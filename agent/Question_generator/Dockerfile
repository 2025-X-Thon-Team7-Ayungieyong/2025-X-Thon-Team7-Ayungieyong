FROM python:3.11-slim

# Accept build arguments for user configuration
ARG USER_UID
ARG USER_GID
ARG USERNAME

# Create user with dynamic UID/GID
RUN groupadd -g ${USER_GID} ${USERNAME} 2>/dev/null || true && \
    useradd -m -u ${USER_UID} -g ${USER_GID} ${USERNAME} 2>/dev/null || true

# Set working directory
WORKDIR /app/Question_generator

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy module files
COPY agent.py .
COPY server.py .

# Set PYTHONPATH to include /app for sibling module imports
ENV PYTHONPATH=/app

# Switch to non-root user
USER ${USERNAME}

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
