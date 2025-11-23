from __future__ import annotations

import os
from typing import Any, Dict, Literal, Optional, TypedDict

import httpx
from langgraph.graph import END, StateGraph

from session_manager import Session, SessionStatus, session_manager

# Service URLs from environment variables
PDF_READER_URL = os.getenv("PDF_READER_URL", "http://localhost:8001")
QUESTION_GEN_URL = os.getenv("QUESTION_GEN_URL", "http://localhost:8002")
FACE_ANALYSIS_URL = os.getenv("FACE_ANALYSIS_URL", "http://localhost:8003")
VOICE_ANALYSIS_URL = os.getenv("VOICE_ANALYSIS_URL", "http://localhost:8004")


class WorkflowState(TypedDict, total=False):
    """State for the interview analysis workflow."""

    session_id: str
    pdf_path: str
    extraction_data: Optional[Dict[str, Any]]
    questions: Optional[list[dict]]
    video_path: Optional[str]
    audio_path: Optional[str]
    face_result: Optional[Dict[str, Any]]
    voice_result: Optional[Dict[str, Any]]
    error: Optional[str]
    status: str


def pdf_extract_node(state: WorkflowState) -> WorkflowState:
    """Extract text from PDF using PDF Reader service."""
    session_id = state["session_id"]
    pdf_path = state["pdf_path"]

    session_manager.update_session(session_id, status=SessionStatus.PDF_EXTRACTING)

    try:
        with httpx.Client() as client:
            response = client.post(
                f"{PDF_READER_URL}/extract",
                json={"pdf_path": pdf_path},
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

        extraction_data = {
            "pdf_path": data["pdf_path"],
            "total_pages": data["total_pages"],
            "extracted_pages": data["extracted_pages"],
            "pages": data["pages_data"],
        }

        session_manager.update_session(
            session_id,
            status=SessionStatus.PDF_EXTRACTED,
            extraction_data=extraction_data,
        )

        return {
            "session_id": session_id,
            "extraction_data": extraction_data,
            "status": "pdf_extracted",
        }
    except Exception as e:
        session_manager.update_session(
            session_id,
            status=SessionStatus.ERROR,
            error_message=f"PDF extraction failed: {str(e)}",
        )
        return {"session_id": session_id, "error": str(e), "status": "error"}


def question_generate_node(state: WorkflowState) -> WorkflowState:
    """Generate interview questions using Question Generator service."""
    session_id = state["session_id"]
    extraction_data = state.get("extraction_data")

    if not extraction_data:
        return {"session_id": session_id, "error": "No extraction data", "status": "error"}

    session_manager.update_session(session_id, status=SessionStatus.GENERATING_QUESTIONS)

    try:
        with httpx.Client() as client:
            response = client.post(
                f"{QUESTION_GEN_URL}/generate",
                json={"extraction_data": extraction_data},
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

        questions = data.get("questions", [])

        session_manager.update_session(
            session_id,
            status=SessionStatus.QUESTIONS_GENERATED,
            questions=questions,
        )

        return {
            "session_id": session_id,
            "questions": questions,
            "status": "questions_generated",
        }
    except Exception as e:
        session_manager.update_session(
            session_id,
            status=SessionStatus.ERROR,
            error_message=f"Question generation failed: {str(e)}",
        )
        return {"session_id": session_id, "error": str(e), "status": "error"}


def wait_for_upload_node(state: WorkflowState) -> WorkflowState:
    """Mark session as waiting for file upload."""
    session_id = state["session_id"]

    session_manager.update_session(session_id, status=SessionStatus.WAITING_FOR_UPLOAD)

    return {
        "session_id": session_id,
        "status": "waiting_for_upload",
    }


# Removed check_upload_route - using interrupt_before instead


def face_analysis_node(state: WorkflowState) -> WorkflowState:
    """Analyze facial expressions using Face Analysis service."""
    session_id = state["session_id"]
    session = session_manager.get_session(session_id)

    if not session or not session.video_path:
        return {"session_id": session_id, "status": "face_skipped"}

    session_manager.update_session(session_id, status=SessionStatus.ANALYZING_FACE)

    try:
        with httpx.Client() as client:
            response = client.post(
                f"{FACE_ANALYSIS_URL}/analyze",
                json={"video_path": session.video_path, "step_seconds": 1.0, "device": "cpu"},
                timeout=300.0,  # 5 minutes for video processing
            )
            response.raise_for_status()
            data = response.json()

        session_manager.update_session(
            session_id,
            status=SessionStatus.FACE_ANALYZED,
            face_analysis_result=data,
        )

        return {
            "session_id": session_id,
            "face_result": data,
            "status": "face_analyzed",
        }
    except Exception as e:
        session_manager.update_session(
            session_id,
            status=SessionStatus.ERROR,
            error_message=f"Face analysis failed: {str(e)}",
        )
        return {"session_id": session_id, "error": str(e), "status": "error"}


def voice_analysis_node(state: WorkflowState) -> WorkflowState:
    """Analyze voice emotions using Voice Analysis service."""
    session_id = state["session_id"]
    session = session_manager.get_session(session_id)

    if not session or not session.audio_path:
        return {"session_id": session_id, "status": "voice_skipped"}

    session_manager.update_session(session_id, status=SessionStatus.ANALYZING_VOICE)

    try:
        with httpx.Client() as client:
            response = client.post(
                f"{VOICE_ANALYSIS_URL}/analyze",
                json={"audio_path": session.audio_path},
                timeout=300.0,
            )
            response.raise_for_status()
            data = response.json()

        session_manager.update_session(
            session_id,
            status=SessionStatus.VOICE_ANALYZED,
            voice_analysis_result=data,
        )

        return {
            "session_id": session_id,
            "voice_result": data,
            "status": "voice_analyzed",
        }
    except Exception as e:
        session_manager.update_session(
            session_id,
            status=SessionStatus.ERROR,
            error_message=f"Voice analysis failed: {str(e)}",
        )
        return {"session_id": session_id, "error": str(e), "status": "error"}


def complete_node(state: WorkflowState) -> WorkflowState:
    """Mark workflow as completed."""
    session_id = state["session_id"]

    session_manager.update_session(session_id, status=SessionStatus.COMPLETED)

    return {
        "session_id": session_id,
        "status": "completed",
    }


def build_workflow() -> StateGraph:
    """Build the interview analysis workflow graph."""
    graph = StateGraph(WorkflowState)

    # Add nodes
    graph.add_node("pdf_extract", pdf_extract_node)
    graph.add_node("question_generate", question_generate_node)
    graph.add_node("wait_for_upload", wait_for_upload_node)
    graph.add_node("face_analysis", face_analysis_node)
    graph.add_node("voice_analysis", voice_analysis_node)
    graph.add_node("complete", complete_node)

    # Set entry point
    graph.set_entry_point("pdf_extract")

    # Add edges
    graph.add_edge("pdf_extract", "question_generate")
    graph.add_edge("question_generate", "wait_for_upload")

    # Conditional routing after upload
    graph.add_conditional_edges(
        "wait_for_upload",
        check_upload_route,
        {
            "face_analysis": "face_analysis",
            "end": END,
        },
    )

    graph.add_edge("face_analysis", "voice_analysis")
    graph.add_edge("voice_analysis", "complete")
    graph.add_edge("complete", END)

    return graph


# Compile workflow
workflow = build_workflow().compile()


def run_workflow(session_id: str, pdf_path: str) -> Dict[str, Any]:
    """Run the workflow for a session."""
    initial_state: WorkflowState = {
        "session_id": session_id,
        "pdf_path": pdf_path,
        "status": "created",
    }

    result = workflow.invoke(initial_state)
    return result
