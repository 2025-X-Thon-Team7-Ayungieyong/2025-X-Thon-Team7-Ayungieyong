# 🎯 Ayungieyong: AI 면접 코칭 시스템

> **2025 X-Thon Team 7** - Multi-Agent 기반 AI 면접 분석 및 피드백 플랫폼

면접자의 자기소개서와 포트폴리오를 분석하여 맞춤형 면접 질문을 생성하고, 면접 영상을 통해 **얼굴 표정**, **음성 추출**, **답변 내용**을 종합 평가하는 AI 시스템입니다.

특히 **Multi-Agent Debate** 메커니즘을 통해 3개의 전문 AI 에이전트가 7라운드에 걸쳐 교차 검증하며 최종 합의를 도출합니다.

---

## 📋 목차

- [구현 화면](#-구현-화면)
- [핵심 기능](#-핵심-기능)
- [프로젝트 전체 워크플로우](#-프로젝트-전체-워크플로우)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [출력 결과물](#-출력-결과물)


---

## 📌 구현 화면


<p align="center">
  <img width="1919" height="756" alt="스크린샷 2025-11-23 143303" src="https://github.com/user-attachments/assets/0ba5fa26-0739-4c4c-b025-c30aacf511ec" />
  <br><div align="center">과거 면접 기록 조회 & 새 면접 생성</div>
</p>
<p align="center">
  <img width="1084" height="484" alt="스크린샷 2025-11-23 143555" src="https://github.com/user-attachments/assets/4a6f64ca-e60d-4a7a-8db5-007e10b71db0" />
  <br><div align="center">자기소개서 및 포트폴리오 PDF 업로드</div>
</p>
<p align="center">
  <img width="1087" height="485" alt="스크린샷 2025-11-23 143640" src="https://github.com/user-attachments/assets/b297a04d-3895-4881-b843-e0c53040e167" />
  <br><div align="center">화상 면접 진행 및 .mp4 파일 저장</div>
</p>
<p align="center">
  <img width="1086" height="481" alt="스크린샷 2025-11-23 143616" src="https://github.com/user-attachments/assets/366badd1-5c37-46ea-b0d1-65e6b2044f55" />
  <br><div align="center">면접 결과 총평 및 최종 보고서 다운로드</div>
</p>

---

## 🎯 핵심 기능

### 1️⃣ 지능형 면접 질문 생성
- 업로드된 자기소개서와 포트폴리오를 **OpenAI GPT-5.1**로 분석
- 지원자 맞춤형 면접 질문 3개 자동 생성
- DuckDuckGo 웹 검색을 통한 실시간 정보 보강

### 2️⃣ 멀티모달 면접 분석
- **얼굴 표정 분석** (py-feat): 7가지 감정(행복, 놀람, 중립, 분노, 혐오, 두려움, 슬픔) 실시간 추출
- **음성 텍스트 변환 (STT)**: Wav2Vec2 한국어 모델로 음성을 텍스트로 자동 전사
- **병렬 처리**: 질문 3개에 대한 6개 분석(얼굴 3개 + 음성 3개) 동시 실행

### 3️⃣ Multi-Agent 평가 시스템 
3개의 독립적인 AI 에이전트가 각자의 전문 영역에서 평가를 수행:

| 에이전트 | 평가 영역 | 주요 기능 |
|---------|----------|----------|
| **Attitude Agent** | 면접 태도 | 얼굴 표정 데이터를 기반으로 Positive/Negative 감정 비율 분석 (100점 만점 환산) |
| **Q&A Relevance Agent** | 답변 품질 | 질문과 답변 간 연관성, 구체성, 명확성 평가 (1-10점 척도) |
| **Consistency Agent** | 일관성 검증 | 자기소개서/포트폴리오와 면접 답변 간 진실성 및 일치성 검증 |

### 4️⃣ Multi-Agent Debate (7-Round) 
3개 에이전트가 **7단계 토론**을 통해 최종 합의 도출:

```
Round 1: 초기 평가 발표
  ├─ Attitude Agent: 얼굴 표정 기반 태도 평가
  ├─ QA Relevance Agent: 질문-답변 연관성 평가
  └─ Consistency Agent: 문서-답변 일관성 평가

Round 2: 교차 검증 (Cross-Examination)
  ├─ Attitude → QA Relevance: 태도 관점에서 답변 연관성 검토
  ├─ QA Relevance → Consistency: 답변 품질 관점에서 일관성 검토
  └─ Consistency → Attitude: 일관성 관점에서 태도 재검토

Round 3: 반박 및 추가 의견 (Rebuttals)
  ├─ Attitude Agent 반박
  ├─ QA Relevance Agent 반박
  └─ Consistency Agent 반박

Round 4: 평가 기준 명시 (Criteria Clarification)
  └─ 각 에이전트가 사용한 객관적 평가 기준 3-4개 명시

Round 5: 증거 및 논리적 갭 지적 (Evidence & Gaps Challenge)
  └─ 다른 에이전트 평가에서 증거 부족 또는 보완 필요 지점 지적

Round 6: 최종 입장 정리 (Closing Positions)
  └─ 각 에이전트가 토론 내용을 종합하여 최종 입장 2-3문장으로 압축

Round 7: 최종 합의 도출 (Final Consensus) ✅
  └─ 3개 에이전트 의견 통합 → Markdown 종합 평가 보고서 생성
      ├─ ✅ Good (장점 5개)
      ├─ ❌ Bad (단점 5개)
      ├─ 📈 Development (개선점 5개)
      └─ 최종 채용 권고 (점수 /100)
```

### 5️⃣ 포트폴리오 개발 추천
- **Document Feedback Agent**: 자기소개서 및 포트폴리오 피드백 제공
- **웹 검색 기반 프로그램 추천**: DuckDuckGo 검색으로 최신 캠프/강의/부트캠프 발굴
- **맞춤형 성장 로드맵**: 1개월 단기 & 1년 장기 커리어 로드맵 생성

### 6️⃣ 인터랙티브 HTML 대시보드
- Debate 결과 + 포트폴리오 피드백 + 웹 검색 인사이트를 **단일 HTML** 페이지로 통합
- 노션 스타일 토글 UI (details/summary 태그 사용)
- 1개월/1년 로드맵 카드 포함
- 추천 링크 pill 버튼 형식으로 제공


---

## 🔄 프로젝트 전체 워크플로우

### 사용자 플로우

```
1. 사용자 회원가입/로그인 (React Frontend)
   └─ POST /api/auth/signup, /api/auth/login

2. 문서 업로드 (introduce.pdf, portfolio.pdf)
   └─ POST /api/documents/upload
       └─ Node.js Backend → MySQL 저장 + LangGraph Admin 호출

3. LangGraph Workflow 시작 (Session 생성)
   ├─ PDF 텍스트 추출 (PDF_Reader 마이크로서비스)
   │   └─ PyMuPDF로 introduce.txt, portfolio.txt 생성
   │
   ├─ AI 질문 생성 (Question_generator 마이크로서비스)
   │   └─ OpenAI GPT-5.1 + DuckDuckGo 검색
   │   └─ question_1.txt, question_2.txt, question_3.txt 생성
   │
   └─ Workflow Interrupt (Human-in-the-Loop)
       └─ 상태: waiting_for_upload

4. 면접 녹화 (React Frontend - InterviewRecord.js)
   ├─ 질문 1 표시 → 비디오/오디오 녹화 → interview_1.mp4, interview_1.wav
   ├─ 질문 2 표시 → 비디오/오디오 녹화 → interview_2.mp4, interview_2.wav
   └─ 질문 3 표시 → 비디오/오디오 녹화 → interview_3.mp4, interview_3.wav

5. 파일 업로드 및 Workflow 재개
   └─ POST /api/videos/upload
       └─ Node.js Backend → LangGraph 'continue_workflow' 호출

6. 병렬 분석 (6개 동시 실행)
   ├─ Face Analysis (3개)
   │   ├─ Face_Analysis 서비스 → interview_1.mp4 → Face_1.csv
   │   ├─ Face_Analysis 서비스 → interview_2.mp4 → Face_2.csv
   │   └─ Face_Analysis 서비스 → interview_3.mp4 → Face_3.csv
   │
   └─ Voice Analysis - STT (3개)
       ├─ Voice_Analysis 서비스 → interview_1.wav → Wav2Vec2 STT → Voice_1.txt
       ├─ Voice_Analysis 서비스 → interview_2.wav → Wav2Vec2 STT → Voice_2.txt
       └─ Voice_Analysis 서비스 → interview_3.wav → Wav2Vec2 STT → Voice_3.txt

7. Multi-Agent 평가 (3개 병렬)
   ├─ Attitude Agent
   │   └─ Face_1.csv, Face_2.csv, Face_3.csv 분석
   │   └─ Evaluation_Attitude_Summary.txt 생성
   │
   ├─ QA Relevance Agent
   │   └─ question_*.txt + Voice_*.txt 매칭 분석
   │   └─ Evaluation_QA_Relevance_Summary.txt 생성
   │
   └─ Consistency Agent
       └─ introduce.txt, portfolio.txt, Voice_*.txt 교차 검증
       └─ Evaluation_Consistency_Summary.txt 생성

8. Multi-Agent Debate (7-Round Sequential)
   └─ debate_node() 실행
       ├─ Round 1: Initial Evaluations
       ├─ Round 2: Cross-Examination
       ├─ Round 3: Rebuttals
       ├─ Round 4: Criteria Clarification
       ├─ Round 5: Evidence & Gaps Challenge
       ├─ Round 6: Closing Positions
       └─ Round 7: Final Consensus
           └─ Debate_Final_Report.md 생성 (✅Good/❌Bad/📈Development)

9. 포트폴리오 개발 추천 (병렬 실행)
   └─ portfolio_development_node()
       ├─ DuckDuckGo 검색으로 최신 프로그램/캠프 발굴
       ├─ 자기소개서/포트폴리오 피드백
       └─ Portfolio_Development_Report.md 생성

10. HTML 대시보드 생성
    └─ insight_dashboard_node()
        ├─ Debate_Final_Report.md + Portfolio_Development_Report.md 통합
        ├─ 웹 검색 결과 링크 추출 (최대 10개)
        ├─ 1개월 단기 로드맵 (주차별 4단계)
        ├─ 1년 장기 로드맵 (분기별 6단계)
        └─ Insight_Dashboard.html 생성

11. 결과 조회 (React Frontend - InterviewSummary.js)
    └─ GET /api/interviews/:id/feedback
        └─ HTML 대시보드 렌더링 + 다운로드 링크 제공
```

---

## 🛠 기술 스택

### Frontend
- **React** 19.2.0 - UI 라이브러리
- **React Router** 7.9.6 - SPA 라우팅
- **Create React App** 5.0.1 - 빌드 도구
- **Custom CSS** - 다크/라이트 테마 지원

### Backend (Node.js)
- **Express.js** 5.1.0 - REST API 서버
- **MySQL2** 3.15.3 - 관계형 데이터베이스
- **Multer** 2.0.2 - 파일 업로드
- **Bcrypt** 6.0.0 - 비밀번호 암호화
- **Socket.io** 4.8.1 - 실시간 통신
- **FFmpeg** - 비디오/오디오 변환
- **Axios** 1.13.2 - HTTP 클라이언트

### AI/ML Backend (Python)
- **LangGraph** ≥0.4.8 - Multi-Agent 워크플로우 오케스트레이션
- **LangChain** ≥0.3.25 - LLM 프레임워크
- **OpenAI API** - GPT-5.1 모델 사용
- **FastAPI** ≥0.110 - 마이크로서비스 REST API
- **PyMuPDF** ≥1.26.1 - PDF 텍스트 추출
- **py-feat** - 얼굴 표정 분석 (7가지 감정)
- **PyTorch** - 딥러닝 백엔드
- **OpenCV** (cv2) - 비디오 처리
- **Pandas** - 데이터 분석
- **DuckDuckGo Search** - 웹 검색 API
- **Uvicorn** ≥0.23 - ASGI 서버

### Infrastructure
- **Docker** + **Docker Compose** - 컨테이너화
- **MySQL** - 관계형 데이터베이스
- **Git** - 버전 관리

---

## 📁 프로젝트 구조

```
2025-X-Thon-Team7-Ayungieyong/
│
├── agent/                      # Python AI/ML 마이크로서비스
│   ├── admin/                  # LangGraph 오케스트레이터
│   │   ├── graph.py            # Multi-Agent Workflow 정의
│   │   ├── server.py           # FastAPI 서버 (/start, /upload, /status)
│   │   ├── session_manager.py # Session 상태 관리
│   │   └── requirements.txt
│   │
│   ├── PDF_Reader/             # PDF 텍스트 추출 (Port 8001)
│   │   ├── server.py           # PyMuPDF 기반 /extract 엔드포인트
│   │   └── requirements.txt
│   │
│   ├── Question_generator/     # 면접 질문 생성 (Port 8002)
│   │   ├── server.py           # OpenAI GPT + DuckDuckGo 검색
│   │   └── requirements.txt
│   │
│   ├── Face_Analysis/          # 얼굴 표정 분석 (Port 8003)
│   │   ├── server.py           # py-feat 기반 7가지 감정 분석
│   │   └── requirements.txt
│   │
│   ├── Voice_Analysis/         # 음성 분석 (Port 8004)
│   │   ├── server.py           # 음성 전사 및 감정 분석
│   │   └── requirements.txt
│   │
│   ├── uploads/                # 업로드 파일 저장 (PDF, 비디오, 오디오)
│   ├── outputs/                # 분석 결과 저장 (CSV, TXT, MD, HTML)
│   ├── docker-compose.yml      # 5개 마이크로서비스 오케스트레이션
│   ├── langgraph.json          # LangGraph 설정
│   └── .env                    # OpenAI API 키, LangChain 설정
│
├── back/                       # Node.js Backend API
│   ├── config/
│   │   ├── database.js         # MySQL 연결 풀
│   │   └── upload.js           # Multer 파일 업로드 설정
│   ├── controllers/            # API 컨트롤러
│   │   ├── documentController.js
│   │   ├── interviewController.js
│   │   ├── questionController.js
│   │   ├── videoController.js
│   │   └── feedbackController.js
│   ├── models/                 # MySQL 모델
│   │   ├── documentModel.js
│   │   ├── interviewModel.js
│   │   ├── questionModel.js
│   │   ├── videoModel.js
│   │   └── feedbackModel.js
│   ├── routes/                 # API 라우트 정의
│   │   └── index.js
│   ├── services/               # 비즈니스 로직 레이어
│   ├── middleware/             # 에러 핸들링 미들웨어
│   ├── server.js               # Express 서버 엔트리포인트
│   └── package.json
│
├── front/                      # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Main-Auth-Navbar/
│   │   │   │   ├── Main.js           # 메인 페이지
│   │   │   │   ├── Login.js          # 로그인
│   │   │   │   ├── SignUp.js         # 회원가입
│   │   │   │   ├── LightNavbar.js    # 라이트 테마 네비게이션
│   │   │   │   └── DarkNavbar.js     # 다크 테마 네비게이션
│   │   │   │
│   │   │   ├── Home_PopUp/
│   │   │   │   ├── Home.js           # 홈 페이지
│   │   │   │   └── PopUp.js          # 자기소개서 및 포트폴리오 업로드 팝업
│   │   │   │
│   │   │   └── Interview/
│   │   │       ├── InterviewRecord.js    # 면접 녹화 화면
│   │   │       ├── InterviewQuestion.js  # 질문별 상세 피드백
│   │   │       └── InterviewSummary.js   # 총평 확인인
│   │   │
│   │   ├── App.js              
│   │   └── index.js            
│   │
│   ├── public/                
│   └── package.json
│
└── README.md                  
```


## 📊 출력 결과물

### `/outputs/` 디렉토리 구조

```
outputs/
├── introduce.txt                              # 자기소개서 추출 텍스트
├── portfolio.txt                              # 포트폴리오 추출 텍스트
│
├── question_1.txt                             # 생성된 질문 1
├── question_2.txt                             # 생성된 질문 2
├── question_3.txt                             # 생성된 질문 3
│
├── Face_1.csv                                 # 질문 1 얼굴 표정 분석
├── Face_2.csv                                 # 질문 2 얼굴 표정 분석
├── Face_3.csv                                 # 질문 3 얼굴 표정 분석
│
├── Voice_1.txt                                # 질문 1 음성 전사
├── Voice_2.txt                                # 질문 2 음성 전사
├── Voice_3.txt                                # 질문 3 음성 전사
│
├── Evaluation_Attitude_Summary.txt            # Attitude Agent 평가
├── Evaluation_Attitude.csv                    # 질문별 감정 데이터
├── Evaluation_Attitude_Objective_Scores.csv   # 100점 만점 환산 점수
│
├── Evaluation_QA_Relevance_Summary.txt        # QA Relevance Agent 평가
├── Evaluation_QA_Relevance.csv                # 질문-답변 매칭 데이터
│
├── Evaluation_Consistency_Summary.txt         # Consistency Agent 평가
├── Evaluation_Consistency.csv                 # 문서-답변 일관성 데이터
│
├── Debate_Log.txt                             # 7-Round Debate 전체 로그
├── Debate_Final_Report.md                     # 최종 합의 보고서 (Markdown)
│
├── Portfolio_Search_Results.txt               # DuckDuckGo 검색 결과
├── Portfolio_Development_Report.md            # 포트폴리오 개발 보고서
│
└── Insight_Dashboard.html                     # 통합 HTML 대시보드
```

### 왜 Multi-Agent Debate인가?

1. **다양한 관점 통합**: 태도, 답변 품질, 일관성이라는 독립적인 3가지 측면에서 평가
2. **교차 검증**: 각 에이전트가 다른 에이전트의 평가를 검토하여 편향 감소
3. **증거 기반**: Round 4-5에서 평가 기준과 증거를 명시하여 객관성 확보
4. **합의 도출**: 7라운드를 통해 초기 평가 → 반박 → 기준 명시 → 최종 합의 단계적 진행
5. **LLM 환각 방지**: 다수의 에이전트가 서로 검증하여 잘못된 평가 필터링

---

## 🎓 학습 포인트

### Multi-Agent 시스템 구축
- LangGraph를 사용한 복잡한 워크플로우 오케스트레이션
- 병렬 노드 실행 및 상태 병합 전략
- Human-in-the-loop 패턴 (interrupt/resume)

### LLM Prompt Engineering
- System/User 역할 분리로 에이전트 페르소나 명확화
- Temperature 조절 (0.3: 객관적 평가, 0.7: 토론, 0.5: 합의)
- 구조화된 출력 요청 (Markdown 형식 강제)

### 마이크로서비스 아키텍처
- FastAPI 기반 독립적인 5개 서비스
- Docker Compose로 네트워크 분리 및 헬스 체크
- 서비스 간 HTTP 통신 (httpx 라이브러리)

### 딥러닝 모델 실전 배포
- py-feat를 통한 얼굴 표정 분석 (GPU/CPU 자동 전환)
- PyTorch 모델 초기화 실패 대응 (재시도 로직)
- 프레임 단위 분석 및 CSV 저장

---
## 🔗 참고 자료

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [py-feat Documentation](https://py-feat.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

