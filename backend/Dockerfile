# MemBox Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependency files
COPY pyproject.toml .

# Install dependencies only (without building the project itself)
RUN uv pip install --system -r pyproject.toml

# Copy code
COPY . .

# Install the package
RUN uv pip install --system -e .

# Create upload directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Start command
CMD ["membox"]
