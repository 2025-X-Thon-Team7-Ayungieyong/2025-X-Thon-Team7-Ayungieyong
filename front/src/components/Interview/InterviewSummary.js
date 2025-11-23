import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './InterviewSummary.css';
import goodEmoji from '../../assets/GoodEmoji.png';
import badEmoji from '../../assets/BadEmoji.png';
import devEmoji from '../../assets/DevelopmentEmoji.png';
import bgImage from '../../assets/background.png';

function InterviewSummary() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 백엔드 연동 전, 임시 피드백 mock
  const GOOD = [
    '질문 의도를 정확히 이해하고 백엔드·아키텍처 개념을 상황에 맞게 설명함.',
    '트래픽·협업·운영까지 고려하는 시야와 성장 목표가 분명함.',
  ];
  const BAD = [
    '표정과 톤에서 긴장이 드러나고, 사례 부족으로 실무 경험이 모호함.',
    '표현이 다소 부정확하며 포지션·경험 수준이 불일치해 과장처럼 보일 위험이 있음.',
  ];
  const DEV = [
    '비언어 스킬(표정·호흡·말 끝 처리) 개선과 답변 구조화를 통한 명확한 전달 필요.',
    '용어·설계 개념을 실제 프로젝트에 적용해 경험 기반 설명으로 보완할 것.',
  ];

  const QUESTIONS = [
    { id: 1, title: '자신의 장점과 단점을 말해주세요.' },
    { id: 2, title: '갈등 해결 경험을 말해주세요.' },
    { id: 3, title: '어려웠던 역할은 무엇인가요?' },
  ];

  const [questions, setQuestions] = useState([]);
  const [totalFeedback, setTotalFeedback] = useState({
    good: [],
    bad: [],
    dev: [],
  });

  // 질문 수 (나중에 백엔드에서 받아올 예정)
  // const TOTAL_QUESTIONS = 3;

  // const [questions, setQuestions] = useState([]);

  // 질문 목록 호출 시도
  useEffect(() => {
    // const loadQuestions = async () => {
    //   try {
    //     const res = await fetch(`/api/question/list/${id}`);
    //     const data = await res.json();
    //     if (Array.isArray(data)) setQuestions(data);
    //     else setQuestions([]);
    //   } catch (err) {
    //     console.log('질문 API 실패 → 프론트 임시 데이터 사용');
    //     setQuestions([
    //       { id: 1, title: '자신의 장점과 단점을 말해주세요.' },
    //       { id: 2, title: '갈등 해결 경험을 말해주세요.' },
    //       { id: 3, title: '어려웠던 역할은 무엇인가요?' },
    //     ]);
    //   }
    // };
    // loadQuestions();
    // 질문 목록 하드코딩 적용
    setQuestions(QUESTIONS);

    // 전체 피드백 하드코딩 적용
    setTotalFeedback({
      good: GOOD,
      bad: BAD,
      dev: DEV,
    });
  }, [id]);

  // 전체 피드백 호출
  // useEffect(() => {
  //   const loadFeedback = async () => {
  //     try {
  //       const res = await fetch(`/api/feedback/${id}`);
  //       const data = await res.json();

  //       const good = data.good || [];
  //       const bad = data.bad || [];
  //       const dev = data.dev || [];

  //       setTotalFeedback({ good, bad, dev });
  //     } catch (err) {
  //       console.error('전체 피드백 API 실패', err);
  //       setTotalFeedback({ good: [], bad: [], dev: [] });
  //     }
  //   };

  //   loadFeedback();
  // }, [id]);

  return (
    <div className="summary-page-container">
      <div
        className="summary-bg"
        style={{
          backgroundImage: `url(${bgImage})`,
        }}
      ></div>
      {/* 상단 직무명 (일단 하드코딩) */}
      <div
        className="summary-title-banner"
        style={{
          position: 'relative',
          zIndex: 5,
          color: 'white',
        }}
      >
        카카오 백엔드
      </div>
      {/* 전체 wrapper */}
      <div className="summary-card-wrapper">
        {/* 타이틀 */}
        <div className="summary-header">총평</div>

        {/* 피드백 박스 */}
        <div className="summary-section">
          {/* GOOD */}
          <div className="summary-card">
            <div className="summary-card-title">
              <img src={goodEmoji} alt="good" className="emoji-icon" /> GOOD
            </div>
            <ul>
              {/* {totalFeedback.good.length > 0 ? (
              totalFeedback.good.map((t, i) => <li key={i}>{t}</li>)
            ) : (
              <li>좋은 피드백이 없습니다.</li>
            )} */}
              {totalFeedback.good.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          {/* BAD */}
          <div className="summary-card">
            <div className="summary-card-title">
              {/* <img src={badEmoji} alt="bad" className="emoji-icon" /> BAD
          </div>
          <ul>
            {totalFeedback.bad.length > 0 ? (
              totalFeedback.bad.map((t, i) => <li key={i}>{t}</li>)
            ) : (
              <li>부정적 피드백이 없습니다.</li>
            )}
          </ul> */}
              <img src={badEmoji} alt="bad" className="emoji-icon" /> BAD
            </div>
            <ul>
              {totalFeedback.bad.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          {/* DEV */}
          <div className="summary-card">
            <div className="summary-card-title">
              {/* <img src={devEmoji} alt="development" className="emoji-icon" /> DEVELOPMENT
          </div>
          <ul>
            {totalFeedback.dev.length > 0 ? (
              totalFeedback.dev.map((t, i) => <li key={i}>{t}</li>)
            ) : (
              <li>개선할 점이 없습니다.</li>
            )}
          </ul> */}
              <img src={devEmoji} alt="development" className="emoji-icon" /> DEVELOPMENT
            </div>
            <ul>
              {totalFeedback.dev.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* 질문 버튼 */}
        <div className="summary-list-scroll">
          {questions.map((q) => (
            <button key={q.id} className="nav-btn" onClick={() => navigate(`/interview/${id}/question/${q.id}`)}>
              면접 질문 {q.id}
            </button>
          ))}

          {/* 다시 총평(현재 페이지) */}
          <button className="summarypage-btn">총평</button>
          <button
            className="summarypage-btn"
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

export default InterviewSummary;
