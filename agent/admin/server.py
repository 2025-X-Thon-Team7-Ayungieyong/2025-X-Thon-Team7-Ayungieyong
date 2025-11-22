from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from session_manager import SessionStatus, session_manager

# LangGraph API URL
LANGGRAPH_API_URL = os.getenv("LANGGRAPH_API_URL", "http://localhost:2024")
GRAPH_NAME = "interview_analysis"

app = FastAPI(title="Interview Analysis Admin Service", version="1.0.0")


class StartRequest(BaseModel):
    pdf_path: str = ""  # Optional, not used (uses fixed introduce.pdf and portfolio.pdf)


class StartResponse(BaseModel):
    session_id: str
    status: str
    message: str


class StatusResponse(BaseModel):
    session_id: str
    status: str
    pdf_path: str
    video_paths: list[str] = []
    audio_paths: list[str] = []
    video_path: Optional[str] = None  # Legacy
    audio_path: Optional[str] = None  # Legacy
    questions: Optional[list[Any]]
    face_analysis_results: list[dict] = []
    voice_analysis_results: list[dict] = []
    face_analysis_result: Optional[dict] = None  # Legacy
    voice_analysis_result: Optional[dict] = None  # Legacy
    report_path: Optional[str]
    error_message: Optional[str]


class UploadResponse(BaseModel):
    session_id: str
    video_paths: list[str] = []
    audio_paths: list[str] = []
    message: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "admin"}


@app.post("/start", response_model=StartResponse)
async def start_workflow(req: StartRequest) -> StartResponse:
    """Start the interview analysis workflow with introduce.pdf and portfolio.pdf."""
    try:
        # Use fixed PDF paths (introduce.pdf and portfolio.pdf)
        pdf_path = req.pdf_path if req.pdf_path else "introduce.pdf + portfolio.pdf"

        # Create session
        session = session_manager.create_session(pdf_path=pdf_path)

        # Run workflow in background
        asyncio.create_task(_run_workflow_async(session.session_id, pdf_path))

        return StartResponse(
            session_id=session.session_id,
            status=session.status.value,
            message="Workflow started. Use /status/{session_id} to check progress.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _run_workflow_async(session_id: str, pdf_path: str):
    """Run workflow asynchronously using LangGraph API."""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Create input for the workflow
            input_data = {
                "session_id": session_id,
                "pdf_path": pdf_path,
                "status": "created",
            }

            # Start the workflow run using LangGraph API
            response = await client.post(
                f"{LANGGRAPH_API_URL}/threads/{session_id}/runs/stream",
                json={
                    "assistant_id": GRAPH_NAME,
                    "input": input_data,
                    "stream_mode": "updates",
                },
            )

            # Stream is handled by LangGraph API
            # Workflow will run until it hits the interrupt
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    pass  # LangGraph handles the streaming

    except Exception as e:
        session_manager.update_session(
            session_id,
            status=SessionStatus.ERROR,
            error_message=str(e),
        )


@app.get("/status/{session_id}", response_model=StatusResponse)
def get_status(session_id: str) -> StatusResponse:
    """Get the status of a workflow session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")

    return StatusResponse(
        session_id=session.session_id,
        status=session.status.value,
        pdf_path=session.pdf_path,
        video_paths=session.video_paths,
        audio_paths=session.audio_paths,
        video_path=session.video_path,  # Legacy
        audio_path=session.audio_path,  # Legacy
        questions=session.questions,
        face_analysis_results=session.face_analysis_results,
        voice_analysis_results=session.voice_analysis_results,
        face_analysis_result=session.face_analysis_result,  # Legacy
        voice_analysis_result=session.voice_analysis_result,  # Legacy
        report_path=session.report_path,
        error_message=session.error_message,
    )


@app.post("/upload/{session_id}", response_model=UploadResponse)
async def upload_files(
    session_id: str,
    video_1: Optional[UploadFile] = File(None),
    video_2: Optional[UploadFile] = File(None),
    video_3: Optional[UploadFile] = File(None),
    audio_1: Optional[UploadFile] = File(None),
    audio_2: Optional[UploadFile] = File(None),
    audio_3: Optional[UploadFile] = File(None),
    upload_dir: str = Form("/app/uploads"),
) -> UploadResponse:
    """Upload 3 video and 3 audio files for analysis (one per question)."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")

    if session.status != SessionStatus.WAITING_FOR_UPLOAD:
        raise HTTPException(
            status_code=400,
            detail=f"Session is not waiting for upload. Current status: {session.status.value}",
        )

    upload_path = Path(upload_dir)
    upload_path.mkdir(parents=True, exist_ok=True)

    video_paths = []
    audio_paths = []

    try:
        # Save 3 video files
        for i, video in enumerate([video_1, video_2, video_3], start=1):
            if video:
                video_filename = f"{session_id}_video_{i}{Path(video.filename or f'video_{i}.mp4').suffix}"
                video_file_path = upload_path / video_filename
                with video_file_path.open("wb") as f:
                    content = await video.read()
                    f.write(content)
                video_paths.append(str(video_file_path))
            else:
                video_paths.append("")  # Empty string for missing files

        # Save 3 audio files
        for i, audio in enumerate([audio_1, audio_2, audio_3], start=1):
            if audio:
                audio_filename = f"{session_id}_audio_{i}{Path(audio.filename or f'audio_{i}.wav').suffix}"
                audio_file_path = upload_path / audio_filename
                with audio_file_path.open("wb") as f:
                    content = await audio.read()
                    f.write(content)
                audio_paths.append(str(audio_file_path))
            else:
                audio_paths.append("")  # Empty string for missing files

        # Update session with file paths
        session.video_paths = video_paths
        session.audio_paths = audio_paths
        # Update legacy fields for backward compatibility (use first file)
        session.video_path = video_paths[0] if video_paths else None
        session.audio_path = audio_paths[0] if audio_paths else None

        session_manager.update_session(
            session_id,
            status=SessionStatus.FILES_UPLOADED,
            video_paths=video_paths,
            audio_paths=audio_paths,
        )

        # Continue workflow from interrupt point
        asyncio.create_task(_continue_workflow_async(session_id, video_paths, audio_paths))

        return UploadResponse(
            session_id=session_id,
            video_paths=video_paths,
            audio_paths=audio_paths,
            message="Files uploaded successfully. Analysis will continue automatically.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _continue_workflow_async(session_id: str, video_paths: list[str], audio_paths: list[str]):
    """Continue workflow after file upload using LangGraph API."""
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Update state with video/audio paths using LangGraph API
            await client.post(
                f"{LANGGRAPH_API_URL}/threads/{session_id}/state",
                json={
                    "values": {
                        "video_paths": video_paths,
                        "audio_paths": audio_paths,
                        "face_results": [],
                        "voice_results": [],
                        "face_analysis_complete_count": 0,
                        "voice_analysis_complete_count": 0,
                    },
                    "as_node": "wait_for_upload",
                },
            )

            # Resume the workflow from interrupt using LangGraph API
            response = await client.post(
                f"{LANGGRAPH_API_URL}/threads/{session_id}/runs/stream",
                json={
                    "assistant_id": GRAPH_NAME,
                    "input": None,  # Resume from current state
                    "stream_mode": "updates",
                },
            )

            # Stream the execution
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    pass  # LangGraph handles the streaming

    except Exception as e:
        session_manager.update_session(
            session_id,
            status=SessionStatus.ERROR,
            error_message=str(e),
        )


@app.get("/sessions")
def list_sessions() -> Dict[str, Any]:
    """List all active sessions."""
    sessions = [
        session.to_dict()
        for session in session_manager._sessions.values()
    ]
    return {"sessions": sessions, "total": len(sessions)}


@app.get("/graph/structure")
def get_graph_structure() -> Dict[str, Any]:
    """Get the workflow graph structure for visualization."""
    from graph import workflow

    # Get graph structure
    graph_dict = workflow.get_graph().to_json()

    return {
        "graph": graph_dict,
        "description": "Interview Analysis Workflow",
        "nodes": [
            {"id": "pdf_extract", "label": "PDF 추출", "color": "#3b82f6"},
            {"id": "question_generate", "label": "질문 생성", "color": "#8b5cf6"},
            {"id": "wait_for_upload", "label": "파일 업로드 대기", "color": "#f59e0b"},
            {"id": "face_analysis", "label": "얼굴 분석", "color": "#10b981"},
            {"id": "voice_analysis", "label": "음성 분석", "color": "#ec4899"},
            {"id": "report_generate", "label": "리포트 생성(더미)", "color": "#0ea5e9"},
            {"id": "complete", "label": "완료", "color": "#6366f1"},
        ],
        "edges": [
            {"from": "pdf_extract", "to": "question_generate"},
            {"from": "question_generate", "to": "wait_for_upload"},
            {"from": "wait_for_upload", "to": "face_analysis", "condition": "files_uploaded"},
            {"from": "wait_for_upload", "to": "voice_analysis", "condition": "files_uploaded"},
            {"from": "face_analysis", "to": "report_generate", "condition": "voice도완료"},
            {"from": "voice_analysis", "to": "report_generate", "condition": "face도완료"},
            {"from": "report_generate", "to": "complete"},
            {"from": "complete", "to": "END"},
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
