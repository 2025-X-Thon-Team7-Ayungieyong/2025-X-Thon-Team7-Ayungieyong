import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './InterviewQuestion.css';
import bgImage from '../../assets/background.png';

function InterviewQuestionPage() {
  const { id, qid } = useParams(); // interview id + question id
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  // const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState([]);

  // 백엔드 연동 시 사용될 기본 질문 목록 (fallback)
  const FALLBACK_QUESTIONS = [
    {
      id: 1,
      title:
        '프론트엔드 경험이 많은 편인데, 본인이 보유한 백엔드 역량은 어떤 것들이 있고, 입사 후 6개월 동안 백엔드 역할에 어떻게 적응하고 성장해갈 계획인지 설명해주세요.',
    },
    {
      id: 2,
      title:
        '학부 시절 개발했던 커뮤니티 서비스를 카카오처럼 트래픽이 큰 서비스 기준으로 다시 설계한다면, 백엔드 관점에서 어떤 부분을 중심으로 어떻게 개선하실지 설명해주세요.',
    },
    {
      id: 3,
      title:
        '이전 회사에서의 경험을 바탕으로, 코드 리뷰나 배포와 모니터링 같은 백엔드 프로세스를 어떻게 더 효율적이고 안정적으로 만들 수 있을지 설명해주세요.',
    },
  ];

  // 현재 영상 URL
  // const videoUrl = `/videos/interview_${qid}.mp4`;

  // 질문 개수 백엔드에서 연동하여 받아옴
  // const TOTAL_QUESTIONS = questions.length;

  // 질문 API 호출
  // useEffect(() => {
  //   const fetchQuestions = async () => {
  //     try {
  //       const res = await fetch(`/api/question/list/${id}`);
  //       const text = await res.text();

  //       let data;
  //       try {
  //         data = JSON.parse(text);
  //       } catch {
  //         data = FALLBACK_QUESTIONS;
  //       }

  //       setQuestions(data);
  //     } catch {
  //       setQuestions(FALLBACK_QUESTIONS); // 실패하면 fallback으로 진행
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchQuestions();
  // }, [id]);

  // 질문별 피드백 하드코딩
  const FEEDBACK = {
    1: ['프론트엔드 경험을 토대로 서버 구조를 이해하려는 태도가 좋습니다.'],
    2: ['캐싱, 샤딩, 비동기 처리 등 현실적인 아키텍처 기법의 언급이 더 필요합니다.'],
    3: ['모니터링 지표나 배포 자동화(CI/CD) 도구에 대한 구체적인 언급이 부족합니다.'],
  };

  // 질문별 하드코딩
  useEffect(() => {
    setQuestions(FALLBACK_QUESTIONS);
  }, [id]);

  // 질문별 피드백 하드코딩 적용
  useEffect(() => {
    setFeedback(FEEDBACK[qid] ?? []);
  }, [id, qid]);

  // 질문별 피드백 API 호출
  //   const fetchFeedback = async () => {
  //     try {
  //       // videoId 규칙: interviewId_questionId 형태라고 가정
  //       const videoId = `${id}_${qid}`;

  //       const res = await fetch(`/api/feedback/detail/${videoId}`);
  //       const data = await res.json();

  //       if (Array.isArray(data)) {
  //         setFeedback(data);
  //       } else if (data.feedback) {
  //         setFeedback(data.feedback);
  //       } else {
  //         setFeedback([]);
  //       }
  //     } catch (err) {
  //       console.error('피드백 불러오기 실패', err);
  //       setFeedback([]);
  //     }
  //   };

  //   fetchFeedback();
  // }, [id, qid]); // 질문이 바뀌면 새 피드백 조회

  // if (loading) return <div>로딩 중...</div>;

  const currentQuestion = questions.find((q) => q.id === Number(qid));
  // const TOTAL_QUESTIONS = questions.length;

  return (
    <div className="interview-page-container">
      <div
        className="interview-bg"
        style={{
          backgroundImage: `url(${bgImage})`,
        }}
      ></div>
      {/* 상단 직무명 (일단 하드코딩) */}
      <div
        className="job-title-banner"
        style={{
          position: 'relative',
          zIndex: 5,
          color: 'white',
        }}
      >
        카카오 백앤드
      </div>
      {/* 전체 wrapper */}
      <div className="interview-card-wrapper">
        {/* 질문 text */}
        <div className="question-header">
          질문{qid}. {currentQuestion?.title || '질문을 찾을 수 없습니다.'}
        </div>
        {/* 영상 + 피드백 */}
        <div className="main-section">
          <div className="video-box">
            {/* <video src={videoUrl} controls className="question-video" /> */}
            <video className="question-video" controls>
              {/* <source src={`/videos/interview_${qid}.webm`} type="video/webm" />
              <source src={`/videos/interview_${qid}.mp4`} type="video/mp4" />
              브라우저가 동영상을 지원하지 않습니다. */}
              <source src={`${process.env.PUBLIC_URL}/ex_video.mp4`} type="video/mp4" />
            </video>
          </div>

          <div className="feedback-box">
            <div className="feedback-title">피드백</div>
            <ul className="feedback-list">
              {feedback.length > 0 ? (
                feedback.map((item, idx) => <li key={idx}>{item}</li>)
              ) : (
                <li>피드백이 없습니다.</li>
              )}
            </ul>
          </div>
        </div>

        {/* 버튼 리스트*/}
        <div className="video-list-scroll">
          {questions.map((q) => (
            <button
              key={q.id}
              className={`video-btn ${Number(qid) === q.id ? 'active' : ''}`}
              onClick={() => navigate(`/interview/${id}/question/${q.id}`)}
            >
              면접 질문 {q.id}
            </button>
          ))}
          {/* 총평 버튼*/}
          <button className="summary-btn" onClick={() => navigate(`/interview/${id}/summary`)}>
            총평
          </button>
          <button
            className="summary-btn"
            onClick={() => {
              const link = document.createElement('a');
              link.href = process.env.PUBLIC_URL + '/my_roadmap.html';
              link.download = '나만의_로드맵.html';
              link.click();
            }}
          >
            나만의 <br></br>로드맵
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewQuestionPage;
