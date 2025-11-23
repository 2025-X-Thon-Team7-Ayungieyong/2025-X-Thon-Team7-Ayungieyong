from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Sequence, TypedDict, Union

from langgraph.graph import END, StateGraph

# Make sibling modules importable when run as a script.
HACKATHON_ROOT = Path(__file__).resolve().parents[1]
if str(HACKATHON_ROOT) not in sys.path:
    sys.path.append(str(HACKATHON_ROOT))

from PDF_Reader import PDFExtraction, extract_pdf, parse_page_spec  # noqa: E402
from Question_generator.agent import generate_questions  # noqa: E402
from Face_Analysis import analyze_video  # noqa: E402

DEFAULT_MODEL = "gpt-5.1"
DEFAULT_MAX_CONTEXT_CHARS = 8000


class GraphState(TypedDict, total=False):
    pdf_path: str
    video_path: Optional[str]
    out_dir: str
    pages: Optional[Union[str, Sequence[int]]]
    model: str
    max_context_chars: int
    step_seconds: float
    device: str
    extraction: PDFExtraction
    extraction_json_path: str
    questions: Dict[str, Any]
    questions_json_path: str
    face_emotions_csv_path: Optional[str]
    face_emotions_summary: Optional[Dict[str, Any]]


def pdf_extract_node(state: GraphState) -> GraphState:
    pdf_path = Path(state["pdf_path"])
    pages_spec = state.get("pages")
    page_numbers = _resolve_pages(pages_spec)
    out_dir = _resolve_out_dir(pdf_path, state.get("out_dir"))

    extraction = extract_pdf(pdf_path, page_numbers=page_numbers)
    extraction_json = out_dir / f"{pdf_path.stem}_extracted.json"
    _write_json(extraction.as_dict(), extraction_json)

    return {
        "pdf_path": str(pdf_path),
        "out_dir": str(out_dir),
        "pages": pages_spec,
        "extraction": extraction,
        "extraction_json_path": str(extraction_json),
    }


def question_generate_node(state: GraphState) -> GraphState:
    if "extraction" not in state:
        raise ValueError("Missing PDF extraction in state.")

    model = state.get("model", DEFAULT_MODEL)
    max_context_chars = state.get("max_context_chars", DEFAULT_MAX_CONTEXT_CHARS)

    questions_payload = generate_questions(
        extraction=state["extraction"],
        model=model,
        max_context_chars=max_context_chars,
    )

    pdf_path = Path(state["pdf_path"])
    out_dir = Path(state.get("out_dir") or pdf_path.parent / "outputs")
    questions_json = out_dir / f"{pdf_path.stem}_questions.json"
    _write_json(questions_payload, questions_json)

    return {
        "pdf_path": str(pdf_path),
        "out_dir": str(out_dir),
        "model": model,
        "max_context_chars": max_context_chars,
        "questions": questions_payload,
        "questions_json_path": str(questions_json),
        "extraction_json_path": state.get("extraction_json_path", ""),
        "pages": state.get("pages"),
    }


def face_analysis_node(state: GraphState) -> GraphState:
    """Analyze facial expressions from video if video_path is provided."""
    video_path = state.get("video_path")

    # Skip face analysis if no video provided
    if not video_path:
        return {
            "face_emotions_csv_path": None,
            "face_emotions_summary": None,
        }

    video_path = Path(video_path)
    if not video_path.is_file():
        raise FileNotFoundError(f"Video not found: {video_path}")

    out_dir = Path(state.get("out_dir") or video_path.parent / "outputs")
    out_dir.mkdir(parents=True, exist_ok=True)

    step_seconds = state.get("step_seconds", 1.0)
    device = state.get("device", "cpu")

    csv_path = out_dir / f"{video_path.stem}_face_emotions.csv"

    # Run face analysis
    import pandas as pd
    df = analyze_video(
        video_path=video_path,
        output_csv=csv_path,
        step_seconds=step_seconds,
        device=device,
    )

    # Create summary statistics
    summary = {}
    if not df.empty:
        emotion_cols = [
            "emotion_anger", "emotion_disgust", "emotion_fear",
            "emotion_happiness", "emotion_sadness", "emotion_surprise",
            "emotion_neutral"
        ]
        available_emotion_cols = [col for col in emotion_cols if col in df.columns]

        if available_emotion_cols:
            summary["average_emotions"] = df[available_emotion_cols].mean().to_dict()
            summary["total_frames_analyzed"] = len(df)
            summary["frames_with_faces"] = int((df["faces_detected"] > 0).sum())

    return {
        "face_emotions_csv_path": str(csv_path),
        "face_emotions_summary": summary,
    }


def build_graph() -> StateGraph:
    graph = StateGraph(GraphState)
    graph.add_node("pdf_extract", pdf_extract_node)
    graph.add_node("question_generate", question_generate_node)
    graph.add_node("face_analysis", face_analysis_node)
    graph.set_entry_point("pdf_extract")
    graph.add_edge("pdf_extract", "question_generate")
    graph.add_edge("question_generate", "face_analysis")
    graph.add_edge("face_analysis", END)
    return graph


WORKFLOW = build_graph().compile()


def run_workflow(
    pdf_path: Union[str, Path],
    out_dir: Optional[Union[str, Path]] = None,
    pages: Optional[Union[str, Sequence[int]]] = None,
    model: str = DEFAULT_MODEL,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    video_path: Optional[Union[str, Path]] = None,
    step_seconds: float = 1.0,
    device: str = "cpu",
) -> Dict[str, Any]:
    initial_state: GraphState = {
        "pdf_path": str(pdf_path),
        "out_dir": str(out_dir) if out_dir else "",
        "pages": pages,
        "model": model,
        "max_context_chars": max_context_chars,
        "video_path": str(video_path) if video_path else None,
        "step_seconds": step_seconds,
        "device": device,
    }
    result = WORKFLOW.invoke(initial_state)
    safe_result = dict(result)
    if "extraction" in safe_result and isinstance(safe_result["extraction"], PDFExtraction):
        safe_result["extraction"] = safe_result["extraction"].as_dict()
    return safe_result


def _resolve_out_dir(pdf_path: Path, out_dir: Optional[Union[str, Path]]) -> Path:
    if out_dir:
        path = Path(out_dir)
    else:
        path = pdf_path.parent / "outputs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _resolve_pages(pages: Optional[Union[str, Sequence[int]]]) -> Optional[Sequence[int]]:
    if pages is None:
        return None
    if isinstance(pages, str):
        return parse_page_spec(pages)
    return list(pages)


def _write_json(data: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="LangGraph workflow: PDF -> questions -> face analysis")
    parser.add_argument("--pdf", required=True, help="Path to PDF file.")
    parser.add_argument("--out", help="Output directory (default: <pdf_dir>/outputs).")
    parser.add_argument("--pages", help='Optional page spec (e.g., "1,3-4").')
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"OpenAI model for question generation (default: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--max-context-chars",
        type=int,
        default=DEFAULT_MAX_CONTEXT_CHARS,
        help="Max characters of PDF text to send to LLM.",
    )
    parser.add_argument("--video", help="Optional path to video file for face analysis.")
    parser.add_argument(
        "--step",
        type=float,
        default=1.0,
        help="Sampling interval in seconds for face analysis (default: 1.0).",
    )
    parser.add_argument(
        "--device",
        default="cpu",
        choices=["cpu", "cuda"],
        help="Device for face analysis (default: cpu).",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> None:
    parser = _build_parser()
    args = parser.parse_args(argv)
    result = run_workflow(
        pdf_path=args.pdf,
        out_dir=args.out,
        pages=args.pages,
        model=args.model,
        max_context_chars=args.max_context_chars,
        video_path=args.video,
        step_seconds=args.step,
        device=args.device,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
