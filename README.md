# News-based Stock Red Flag Detection API

## Overview

The News-based Stock Red Flag Detection API is a financial analysis system designed to identify potential corporate risks ("Red Flags") from news text.

This system integrates quantitative sentiment analysis and qualitative reasoning to provide an Explainable AI (XAI) approach to investment risk assessment.

- FinBERT: financial sentiment analysis  
- Rule-based engine: risk scoring  
- LLM: reasoning and explanation generation  

The goal is to move beyond simple scores and provide clear explanations of risk.

---

## System Architecture

    Client (React)
          ↓
    FastAPI Router
          ↓
    Service Layer
          ↓
    AI Module (FinBERT + LLM)
          ↓
    Database (PostgreSQL / MongoDB)

### Design Principles

- Modular architecture for scalability  
- Layered structure for maintainability  
- Asynchronous processing for performance  

---

## Tech Stack

### Backend / AI
- Python  
- FastAPI  
- PyTorch  
- Transformers  

### Frontend
- JavaScript  
- React  

### Database
- PostgreSQL  
- MongoDB  

### Deployment
- Docker  

---

## AI Pipeline

### 1. Quantitative Sentiment Analysis
FinBERT is used to extract sentiment scores (positive, neutral, negative) from financial news text.

### 2. Risk Scoring Engine
A rule-based engine maps sentiment scores and predefined risk keywords such as:
- investigation  
- lawsuit  
- earnings decline  

into discrete risk levels:

    Low / Medium / High

### 3. Qualitative Reasoning (LLM)
The LLM interprets detected red flags and generates natural language explanations describing the underlying risk and its potential impact.

---

## Key Features

- Red Flag Detection from news text  
- Risk factor classification (regulatory, financial, legal)  
- Explainable AI reports  
- RESTful API endpoints  

---

## API Endpoints

### Analyze News

    POST /analyze

Executes the full AI pipeline on input news text.

### Get Result

    GET /results/{id}

Retrieves stored analysis results.

### Generate Report

    POST /report

Generates a summarized risk report.

---

## Testing and Quality Assurance

### Unit Testing
- Validation of risk scoring logic  
- Verification of AI output format (JSON)

### Integration Testing
- End-to-end data flow validation across FastAPI, AI modules, and database  

---

## Deployment

### 풀스택 한 줄 시연 (Recommended)

PG / FastAPI / nginx-served React 가 한 `docker compose` 로 다 뜬다. Docker Desktop 또는 `brew install colima docker docker-compose && colima start`.

```bash
# 1) .env 준비 — JWT_SECRET, NAVER 키 채우기
cp backend/.env.example backend/.env
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(48))" >> backend/.env

# 2) 빌드 + 기동 (첫 빌드 ~1분, 이후 캐시)
docker compose up -d --build
docker compose ps                      # 3개 컨테이너 healthy / Up 확인

# 3) 접속
open http://localhost:5173             # 프론트
open http://localhost:8000/docs        # API 문서 (Swagger)
```

| 서비스 | 포트 | 컨테이너 |
|---|---|---|
| Frontend (nginx) | **5173** → 80 | `redflag-frontend` |
| Backend (FastAPI) | **8000** | `redflag-backend` |
| PostgreSQL | **5432** | `redflag-postgres` |

회원가입·분석·게시글 등 모든 데이터는 `redflag-pgdata` named volume 에 영속. PG 안 직접 확인:

```bash
docker compose exec db psql -U redflag -d redflag -c "\dt"
docker compose exec db psql -U redflag -d redflag -c "SELECT id, email, name FROM users;"
```

운영:
```bash
docker compose logs -f backend         # 로그
docker compose restart backend         # 코드 수정 후 재시작 (다시 build 필요)
docker compose down                    # 중지 (데이터 유지)
docker compose down -v                 # 데이터까지 삭제
```

### 호스트에서 직접 돌리고 싶다면

DB만 컨테이너로 두고 백엔드/프론트는 호스트에서:

```bash
docker compose up -d db
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload    # 8000

cd frontend && npm install && npm run dev  # 5173
```

`.env` 의 `DATABASE_URL` 을 `localhost:5432` 로 두면 됨 (.env.example 기본값).

### FinBERT 실추론

기본 docker 이미지에 **torch CPU wheel + transformers 가 포함**되어 있고 `ENABLE_FINBERT=true` 로 켜져 있다. 첫 분석 요청 시 HuggingFace 에서 모델을 받느라 ~30초 걸리고, 이후 호출은 메모리 캐시로 즉시 응답.

- 한글 본문 → `snunlp/KR-FinBert-SC` 로딩
- 영문 본문 → `ProsusAI/finbert` 로딩
- 모델 로딩 실패 시 룰 기반 fallback 으로 자동 전환 (서버 안 죽음)

호스트 venv 에서 돌릴 땐:

```bash
.venv/bin/pip install -r backend/requirements-ml.txt
# backend/.env 에 ENABLE_FINBERT=true
```

---

## Expected Impact

### Information Filtering
Reduces noise in financial news and highlights high-impact risk signals.

### Decision Support
Provides not only a risk score but also interpretable reasoning behind it.

### Scalability
Designed to support real-time news ingestion and multi-asset analysis in future extensions.

---

## Future Work

- Real-time news crawling and streaming analysis  
- Integration with financial data sources  
- Personalized risk profiling models  

---

## Summary

This project delivers an explainable, modular, and scalable system for extracting actionable risk insights from financial news using a hybrid AI approach.
