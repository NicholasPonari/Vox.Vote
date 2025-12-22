# Use Python 3.11 slim as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for dlib and face_recognition
# Note: Tesseract OCR removed - now using OpenAI Vision API for text extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Run with gunicorn for production
# With 8 vCPU and 8GB RAM, we can run more workers for better concurrency
# Using 4 workers with 4 threads each to utilize available CPU cores
# face_recognition models are loaded once per worker (~250MB each)
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "4", "--threads", "4", "--timeout", "180", "--worker-class", "gthread", "--max-requests", "200", "--max-requests-jitter", "20", "app:app"]
