FROM python:3.10-slim

WORKDIR /backend

# requirements 먼저 복사 — 의존성 layer 캐시 활용
COPY requirements.txt requirements-ml.txt ./

# torch 는 CPU wheel 로 한정 (~200MB) — 기본 wheel 은 CUDA 빌드라 GPU 미사용 환경에서 1GB+ 낭비.
# transformers/tokenizers 등 나머지는 일반 PyPI 에서.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r requirements-ml.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
