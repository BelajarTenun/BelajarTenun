# Agen tutor realtime: LiveKit + Gemini Live (Vertex AI atau API key).
FROM python:3.12-slim
WORKDIR /agent
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
RUN python main.py download-files || true
# Sama dengan user app (node, uid 1000) supaya bisa membaca kunci Vertex di /secrets (chmod 640, grup 1000).
USER 1000:1000
CMD ["python", "main.py", "start"]
