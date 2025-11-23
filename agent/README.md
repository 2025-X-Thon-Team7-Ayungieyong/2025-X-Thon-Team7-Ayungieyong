# 면접 분석 시스템 (Interview Analysis System)

마이크로서비스 아키텍처 기반 면접 분석 시스템. PDF 이력서 분석, 면접 질문 생성, 얼굴 표정 분석, 음성 감정 분석을 수행합니다.

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         Admin (LangGraph)                    │
│              워크플로우 오케스트레이터 (Port 8000)              │
└───────────┬────────────────────────────────────┬─────────────┘
            │                                    │
    ┌───────▼────────┐                  ┌────────▼────────┐
    │  PDF Reader    │                  │   Question Gen  │
    │   (Port 8001)  │──────────────────▶│   (Port 8002)  │
    └────────────────┘   extraction     └─────────────────┘
                              data
    ┌────────────────┐                  ┌─────────────────┐
    │ Face Analysis  │                  │ Voice Analysis  │
    │   (Port 8003)  │                  │   (Port 8004)   │
    └────────────────┘                  └─────────────────┘
```

### 워크플로우

```
1. PDF 업로드
   ↓
2. PDF 텍스트 추출 (PDF_Reader)
   ↓
3. 면접 질문 3개 생성 (Question_generator + OpenAI)
   ↓
4. [사용자 파일 업로드 대기] ← 비디오/오디오 업로드
   ↓
5. 얼굴 표정 분석 (Face_Analysis + py-feat)
   ↓
6. 음성 감정 분석 (Voice_Analysis - placeholder)
   ↓
7. 완료
```

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# .env 파일 생성
cp .env.example .env

# OpenAI API 키 설정
echo "OPENAI_API_KEY=your_key_here" > .env
```

### 2. Docker Compose로 실행

```bash
# 모든 서비스 빌드 및 시작
docker-compose up --build

# 백그라운드 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f admin

# 서비스 중지
docker-compose down
```

### 3. 서비스 확인

```bash
# 헬스체크
curl http://localhost:8000/health  # Admin
curl http://localhost:8001/health  # PDF Reader
curl http://localhost:8002/health  # Question Generator
curl http://localhost:8003/health  # Face Analysis
curl http://localhost:8004/health  # Voice Analysis
```

## 📡 API 사용법

### 1. 워크플로우 시작 (PDF 분석 + 질문 생성)

```bash
curl -X POST http://localhost:8000/start \
  -H "Content-Type: application/json" \
  -d '{
    "pdf_path": "/app/PDF_Reader/test.pdf"
  }'

# Response
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "created",
  "message": "Workflow started. Use /status/{session_id} to check progress."
}
```

### 2. 진행 상황 확인

```bash
curl http://localhost:8000/status/{session_id}

# Response
{
  "session_id": "550e8400-...",
  "status": "waiting_for_upload",
  "pdf_path": "/app/PDF_Reader/test.pdf",
  "questions": [
    {
      "question": "귀하의 경력 중 가장 어려웠던 프로젝트는 무엇이었나요?",
      "intent": "문제 해결 능력 파악"
    },
    ...
  ],
  "video_path": null,
  "audio_path": null
}
```

### 3. 비디오/오디오 업로드

```bash
curl -X POST http://localhost:8000/upload/{session_id} \
  -F "video=@/path/to/interview.mp4" \
  -F "audio=@/path/to/interview.wav"

# Response
{
  "session_id": "550e8400-...",
  "video_path": "/app/uploads/550e8400-..._video.mp4",
  "audio_path": "/app/uploads/550e8400-..._audio.wav",
  "message": "Files uploaded successfully. Analysis will continue automatically."
}
```

### 4. 최종 결과 확인

```bash
curl http://localhost:8000/status/{session_id}

# Response (status: "completed")
{
  "session_id": "550e8400-...",
  "status": "completed",
  "questions": [...],
  "video_path": "/app/uploads/..._video.mp4",
  "audio_path": "/app/uploads/..._audio.wav"
}
```

## 📦 서비스 구성

### Admin (포트 8000)
- **역할**: 워크플로우 오케스트레이션
- **기술**: FastAPI + LangGraph
- **엔드포인트**:
  - `POST /start`: 워크플로우 시작
  - `GET /status/{session_id}`: 진행 상황
  - `POST /upload/{session_id}`: 파일 업로드
  - `GET /sessions`: 모든 세션 조회

### PDF_Reader (포트 8001)
- **역할**: PDF 텍스트 추출
- **기술**: PyMuPDF
- **엔드포인트**:
  - `POST /extract`: PDF 추출

### Question_generator (포트 8002)
- **역할**: 면접 질문 생성
- **기술**: OpenAI GPT-4o-mini
- **엔드포인트**:
  - `POST /generate`: 질문 생성 (3개)

### Face_Analysis (포트 8003)
- **역할**: 얼굴 표정 감정 분석
- **기술**: py-feat
- **엔드포인트**:
  - `POST /analyze`: 비디오 분석

### Voice_Analysis (포트 8004)
- **역할**: 음성 감정 분석 (placeholder)
- **기술**: TBD (wav2vec 예정)
- **엔드포인트**:
  - `POST /analyze`: 오디오 분석

## 🛠️ 개발

### 개별 서비스 실행 (로컬)

```bash
# PDF Reader
cd PDF_Reader
pip install -r requirements.txt
uvicorn server:app --port 8001

# Question Generator
cd Question_generator
export OPENAI_API_KEY=your_key
pip install -r requirements.txt
uvicorn server:app --port 8002

# Admin
cd admin
pip install -r requirements.txt
uvicorn server:app --port 8000
```

### 서비스 재빌드

```bash
# 특정 서비스만 재빌드
docker-compose up -d --build admin

# 모든 서비스 재빌드
docker-compose up -d --build
```

## 📂 폴더 구조

```
Hackathon/
├── admin/                    # 워크플로우 오케스트레이터
│   ├── graph.py             # LangGraph 워크플로우
│   ├── server.py            # FastAPI 서버
│   ├── session_manager.py   # 세션 관리
│   └── Dockerfile
├── PDF_Reader/              # PDF 추출 서비스
│   ├── pdf_reader.py
│   ├── server.py
│   └── Dockerfile
├── Question_generator/      # 질문 생성 서비스
│   ├── agent.py
│   ├── server.py
│   └── Dockerfile
├── Face_Analysis/           # 얼굴 분석 서비스
│   ├── face_analysis.py
│   ├── server.py
│   └── Dockerfile
├── Voice_Analysis/          # 음성 분석 서비스 (placeholder)
│   ├── voice_analysis.py
│   ├── server.py
│   └── Dockerfile
├── uploads/                 # 업로드된 파일 저장소
├── docker-compose.yml       # Docker Compose 설정
└── .env                     # 환경 변수
```

## 🔒 보안 & 권한

- 모든 컨테이너는 `atwoddl` 사용자(UID 1000)로 실행
- 절대 root 권한 사용 안 함
- 호스트 `/data/project/atwoddl/Hackathon`을 컨테이너 `/app`에 마운트

## 🚧 향후 계획

- [ ] Voice_Analysis 실제 구현 (wav2vec2)
- [ ] Final_Report 모듈 추가 (종합 보고서 생성)
- [ ] Redis 기반 세션 관리 (분산 환경 지원)
- [ ] WebSocket 실시간 진행 상황 업데이트
- [ ] GPU 최적화 (Face Analysis)
