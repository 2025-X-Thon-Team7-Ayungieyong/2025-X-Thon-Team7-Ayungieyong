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
        '프론트엔드 중심의 경험이 많은데, 백엔드 역량은 어떤 식으로 보완해 왔는지, 그리고 입사 후 1년 안에 어떤 수준의 백엔드 개발자로 성장할 계획인지 설명해주세요.',
    },
    {
      id: 2,
      title:
        '대규모 트래픽 환경을 가정할 때, 로그인, 채팅, 푸시 같은 핵심 API를 어떻게 설계하실 건가요? 성능과 안정성을 위해 어떤 아키텍처적 고려를 하실지 구체적으로 말씀해주세요.',
    },
    {
      id: 3,
      title:
        '이미 운영 중인 레거시 백엔드를 점진적으로 개선해야 한다면, 어떤 기준으로 우선순위를 정하고, 어떻게 협업 구조를 설계해 개선을 추진할지 본인의 실제 경험을 바탕으로 설명해 주세요.',
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
    1: [
      '백엔드 역량을 "사용 경험"이 아닌 “설계·운영 관점”으로 더 구체적으로 말했으면 좋습니다.',
      '1년 후 목표가 기술 키워드 나열에 그쳐서, “어떤 도메인을 책임질지”가 조금 더 명확하면 좋습니다.',
    ],
    2: [
      '트래픽 병목 지점을 구체적으로 짚지 못해 성능 고려가 부족해 보였습니다.',
      '로그인·채팅·푸시의 특성 차이를 반영한 아키텍처 설계가 미흡했습니다.',
    ],
    3: [
      '레거시 개선 우선순위를 “데이터·트래픽·리스크 기반”으로 설명하면 더 설득력이 높습니다.',
      '협업 방식이 추상적이어서 실제 경험 기반의 절차나 사례가 더 필요해 보였습니다.',
    ],
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
        카카오 백엔드
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
