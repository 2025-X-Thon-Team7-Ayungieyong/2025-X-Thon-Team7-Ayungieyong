FROM python:3.11-slim

# Install system dependencies for OpenCV, py-feat, and matplotlib
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    gcc \
    g++ \
    gfortran \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libfreetype6-dev \
    libpng-dev \
    libjpeg-dev \
    libopenblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

# Accept build arguments for user configuration
ARG USER_UID
ARG USER_GID
ARG USERNAME

# Create user with dynamic UID/GID
RUN groupadd -g ${USER_GID} ${USERNAME} 2>/dev/null || true && \
    useradd -m -u ${USER_UID} -g ${USER_GID} ${USERNAME} 2>/dev/null || true

# Set working directory
WORKDIR /app/Face_Analysis

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install h5py FIRST (it needs to be installed before other packages that depend on it)
RUN pip install --no-cache-dir h5py

# Install numpy and other binary packages (from wheels, not source)
RUN pip install --no-cache-dir numpy==1.23.5 scipy pandas opencv-python

# Copy requirements and install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download py-feat models as root before switching user
RUN python -c "from feat import Detector; Detector(device='cuda')" || true

# Change ownership of site-packages to atwoddl user
RUN chown -R ${USER_UID}:${USER_GID} /usr/local/lib/python3.11/site-packages || true

# Copy module files
COPY __init__.py .
COPY face_analysis.py .
COPY server.py .

# Switch to non-root user
USER ${USERNAME}

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
