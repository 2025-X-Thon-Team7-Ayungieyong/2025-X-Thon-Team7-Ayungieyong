# Base image
FROM python:3.11-slim

# Install system dependencies (ffmpeg/glib for future video/vision tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsm6 libxext6 libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Project code
COPY . .

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "app.server:app", "--host", "0.0.0.0", "--port", "8000"]
