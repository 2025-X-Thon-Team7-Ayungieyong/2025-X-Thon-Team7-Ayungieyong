# Admin Orchestrator

LangGraph 기반 워크플로우 오케스트레이터. 전체 면접 분석 프로세스를 관리합니다.

## 🎯 주요 기능

- **워크플로우 관리**: LangGraph로 구현된 상태 기반 워크플로우
- **세션 관리**: 여러 워크플로우 동시 실행 지원
- **조건부 라우팅**: 파일 업로드 여부에 따른 분기 처리
- **서비스 오케스트레이션**: 각 마이크로서비스 HTTP 호출 조정

## 📊 워크플로우 시각화

### 방법 1: LangSmith (추천)

1. **LangSmith 가입**: https://smith.langchain.com/
2. **API 키 발급**: Settings → API Keys
3. **.env 파일 설정**:
   ```bash
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your_langsmith_api_key
   LANGCHAIN_PROJECT=hackathon-interview-analysis
   ```
4. **실행 후 확인**:
   - 워크플로우 실행 시 자동으로 LangSmith에 트레이싱 전송
   - https://smith.langchain.com/projects 에서 실시간 확인
   - 각 노드 실행 시간, 입출력, 에러 추적 가능

### 방법 2: API 엔드포인트

워크플로우 구조를 API로 조회:

```bash
curl http://localhost:8000/graph/structure
```

**응답 예시**:
```json
{
  "graph": {...},
  "description": "Interview Analysis Workflow",
  "nodes": [
    {"id": "pdf_extract", "label": "PDF 추출", "color": "#3b82f6"},
    {"id": "question_generate", "label": "질문 생성", "color": "#8b5cf6"},
    {"id": "wait_for_upload", "label": "파일 업로드 대기", "color": "#f59e0b"},
    {"id": "face_analysis", "label": "얼굴 분석", "color": "#10b981"},
    {"id": "voice_analysis", "label": "음성 분석", "color": "#ec4899"},
    {"id": "complete", "label": "완료", "color": "#6366f1"}
  ],
  "edges": [...]
}
```

## 🚀 로컬 실행

```bash
# Conda 환경 사용
conda activate graph
cd admin
uvicorn server:app --host 0.0.0.0 --port 8000

# 또는 Python 직접 실행
python server.py
```

## 🐳 Docker 실행

```bash
# docker-compose.yml 포함
docker-compose up admin

# 또는 직접 빌드
docker build -t hackathon-admin .
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_key \
  -e LANGCHAIN_TRACING_V2=true \
  -e LANGCHAIN_API_KEY=your_langsmith_key \
  -v /data/project/atwoddl/Hackathon:/app \
  --user 1000:1000 \
  hackathon-admin
```

## 📡 API 엔드포인트

### POST /start
워크플로우 시작

**Request**:
```json
{
  "pdf_path": "/app/PDF_Reader/test.pdf"
}
```

**Response**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "created",
  "message": "Workflow started..."
}
```

### GET /status/{session_id}
진행 상황 확인

**Response**:
```json
{
  "session_id": "...",
  "status": "waiting_for_upload",
  "pdf_path": "/app/PDF_Reader/test.pdf",
  "questions": [...],
  "video_path": null,
  "audio_path": null
}
```

### POST /upload/{session_id}
비디오/오디오 업로드

**Request** (multipart/form-data):
- `video`: 비디오 파일 (선택)
- `audio`: 오디오 파일 (선택)
- `upload_dir`: 저장 경로 (기본: /data/project/atwoddl/Hackathon/uploads)

### GET /sessions
모든 세션 목록 조회

### GET /graph/structure
워크플로우 그래프 구조 조회

### GET /health
헬스체크

## 🔧 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 | ✅ |
| `LANGCHAIN_TRACING_V2` | LangSmith 트레이싱 활성화 | ❌ |
| `LANGCHAIN_API_KEY` | LangSmith API 키 | ❌ |
| `LANGCHAIN_PROJECT` | LangSmith 프로젝트 이름 | ❌ |
| `PDF_READER_URL` | PDF Reader 서비스 URL | ✅ |
| `QUESTION_GEN_URL` | Question Generator 서비스 URL | ✅ |
| `FACE_ANALYSIS_URL` | Face Analysis 서비스 URL | ✅ |
| `VOICE_ANALYSIS_URL` | Voice Analysis 서비스 URL | ✅ |

## 📁 파일 구조

```
admin/
├── __init__.py              # 패키지 초기화
├── graph.py                 # LangGraph 워크플로우 정의
├── server.py                # FastAPI 서버
├── session_manager.py       # 세션 상태 관리
├── requirements.txt         # Python 의존성
├── environment.yml          # Conda 환경 백업
├── Dockerfile              # Docker 이미지
└── README.md               # 이 파일
```

## 🎨 워크플로우 상세

```
┌──────────────┐
│ pdf_extract  │ ← 엔트리 포인트
└──────┬───────┘
       ↓
┌──────────────────┐
│ question_generate│
└──────┬───────────┘
       ↓
┌──────────────────┐
│ wait_for_upload  │ ← 파일 업로드 대기
└──────┬───────────┘
       ↓
    [조건부 분기]
       ↓
   파일 있음? ──Yes──→ face_analysis → voice_analysis → complete → END
       │
       No
       ↓
      END
```

## 🐛 디버깅

### 로그 확인
```bash
# Docker 로그
docker-compose logs -f admin

# 특정 세션 상태 확인
curl http://localhost:8000/status/{session_id}

# 모든 세션 목록
curl http://localhost:8000/sessions
```

### LangSmith에서 확인
1. https://smith.langchain.com/ 접속
2. 프로젝트 선택 (hackathon-interview-analysis)
3. 각 워크플로우 실행 클릭
4. 노드별 입출력, 실행 시간, 에러 확인
