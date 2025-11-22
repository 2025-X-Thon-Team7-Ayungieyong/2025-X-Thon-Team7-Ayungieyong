from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .graph import run_workflow

app = FastAPI(title="Hackathon Agent (LangGraph)", version="0.1.0")


class GenerateRequest(BaseModel):
    pdf_path: str
    out_dir: Optional[str] = None
    pages: Optional[str] = None
    model: str = "gpt-5.1"
    max_context_chars: int = 8000
    video_path: Optional[str] = None
    step_seconds: float = 1.0
    device: str = "cpu"


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/generate")
def generate(req: GenerateRequest) -> dict:
    try:
        result = run_workflow(
            pdf_path=Path(req.pdf_path),
            out_dir=req.out_dir,
            pages=req.pages,
            model=req.model,
            max_context_chars=req.max_context_chars,
            video_path=req.video_path,
            step_seconds=req.step_seconds,
            device=req.device,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
