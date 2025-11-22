import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './InterviewQuestion.css';
import bgImage from '../../assets/background.png';

function InterviewQuestionPage() {
  const { id, qid } = useParams(); // interview id + question id
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 백엔드 연동 시 사용될 기본 질문 목록 (fallback)
  const FALLBACK_QUESTIONS = [
    { id: 1, title: '자기소개를 해주세요.' },
    { id: 2, title: '자신의 장점과 단점을 말해주세요.' },
    { id: 3, title: '최근 해결한 문제 상황을 설명해주세요.' },
  ];

  // 현재 영상 URL
  const videoUrl = `/videos/interview_${id}_q${qid}.webm`;

  // 질문 개수 백엔드에서 연동하여 받아옴
  // const TOTAL_QUESTIONS = questions.length;

  // 질문 API 호출
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/interview/${id}/questions`);
        const text = await res.text();

        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = FALLBACK_QUESTIONS;
        }

        setQuestions(data);
      } catch {
        setQuestions(FALLBACK_QUESTIONS); // 실패하면 fallback으로 진행
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [id]);

  if (loading) return <div>로딩 중...</div>;

  const currentQuestion = questions.find((q) => q.id === Number(qid));
  const TOTAL_QUESTIONS = questions.length;

  return (
    <div className="interview-page-container">
      <div
        className="interview-bg"
        style={{
          backgroundImage: `url(${bgImage})`,
        }}
      ></div>
      {/* 상단 직무명 (일단 하드코딩) */}
      <div className="job-title-banner">삼성 SDK 면접</div>
      {/* 전체 wrapper */}
      <div className="interview-card-wrapper">
        {/* 질문 text */}
        <div className="question-header">
          질문{qid}. {currentQuestion?.title || '질문을 찾을 수 없습니다.'}
        </div>
        {/* 영상 + 피드백 */}
        <div className="main-section">
          <div className="video-box">
            <video src={videoUrl} controls className="question-video" />
          </div>

          <div className="feedback-box">
            <div className="feedback-title">피드백</div>
            <ul className="feedback-list">
              <li>발성이 불안정합니다.</li>
              <li>말이 빠릅니다. 천천히 말씀하세요.</li>
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
        </div>
      </div>
    </div>
  );
}

export default InterviewQuestionPage;
