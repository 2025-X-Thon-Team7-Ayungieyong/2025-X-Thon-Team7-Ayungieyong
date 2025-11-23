from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Union

from openai import OpenAI

# Ensure we can import sibling modules (e.g., PDF_Reader).
HACKATHON_ROOT = Path(__file__).resolve().parents[1]
if str(HACKATHON_ROOT) not in sys.path:
    sys.path.append(str(HACKATHON_ROOT))

from PDF_Reader import PDFExtraction, extract_pdf, parse_page_spec  # noqa: E402

DEFAULT_SEARCH_KEYWORDS: Sequence[str] = (
    "면접 기출문제",
    "면접 후기",
    "개발자 면접 예상문제",
)


def _get_text_response(client: OpenAI, model: str, messages: List[Dict[str, str]], temperature: float = 0.0) -> str:
    """Return plain text from OpenAI regardless of SDK version."""
    if hasattr(client, "chat") and hasattr(client.chat, "completions"):
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        message = completion.choices[0].message
        return message.content if hasattr(message, "content") else ""

    if hasattr(client, "responses"):
        response = client.responses.create(
            model=model,
            input=messages,
            temperature=temperature,
        )
        if getattr(response, "output_text", None):
            return response.output_text
        try:
            return response.output[0].content[0].text
        except Exception:
            return ""

    raise AttributeError("OpenAI client does not support chat or responses APIs.")


def fetch_company_role_search_context(
    company: str,
    role: str,
    keywords: Sequence[str],
    per_query: int = 3,
    max_chars: int = 2000,
) -> str:
    """
    Fetch condensed web search snippets for the target company/role.
    Uses DuckDuckGo so no API key is required. Returns a newline-joined string.
    """
    try:
        from duckduckgo_search import DDGS
    except ImportError as exc:  # pragma: no cover - informs misconfiguration
        raise RuntimeError(
            "duckduckgo-search is required for web search. Install via `pip install duckduckgo-search`."
        ) from exc

    base_terms = " ".join(part for part in (company, role) if part).strip()
    queries = [
        " ".join(part for part in (base_terms, kw) if part).strip()
        for kw in keywords
    ]
    queries = [q for q in queries if q]
    if not queries:
        return ""

    snippets: List[str] = []
    try:
        with DDGS(timeout=10) as ddgs:
            for query in queries:
                try:
                    for item in ddgs.text(query, max_results=per_query):
                        title = (item.get("title") or "").strip()
                        snippet = (item.get("body") or "").strip()
                        link = (item.get("href") or "").strip()
                        if not title and not snippet:
                            continue
                        line = f"[{query}] {title}: {snippet}"
                        if link:
                            line += f" (link: {link})"
                        snippets.append(line)
                except Exception:
                    # Skip individual query failures to keep the flow resilient.
                    continue
    except Exception as exc:
        raise RuntimeError(f"Web search failed: {exc}") from exc

    context = "\n".join(snippets)
    if len(context) > max_chars:
        context = context[:max_chars]
    return context


def run_agent(
    pdf_path: Union[str, Path],
    out_dir: Optional[Union[str, Path]] = None,
    model: str = "gpt-5.1",
    pages: Optional[Sequence[int]] = None,
    max_context_chars: int = 8000,
    client: Optional[OpenAI] = None,
) -> Dict[str, Any]:
    """
    Run the agent flow:
    1) call PDF reader, 2) save JSON, 3) call LLM for 3 questions, 4) save questions JSON.
    """
    pdf_path = Path(pdf_path)
    out_dir = Path("/app/outputs")
    out_dir.mkdir(parents=True, exist_ok=True)

    extraction = extract_pdf(pdf_path, page_numbers=pages)
    extracted_path = out_dir / f"{pdf_path.stem}_extracted.json"
    _write_json(extraction.as_dict(), extracted_path)

    questions_list = generate_questions(
        extraction=extraction,
        model=model,
        max_context_chars=max_context_chars,
        client=client,
    )
    questions_path = out_dir / "Questions_Text.txt"
    _write_txt(questions_list, questions_path)

    return {
        "pdf_path": str(pdf_path),
        "extracted_json": str(extracted_path),
        "questions_txt": str(questions_path),
        "questions": questions_list,
    }


def generate_questions(
    extraction: PDFExtraction,
    model: str,
    max_context_chars: int,
    client: Optional[OpenAI] = None,
) -> List[str]:
    client = client or _build_client()

    context_text = "\n\n".join(page.text for page in extraction.pages if page.text)
    truncated = False
    if len(context_text) > max_context_chars:
        context_text = context_text[:max_context_chars]
        truncated = True

    system_prompt = (
        "You are an interview question generator. "
        "Use ONLY the provided PDF text to craft 3 Korean interview questions. "
        "Do not invent facts not present in the text. "
        "Keep questions concise and job-relevant. "
        "Return a JSON object with key 'questions', a list of exactly 3 strings (just the questions). "
        "If context is sparse, keep questions general but still grounded."
    )
    user_prompt = (
        f"PDF path: {extraction.path}\n"
        f"Page count: {extraction.page_count}\n"
        f"Context truncated: {truncated}\n"
        "Extracted text:\n"
        f"{context_text}"
    )

    content = _get_text_response(
        client,
        model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,
    ) or "{}"
    try:
        payload = json.loads(content)
        questions = payload.get("questions", [])
    except json.JSONDecodeError:
        questions = []
    return questions


def generate_questions_from_texts(
    introduce_text: str,
    portfolio_text: str,
    model: str,
    max_context_chars: int,
    client: Optional[OpenAI] = None,
    company: Optional[str] = None,
    role: Optional[str] = None,
    search_keywords: Optional[Sequence[str]] = None,
    search_results_per_query: int = 3,
    max_search_chars: int = 2000,
) -> List[str]:
    """
    Generate interview questions from introduce/portfolio texts plus optional company/role search context.
    """
    client = client or _build_client()

    keywords = list(search_keywords) if search_keywords is not None else list(DEFAULT_SEARCH_KEYWORDS)
    search_context = ""

    if company or role:
        try:
            search_context = fetch_company_role_search_context(
                company=company or "",
                role=role or "",
                keywords=keywords,
                per_query=search_results_per_query,
                max_chars=max_search_chars,
            )
        except Exception:
            # If search fails, proceed with the provided texts only.
            search_context = ""

    context_sections = []
    if company or role:
        meta_lines = []
        if company:
            meta_lines.append(f"회사: {company}")
        if role:
            meta_lines.append(f"직무: {role}")
        if keywords:
            meta_lines.append("검색 키워드: " + ", ".join(keywords))
        context_sections.append("=== 회사/직무 정보 ===\n" + "\n".join(meta_lines))

    context_sections.append("=== 자기소개서 ===\n" + introduce_text)
    context_sections.append("=== 포트폴리오 ===\n" + portfolio_text)

    if search_context:
        context_sections.append("=== 검색 결과 요약 ===\n" + search_context)

    combined_text = "\n\n".join(context_sections)

    truncated = False
    if len(combined_text) > max_context_chars:
        combined_text = combined_text[:max_context_chars]
        truncated = True

    system_prompt = (
        "You are an interview question generator for Korean technical interviews. "
        "Use the candidate's 자기소개서, 포트폴리오, 회사/직무 정보, 그리고 검색 결과 요약을 근거로 정확히 3개의 한국어 면접 질문을 만든다. "
        "질문은 회사/직무 맥락(예: 기대 역량, 문화 적합성, 공통 기술 스택)과 지원자가 언급한 경험을 연결해야 한다. "
        "검색 요약에 있는 키워드나 화제를 활용하되, 제공된 정보 밖의 사실은 만들지 않는다. "
        "반드시 JSON 객체를 반환하고, 키 'questions'에 문자열 3개를 담은 리스트만 포함한다."
    )
    user_prompt = (
        f"Context truncated: {truncated}\n"
        "Available context (company/role, candidate docs, search snippets):\n"
        f"{combined_text}"
    )

    content = _get_text_response(
        client,
        model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,
    ) or "{}"
    try:
        payload = json.loads(content)
        questions = payload.get("questions", [])
    except json.JSONDecodeError:
        questions = []
    return questions


def _write_json(data: Any, path: Path) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _write_txt(questions: List[str], path: Path) -> None:
    """
    Save questions as individual txt files.
    Creates question_1.txt, question_2.txt, question_3.txt in the same directory.
    """
    output_dir = path.parent
    output_dir.mkdir(parents=True, exist_ok=True)

    for i, question in enumerate(questions, start=1):
        question_file = output_dir / f"question_{i}.txt"
        with question_file.open("w", encoding="utf-8") as f:
            f.write(question)


def _build_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is required.")
    return OpenAI(api_key=api_key)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run agent: PDF -> JSON -> LLM (3 interview questions)."
    )
    parser.add_argument("--pdf", required=True, help="Path to PDF file.")
    parser.add_argument(
        "--out",
        help="Output directory for JSON files (default: <pdf_dir>/outputs).",
    )
    parser.add_argument(
        "--pages",
        help='Optional page spec (e.g., "1,3-4") to restrict extraction.',
    )
    parser.add_argument(
        "--model",
        default="gpt-5.1",
        help="OpenAI chat completion model (default: gpt-5.1).",
    )
    parser.add_argument(
        "--max-context-chars",
        type=int,
        default=8000,
        help="Max characters of PDF text to send to the LLM (default: 8000).",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> None:
    parser = _build_parser()
    args = parser.parse_args(argv)
    pages = parse_page_spec(args.pages) if args.pages else None
    result = run_agent(
        pdf_path=args.pdf,
        out_dir=args.out,
        model=args.model,
        pages=pages,
        max_context_chars=args.max_context_chars,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
