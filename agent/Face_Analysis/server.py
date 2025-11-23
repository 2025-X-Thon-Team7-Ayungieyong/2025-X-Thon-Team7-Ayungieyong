from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from face_analysis import analyze_video, _resolve_device

app = FastAPI(title="Face Analysis MCP Service", version="1.0.0")


class AnalyzeRequest(BaseModel):
    video_path: str
    output_csv: Optional[str] = None
    step_seconds: float = 1.0
    device: str = "auto"


class AnalyzeResponse(BaseModel):
    csv_path: str
    summary: Dict[str, Any]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "face_analysis"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze facial expressions from video file."""
    try:
        video_path = Path(req.video_path)
        if not video_path.is_file():
            raise HTTPException(
                status_code=404,
                detail=f"Video not found: {req.video_path}",
            )

        # Determine output CSV path
        if req.output_csv:
            csv_path = Path(req.output_csv)
        else:
            csv_path = Path("/app/outputs/Face_Text.csv")

        device = _resolve_device(req.device)

        # Run analysis
        df = None
        try:
            df = analyze_video(
                video_path=video_path,
                output_csv=csv_path,
                step_seconds=req.step_seconds,
                device=device,
            )
        except Exception as exc:
            # Retry on CPU if CUDA path fails (common when GPU is unavailable in the runtime)
            if device.startswith("cuda"):
                print(f"CUDA face analysis failed, retrying on CPU. Error: {exc}")
                device = "cpu"
                df = analyze_video(
                    video_path=video_path,
                    output_csv=csv_path,
                    step_seconds=req.step_seconds,
                    device=device,
                )
            else:
                raise

        # Create summary statistics
        summary: Dict[str, Any] = {}
        if not df.empty:
            emotion_cols = [
                "emotion_anger",
                "emotion_disgust",
                "emotion_fear",
                "emotion_happiness",
                "emotion_sadness",
                "emotion_surprise",
                "emotion_neutral",
            ]
            available_emotion_cols = [col for col in emotion_cols if col in df.columns]

            if available_emotion_cols:
                summary["average_emotions"] = df[available_emotion_cols].mean().to_dict()
                summary["total_frames_analyzed"] = len(df)
                summary["frames_with_faces"] = int((df["faces_detected"] > 0).sum())
        else:
            summary["total_frames_analyzed"] = 0
            summary["frames_with_faces"] = 0

        return AnalyzeResponse(
            csv_path=str(csv_path),
            summary=summary,
        )
    except Exception as exc:
        import traceback
        error_detail = f"{str(exc)}\n{traceback.format_exc()}"
        print(f"ERROR in Face Analysis: {error_detail}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
