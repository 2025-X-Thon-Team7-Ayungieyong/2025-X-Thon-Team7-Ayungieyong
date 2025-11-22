from __future__ import annotations

import subprocess
import sys
import threading
from pathlib import Path
from typing import Dict, Any, Union

import pandas as pd
import soundfile as sf
import torch
import torchaudio
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

MODEL_NAME = "kresnik/wav2vec2-large-xlsr-korean"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

_MODEL = None
_PROCESSOR = None
_LOAD_LOCK = threading.Lock()
# Serialize inference to avoid concurrent model moves/allocations (meta tensor error).
_INFERENCE_LOCK = threading.Lock()


def analyze_audio(
    audio_path: Union[str, Path],
    output_csv: Union[str, Path] = None,
    output_txt: Union[str, Path] = None,
) -> pd.DataFrame:
    """
    Analyze audio file using wav2vec2-base-korean model for transcription.

    Args:
        audio_path: Path to audio file
        output_csv: Optional path to save results as CSV
        output_txt: Optional path to save transcription as txt (default: /app/outputs/Voice_Text.txt)

    Returns:
        DataFrame with transcription results
    """
    audio_path = Path(audio_path)

    if not audio_path.is_file():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    # Run wav2vec2 transcription
    transcription = run_wav2vec2_transcription(audio_path)

    # Save transcription to txt file
    if output_txt is None:
        output_txt = Path("/app/outputs/Voice_Text.txt")
    else:
        output_txt = Path(output_txt)
    output_txt.parent.mkdir(parents=True, exist_ok=True)
    output_txt.write_text(transcription, encoding="utf-8")

    # Create DataFrame with results
    data = {
        "audio_path": [str(audio_path)],
        "transcription": [transcription],
        "output_txt": [str(output_txt)],
        "status": ["completed"],
    }

    df = pd.DataFrame(data)

    if output_csv:
        output_csv = Path(output_csv)
        output_csv.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_csv, index=False)

    return df


def load_and_preprocess_audio(file_path: Path, processor, device: str = "cpu"):
    """
    Load and preprocess audio file for wav2vec2 model.

    Args:
        file_path: Path to audio file
        processor: Wav2Vec2Processor instance
        device: Device to use (cpu or cuda)

    Returns:
        Preprocessed audio tensor
    """
    # Load audio using soundfile (avoids torchcodec errors)
    audio_input, sampling_rate = sf.read(file_path)

    # Convert numpy array to tensor
    waveform = torch.FloatTensor(audio_input)

    # Handle dimensions: (time, channels) -> (channels, time)
    if waveform.ndim == 2:
        waveform = waveform.t()
    elif waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)

    # Resample to 16000Hz (model requirement)
    if sampling_rate != 16000:
        resampler = torchaudio.transforms.Resample(sampling_rate, 16000)
        waveform = resampler(waveform)

    # Process through processor
    inputs = processor(waveform.squeeze().numpy(), sampling_rate=16000, return_tensors="pt")
    return inputs.input_values[0]


def _load_model_and_processor():
    """Load wav2vec2 model/processor once, with locking for concurrent requests."""
    global _MODEL, _PROCESSOR
    if _MODEL is not None and _PROCESSOR is not None:
        return _MODEL, _PROCESSOR

    with _LOAD_LOCK:
        if _MODEL is not None and _PROCESSOR is not None:
            return _MODEL, _PROCESSOR

        print(f"Loading model: {MODEL_NAME} on {DEVICE}...")
        processor = Wav2Vec2Processor.from_pretrained(MODEL_NAME)
        model = Wav2Vec2ForCTC.from_pretrained(
            MODEL_NAME,
            low_cpu_mem_usage=False,
            torch_dtype=torch.float32,
        )
        model.to(DEVICE)
        model.eval()
        _MODEL = model
        _PROCESSOR = processor
        return model, processor


def run_wav2vec2_transcription(audio_path: Path) -> str:
    """
    Run wav2vec2 model for Korean speech-to-text transcription.

    Args:
        audio_path: Path to audio file

    Returns:
        Transcribed text
    """
    try:
        model, processor = _load_model_and_processor()

        # Preprocess audio
        input_values = load_and_preprocess_audio(audio_path, processor, DEVICE)

        # Move to device and add batch dimension
        input_tensor = input_values.unsqueeze(0).to(DEVICE)

        # Run inference
        with _INFERENCE_LOCK:
            with torch.no_grad():
                logits = model(input_tensor).logits

        predicted_ids = torch.argmax(logits, dim=-1)

        # Decode to text
        transcription = processor.batch_decode(predicted_ids)[0]

        print(f"Transcription: {transcription}")
        return transcription

    except Exception as e:
        import traceback
        error_msg = f"Error during transcription: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return f"[ERROR] {str(e)}"
