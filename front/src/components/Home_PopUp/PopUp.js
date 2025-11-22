import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingGif from '../../assets/loading.gif';
import './PopUp.css';

export default function PopUp({ onClose }) {
  const [interviewId, setInterviewId] = useState(null);

  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [questionCount, setQuestionCount] = useState('');

  const [uploadFile, setUploadFile] = useState([]);

  const [questions, setQuestions] = useState([]);

  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);

  const startInterviewProcess = async () => {
    try {
      console.log('=== 인터뷰 생성 & 질문 생성 프로세스 시작 ===');

      // 1) 인터뷰 생성
      const createRes = await fetch('/interview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          company,
          jobCategory: position,
          questions: [],
        }),
      });
      const createData = await createRes.json();

      if (!createData.success) throw new Error('인터뷰 생성 실패');
      const newInterviewId = createData.data.id;
      console.log('인터뷰 ID:', newInterviewId);

      // 2) introduce 업로드
      const form1 = new FormData();
      form1.append('introduce', uploadFile.resumeBackend);

      const resIntroduce = await fetch('/document/introduce/upload', {
        method: 'POST',
        body: form1,
      });
      const introduceData = await resIntroduce.json();

      if (!introduceData.success) throw new Error('자소서 업로드 실패');
      const introduceId = introduceData.data.id;
      console.log('자소서 문서 ID:', introduceId);

      // 3) portfolio 업로드
      const form2 = new FormData();
      form2.append('portfolio', uploadFile.portfolioBackend);

      const resPortfolio = await fetch('/document/portfolio/upload', {
        method: 'POST',
        body: form2,
      });
      const portfolioData = await resPortfolio.json();

      if (!portfolioData.success) throw new Error('포트폴리오 업로드 실패');
      const portfolioId = portfolioData.data.id;
      console.log('포트폴리오 문서 ID:', portfolioId);

      // 4) 질문 생성
      const qRes = await fetch('/question/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: newInterviewId,
          documentIds: [introduceId, portfolioId],
          jobCategory: position,
          questionCount: Number(questionCount),
        }),
      });
      const qData = await qRes.json();

      if (!qData.success || !qData.data.questions?.length) throw new Error('질문 생성 실패');

      console.log('생성된 질문 개수:', qData.data.questions.length);

      // 5) 웹캠 페이지 이동
      navigate(`/interview/${newInterviewId}/webcam`);
    } catch (err) {
      console.error('오류 발생:', err.message);
      alert('문제가 발생했습니다: ' + err.message);
      setStep(4);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (step !== 4) return;

    async function checkDevices() {
      try {
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => t.stop());
          setMediaStream(null);
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setMediaStream(stream);

        // 카메라／마이크 체크
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

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [mediaStream]);

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        {/* step UI */}
        {step === 1 && (
          <div>
            <h2 className="popup-title">새 면접 만들기</h2>
            <p style={{ textAlign: 'center' }}>면접에 대한 기본 정보를 입력해주세요.</p>

            {/* 면접 제목 */}
            <div style={{ marginBottom: '5px' }}>
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
            <div style={{ marginBottom: '5px' }}>
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
            <div style={{ marginBottom: '5px' }}>
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
            <div style={{ marginBottom: '5px' }}>
              <label className="popup-label">질문 수</label>
              <select value={questionCount} onChange={(e) => setQuestionCount(e.target.value)} className="popup-select">
                <option value="">선택하세요</option>
                {Array.from({ length: 8 }, (_, i) => i + 3).map((num) => (
                  <option key={num} value={num}>
                    {num}개
                  </option>
                ))}
              </select>
            </div>
            <div className="popup-buttons-fixed">
              <button className="popup-cancel" onClick={onClose}>
                취소
              </button>
              <button className="popup-next" onClick={handleNext} disabled={!title || !position || !questionCount}>
                다음
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="popup-title">파일 업로드</h2>
            <p style={{ textAlign: 'center' }}>자기소개서/포트폴리오를 업로드 해주세요.</p>

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

                  // 백엔드 전송용 파일명 변경
                  const backendPortfolio = new File([uploadFile.portfolio], 'portfolio.pdf', {
                    type: uploadFile.portfolio.type,
                  });

                  const backendResume = new File([uploadFile.resume], 'introduce.pdf', {
                    type: uploadFile.resume.type,
                  });

                  // 백엔드에서 사용할 파일을 따로 저장
                  setUploadFile({
                    ...uploadFile,
                    portfolioBackend: backendPortfolio,
                    resumeBackend: backendResume,
                  });

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
            <p>연습하고 싶은 면접 질문을 추가해주세요.</p>

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
            <h2 className="popup-title">디바이스 체크</h2>

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
            <div className="popup-buttons-fixed">
              <button
                className="popup-cancel"
                onClick={() => {
                  if (mediaStream) {
                    mediaStream.getTracks().forEach((t) => t.stop());
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

                  setStep(5); // step5로 전환
                  startInterviewProcess(); // 전체 백엔드 작업 시작
                }}
              >
                시작하기
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div
            className="popup-step-wrapper"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '380px',
              textAlign: 'center',
              gap: '20px',
            }}
          >
            <img
              marginTop="30px"
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
