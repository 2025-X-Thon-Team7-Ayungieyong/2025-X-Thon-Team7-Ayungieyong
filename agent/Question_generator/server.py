from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

HACKATHON_ROOT = Path(__file__).resolve().parents[1]
if str(HACKATHON_ROOT) not in sys.path:
    sys.path.append(str(HACKATHON_ROOT))

from PDF_Reader import PDFExtraction  # noqa: E402

from agent import generate_questions, _write_txt  # noqa: E402

app = FastAPI(title="Question Generator MCP Service", version="1.0.0")


class GenerateRequest(BaseModel):
    introduce_text: str
    portfolio_text: str
    company: str = "kakao"
    role: str = "백엔드 개발자"
    search_keywords: list[str] = Field(
        default_factory=lambda: [
            "면접 기출문제",
            "면접 후기",
            "kakao 개발자 면접 예상문제",
        ]
    )
    search_results_per_query: int = 3
    max_search_chars: int = 2000
    model: str = "gpt-5.1"
    max_context_chars: int = 16000  # Increased for two documents


class GenerateResponse(BaseModel):
    questions: list[str]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "question_generator"}


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest) -> GenerateResponse:
    """Generate 3 Korean interview questions from introduce and portfolio texts."""
    try:
        # Check for OpenAI API key
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=500,
                detail="OPENAI_API_KEY environment variable is required.",
            )

        # Import generate_questions_from_texts
        from agent import generate_questions_from_texts

        # Generate questions using both texts
        questions_list = generate_questions_from_texts(
            introduce_text=req.introduce_text,
            portfolio_text=req.portfolio_text,
            model=req.model,
            max_context_chars=req.max_context_chars,
            company=req.company,
            role=req.role,
            search_keywords=req.search_keywords,
            search_results_per_query=req.search_results_per_query,
            max_search_chars=req.max_search_chars,
            client=None,  # Will use default client
        )

        # Save questions to individual txt files (question_1.txt, question_2.txt, question_3.txt)
        output_path = Path("/app/outputs/questions.txt")  # Dummy path for directory reference
        output_path.parent.mkdir(parents=True, exist_ok=True)
        _write_txt(questions_list, output_path)

        return GenerateResponse(
            questions=questions_list,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
