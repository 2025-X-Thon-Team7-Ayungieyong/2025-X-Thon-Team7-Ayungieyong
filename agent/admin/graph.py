from __future__ import annotations

import os
from operator import add
from pathlib import Path
from typing import Annotated, Any, Dict, Optional

import httpx
import pandas as pd
from openai import OpenAI
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

# Support both Docker (from session_manager) and langgraph dev (from admin.session_manager)
try:
    from admin.session_manager import Session, SessionStatus, session_manager
except ModuleNotFoundError:
    from session_manager import Session, SessionStatus, session_manager

# Service URLs from environment variables
PDF_READER_URL = os.getenv("PDF_READER_URL", "http://localhost:8001")
QUESTION_GEN_URL = os.getenv("QUESTION_GEN_URL", "http://localhost:8002")
FACE_ANALYSIS_URL = os.getenv("FACE_ANALYSIS_URL", "http://localhost:8003")
VOICE_ANALYSIS_URL = os.getenv("VOICE_ANALYSIS_URL", "http://localhost:8004")

# Base directory - use /app in Docker, or configured path in local
BASE_DIR = Path(os.getenv("BASE_DIR", "/app" if Path("/app").exists() else "."))


def get_text_response(client: OpenAI, model: str, messages: list[dict], temperature: float = 0.3) -> str:
    """Call OpenAI and return plain text regardless of client version.

    Newer SDKs expose `responses.create`, while older ones use
    `chat.completions.create`. This helper picks what is available so we don't
    crash with AttributeError when `responses` is missing.
    """
    if hasattr(client, "chat") and hasattr(client.chat, "completions"):
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        choice = completion.choices[0].message
        return choice.content if hasattr(choice, "content") else ""

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

    raise AttributeError("OpenAI client does not support chat or responses APIs")


def merge_results(left: list, right: list) -> list:
    """Custom reducer to merge analysis results by index."""
    if not left:
        return right
    if not right:
        return left
    # Merge lists, keeping the longer one as base
    result = left.copy() if len(left) >= len(right) else right.copy()
    # Update with non-empty values from the other list
    for i, val in enumerate(right if len(left) >= len(right) else left):
        if val and (i >= len(result) or not result[i]):
            if i < len(result):
                result[i] = val
            else:
                result.append(val)
    return result


def keep_latest(_: str, right: str) -> str:
    """Reducer to keep the latest status when multiple updates occur in one step."""
    return right


class WorkflowState(TypedDict, total=False):
    """State for the interview analysis workflow."""

    session_id: Optional[str]  # Auto-generated if not provided
    pdf_path: str  # Kept for backward compatibility, not used
    introduce_pdf_path: Optional[str]  # Path to introduce.pdf
    portfolio_pdf_path: Optional[str]  # Path to portfolio.pdf
    introduce_txt_path: Optional[str]
    portfolio_txt_path: Optional[str]
    extraction_data: Optional[Dict[str, Any]]
    questions: Optional[list[dict]]
    # Support 3 video/audio files (one per question)
    video_paths: list[str]
    audio_paths: list[str]
    # Legacy single path fields
    video_path: Optional[str]
    audio_path: Optional[str]
    # Results for 3 analyses - use Annotated with custom reducer for parallel updates
    face_results: Annotated[list[Dict[str, Any]], merge_results]
    voice_results: Annotated[list[Dict[str, Any]], merge_results]
    # Legacy single result fields
    face_result: Optional[Dict[str, Any]]
    voice_result: Optional[Dict[str, Any]]
    # Track completion of parallel analyses - use add reducer
    face_analysis_complete_count: Annotated[int, add]
    voice_analysis_complete_count: Annotated[int, add]
    report_path: Optional[str]
    # Multi-agent evaluation results
    attitude_evaluation: Optional[Dict[str, Any]]  # Face expression evaluation
    qa_relevance_evaluation: Optional[Dict[str, Any]]  # Question-Answer relevance
    consistency_evaluation: Optional[Dict[str, Any]]  # Introduce/Portfolio consistency
    # Document feedback and enrichment report
    portfolio_development_report: Optional[Dict[str, Any]]
    portfolio_development_report_path: Optional[str]
    # Combined HTML dashboard
    insight_dashboard_path: Optional[str]
    # Allow multiple errors from parallel nodes
    errors: Annotated[list[str], add]
    status: Annotated[str, keep_latest]


def pdf_extract_node(state: WorkflowState) -> WorkflowState:
    """Extract text from both introduce.pdf and portfolio.pdf, save as txt files."""
    # Auto-generate session_id if not provided
    session_id = state.get("session_id")
    if not session_id:
        import uuid
        session_id = str(uuid.uuid4())
        pdf_path = state.get("pdf_path", "")
        # Create new session
        session = session_manager.create_session(pdf_path=pdf_path)
        session_id = session.session_id

    session_manager.update_session(session_id, status=SessionStatus.PDF_EXTRACTING)

    # Get PDF paths from state, use defaults if not provided
    # PDF paths should be in Docker format (/app/...) since PDF_Reader service runs in Docker
    introduce_pdf = state.get("introduce_pdf_path", "/app/uploads/introduce.pdf")
    portfolio_pdf = state.get("portfolio_pdf_path", "/app/uploads/portfolio.pdf")

    # Define the two PDFs to extract
    pdf_files = {
        "introduce": introduce_pdf,
        "portfolio": portfolio_pdf,
    }

    # Use BASE_DIR for outputs to avoid hardcoded paths
    output_dir = BASE_DIR / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        introduce_txt_path = None
        portfolio_txt_path = None

        with httpx.Client() as client:
            # Extract introduce.pdf
            response = client.post(
                f"{PDF_READER_URL}/extract",
                json={"pdf_path": pdf_files["introduce"]},
                timeout=60.0,
            )
            response.raise_for_status()
            introduce_data = response.json()

            # Save as introduce.txt
            introduce_txt = "\n\n".join(
                page["text"] for page in introduce_data["pages_data"] if page.get("text")
            )
            introduce_txt_path = output_dir / "introduce.txt"
            introduce_txt_path.write_text(introduce_txt, encoding="utf-8")

            # Extract portfolio.pdf
            response = client.post(
                f"{PDF_READER_URL}/extract",
                json={"pdf_path": pdf_files["portfolio"]},
                timeout=60.0,
            )
            response.raise_for_status()
            portfolio_data = response.json()

            # Save as portfolio.txt
            portfolio_txt = "\n\n".join(
                page["text"] for page in portfolio_data["pages_data"] if page.get("text")
            )
            portfolio_txt_path = output_dir / "portfolio.txt"
            portfolio_txt_path.write_text(portfolio_txt, encoding="utf-8")

        # Store paths in extraction_data for backward compatibility
        extraction_data = {
            "introduce_txt": str(introduce_txt_path),
            "portfolio_txt": str(portfolio_txt_path),
        }

        session_manager.update_session(
            session_id,
            status=SessionStatus.PDF_EXTRACTED,
            extraction_data=extraction_data,
        )

        return {
            "session_id": session_id,
            "introduce_txt_path": str(introduce_txt_path),
            "portfolio_txt_path": str(portfolio_txt_path),
            "extraction_data": extraction_data,
            "status": "pdf_extracted",
        }
    except Exception as e:
        session_manager.update_session(
            session_id,
            status=SessionStatus.ERROR,
            error_message=f"PDF extraction failed: {str(e)}",
        )
        return {"session_id": session_id, "errors": [f"PDF extraction failed: {str(e)}"], "status": "error"}


def question_generate_node(state: WorkflowState) -> WorkflowState:
    """Generate interview questions using Question Generator service with both txt files."""
    session_id = state["session_id"]
    introduce_txt_path = state.get("introduce_txt_path")
    portfolio_txt_path = state.get("portfolio_txt_path")

    if not introduce_txt_path or not portfolio_txt_path:
        return {"session_id": session_id, "errors": ["Missing txt file paths"], "status": "error"}

    session_manager.update_session(session_id, status=SessionStatus.GENERATING_QUESTIONS)

    try:
        # Read both txt files
        introduce_txt = Path(introduce_txt_path).read_text(encoding="utf-8")
        portfolio_txt = Path(portfolio_txt_path).read_text(encoding="utf-8")

        with httpx.Client() as client:
            response = client.post(
                f"{QUESTION_GEN_URL}/generate",
                json={
                    "introduce_text": introduce_txt,
                    "portfolio_text": portfolio_txt,
                },
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
        return {"session_id": session_id, "errors": [f"Question generation failed: {str(e)}"], "status": "error"}


def wait_for_upload_node(state: WorkflowState) -> WorkflowState:
    """Mark session as waiting for file upload and initialize analysis fields."""
    session_id = state["session_id"]

    session_manager.update_session(session_id, status=SessionStatus.WAITING_FOR_UPLOAD)

    # Auto-populate with default file paths if not provided
    video_paths = state.get("video_paths", [])
    audio_paths = state.get("audio_paths", [])

    if not video_paths or len(video_paths) == 0:
        video_paths = [
            "/app/uploads/interview_1.mp4",
            "/app/uploads/interview_2.mp4",
            "/app/uploads/interview_3.mp4"
        ]

    if not audio_paths or len(audio_paths) == 0:
        audio_paths = [
            "/app/uploads/interview_1.wav",
            "/app/uploads/interview_2.wav",
            "/app/uploads/interview_3.wav"
        ]

    return {
        "session_id": session_id,
        "status": "waiting_for_upload",
        "video_paths": video_paths,
        "audio_paths": audio_paths,
        "face_results": [],
        "voice_results": [],
        "face_analysis_complete_count": 0,
        "voice_analysis_complete_count": 0,
    }


def _create_face_analysis_node(index: int):
    """Factory function to create face analysis node for question index (0, 1, or 2)."""

    def face_analysis_node(state: WorkflowState) -> WorkflowState:
        """Analyze facial expressions for one video file."""
        session_id = state["session_id"]
        session = session_manager.get_session(session_id)

        # Get video_paths from state or session
        video_paths = state.get("video_paths", []) or (session.video_paths if session else [])

        # Check if we have a video for this index
        if index >= len(video_paths) or not video_paths[index]:
            skip_payload = {
                "status": "skipped",
                "reason": f"No video uploaded for question {index + 1}",
                "question_index": index,
            }
            # Store result in the list
            face_results = state.get("face_results", [])
            while len(face_results) <= index:
                face_results.append({})
            face_results[index] = skip_payload

            return {
                "face_results": face_results,
                "face_analysis_complete_count": state.get("face_analysis_complete_count", 0) + 1,
            }

        video_path = video_paths[index]
        session_manager.update_session(session_id, status=SessionStatus.ANALYZING_FACE)

        # Set output CSV path with numbered filename
        output_csv = f"/app/outputs/Face_{index + 1}.csv"

        try:
            max_attempts = 2
            data = None
            last_error: Optional[str] = None

            for attempt in range(1, max_attempts + 1):
                # 1차: auto, 2차: 강제 CPU로 재시도 (모델 초기 로드 실패/무감지 대응)
                device = "auto" if attempt == 1 else "cpu"
                try:
                    with httpx.Client() as client:
                        response = client.post(
                            f"{FACE_ANALYSIS_URL}/analyze",
                            json={
                                "video_path": video_path,
                                "output_csv": output_csv,
                                "step_seconds": 1.0,
                                "device": device,
                            },
                            timeout=300.0,
                        )
                        response.raise_for_status()
                        data = response.json()
                        data["question_index"] = index
                        data["attempt"] = attempt

                    summary = data.get("summary", {}) or {}
                    frames_with_faces = summary.get("frames_with_faces", 0)

                    # 성공 조건: 얼굴 검출이 1프레임 이상 있을 때
                    if frames_with_faces and frames_with_faces > 0:
                        last_error = None
                        break

                    last_error = (
                        f"No faces detected (attempt {attempt}, device={device})"
                    )
                except Exception as e:
                    last_error = str(e)

                # 재시도 가능하면 이어서 계속
                if attempt < max_attempts:
                    continue

            if data is None or last_error is not None:
                raise RuntimeError(last_error or "Face analysis failed")

            # Store result in the list
            face_results = state.get("face_results", [])
            while len(face_results) <= index:
                face_results.append({})
            face_results[index] = data

            # Update session with accumulated results
            session_manager.update_session(
                session_id,
                status=SessionStatus.FACE_ANALYZED,
                face_analysis_results=face_results,
            )

            return {
                "face_results": face_results,
                "face_analysis_complete_count": state.get("face_analysis_complete_count", 0) + 1,
            }
        except httpx.HTTPStatusError as e:
            detail = None
            try:
                detail = e.response.json()
            except Exception:
                detail = e.response.text
            error_payload = {
                "status": "error",
                "error": str(e),
                "detail": detail,
                "question_index": index,
                "attempts": 2,
            }
            face_results = state.get("face_results", [])
            while len(face_results) <= index:
                face_results.append({})
            face_results[index] = error_payload

            return {
                "face_results": face_results,
                "face_analysis_complete_count": state.get("face_analysis_complete_count", 0) + 1,
                "errors": [f"Face analysis {index + 1} failed: {str(e)}"],
            }
        except Exception as e:
            error_payload = {
                "status": "error",
                "error": str(e),
                "attempts": 2,
                "question_index": index,
            }
            face_results = state.get("face_results", [])
            while len(face_results) <= index:
                face_results.append({})
            face_results[index] = error_payload

            return {
                "face_results": face_results,
                "face_analysis_complete_count": state.get("face_analysis_complete_count", 0) + 1,
                "errors": [f"Face analysis {index + 1} failed: {str(e)}"],
            }

    return face_analysis_node


def _create_voice_analysis_node(index: int):
    """Factory function to create voice analysis node for question index (0, 1, or 2)."""

    def voice_analysis_node(state: WorkflowState) -> WorkflowState:
        """Analyze voice emotions for one audio file."""
        session_id = state["session_id"]
        session = session_manager.get_session(session_id)

        # Get audio_paths from state or session
        audio_paths = state.get("audio_paths", []) or (session.audio_paths if session else [])

        # Check if we have an audio for this index
        if index >= len(audio_paths) or not audio_paths[index]:
            skip_payload = {
                "status": "skipped",
                "reason": f"No audio uploaded for question {index + 1}",
                "question_index": index,
            }
            # Store result in the list
            voice_results = state.get("voice_results", [])
            while len(voice_results) <= index:
                voice_results.append({})
            voice_results[index] = skip_payload

            return {
                "voice_results": voice_results,
                "voice_analysis_complete_count": state.get("voice_analysis_complete_count", 0) + 1,
            }

        audio_path = audio_paths[index]
        session_manager.update_session(session_id, status=SessionStatus.ANALYZING_VOICE)

        # Set output TXT path with numbered filename
        output_txt = f"/app/outputs/Voice_{index + 1}.txt"

        try:
            with httpx.Client() as client:
                response = client.post(
                    f"{VOICE_ANALYSIS_URL}/analyze",
                    json={
                        "audio_path": audio_path,
                        "output_txt": output_txt
                    },
                    timeout=300.0,
                )
                response.raise_for_status()
                data = response.json()
                data["question_index"] = index

            # Store result in the list
            voice_results = state.get("voice_results", [])
            while len(voice_results) <= index:
                voice_results.append({})
            voice_results[index] = data

            # Update session with accumulated results
            session_manager.update_session(
                session_id,
                status=SessionStatus.VOICE_ANALYZED,
                voice_analysis_results=voice_results,
            )

            return {
                "voice_results": voice_results,
                "voice_analysis_complete_count": state.get("voice_analysis_complete_count", 0) + 1,
            }
        except Exception as e:
            error_payload = {
                "status": "error",
                "error": str(e),
                "question_index": index,
            }
            voice_results = state.get("voice_results", [])
            while len(voice_results) <= index:
                voice_results.append({})
            voice_results[index] = error_payload

            return {
                "voice_results": voice_results,
                "voice_analysis_complete_count": state.get("voice_analysis_complete_count", 0) + 1,
                "errors": [f"Voice analysis {index + 1} failed: {str(e)}"],
            }

    return voice_analysis_node


def attitude_evaluation_node(state: WorkflowState) -> WorkflowState:
    """
    Agent 1: Evaluate interview attitude based on facial expressions from Face_1.csv, Face_2.csv, Face_3.csv.
    Positive emotions: happiness, surprise, neutral
    Negative emotions: anger, disgust, fear, sadness
    """
    session_id = state["session_id"]
    output_dir = BASE_DIR / "outputs"

    print(f"[ATTITUDE EVAL] Starting attitude evaluation for session {session_id}")
    print(f"[ATTITUDE EVAL] Looking for Face CSV files in: {output_dir}")

    try:
        # Read the 3 Face CSV files
        face_data = []
        for i in range(1, 4):
            csv_path = output_dir / f"Face_{i}.csv"
            if not csv_path.exists():
                return {
                    "attitude_evaluation": {
                        "status": "error",
                        "error": f"Face_{i}.csv not found"
                    },
                    "errors": [f"Face_{i}.csv not found"]
                }
            df = pd.read_csv(csv_path)
            face_data.append(df)

        # Define emotion categories
        positive_emotions = ['happiness', 'surprise', 'neutral']
        negative_emotions = ['anger', 'disgust', 'fear', 'sadness']
        all_emotions = positive_emotions + negative_emotions

        # === STEP 1: Calculate average for each emotion in each Face CSV ===
        individual_evaluations = []
        emotion_averages_per_file = []  # Store for overall calculation

        for i, df in enumerate(face_data, 1):
            # Calculate average for each of the 7 emotions
            emotion_avgs = {}
            for emotion in all_emotions:
                col_name = f'emotion_{emotion}'
                if col_name in df.columns:
                    emotion_avgs[emotion] = float(df[col_name].mean())
                else:
                    emotion_avgs[emotion] = 0.0

            emotion_averages_per_file.append(emotion_avgs)

            # Calculate positive and negative sums for this file
            positive_sum = sum(emotion_avgs[e] for e in positive_emotions)
            negative_sum = sum(emotion_avgs[e] for e in negative_emotions)

            individual_evaluations.append({
                "question": i,
                "emotion_averages": emotion_avgs,
                "positive_sum": float(positive_sum),
                "negative_sum": float(negative_sum),
                "total_frames": len(df),
                "faces_detected": int(df['faces_detected'].sum())
            })

        # === STEP 2: Calculate overall average across all 3 Face CSVs ===
        overall_emotion_averages = {}
        for emotion in all_emotions:
            # Average of averages across 3 files
            avg_across_files = sum(file_avg[emotion] for file_avg in emotion_averages_per_file) / 3
            overall_emotion_averages[emotion] = float(avg_across_files)

        # === STEP 3: Calculate overall positive and negative sums ===
        overall_positive_sum = sum(overall_emotion_averages[e] for e in positive_emotions)
        overall_negative_sum = sum(overall_emotion_averages[e] for e in negative_emotions)
        overall_total = overall_positive_sum + overall_negative_sum

        # === STEP 4: Convert to 100-point scale ===
        if overall_total > 0:
            positive_score_100 = (overall_positive_sum / overall_total) * 100
            negative_score_100 = (overall_negative_sum / overall_total) * 100
        else:
            positive_score_100 = 0.0
            negative_score_100 = 0.0

        # Create objective score summary
        objective_scores = {
            "overall_emotion_averages": overall_emotion_averages,
            "positive_sum": float(overall_positive_sum),
            "negative_sum": float(overall_negative_sum),
            "total": float(overall_total),
            "positive_score_100": float(positive_score_100),
            "negative_score_100": float(negative_score_100)
        }

        # Prepare context for LLM with objective calculated scores
        context = f"""다음은 3개의 면접 질문에 대한 답변 동안의 얼굴 표정 분석 결과입니다.

**감정 점수 분류:**
- Positive 표정: happiness(행복), surprise(놀람), neutral(중립)
- Negative 표정: anger(분노), disgust(혐오), fear(두려움), sadness(슬픔)

**=== 개별 질문별 분석 ===**
"""
        for eval_data in individual_evaluations:
            context += f"""
질문 {eval_data['question']}:
  - Positive 합계: {eval_data['positive_sum']:.4f}
  - Negative 합계: {eval_data['negative_sum']:.4f}
  - 각 감정 평균:
"""
            for emotion, value in eval_data['emotion_averages'].items():
                context += f"    * {emotion}: {value:.4f}\n"
            context += f"  - 분석된 프레임 수: {eval_data['total_frames']}\n"
            context += f"  - 얼굴 감지 횟수: {eval_data['faces_detected']}\n"

        context += f"""

**=== 전체 통합 점수 (Face_1/2/3 종합) ===**
📊 **객관적 계산 결과:**

1. 전체 감정 평균 (3개 파일 평균):
"""
        for emotion, value in overall_emotion_averages.items():
            emotion_type = "✅ Positive" if emotion in positive_emotions else "❌ Negative"
            context += f"   - {emotion}: {value:.4f} ({emotion_type})\n"

        context += f"""
2. Positive 총합: {overall_positive_sum:.4f}
3. Negative 총합: {overall_negative_sum:.4f}
4. 전체 합계: {overall_total:.4f}

**🎯 100점 만점 환산 점수:**
- ✅ Positive 점수: {positive_score_100:.2f}점 / 100점
- ❌ Negative 점수: {negative_score_100:.2f}점 / 100점

---

위 **객관적으로 계산된 점수**를 바탕으로 면접자의 전체적인 태도를 평가해주세요:
- 3개 질문 전체를 종합하여 평가
- Positive {positive_score_100:.1f}% vs Negative {negative_score_100:.1f}% 비율 해석
- 면접 태도에 대한 종합 의견 (3-5문장)
- 개선이 필요한 부분이 있다면 구체적으로 제시
"""

        # Call OpenAI for evaluation
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        evaluation_text = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 면접 평가 전문가입니다. 얼굴 표정 데이터를 분석하여 면접자의 태도를 객관적으로 평가합니다."},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
        )

        result = {
            "status": "completed",
            "individual_evaluations": individual_evaluations,
            "objective_scores": objective_scores,
            "overall_evaluation": evaluation_text,
        }

        # Save detailed individual data as CSV
        import csv
        csv_path = output_dir / "Evaluation_Attitude.csv"
        with csv_path.open('w', newline='', encoding='utf-8') as f:
            fieldnames = ['question', 'positive_sum', 'negative_sum', 'total_frames', 'faces_detected'] + \
                         [f'emotion_{e}' for e in all_emotions]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for eval_data in individual_evaluations:
                row = {
                    'question': eval_data['question'],
                    'positive_sum': eval_data['positive_sum'],
                    'negative_sum': eval_data['negative_sum'],
                    'total_frames': eval_data['total_frames'],
                    'faces_detected': eval_data['faces_detected']
                }
                for emotion in all_emotions:
                    row[f'emotion_{emotion}'] = eval_data['emotion_averages'][emotion]
                writer.writerow(row)

        # Save objective scores as separate CSV
        objective_csv_path = output_dir / "Evaluation_Attitude_Objective_Scores.csv"
        with objective_csv_path.open('w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Metric', 'Value'])
            writer.writerow(['Positive Score (100 scale)', f"{objective_scores['positive_score_100']:.2f}"])
            writer.writerow(['Negative Score (100 scale)', f"{objective_scores['negative_score_100']:.2f}"])
            writer.writerow(['Positive Sum (raw)', f"{objective_scores['positive_sum']:.4f}"])
            writer.writerow(['Negative Sum (raw)', f"{objective_scores['negative_sum']:.4f}"])
            writer.writerow(['Total', f"{objective_scores['total']:.4f}"])
            writer.writerow([])
            writer.writerow(['Emotion', 'Average Value', 'Type'])
            for emotion in all_emotions:
                emotion_type = 'Positive' if emotion in positive_emotions else 'Negative'
                writer.writerow([emotion, f"{objective_scores['overall_emotion_averages'][emotion]:.4f}", emotion_type])

        # Save comprehensive summary with scores
        summary_path = output_dir / "Evaluation_Attitude_Summary.txt"
        summary_content = f"""=== 면접 태도 평가 ===

📊 객관적 점수 (100점 만점):
- Positive: {objective_scores['positive_score_100']:.2f}점
- Negative: {objective_scores['negative_score_100']:.2f}점

전체 감정 평균:
"""
        for emotion in all_emotions:
            emotion_type = "Positive" if emotion in positive_emotions else "Negative"
            summary_content += f"  - {emotion}: {objective_scores['overall_emotion_averages'][emotion]:.4f} ({emotion_type})\n"

        summary_content += f"\n=== LLM 평가 ===\n\n{evaluation_text}\n"
        summary_path.write_text(summary_content, encoding="utf-8")

        return {
            "attitude_evaluation": result
        }

    except Exception as e:
        return {
            "attitude_evaluation": {
                "status": "error",
                "error": str(e)
            },
            "errors": [f"Attitude evaluation failed: {str(e)}"]
        }


def qa_relevance_evaluation_node(state: WorkflowState) -> WorkflowState:
    """
    Agent 2: Evaluate relevance between questions and answers.
    Maps: question_1 ↔ Voice_1, question_2 ↔ Voice_2, question_3 ↔ Voice_3
    """
    session_id = state["session_id"]
    output_dir = BASE_DIR / "outputs"

    print(f"[QA EVAL] Starting Q&A relevance evaluation for session {session_id}")
    print(f"[QA EVAL] Looking for question/voice files in: {output_dir}")

    try:
        # Read question and voice pairs
        qa_pairs = []
        for i in range(1, 4):
            question_path = output_dir / f"question_{i}.txt"
            voice_path = output_dir / f"Voice_{i}.txt"

            if not question_path.exists():
                return {
                    "qa_relevance_evaluation": {
                        "status": "error",
                        "error": f"question_{i}.txt not found"
                    },
                    "errors": [f"question_{i}.txt not found"]
                }

            if not voice_path.exists():
                return {
                    "qa_relevance_evaluation": {
                        "status": "error",
                        "error": f"Voice_{i}.txt not found"
                    },
                    "errors": [f"Voice_{i}.txt not found"]
                }

            question = question_path.read_text(encoding="utf-8").strip()
            answer = voice_path.read_text(encoding="utf-8").strip()

            qa_pairs.append({
                "question_number": i,
                "question": question,
                "answer": answer
            })

        # Prepare context for LLM
        context = """다음은 면접 질문과 면접자의 답변입니다. 각 질문-답변 쌍의 연관성을 평가해주세요.

"""
        for pair in qa_pairs:
            context += f"""
**질문 {pair['question_number']}:**
{pair['question']}

**답변 {pair['question_number']}:**
{pair['answer']}

---
"""

        context += """
각 질문-답변 쌍에 대해:
1. 답변이 질문과 연관성이 있는지 평가 (1-10점)
2. 답변의 완성도 평가 (구체성, 명확성)
3. 개선이 필요한 부분 제시

마지막으로 전체적인 답변 능력에 대한 종합 평가를 작성해주세요.
"""

        # Call OpenAI for evaluation
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        evaluation_text = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 면접 평가 전문가입니다. 질문과 답변의 연관성을 객관적으로 평가합니다."},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
        )

        result = {
            "status": "completed",
            "qa_pairs": qa_pairs,
            "evaluation": evaluation_text
        }

        # Save detailed data as CSV
        import csv
        csv_path = output_dir / "Evaluation_QA_Relevance.csv"
        with csv_path.open('w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['question_number', 'question', 'answer'])
            writer.writeheader()
            writer.writerows(qa_pairs)

        # Save summary evaluation as text
        summary_path = output_dir / "Evaluation_QA_Relevance_Summary.txt"
        summary_path.write_text(evaluation_text, encoding="utf-8")

        return {
            "qa_relevance_evaluation": result
        }

    except Exception as e:
        return {
            "qa_relevance_evaluation": {
                "status": "error",
                "error": str(e)
            },
            "errors": [f"Q&A relevance evaluation failed: {str(e)}"]
        }


def consistency_evaluation_node(state: WorkflowState) -> WorkflowState:
    """
    Agent 3: Evaluate consistency between introduce/portfolio and all voice answers.
    Checks for truthfulness and consistency across documents.
    """
    session_id = state["session_id"]
    output_dir = BASE_DIR / "outputs"

    print(f"[CONSISTENCY EVAL] Starting consistency evaluation for session {session_id}")
    print(f"[CONSISTENCY EVAL] Looking for introduce/portfolio/voice files in: {output_dir}")

    try:
        # Read introduce and portfolio
        introduce_path = output_dir / "introduce.txt"
        portfolio_path = output_dir / "portfolio.txt"

        if not introduce_path.exists():
            return {
                "consistency_evaluation": {
                    "status": "error",
                    "error": "introduce.txt not found"
                },
                "errors": ["introduce.txt not found"]
            }

        if not portfolio_path.exists():
            return {
                "consistency_evaluation": {
                    "status": "error",
                    "error": "portfolio.txt not found"
                },
                "errors": ["portfolio.txt not found"]
            }

        introduce = introduce_path.read_text(encoding="utf-8")
        portfolio = portfolio_path.read_text(encoding="utf-8")

        # Read all voice answers
        voice_answers = []
        for i in range(1, 4):
            voice_path = output_dir / f"Voice_{i}.txt"
            if not voice_path.exists():
                return {
                    "consistency_evaluation": {
                        "status": "error",
                        "error": f"Voice_{i}.txt not found"
                    },
                    "errors": [f"Voice_{i}.txt not found"]
                }
            answer = voice_path.read_text(encoding="utf-8").strip()
            voice_answers.append({
                "answer_number": i,
                "content": answer
            })

        # Prepare context for LLM
        context = f"""다음은 면접자의 자기소개서, 포트폴리오, 그리고 면접 답변입니다.

**자기소개서:**
{introduce}

**포트폴리오:**
{portfolio}

**면접 답변들:**
"""
        for voice in voice_answers:
            context += f"""
답변 {voice['answer_number']}: {voice['content']}
"""

        context += """

자기소개서/포트폴리오와 면접 답변들을 종합하여 다음을 평가해주세요:

1. **일관성 평가**: 면접 답변이 자기소개서 및 포트폴리오의 내용과 일치하는지?
2. **진실성 평가**: 답변에서 언급된 경험/기술이 문서에 기재된 내용과 부합하는지?
3. **거짓정보 여부**: 자기소개서/포트폴리오에 없는 과장되거나 거짓된 정보가 있는지?
4. **신뢰도**: 전체적인 답변의 신뢰도 평가 (1-10점)

종합적인 평가 의견을 작성해주세요.
"""

        # Call OpenAI for evaluation
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        evaluation_text = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 면접 평가 전문가입니다. 제출 문서와 면접 답변의 일관성을 객관적으로 평가합니다."},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
        )

        result = {
            "status": "completed",
            "voice_answers": voice_answers,
            "evaluation": evaluation_text
        }

        # Save detailed data as CSV
        import csv
        csv_path = output_dir / "Evaluation_Consistency.csv"
        with csv_path.open('w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['answer_number', 'content'])
            writer.writeheader()
            writer.writerows(voice_answers)

        # Save summary evaluation as text
        summary_path = output_dir / "Evaluation_Consistency_Summary.txt"
        summary_path.write_text(evaluation_text, encoding="utf-8")

        return {
            "consistency_evaluation": result
        }

    except Exception as e:
        return {
            "consistency_evaluation": {
                "status": "error",
                "error": str(e)
            },
            "errors": [f"Consistency evaluation failed: {str(e)}"]
        }


def portfolio_development_node(state: WorkflowState) -> WorkflowState:
    """Provide document feedback and suggest programs to strengthen the portfolio."""
    session_id = state["session_id"]
    output_dir = BASE_DIR / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"[PORTFOLIO_DEV] Starting document feedback agent for session {session_id}")

    def _read_first(paths: list[Path]) -> str:
        for path in paths:
            try:
                if path.exists():
                    return path.read_text(encoding="utf-8").strip()
            except Exception:
                continue
        return ""

    introduce_text = _read_first([Path("/app/outputs/introduce.txt"), output_dir / "introduce.txt"])
    portfolio_text = _read_first([Path("/app/outputs/portfolio.txt"), output_dir / "portfolio.txt"])
    voice_texts = []
    for i in range(1, 4):
        voice_texts.append(
            _read_first(
                [
                    Path(f"/app/outputs/Voice_{i}.txt"),
                    output_dir / f"Voice_{i}.txt",
                ]
            )
        )

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    context = f"""다음은 면접자의 자기소개서와 포트폴리오 원문입니다.

<자기소개서>
{introduce_text or "(내용을 찾을 수 없습니다.)"}

<포트폴리오>
{portfolio_text or "(내용을 찾을 수 없습니다.)"}

<면접 답변 요약>
1번 답변: {voice_texts[0] or "(없음)"}
2번 답변: {voice_texts[1] or "(없음)"}
3번 답변: {voice_texts[2] or "(없음)"}
"""

    prompt = f"""위 문서를 바탕으로 다음을 모두 포함한 Markdown 보고서를 작성하세요.

요구사항:
- 최신 정보를 웹서핑해 조사하듯이, 근거/추천 출처를 간단히 제시하세요.
- 검색이 필요한 경우, 실제로 쓸 법한 검색 키워드도 함께 적으세요.
- 실행 가능하고 구체적인 조언 위주로 작성하세요.
- 면접 답변에서 드러난 부족한 경험/역량을 캐치하고, 이를 보완할 구체적 활동/프로그램을 제안하세요.

보고서 형식(한국어 유지):
# 문서 피드백 및 성장 제안
## 1. 자기소개서 피드백
- 강점과 개선 포인트(각 3개 이상)
- 바로 반영할 수 있는 문장/구조 수정 제안

## 2. 포트폴리오 피드백
- 내용/구조/스토리텔링 관점에서의 개선 아이디어(각 3개 이상)
- 부족한 증빙 자료나 추가 산출물 제안

## 3. 경력 추가 프로그램 서칭결과
- 최근 1~2년 내 참여할 만한 프로그램/캠프/강의 5개 이상을 표로 제시
- 각 항목에 이름, 추천 이유(한 줄), 예상 검색 키워드, 공식 또는 대표 URL을 포함

## 4. 답변 기반 보완 활동 추천
- 면접 답변에서 부족해 보이는 경험/역량을 짧게 지적
- 이를 채울 수 있는 구체적 학습/프로젝트/봉사/동아리/인턴십 아이디어 5개 이상
- 각 아이디어에 예상 검색 키워드와 추천 이유를 1줄씩 적기
"""

    try:
        report_markdown = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 커리어 코치이자 리서치 에이전트입니다. 문서를 분석하고 웹서핑을 하듯 최신 프로그램과 활동을 찾아 제안합니다.",
                },
                {"role": "user", "content": context + "\n\n" + prompt},
            ],
            temperature=0.6,
        )

        report_path = output_dir / "Portfolio_Development_Report.md"
        report_path.write_text(report_markdown, encoding="utf-8")

        print(f"[PORTFOLIO_DEV] Report saved to: {report_path}")

        return {
            "portfolio_development_report": {
                "status": "completed",
                "report_path": str(report_path),
                "report": report_markdown,
            },
            "portfolio_development_report_path": str(report_path),
        }
    except Exception as e:
        print(f"[PORTFOLIO_DEV] Error: {str(e)}")
        return {
            "portfolio_development_report": {
                "status": "error",
                "error": str(e),
            },
            "errors": [f"Portfolio development report failed: {str(e)}"],
        }


def insight_dashboard_node(state: WorkflowState) -> WorkflowState:
    """Combine Markdown reports into a single interactive HTML dashboard."""
    session_id = state["session_id"]
    output_dir = BASE_DIR / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"[INSIGHT_DASH] Building HTML dashboard for session {session_id}")

    debate_path = output_dir / "Debate_Final_Report.md"
    portfolio_report_path = output_dir / "Portfolio_Development_Report.md"

    if not debate_path.exists():
        return {
            "errors": ["Debate_Final_Report.md not found"],
            "insight_dashboard_path": None,
        }

    if not portfolio_report_path.exists():
        return {
            "errors": ["Portfolio_Development_Report.md not found"],
            "insight_dashboard_path": None,
        }

    debate_md = debate_path.read_text(encoding="utf-8")
    portfolio_md = portfolio_report_path.read_text(encoding="utf-8")

    import json

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    prompt = f"""당신은 프론트엔드 디자이너 겸 리포트 요약가입니다. 아래 두 개의 Markdown 보고서를 읽고,
1) 단일 페이지, 단일 컬럼, 노션 스타일의 토글(details/summary) UI로
2) 압축 요약(과도한 본문 복붙 금지)과
3) 추천 링크/액션을 함께 담은
HTML을 작성하세요.

색상 팔레트는 반드시 사용:
- 배경/패널: #F5F5F5, 하이라이트 배경: #0A193D, 포인트 텍스트: #0A091A

디자인 요구:
- 화면 분할 금지(좌우 컬럼 X), 위에서 아래로 노션처럼 토글/섹션이 순서대로 내려오게.
- 토글 3개 이상 포함: (1) Debate 최종 요약, (2) 포트폴리오/답변 통합 요약, (3) 추천 링크, (4) 빠른 액션 등.
- 각 토글 내용은 압축 요약만 보여주고, 원문 링크를 함께 제공.
- 링크는 보고서에 등장한 URL들을 추출해 pill/button 형태로 나열. 중복 제거, 최대 10개.
- 액션 아이템은 bullet 6~8개로 압축.
- 가독성 높은 폰트(Inter, Pretendard 우선), 라운드 카드, subtle shadow.
- JS는 최소화: 토글은 기본 details/summary 사용. 추가 파서는 필요 없지만, 주어진 Markdown을 5~8문장/불릿 수준으로 요약하여 토글 본문에 넣어라.
- 반드시 <!DOCTYPE html>부터 시작하는 완전한 HTML을 반환.

자료:
--- Debate Report ---
{debate_md[:8000]}

--- Portfolio/Development Report (문서+답변 통합) ---
{portfolio_md[:8000]}
"""

    html = get_text_response(
        client,
        model="gpt-5.1",
        messages=[
            {
                "role": "system",
                "content": "당신은 노션 느낌의 단일 컬럼 HTML 대시보드를 만드는 프론트엔드 디자이너입니다. 토글과 컴팩트 요약, 링크/액션을 깔끔하게 배치하세요.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
    )

    # Fallback: ensure basic HTML wrapper exists
    if "<html" not in html.lower():
        html = f"""<!DOCTYPE html><html><body><pre>{json.dumps(html)}</pre></body></html>"""

    html_path = output_dir / "Insight_Dashboard.html"
    html_path.write_text(html, encoding="utf-8")

    print(f"[INSIGHT_DASH] HTML dashboard saved to: {html_path}")

    return {
        "insight_dashboard_path": str(html_path),
    }


def debate_node(state: WorkflowState) -> WorkflowState:
    """
    Multi-Agent Debate: 3 evaluation agents debate to reach final consensus.
    - Attitude Agent
    - QA Relevance Agent
    - Consistency Agent
    """
    session_id = state["session_id"]
    output_dir = BASE_DIR / "outputs"

    print(f"[DEBATE] Starting multi-agent debate for session {session_id}")

    try:
        # Read the 3 evaluation summaries
        attitude_summary_path = output_dir / "Evaluation_Attitude_Summary.txt"
        qa_summary_path = output_dir / "Evaluation_QA_Relevance_Summary.txt"
        consistency_summary_path = output_dir / "Evaluation_Consistency_Summary.txt"

        if not all([attitude_summary_path.exists(), qa_summary_path.exists(), consistency_summary_path.exists()]):
            return {
                "errors": ["Not all evaluation summaries are available for debate"],
                "status": "debate_error"
            }

        attitude_eval = attitude_summary_path.read_text(encoding="utf-8")
        qa_eval = qa_summary_path.read_text(encoding="utf-8")
        consistency_eval = consistency_summary_path.read_text(encoding="utf-8")

        # Initialize debate log
        debate_log = []
        debate_log.append("=" * 80)
        debate_log.append("MULTI-AGENT DEBATE: INTERVIEW EVALUATION")
        debate_log.append("=" * 80)
        debate_log.append(f"Session ID: {session_id}")
        debate_log.append(f"Date: {os.popen('date').read().strip()}")
        debate_log.append("=" * 80)
        debate_log.append("")

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Round 1: Initial Presentations
        debate_log.append("=" * 80)
        debate_log.append("ROUND 1: INITIAL EVALUATIONS")
        debate_log.append("=" * 80)
        debate_log.append("")

        debate_log.append("[Attitude Agent]")
        debate_log.append(attitude_eval)
        debate_log.append("")

        debate_log.append("[QA Relevance Agent]")
        debate_log.append(qa_eval)
        debate_log.append("")

        debate_log.append("[Consistency Agent]")
        debate_log.append(consistency_eval)
        debate_log.append("")

        # Round 2: Cross-Examination
        debate_log.append("=" * 80)
        debate_log.append("ROUND 2: CROSS-EXAMINATION")
        debate_log.append("=" * 80)
        debate_log.append("")

        # Attitude Agent examines QA Relevance
        attitude_to_qa = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 면접 태도 평가 전문가입니다. 질문-답변 연관성 평가를 검토하고 의견을 제시하세요."},
                {"role": "user", "content": f"다음은 질문-답변 연관성 평가입니다:\n\n{qa_eval}\n\n면접 태도 관점에서 이 평가에 대한 의견을 2-3문장으로 제시하세요."},
            ],
            temperature=0.7,
        )
        debate_log.append("[Attitude Agent → QA Relevance Agent]")
        debate_log.append(attitude_to_qa)
        debate_log.append("")

        # QA Relevance Agent examines Consistency
        qa_to_consistency = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 질문-답변 연관성 평가 전문가입니다. 일관성 평가를 검토하고 의견을 제시하세요."},
                {"role": "user", "content": f"다음은 일관성 평가입니다:\n\n{consistency_eval}\n\n질문-답변 연관성 관점에서 이 평가에 대한 의견을 2-3문장으로 제시하세요."},
            ],
            temperature=0.7,
        )
        debate_log.append("[QA Relevance Agent → Consistency Agent]")
        debate_log.append(qa_to_consistency)
        debate_log.append("")

        # Consistency Agent examines Attitude
        consistency_to_attitude = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 일관성 평가 전문가입니다. 면접 태도 평가를 검토하고 의견을 제시하세요."},
                {"role": "user", "content": f"다음은 면접 태도 평가입니다:\n\n{attitude_eval}\n\n일관성 관점에서 이 평가에 대한 의견을 2-3문장으로 제시하세요."},
            ],
            temperature=0.7,
        )
        debate_log.append("[Consistency Agent → Attitude Agent]")
        debate_log.append(consistency_to_attitude)
        debate_log.append("")

        # Round 3: Rebuttals
        debate_log.append("=" * 80)
        debate_log.append("ROUND 3: REBUTTALS & ADDITIONAL INSIGHTS")
        debate_log.append("=" * 80)
        debate_log.append("")

        # Attitude Agent's rebuttal
        attitude_rebuttal = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 면접 태도 평가 전문가입니다."},
                {"role": "user", "content": f"Consistency Agent가 다음과 같이 의견을 제시했습니다:\n\n{consistency_to_attitude}\n\n이에 대한 당신의 반박 또는 추가 의견을 2-3문장으로 제시하세요."},
            ],
            temperature=0.7,
        )
        debate_log.append("[Attitude Agent - Rebuttal]")
        debate_log.append(attitude_rebuttal)
        debate_log.append("")

        # QA Agent's rebuttal
        qa_rebuttal = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 질문-답변 연관성 평가 전문가입니다."},
                {"role": "user", "content": f"Attitude Agent가 다음과 같이 의견을 제시했습니다:\n\n{attitude_to_qa}\n\n이에 대한 당신의 반박 또는 추가 의견을 2-3문장으로 제시하세요."},
            ],
            temperature=0.7,
        )
        debate_log.append("[QA Relevance Agent - Rebuttal]")
        debate_log.append(qa_rebuttal)
        debate_log.append("")

        # Consistency Agent's rebuttal
        consistency_rebuttal = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 일관성 평가 전문가입니다."},
                {"role": "user", "content": f"QA Relevance Agent가 다음과 같이 의견을 제시했습니다:\n\n{qa_to_consistency}\n\n이에 대한 당신의 반박 또는 추가 의견을 2-3문장으로 제시하세요."},
            ],
            temperature=0.7,
        )
        debate_log.append("[Consistency Agent - Rebuttal]")
        debate_log.append(consistency_rebuttal)
        debate_log.append("")

        # Final Round: Consensus Building
        debate_log.append("=" * 80)
        debate_log.append("FINAL ROUND: CONSENSUS BUILDING")
        debate_log.append("=" * 80)
        debate_log.append("")

        # Synthesize all perspectives
        synthesis_prompt = f"""다음은 3명의 면접 평가 전문가들의 토론 내용입니다:

**면접 태도 평가:**
{attitude_eval}

**질문-답변 연관성 평가:**
{qa_eval}

**일관성 평가:**
{consistency_eval}

**Cross-Examination:**
- Attitude → QA: {attitude_to_qa}
- QA → Consistency: {qa_to_consistency}
- Consistency → Attitude: {consistency_to_attitude}

**Rebuttals:**
- Attitude: {attitude_rebuttal}
- QA: {qa_rebuttal}
- Consistency: {consistency_rebuttal}

위 3명의 전문가 의견을 종합하여 Markdown 형식으로 총평을 작성하세요.

다음 형식을 **정확히** 따라주세요:

# 면접 종합 평가 보고서

## ✅ Good (장점)
1. [구체적인 장점 1]
2. [구체적인 장점 2]
3. [구체적인 장점 3]
4. [구체적인 장점 4]
5. [구체적인 장점 5]

## ❌ Bad (단점)
1. [구체적인 단점 1]
2. [구체적인 단점 2]
3. [구체적인 단점 3]
4. [구체적인 단점 4]
5. [구체적인 단점 5]

## 📈 Development (발전시켜야할 점)
1. [구체적인 개선점 1]
2. [구체적인 개선점 2]
3. [구체적인 개선점 3]
4. [구체적인 개선점 4]
5. [구체적인 개선점 5]

---

## 최종 채용 권고
- **권고 사항**: [적극 추천 / 추천 / 보류 / 비추천 중 선택]
- **종합 점수**: [X/100점]

**중요**: 각 섹션은 정확히 5개 항목이어야 하며, 구체적이고 실질적인 내용이어야 합니다.
"""

        final_consensus = get_text_response(
            client,
            model="gpt-5.1",
            messages=[
                {"role": "system", "content": "당신은 면접 평가 종합 중재자입니다. 여러 전문가의 의견을 균형있게 종합하여 Markdown 형식으로 작성합니다."},
                {"role": "user", "content": synthesis_prompt},
            ],
            temperature=0.5,
        )

        debate_log.append("[FINAL CONSENSUS]")
        debate_log.append(final_consensus)
        debate_log.append("")
        debate_log.append("=" * 80)
        debate_log.append("END OF DEBATE")
        debate_log.append("=" * 80)

        # Save debate log
        debate_log_path = output_dir / "Debate_Log.txt"
        debate_log_path.write_text("\n".join(debate_log), encoding="utf-8")

        # Save final report separately as Markdown
        final_report_path = output_dir / "Debate_Final_Report.md"
        final_report_path.write_text(final_consensus, encoding="utf-8")

        print(f"[DEBATE] Debate completed successfully!")
        print(f"[DEBATE] Log saved to: {debate_log_path}")
        print(f"[DEBATE] Final report saved to: {final_report_path}")

        return {
            "debate_log_path": str(debate_log_path),
            "final_report_path": str(final_report_path)
        }

    except Exception as e:
        print(f"[DEBATE] Error: {str(e)}")
        return {
            "errors": [f"Debate failed: {str(e)}"]
        }


def complete_node(state: WorkflowState) -> WorkflowState:
    """Mark workflow as completed."""
    session_id = state["session_id"]

    # Session may not exist in long-running workers after reload; avoid hard failure.
    try:
        session_manager.update_session(session_id, status=SessionStatus.COMPLETED)
    except ValueError:
        print(f"[COMPLETE] Session not found for update: {session_id} (skipping)")

    return {
        "session_id": session_id,
        "status": "completed",
    }


def check_analyses_complete_node(state: WorkflowState) -> WorkflowState:
    """Check if all 6 analyses are complete and ready for evaluations."""
    face_count = state.get("face_analysis_complete_count", 0)
    voice_count = state.get("voice_analysis_complete_count", 0)

    print(f"[CHECK] Analysis completion - face: {face_count}/3, voice: {voice_count}/3")

    if face_count >= 3 and voice_count >= 3:
        print(f"[CHECK] All 6 analyses complete! Ready for evaluations")
        return {
            "status": "analyses_complete"
        }
    else:
        print(f"[CHECK] Waiting for more analyses...")
        return {
            "status": "analyses_in_progress"
        }


def check_evaluations_complete_node(state: WorkflowState) -> WorkflowState:
    """Check if all 3 evaluations are complete and ready for debate."""
    print(f"[CHECK] All evaluations complete! Ready for debate")
    return {
        "status": "evaluations_complete"
    }


def build_workflow() -> StateGraph:
    """Build the interview analysis workflow graph with 3 parallel analyses per type + multi-agent evaluations."""
    graph = StateGraph(WorkflowState)

    # Add nodes
    graph.add_node("pdf_extract", pdf_extract_node)
    graph.add_node("question_generate", question_generate_node)
    graph.add_node("wait_for_upload", wait_for_upload_node)

    # Add 3 face analysis nodes (one per question)
    for i in range(3):
        graph.add_node(f"face_analysis_{i+1}", _create_face_analysis_node(i))

    # Add 3 voice analysis nodes (one per question)
    for i in range(3):
        graph.add_node(f"voice_analysis_{i+1}", _create_voice_analysis_node(i))

    # Add check node to verify all analyses are complete
    graph.add_node("check_analyses_complete", check_analyses_complete_node)

    # Add document feedback agent (runs alongside evaluations, no debate)
    graph.add_node("portfolio_development", portfolio_development_node)

    # Add 3 multi-agent evaluation nodes
    graph.add_node("attitude_evaluation", attitude_evaluation_node)
    graph.add_node("qa_relevance_evaluation", qa_relevance_evaluation_node)
    graph.add_node("consistency_evaluation", consistency_evaluation_node)

    # Add check node to verify all evaluations are complete
    graph.add_node("check_evaluations_complete", check_evaluations_complete_node)

    # Add debate node where 3 agents debate
    graph.add_node("debate", debate_node)

    # Add dashboard builder to merge reports into HTML
    graph.add_node("insight_dashboard", insight_dashboard_node)

    graph.add_node("complete", complete_node)

    # Set entry point
    graph.set_entry_point("pdf_extract")

    # Add edges - branch after upload for parallel media analysis
    graph.add_edge("pdf_extract", "question_generate")
    graph.add_edge("question_generate", "wait_for_upload")

    # From wait_for_upload, spawn all 6 analyses in parallel
    for i in range(3):
        graph.add_edge("wait_for_upload", f"face_analysis_{i+1}")
        graph.add_edge("wait_for_upload", f"voice_analysis_{i+1}")

    # All 6 analyses converge to check_analyses_complete node
    for i in range(3):
        graph.add_edge(f"face_analysis_{i+1}", "check_analyses_complete")
        graph.add_edge(f"voice_analysis_{i+1}", "check_analyses_complete")

    # From check node, go to attitude evaluation (which will trigger the others)
    graph.add_edge("check_analyses_complete", "portfolio_development")
    graph.add_edge("check_analyses_complete", "attitude_evaluation")

    # After attitude evaluation, trigger the other 2 evaluations in parallel
    graph.add_edge("attitude_evaluation", "qa_relevance_evaluation")
    graph.add_edge("attitude_evaluation", "consistency_evaluation")

    # Both qa_relevance and consistency go to check_evaluations_complete
    graph.add_edge("qa_relevance_evaluation", "check_evaluations_complete")
    graph.add_edge("consistency_evaluation", "check_evaluations_complete")

    # After all evaluations are complete, go to debate
    graph.add_edge("check_evaluations_complete", "debate")

    # Build HTML dashboard when both debate and portfolio development are done, then complete
    graph.add_edge("debate", "insight_dashboard")
    graph.add_edge("portfolio_development", "insight_dashboard")
    graph.add_edge("insight_dashboard", "complete")
    graph.add_edge("complete", END)

    return graph


# Compile workflow with interrupt for human-in-the-loop
# Workflow will PAUSE after wait_for_upload before starting analyses
# Note: LangGraph API handles persistence automatically
# Only interrupt once - parallel nodes will all execute after resume
workflow = build_workflow().compile(interrupt_after=["wait_for_upload"])


def run_workflow(session_id: str, pdf_path: str) -> Dict[str, Any]:
    """Run the workflow for a session."""
    initial_state: WorkflowState = {
        "session_id": session_id,
        "pdf_path": pdf_path,
        "status": "created",
    }

    # Create config with thread_id for checkpointing
    config = {"configurable": {"thread_id": session_id}}

    result = workflow.invoke(initial_state, config=config)

    # Print LangSmith trace URL
    project_name = os.getenv("LANGCHAIN_PROJECT", "default")
    print(f"\n{'='*60}")
    print(f"🔗 LangSmith Trace:")
    print(f"   https://smith.langchain.com/public/{project_name}/r/{session_id}")
    print(f"{'='*60}\n")

    return result


def continue_workflow(session_id: str, updates: Dict[str, Any] = None) -> Dict[str, Any]:
    """Continue the workflow after interrupt (e.g., after file upload)."""
    config = {"configurable": {"thread_id": session_id}}

    # If we have updates (like video_path, audio_path), apply them
    if updates:
        workflow.update_state(config, updates, as_node="wait_for_upload")

    # Continue execution from where it was interrupted
    # Pass empty dict instead of None to avoid "Received no input" error
    result = workflow.invoke({}, config=config)

    # Print LangSmith trace URL
    project_name = os.getenv("LANGCHAIN_PROJECT", "default")
    print(f"\n{'='*60}")
    print(f"🔗 LangSmith Trace (Continued):")
    print(f"   https://smith.langchain.com/public/{project_name}/r/{session_id}")
    print(f"{'='*60}\n")

    return result
