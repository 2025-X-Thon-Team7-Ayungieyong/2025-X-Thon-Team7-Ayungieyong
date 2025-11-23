from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from voice_analysis import analyze_audio

app = FastAPI(title="Voice Analysis MCP Service", version="1.0.0")


class AnalyzeRequest(BaseModel):
    audio_path: str
    output_csv: Optional[str] = None
    output_txt: Optional[str] = None


class AnalyzeResponse(BaseModel):
    csv_path: Optional[str]
    summary: Dict[str, Any]
    status: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "voice_analysis"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze audio emotions from audio file (placeholder implementation)."""
    try:
        audio_path = Path(req.audio_path)
        if not audio_path.is_file():
            raise HTTPException(
                status_code=404,
                detail=f"Audio not found: {req.audio_path}",
            )

        # Determine output CSV path
        csv_path = None
        if req.output_csv:
            csv_path = Path(req.output_csv)

        # Determine output TXT path
        txt_path = None
        if req.output_txt:
            txt_path = Path(req.output_txt)

        # Run analysis
        df = analyze_audio(
            audio_path=audio_path,
            output_csv=csv_path,
            output_txt=txt_path,
        )

        # Create summary
        summary = {
            "transcription": df["transcription"].iloc[0],
            "output_txt": df["output_txt"].iloc[0],
            "audio_path": df["audio_path"].iloc[0],
        }

        return AnalyzeResponse(
            csv_path=str(csv_path) if csv_path else None,
            summary=summary,
            status=df["status"].iloc[0],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
