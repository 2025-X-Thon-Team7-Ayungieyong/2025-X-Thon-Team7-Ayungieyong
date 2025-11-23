FROM python:3.11-slim

# Accept build arguments for user configuration
ARG USER_UID
ARG USER_GID
ARG USERNAME

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    libsndfile1-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create user with dynamic UID/GID
RUN groupadd -g ${USER_GID} ${USERNAME} 2>/dev/null || true && \
    useradd -m -u ${USER_UID} -g ${USER_GID} ${USERNAME} 2>/dev/null || true

# Set working directory
WORKDIR /app/Voice_Analysis

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy module files
COPY __init__.py .
COPY voice_analysis.py .
COPY server.py .

# Switch to non-root user
USER ${USERNAME}

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
