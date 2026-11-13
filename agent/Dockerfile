# Agen tutor realtime: LiveKit + Gemini Live (Vertex AI atau API key).
FROM python:3.12-slim
WORKDIR /agent
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
RUN python main.py download-files || true
USER nobody
CMD ["python", "main.py", "start"]
