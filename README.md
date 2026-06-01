# RED FLAG
<img width="2918" height="1514" alt="image" src="https://github.com/user-attachments/assets/9752a364-2e77-4ae3-bd38-baf8deb7e972" />

뉴스 기반 주식 리스크 탐지 서비스입니다. 기업/종목 뉴스를 검색하고, 감성 분석과 룰 기반 리스크 엔진으로 `Low / Medium / High` 위험도를 산출한 뒤, 분석 근거와 리포트를 보여줍니다.

이 레포는 **로컬 실행을 기준으로 구성**되어 있습니다. 다른 사람이 GitHub에서 클론한 뒤 Docker만 있으면 같은 UI와 기능을 바로 확인할 수 있도록 `docker compose` 실행 흐름을 제공합니다.

---

## 주요 기능

### 뉴스 기반 리스크 분석
- 네이버 뉴스 API 기반 기업/종목 뉴스 검색
- 뉴스 제목/본문을 바탕으로 단일 뉴스 리스크 분석
- 종목별 뉴스 여러 건 일괄 분석
- 2-4개 종목 비교 분석
- 분석 결과 히스토리 저장

### Explainable AI 리포트
- 감성 레이블과 신뢰도 표시
- 리스크 점수 `0-100` 산출
- 위험 단계 `Low / Medium / High` 분류
- 법률, 규제, 재무, 경영, 시장 관련 red flag 키워드 탐지
- 분석 근거와 종합 리포트 생성

### 종목 기능
- 종목 자동완성 검색
- 네이버 모바일 금융 기반 실시간 시세 조회
- 뉴스 언급량 기반 핫 종목 표시
- 관심종목 등록, 메모 수정, 삭제
- 관심종목 기반 빠른 분석

### 사용자 기능
- 회원가입 / 로그인 / 로그아웃
- JWT 기반 인증
- 개인별 분석 히스토리
- 관심종목 관리
- 계정 삭제

### 커뮤니티
- 게시글 작성, 수정, 삭제
- 종목 태그 연결
- 좋아요
- 댓글 작성

### 종목 Agent 채팅
- 종목별 1:1 AI 채팅
- 최근 뉴스, 시세, 사용자의 분석 이력을 컨텍스트로 사용
- Gemini / Anthropic / OpenAI 중 하나를 선택해서 사용 가능
- LLM API 키가 없으면 채팅 기능만 비활성화되고 나머지 기능은 동작

---

## 화면 구성

| 화면 | 설명 |
|---|---|
| Dashboard | 뉴스 검색, 핫 종목, 뉴스별 리스크 분석 |
| Analysis | 상세 리스크 리포트, 감성 분석, red flag 요인 |
| Compare | 여러 종목의 뉴스 리스크 비교 |
| Watchlist | 관심종목, 시세, 메모, 빠른 분석 |
| Community | 게시글, 댓글, 좋아요 |
| Floating Agent | 관심종목/검색 종목 기반 AI 채팅 |
| Auth | 로그인, 회원가입 |

---

## 아키텍처

```mermaid
flowchart TD
    Browser["Browser<br/>React UI"] --> Frontend["Frontend<br/>Vite build served by nginx"]
    Frontend --> Backend["Backend<br/>FastAPI"]
    Backend --> DB["PostgreSQL<br/>users / analyses / posts / watchlist / chat"]
    Backend --> News["Naver News API"]
    Backend --> Quote["Naver Mobile Stock"]
    Backend --> Risk["Risk Engine<br/>keywords + scoring rules"]
    Backend --> FinBERT["FinBERT<br/>optional"]
    Backend --> LLM["Gemini / Anthropic / OpenAI<br/>optional"]
```

```mermaid
sequenceDiagram
    participant U as User
    participant R as React
    participant A as FastAPI
    participant N as Naver News
    participant E as Risk Engine
    participant D as PostgreSQL

    U->>R: 기업명 검색
    R->>A: GET /news?query=...
    A->>N: 뉴스 검색
    N-->>A: 뉴스 목록
    A-->>R: 뉴스 목록
    U->>R: 뉴스 분석 클릭
    R->>A: POST /analyze
    A->>E: 감성/키워드/점수 계산
    A->>D: 분석 결과 저장
    A-->>R: 리스크 결과
```

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React, Vite, React Router, Tailwind CSS, Recharts |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL |
| AI / NLP | FinBERT optional, rule-based risk engine |
| LLM optional | Gemini, Anthropic Claude, OpenAI |
| Infra | Docker, Docker Compose, nginx |

---

## 빠른 시작: Docker Compose 권장

### 1. 필수 준비물

- Docker Desktop
- Git

macOS에서 Docker Desktop 대신 Colima를 쓴다면:

```bash
brew install colima docker docker-compose
colima start
```

### 2. 클론

```bash
git clone https://github.com/dongramiho/smart_gachon.git
cd smart_gachon
```

### 3. 환경변수 파일 생성

```bash
cp backend/.env.example backend/.env
python3 - <<'PY'
from pathlib import Path
import secrets

path = Path("backend/.env")
updates = {
    "JWT_SECRET": secrets.token_urlsafe(48),
    # API 키가 없으면 빈 값으로 두어 mock 뉴스 데이터가 나오게 합니다.
    "NAVER_CLIENT_ID": "",
    "NAVER_CLIENT_SECRET": "",
}

lines = path.read_text().splitlines()
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else ""
    if key in updates:
        out.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={value}")
path.write_text("\n".join(out) + "\n")
PY
```

`backend/.env`에서 아래 값을 확인합니다.

```env
DATABASE_URL=postgresql+psycopg2://redflag:redflag@localhost:5432/redflag
JWT_SECRET=<자동 생성된 긴 문자열>
ENABLE_FINBERT=false
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

`ENABLE_FINBERT=false`는 호스트에서 직접 실행할 때의 기본값입니다. Docker Compose 실행에서는 `docker-compose.yml`이 백엔드 컨테이너에 `ENABLE_FINBERT=true`를 주입합니다.

네이버 뉴스 API 키가 없으면 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 비워도 됩니다. 이 경우 앱은 mock 뉴스 데이터로 동작합니다.

```env
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

### 4. 실행

```bash
docker compose up -d --build
```

첫 빌드는 시간이 걸릴 수 있습니다. 특히 Docker 이미지에는 CPU용 torch와 FinBERT 관련 패키지가 포함되어 있어 네트워크와 머신 상태에 따라 몇 분 걸릴 수 있습니다.

### 5. 접속

| 서비스 | URL |
|---|---|
| React 앱 | http://localhost:5173 |
| FastAPI Swagger | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

```bash
open http://localhost:5173
open http://localhost:8000/docs
```

---

## Docker 명령어

```bash
# 실행 상태 확인
docker compose ps

# 백엔드 로그 보기
docker compose logs -f backend

# 프론트 로그 보기
docker compose logs -f frontend

# 전체 재시작
docker compose restart

# 중지. DB 데이터는 유지됨
docker compose down

# 중지 + DB 데이터 삭제
docker compose down -v
```

DB 테이블 확인:

```bash
docker compose exec db psql -U redflag -d redflag -c "\dt"
```

회원 데이터 확인:

```bash
docker compose exec db psql -U redflag -d redflag -c "SELECT id, email, name FROM users;"
```

---

## 로컬 개발 모드

Docker Compose는 완성된 풀스택 실행에 가장 편합니다. 코드를 수정하면서 개발하려면 DB만 Docker로 띄우고, 백엔드/프론트는 호스트에서 실행할 수 있습니다.

### 1. DB만 실행

```bash
docker compose up -d db
```

### 2. 백엔드 실행

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload
```

백엔드 주소:

```text
http://localhost:8000
```

### 3. 프론트 실행

새 터미널에서:

```bash
cd frontend
npm install
npm run dev
```

프론트 주소:

```text
http://localhost:5173
```

---

## 환경변수 설명

`backend/.env.example`을 복사해서 `backend/.env`로 사용합니다.

| 변수 | 필수 | 설명 |
|---|---:|---|
| `JWT_SECRET` | 예 | JWT 서명용 비밀키. 32자 이상 권장 |
| `DATABASE_URL` | 예 | DB 연결 문자열. Docker 실행 시 compose가 컨테이너용 URL로 override |
| `CORS_ORIGINS` | 예 | 프론트 허용 origin |
| `NAVER_CLIENT_ID` | 아니오 | 네이버 뉴스 검색 API ID |
| `NAVER_CLIENT_SECRET` | 아니오 | 네이버 뉴스 검색 API Secret |
| `ENABLE_FINBERT` | 아니오 | `true`면 FinBERT 실추론 사용 |
| `LLM_PROVIDER` | 아니오 | `gemini`, `anthropic`, `openai` 중 선택 |
| `GEMINI_API_KEY` | 아니오 | Gemini 채팅/설명용 |
| `ANTHROPIC_API_KEY` | 아니오 | Claude 채팅/설명용 |
| `OPENAI_API_KEY` | 아니오 | OpenAI 채팅/설명용 |

LLM 키가 없어도 뉴스 검색, 리스크 분석, 커뮤니티, 관심종목 등 핵심 기능은 동작합니다. 단, 종목 Agent 채팅은 키가 없으면 안내 메시지를 반환합니다.

---

## FinBERT 설정

기본 로컬 Docker Compose는 `ENABLE_FINBERT=true`로 백엔드를 실행합니다.

- 한글 뉴스: `snunlp/KR-FinBert-SC`
- 영문 뉴스: `ProsusAI/finbert`
- 모델 로딩 실패 시 rule-based fallback으로 자동 전환

처음 분석 요청 때 HuggingFace 모델 다운로드가 발생할 수 있어 시간이 걸립니다. 가볍게 실행하고 싶다면 `docker-compose.yml`의 backend 환경변수에서 아래처럼 바꿉니다.

```yaml
ENABLE_FINBERT: "false"
```

호스트 개발 모드에서 FinBERT를 켜려면:

```bash
cd backend
.venv/bin/pip install -r requirements-ml.txt
# backend/.env
# ENABLE_FINBERT=true
```

---

## API 요약

| Method | Path | 설명 |
|---|---|---|
| `POST` | `/auth/signup` | 회원가입 |
| `POST` | `/auth/login` | 로그인 |
| `GET` | `/auth/me` | 내 정보 |
| `DELETE` | `/auth/me` | 계정 삭제 |
| `GET` | `/news/latest` | 최신 뉴스 |
| `GET` | `/news?query=...` | 뉴스 검색 |
| `POST` | `/analyze` | 단일 뉴스 분석 |
| `POST` | `/analyze/company` | 기업 뉴스 일괄 분석 |
| `POST` | `/analyze/compare` | 종목 비교 분석 |
| `GET` | `/analyze/history` | 내 분석 히스토리 |
| `POST` | `/report` | 분석 리포트 생성 |
| `GET` | `/stocks/search` | 종목 자동완성 |
| `GET` | `/stocks/trending` | 핫 종목 |
| `GET` | `/stocks/quote/{ticker}` | 시세 조회 |
| `GET` | `/watchlist` | 관심종목 목록 |
| `POST` | `/watchlist` | 관심종목 추가 |
| `PATCH` | `/watchlist/{item_id}` | 메모 수정 |
| `DELETE` | `/watchlist/{item_id}` | 관심종목 삭제 |
| `GET` | `/community/posts` | 게시글 목록 |
| `POST` | `/community/posts` | 게시글 작성 |
| `PATCH` | `/community/posts/{post_id}` | 게시글 수정 |
| `DELETE` | `/community/posts/{post_id}` | 게시글 삭제 |
| `POST` | `/community/posts/{post_id}/like` | 좋아요 |
| `POST` | `/community/posts/{post_id}/comments` | 댓글 작성 |
| `GET` | `/chat/stocks/{ticker}/messages` | 채팅 내역 |
| `POST` | `/chat/stocks/{ticker}/stream` | 채팅 스트리밍 |

전체 스키마와 테스트 호출은 Swagger에서 확인할 수 있습니다.

```text
http://localhost:8000/docs
```

---

## 테스트

백엔드 테스트:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest
```

프론트 빌드 확인:

```bash
cd frontend
npm install
npm run build
```

---

## 문제 해결

### `backend/.env not found`

`backend/.env`가 없으면 Docker Compose가 백엔드를 띄우지 못합니다.

```bash
cp backend/.env.example backend/.env
python3 - <<'PY'
from pathlib import Path
import secrets

path = Path("backend/.env")
updates = {"JWT_SECRET": secrets.token_urlsafe(48), "NAVER_CLIENT_ID": "", "NAVER_CLIENT_SECRET": ""}
lines = path.read_text().splitlines()
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else ""
    if key in updates:
        out.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={value}")
path.write_text("\n".join(out) + "\n")
PY
```

### `JWT_SECRET이 설정되지 않았습니다`

`backend/.env`에 `JWT_SECRET`이 비어 있거나 너무 짧습니다. 아래 명령으로 새 키를 추가하세요.

```bash
python3 - <<'PY'
from pathlib import Path
import secrets

path = Path("backend/.env")
lines = path.read_text().splitlines()
secret = secrets.token_urlsafe(48)
updated = False
out = []
for line in lines:
    if line.startswith("JWT_SECRET="):
        out.append(f"JWT_SECRET={secret}")
        updated = True
    else:
        out.append(line)
if not updated:
    out.append(f"JWT_SECRET={secret}")
path.write_text("\n".join(out) + "\n")
PY
```

### 뉴스가 실제 기사처럼 나오지 않고 mock 데이터가 나옴

네이버 API 키가 비어 있으면 mock 뉴스로 동작합니다. 실제 뉴스 검색을 사용하려면 `backend/.env`에 아래 값을 넣으세요.

```env
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
```

### 첫 분석이 오래 걸림

FinBERT 모델을 처음 다운로드/로딩하는 시간일 수 있습니다. 가볍게 확인하려면 `ENABLE_FINBERT=false`로 실행하세요.

### 포트 충돌

기본 포트:

| 포트 | 용도 |
|---:|---|
| 5173 | 프론트 |
| 8000 | 백엔드 |
| 5432 | PostgreSQL |

이미 사용 중이면 기존 프로세스를 종료하거나 `docker-compose.yml`의 포트 매핑을 바꾸세요.

### DB를 초기화하고 싶음

```bash
docker compose down -v
docker compose up -d --build
```

`down -v`는 PostgreSQL 볼륨까지 삭제하므로 회원, 게시글, 분석 기록이 모두 사라집니다.

---

## 프로젝트 구조

```text
smart_gachon/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers
│   │   ├── ai/           # FinBERT, risk engine
│   │   ├── core/         # config, auth, limiter
│   │   ├── data/         # stock master
│   │   ├── database/     # SQLAlchemy models/session/repository
│   │   ├── models/       # Pydantic schemas
│   │   └── services/     # business logic
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── requirements-ml.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 로컬 실행 요약

가장 짧은 실행 흐름:

```bash
git clone https://github.com/dongramiho/smart_gachon.git
cd smart_gachon
cp backend/.env.example backend/.env
python3 - <<'PY'
from pathlib import Path
import secrets

path = Path("backend/.env")
updates = {"JWT_SECRET": secrets.token_urlsafe(48), "NAVER_CLIENT_ID": "", "NAVER_CLIENT_SECRET": ""}
lines = path.read_text().splitlines()
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else ""
    if key in updates:
        out.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={value}")
path.write_text("\n".join(out) + "\n")
PY
docker compose up -d --build
open http://localhost:5173
```
