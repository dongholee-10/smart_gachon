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

### 1. PostgreSQL (docker-compose)

DB만 컨테이너로 띄우고 백엔드·프론트는 로컬에서 직접 실행. macOS면 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 또는 `brew install colima docker docker-compose` 후 `colima start`.

```bash
docker compose up -d db        # PG 백그라운드 기동 (5432 포트)
docker compose ps              # healthy 표시까지 ~5초
docker compose logs -f db      # 로그 보고 싶으면
docker compose down            # 중지 (volume 유지)
docker compose down -v         # volume까지 삭제 — 데이터 전부 날아감
```

기본 접속 정보 (`docker-compose.yml`):

| 항목 | 값 |
|---|---|
| 호스트 | `localhost` |
| 포트 | `5432` |
| DB | `redflag` |
| 유저 | `redflag` |
| 비밀번호 | `redflag` |

`backend/.env`의 `DATABASE_URL`이 이 값과 일치하면 됨 — `.env.example`에 기본값으로 채워둠.

### 2. 백엔드·프론트 실행

```bash
# 백엔드
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env             # JWT_SECRET, NAVER 키 채우기
.venv/bin/uvicorn app.main:app --reload

# 프론트
cd frontend && npm install && npm run dev
```

서버 첫 기동 시 SQLAlchemy `init_db()`가 PG에 테이블을 자동 생성. 회원가입 → 분석 → 게시글 등 모든 데이터가 PG에 영속.

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
