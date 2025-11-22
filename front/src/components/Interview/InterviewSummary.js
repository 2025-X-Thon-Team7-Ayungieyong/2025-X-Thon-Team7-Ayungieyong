import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './InterviewSummary.css';
import goodEmoji from '../../assets/GoodEmoji.png';
import badEmoji from '../../assets/BadEmoji.png';
import devEmoji from '../../assets/DevelopmentEmoji.png';

function InterviewSummary() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 백엔드 연동 전, 임시 피드백 mock
  const GOOD = ['표정이 좋습니다.', '시선이 흔들리지 않습니다.'];
  const BAD = ['발성이 불안정합니다.', '프로젝트 경험 숙지가 부족합니다.'];
  const DEV = ['더 크게 말씀하세요.', '내용 숙지에 신경쓰세요.'];

  // 질문 수 (나중에 백엔드에서 받아올 예정)
  const TOTAL_QUESTIONS = 3;

  const [questions, setQuestions] = useState([]);

  // 질문 목록 호출 시도
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/interview/${id}/questions`);
        const data = await res.json();

        if (Array.isArray(data)) setQuestions(data);
        else setQuestions([]);
      } catch (err) {
        console.log('질문 API 실패 → 프론트 임시 데이터 사용');
        setQuestions([
          { id: 1, title: '자신의 장점과 단점을 말해주세요.' },
          { id: 2, title: '갈등 해결 경험을 말해주세요.' },
          { id: 3, title: '어려웠던 역할은 무엇인가요?' },
        ]);
      }
    };

    load();
  }, [id]);

  return (
    <div className="summary-container">
      <div className="summary-job-title">삼성 SDK 면접</div>

      {/* 타이틀 */}
      <div className="summary-header">총평</div>

      {/* GOOD / BAD / DEV 박스 */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-title">
            <img src={goodEmoji} alt="good" className="emoji-icon" /> GOOD
          </div>
          <ul>
            {GOOD.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>

        <div className="summary-card">
          <div className="summary-card-title">
            <img src={badEmoji} alt="bad" className="emoji-icon" /> BAD
          </div>
          <ul>
            {BAD.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>

        <div className="summary-card">
          <div className="summary-card-title">
            <img src={devEmoji} alt="development" className="emoji-icon" /> DEVELOPMENT
          </div>
          <ul>
            {DEV.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 아래 질문 리스트 */}
      <div className="summary-bottom-nav">
        {questions.map((q) => (
          <button key={q.id} className="nav-btn" onClick={() => navigate(`/interview/${id}/question/${q.id}`)}>
            면접 질문 {q.id}
          </button>
        ))}

        {/* 다시 총평(현재 페이지) */}
        <button className="nav-btn active">총평</button>
      </div>
    </div>
  );
}

export default InterviewSummary;
