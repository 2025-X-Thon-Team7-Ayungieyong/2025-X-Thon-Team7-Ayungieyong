from __future__ import annotations

import argparse
import math
import tempfile
import threading
from pathlib import Path
from typing import List, Optional, Sequence, Tuple, Union

import cv2
import pandas as pd
import torch
from PIL import Image
from feat import Detector

# Cache detectors per device to avoid repeated model loads and reduce contention.
_DETECTORS: dict[str, Detector] = {}
_DETECTOR_LOCK = threading.Lock()
# Serialize detector inference to avoid race conditions inside py-feat/torch.
_INFERENCE_LOCK = threading.Lock()


def analyze_video(
    video_path: Union[str, Path],
    output_csv: Optional[Union[str, Path]] = None,
    step_seconds: float = 1.0,
    device: str = "auto",
) -> pd.DataFrame:
    """
    Analyze facial expressions in a video at fixed intervals.

    Args:
        video_path: Path to the video file.
        output_csv: Optional path to save results as CSV.
        step_seconds: Sampling interval in seconds.
        device: "cpu", "cuda", or "auto" for py-feat detector.

    Returns:
        Pandas DataFrame with per-face detections per sampled second.
    """
    video_path = Path(video_path)
    if not video_path.is_file():
        raise FileNotFoundError(f"Video not found: {video_path}")

    # Set default output path if not specified
    if output_csv is None:
        output_csv = Path("/app/outputs/Face_Text.csv")
    else:
        output_csv = Path(output_csv)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if not fps or fps <= 0:
        cap.release()
        raise ValueError(f"Invalid FPS ({fps}) for video: {video_path}")
    if frame_count <= 0:
        cap.release()
        raise ValueError(f"No frames found in video: {video_path}")
    duration_seconds = frame_count / fps

    resolved_device = _resolve_device(device)
    detector = _get_detector(resolved_device)
    rows: List[dict] = []
    sample_plan = _build_sample_plan(fps=fps, frame_count=frame_count, step_seconds=step_seconds)

    try:
        for timestamp_sec, frame_idx in sample_plan:
            frame = _read_frame(cap, frame_idx)
            if frame is None:
                continue
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb)

            # Create temp file and get path
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                tmp_path = tmp.name

            # Save image after closing the file handle
            try:
                pil_image.save(tmp_path)
                try:
                    with _INFERENCE_LOCK:
                        # Disable gradient computation for inference to avoid "requires_grad" errors
                        with torch.no_grad():
                            # Use batch_size=1 to avoid shape/broadcast errors in py-feat.
                            fex = detector.detect_image(tmp_path, batch_size=1)
                except Exception as detect_exc:
                    # Skip frame on detector failure but keep processing others.
                    print(f"Detector failed at t={timestamp_sec}s frame={frame_idx}: {detect_exc}")
                    fex = None
            finally:
                Path(tmp_path).unlink(missing_ok=True)

            if fex is None or len(fex) == 0:
                rows.append(
                    {
                        "timestamp_sec": timestamp_sec,
                        "frame_index": frame_idx,
                        "faces_detected": 0,
                        "dominant_emotion": None,
                    }
                )
                continue

            df = fex.copy() if hasattr(fex, 'copy') else fex

            # Drop rows with no actual face detection (py-feat can return NaN-only rows).
            face_cols = ["FaceRectX", "FaceRectY", "FaceRectWidth", "FaceRectHeight"]
            if all(col in df.columns for col in face_cols):
                df = df.dropna(subset=face_cols, how="any")
            if df is None or len(df) == 0:
                rows.append(
                    {
                        "timestamp_sec": timestamp_sec,
                        "frame_index": frame_idx,
                        "faces_detected": 0,
                        "dominant_emotion": None,
                    }
                )
                continue
            try:
                emo_df = fex.emotions
            except Exception:
                emo_df = None

            if emo_df is not None and not emo_df.empty:
                # Fill NA with 0 to avoid all-NA warnings and surface zeros in CSV.
                emo_filled = emo_df.fillna(0)
                df["dominant_emotion"] = emo_filled.idxmax(axis=1).values
                # If all zeros, mark dominant as None
                zero_mask = emo_filled.sum(axis=1) == 0
                df.loc[zero_mask, "dominant_emotion"] = None
                for col in emo_filled.columns:
                    df[f"emotion_{col}"] = emo_filled[col].values
            else:
                df["dominant_emotion"] = None

            if "face_id" not in df.columns:
                df["face_id"] = list(range(1, len(df) + 1))

            df["timestamp_sec"] = timestamp_sec
            df["frame_index"] = frame_idx
            df["faces_detected"] = len(df)
            rows.extend(df.to_dict(orient="records"))
    finally:
        cap.release()

    result_df = pd.DataFrame(rows)

    # Keep only essential columns: timestamp, faces_detected, and 7 emotions
    essential_columns = [
        "timestamp_sec",
        "faces_detected",
        "emotion_anger",
        "emotion_disgust",
        "emotion_fear",
        "emotion_happiness",
        "emotion_sadness",
        "emotion_surprise",
        "emotion_neutral",
    ]

    # Filter to only columns that exist in the dataframe
    available_columns = [col for col in essential_columns if col in result_df.columns]
    if available_columns:
        result_df = result_df[available_columns]

    # Save to CSV (output_csv is already a Path object)
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    result_df.to_csv(output_csv, index=False)
    return result_df


def _read_frame(cap: cv2.VideoCapture, frame_index: int):
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ok, frame = cap.read()
    if not ok:
        return None
    return frame


def _build_sample_plan(fps: float, frame_count: int, step_seconds: float) -> List[Tuple[float, int]]:
    """
    Generate (timestamp_sec, frame_index) pairs at the requested interval.
    Ensures the last frame is within bounds.
    """
    if step_seconds <= 0:
        raise ValueError("step_seconds must be > 0.")
    duration = frame_count / fps
    steps = max(1, math.ceil(duration / step_seconds))
    plan: List[Tuple[float, int]] = []
    for i in range(steps):
        timestamp = i * step_seconds
        frame_idx = min(int(round(timestamp * fps)), frame_count - 1)
        plan.append((timestamp, frame_idx))
    return plan


def _default_output_path(video_path: Path) -> Path:
    return Path("/app/outputs/Face_Text.csv")


def _resolve_device(device: str) -> str:
    """
    Resolve requested device string to an available device.
    Falls back to CPU when CUDA is unavailable.
    """
    requested = (device or "auto").lower()
    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        return "cpu"
    return requested


def _get_detector(device: str) -> Detector:
    """Get or create a cached Detector for the given device."""
    key = device
    detector = _DETECTORS.get(key)
    if detector:
        return detector
    with _DETECTOR_LOCK:
        detector = _DETECTORS.get(key)
        if detector:
            return detector
        # Add output_size to ensure consistent image dimensions and avoid batch errors
        detector = Detector(
            device=device,
            face_model="retinaface",
            emotion_model="resmasknet",
            output_size=512  # Fixed size to avoid dimension mismatch errors
        )
        _DETECTORS[key] = detector
        return detector


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Analyze facial expressions in a video at fixed intervals and export CSV."
    )
    parser.add_argument("video", help="Path to the video file.")
    parser.add_argument(
        "--out",
        help="Output CSV path (default: <video_stem>_face_emotions.csv in the same directory).",
    )
    parser.add_argument(
        "--step",
        type=float,
        default=1.0,
        help="Sampling interval in seconds (default: 1.0).",
    )
    parser.add_argument(
        "--device",
        default="cuda",
        choices=["cpu", "cuda"],
        help="Device for py-feat detector (default: cuda).",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> None:
    parser = _build_parser()
    args = parser.parse_args(argv)
    video_path = Path(args.video)
    output_path = Path(args.out) if args.out else _default_output_path(video_path)
    analyze_video(
        video_path=video_path,
        output_csv=output_path,
        step_seconds=args.step,
        device=args.device,
    )
    print(f"Analysis complete. CSV saved to: {output_path}")


if __name__ == "__main__":
    main()
