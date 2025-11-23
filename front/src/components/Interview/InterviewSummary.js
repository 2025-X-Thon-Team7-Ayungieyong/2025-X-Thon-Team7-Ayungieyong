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
    '표정과 시선이 안정적이고 말투가 차분해서 전반적인 전달력이 좋습니다.',
    '답변할 때 불필요한 긴장감이 적어 듣는 사람이 편안하게 느낄 수 있습니다.',
  ];
  const BAD = [
    '기술적인 설명이 추상적이어서 핵심 메시지가 약하게 느껴집니다.',
    '예시나 수치를 더 구체적으로 제시했으면 설득력이 훨씬 높았을 것입니다.',
  ];
  const DEV = [
    '각 답변에 기술 요소를 조금 더 명확하게 포함하면 전문성이 더 잘 드러납니다.',
    '말의 마무리를 단정하게 하고 어휘 선택을 조금만 다듬으면 표현력이 향상될 것입니다.',
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
        카카오 백앤드
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
