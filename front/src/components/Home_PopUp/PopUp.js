import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingGif from '../../assets/loading.gif';
import './PopUp.css';

export default function PopUp({ onClose }) {
  const [interviewId, setInterviewId] = useState(null);

  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const handleNext = () => {
    setTimeout(() => {
      setStep((prev) => prev + 1);
    }, 500); // 0.5초 딜레이
  };
  const handlePrev = () => setStep(step - 1);

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [questionCount, setQuestionCount] = useState('');

  const [uploadFile, setUploadFile] = useState({});

  const [questions, setQuestions] = useState([]);

  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    if (step !== 4) return;

    async function checkDevices() {
      try {
        // 기존 스트림 정리
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        mediaStreamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        setCameraOk(!!videoTrack);
        setMicOk(!!audioTrack);

        const videoElement = document.getElementById('previewVideo');
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      } catch (err) {
        console.error('디바이스 체크 실패:', err);
        setCameraOk(false);
        setMicOk(false);
      }
    }

    checkDevices();
  }, [step]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (step === 5) {
      const timer = setTimeout(() => {
        const newInterviewId = 1; // 임시 ID 유지
        navigate(`/interview/${newInterviewId}/webcam`);
      }, 2000); // 2초

      return () => clearTimeout(timer);
    }
  }, [step, navigate]);

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        {/* step UI */}
        {step === 1 && (
          <div>
            <h2 className="popup-title">새 면접 만들기</h2>

            <div className="popup-inputsss">
              {/* 면접 제목 */}
              <div>
                <label className="popup-label">면접장 제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="면접장 제목을 입력하세요"
                  className="popup-input"
                />
              </div>
              {/* 회사명 추가됨 */}
              <div>
                <label className="popup-label">면접 볼 회사</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="예: 삼성전자 / 카카오 / 네이버"
                  className="popup-input"
                />
              </div>

              {/* 직군 */}
              <div>
                <label className="popup-label">직군</label>
                <select value={position} onChange={(e) => setPosition(e.target.value)} className="popup-select">
                  <option value="">선택하세요</option>
                  <option value="프론트">프론트 개발자</option>
                  <option value="백엔드">백엔드 개발자</option>
                  <option value="디자인">디자인</option>
                  <option value="기획">기획</option>
                  <option value="데이터">데이터</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* 질문 수 */}
              <div>
                <label className="popup-label">질문 수</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  className="popup-select"
                >
                  <option value="">선택하세요</option>
                  {Array.from({ length: 8 }, (_, i) => i + 3).map((num) => (
                    <option key={num} value={num}>
                      {num}개
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="popup-buttons-fixed">
              <button className="popup-cancel" onClick={onClose}>
                취소
              </button>
              <button
                className="popup-next"
                onClick={handleNext}
                disabled={!title || !company || !position || !questionCount}
              >
                다음
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="popup-title">파일 업로드</h1>
            <div className="popup-inputsss">
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>자기소개서/포트폴리오를 업로드 해주세요.</div>

              {/* 숨겨진 input */}
              <input
                type="file"
                accept="application/pdf"
                id="resumeInput"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && file.type !== 'application/pdf') {
                    alert('PDF 파일만 업로드할 수 있습니다.');
                    return;
                  }
                  setUploadFile((prev) => ({
                    ...prev,
                    resume: file,
                  }));
                }}
              />

              <input
                type="file"
                accept="application/pdf"
                id="portfolioInput"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && file.type !== 'application/pdf') {
                    alert('PDF 파일만 업로드할 수 있습니다.');
                    return;
                  }
                  setUploadFile((prev) => ({
                    ...prev,
                    portfolio: file,
                  }));
                }}
              />

              {/* 자기소개서 업로드 버튼 */}
              <div onClick={() => document.getElementById('resumeInput').click()} className="upload-box">
                {/* 파일 업로드 전에는 아이콘 + 텍스트 */}
                {!uploadFile.resume ? (
                  <>
                    <img src={require('../../assets/file.png')} alt="file icon" className="upload-icon" />
                    <div>자기소개서 업로드</div>
                  </>
                ) : (
                  <div className="upload-text">{uploadFile.resume.name}</div>
                )}
              </div>

              {/* 포트폴리오 업로드 버튼 */}
              <div onClick={() => document.getElementById('portfolioInput').click()} className="upload-box">
                {!uploadFile.portfolio ? (
                  <>
                    <img src={require('../../assets/file.png')} alt="file icon" className="upload-icon" />
                    <div>포트폴리오 업로드</div>
                  </>
                ) : (
                  <div className="upload-text">{uploadFile.portfolio.name}</div>
                )}
              </div>
            </div>
            {/* 이전/다음 버튼 */}
            <div className="popup-buttons-fixed">
              <button className="popup-cancel" onClick={handlePrev}>
                이전
              </button>

              <button
                className="popup-next"
                onClick={() => {
                  if (!uploadFile.portfolio || !uploadFile.resume) {
                    alert('자기소개서와 포트폴리오를 모두 업로드해주세요.');
                    return;
                  }

                  handleNext();
                }}
              >
                다음
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="popup-step-wrapper">
            <h2 className="popup-title">질문 추가</h2>
            <div className="popup-inputsss">
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>연습하고 싶은 면접 질문을 추가해주세요.</div>

              {/* 질문 input 리스트 */}
              <div className="question-list">
                {questions.map((q, idx) => (
                  <div key={idx} className="question-item">
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[idx] = e.target.value;
                        setQuestions(updated);
                      }}
                      className="question-input"
                    />

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => {
                        const updated = [...questions];
                        updated.splice(idx, 1);
                        setQuestions(updated);
                      }}
                      className="question-delete"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>

              {/* 새 질문 만들기 버튼 */}
              <button
                onClick={() => {
                  if (questions.length >= Number(questionCount)) {
                    alert(`질문 수를 초과했습니다. (최대 ${questionCount}개)`);
                    return;
                  }
                  setQuestions([...questions, '']);
                }}
                className="question-add-box"
              >
                새 질문 만들기
              </button>
            </div>

            {/* 이동 버튼 */}
            <div className="popup-buttons-fixed">
              <button className="popup-cancel" onClick={handlePrev}>
                이전
              </button>
              <button
                className="popup-next"
                onClick={() => {
                  // 질문이 1개 이상이면 빈 값 체크
                  if (questions.length > 0) {
                    const hasEmpty = questions.some((q) => !q.trim());
                    if (hasEmpty) {
                      alert('입력되지 않은 질문이 있습니다. 내용을 입력하거나 삭제해주세요.');
                      return;
                    }
                  }

                  handleNext();
                }}
              >
                다음
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step4-wrapper">
            <h1 className="popup-title">디바이스 체크</h1>
            <div className="popup-inputsss">
              {/* 캠 미리보기 영역 */}
              <div className="device-video-box">
                <video id="previewVideo" autoPlay playsInline muted className="device-video" />
              </div>

              {/* 상태 표시 */}
              <div className="device-status-row">
                {/* 카메라 상태 */}
                <div className={`device-status ${cameraOk ? 'ok' : 'no'}`}>
                  {cameraOk ? '📷 카메라 연결됨' : '📷 카메라 연결 안됨'}
                </div>

                {/* 마이크 상태 */}
                <div className={`device-status ${micOk ? 'ok' : 'no'}`}>
                  {micOk ? '🎤 마이크 연결됨' : '🎤 마이크 연결 안됨'}
                </div>
              </div>
            </div>
            <div className="popup-buttons-fixed">
              <button
                className="popup-cancel"
                onClick={() => {
                  if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach((t) => t.stop());
                  }
                  handlePrev();
                }}
              >
                이전
              </button>

              <button
                className="popup-next"
                onClick={() => {
                  if (!cameraOk || !micOk) {
                    alert('카메라 또는 마이크가 연결되지 않았습니다.');
                    return;
                  }

                  setStep(5);
                }}
              >
                시작하기
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="popup-step-wrapper">
            <img
              src={loadingGif}
              alt="loading"
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'contain',
                marginBottom: '5px',
              }}
            />

            <p
              style={{
                fontSize: '28px',
                color: 'white',
                fontWeight: 500,
              }}
            >
              처리 중 입니다...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
