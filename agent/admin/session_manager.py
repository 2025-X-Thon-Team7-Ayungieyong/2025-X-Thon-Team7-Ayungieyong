from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional


class SessionStatus(str, Enum):
    """Session status enumeration."""

    CREATED = "created"
    PDF_EXTRACTING = "pdf_extracting"
    PDF_EXTRACTED = "pdf_extracted"
    GENERATING_QUESTIONS = "generating_questions"
    QUESTIONS_GENERATED = "questions_generated"
    WAITING_FOR_UPLOAD = "waiting_for_upload"
    FILES_UPLOADED = "files_uploaded"
    ANALYZING_FACE = "analyzing_face"
    FACE_ANALYZED = "face_analyzed"
    ANALYZING_VOICE = "analyzing_voice"
    VOICE_ANALYZED = "voice_analyzed"
    REPORT_GENERATING = "report_generating"
    REPORT_GENERATED = "report_generated"
    COMPLETED = "completed"
    ERROR = "error"


class Session:
    """Session data container."""

    def __init__(self, session_id: str, pdf_path: str):
        self.session_id = session_id
        self.pdf_path = pdf_path
        self.status = SessionStatus.CREATED
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

        # Data storage
        self.extraction_data: Optional[Dict[str, Any]] = None
        self.questions: Optional[list[dict]] = None
        # Changed to lists to support 3 files (one per question)
        self.video_paths: list[str] = []
        self.audio_paths: list[str] = []
        # Keep legacy fields for backward compatibility
        self.video_path: Optional[str] = None
        self.audio_path: Optional[str] = None
        self.face_analysis_results: list[Dict[str, Any]] = []
        self.voice_analysis_results: list[Dict[str, Any]] = []
        self.face_analysis_result: Optional[Dict[str, Any]] = None
        self.voice_analysis_result: Optional[Dict[str, Any]] = None
        self.report_path: Optional[str] = None
        self.error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert session to dictionary."""
        return {
            "session_id": self.session_id,
            "pdf_path": self.pdf_path,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "video_paths": self.video_paths,
            "audio_paths": self.audio_paths,
            "video_path": self.video_path,  # Legacy
            "audio_path": self.audio_path,  # Legacy
            "questions": self.questions,
            "face_analysis_results": self.face_analysis_results,
            "voice_analysis_results": self.voice_analysis_results,
            "face_analysis_result": self.face_analysis_result,  # Legacy
            "voice_analysis_result": self.voice_analysis_result,  # Legacy
            "report_path": self.report_path,
            "error_message": self.error_message,
        }


class SessionManager:
    """In-memory session manager."""

    def __init__(self):
        self._sessions: Dict[str, Session] = {}

    def create_session(self, pdf_path: str) -> Session:
        """Create a new session."""
        session_id = str(uuid.uuid4())
        session = Session(session_id=session_id, pdf_path=pdf_path)
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID."""
        return self._sessions.get(session_id)

    def update_session(self, session_id: str, **kwargs) -> None:
        """Update session fields."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        for key, value in kwargs.items():
            if hasattr(session, key):
                setattr(session, key, value)
        session.updated_at = datetime.now()

    def delete_session(self, session_id: str) -> None:
        """Delete session."""
        if session_id in self._sessions:
            del self._sessions[session_id]


# Global session manager instance
session_manager = SessionManager()
