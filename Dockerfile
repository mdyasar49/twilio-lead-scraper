FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Run daemon mode (every 60 minutes)
CMD ["python", "main.py", "--mode", "daemon", "--interval", "60"]
