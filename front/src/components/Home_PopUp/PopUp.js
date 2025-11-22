import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingGif from '../../assets/loading.gif';

export default function PopUp({ onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const [title, setTitle] = useState('');
  const [position, setPosition] = useState('');
  const [questionCount, setQuestionCount] = useState('');

  const [uploadFile, setUploadFile] = useState([]);

  const [questions, setQuestions] = useState([]);

  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);

  const [mediaStream, setMediaStream] = useState(null);

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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          width: '400px',
          minHeight: '280px',
        }}
      >
        {/* step UI */}
        {step === 1 && (
          <div>
            <h2>새 면접 만들기 (Step 1)</h2>
            <p>면접에 대한 기본 정보를 입력해주세요.</p>

            {/* 면접 제목 */}
            <div style={{ marginBottom: '10px' }}>
              <label>면접장 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 삼성 SDK 면접"
                style={{ width: '95%', padding: '6px' }}
              />
            </div>

            {/* 직군 */}
            <div style={{ marginBottom: '10px' }}>
              <label>직군</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                style={{ width: '100%', padding: '6px' }}
              >
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
            <div style={{ marginBottom: '10px' }}>
              <label>질문 수</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                style={{ width: '100%', padding: '6px' }}
              >
                <option value="">선택하세요</option>
                {Array.from({ length: 8 }, (_, i) => i + 3).map((num) => (
                  <option key={num} value={num}>
                    {num}개
                  </option>
                ))}
              </select>
            </div>

            <button onClick={onClose}>취소</button>
            <button onClick={handleNext} disabled={!title || !position || !questionCount}>
              다음
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>파일 업로드 (Step 2)</h2>
            <p>자기소개서/포트폴리오를 업로드 해주세요.</p>

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
            <div
              onClick={() => document.getElementById('resumeInput').click()}
              style={{
                width: '100%',
                height: '90px',
                border: '2px solid #444',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              {/* 파일 업로드 전에는 아이콘 + 텍스트 */}
              {!uploadFile.resume ? (
                <>
                  <div style={{ fontSize: '28px' }}>📁</div>
                  <div>자기소개서 업로드</div>
                </>
              ) : (
                <div>{uploadFile.resume.name}</div>
              )}
            </div>

            {/* 포트폴리오 업로드 버튼 */}
            <div
              onClick={() => document.getElementById('portfolioInput').click()}
              style={{
                width: '100%',
                height: '90px',
                border: '2px solid #444',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                marginBottom: '15px',
              }}
            >
              {!uploadFile.portfolio ? (
                <>
                  <div style={{ fontSize: '28px' }}>📁</div>
                  <div>포트폴리오 업로드</div>
                </>
              ) : (
                <div>{uploadFile.portfolio.name}</div>
              )}
            </div>

            {/* 이전/다음 버튼 */}
            <button onClick={handlePrev}>이전</button>

            <button
              onClick={() => {
                if (!uploadFile.portfolio || !uploadFile.resume) {
                  alert('자기소개서와 포트폴리오를 모두 업로드해주세요.');
                  return;
                }

                // 백엔드 전송용 파일명 변경
                const backendPortfolio = new File([uploadFile.portfolio], 'portfolio.pdf', {
                  type: uploadFile.portfolio.type,
                });

                const backendResume = new File([uploadFile.resume], 'introduce.pdf', { type: uploadFile.resume.type });

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
        )}

        {step === 3 && (
          <div>
            <h2>질문 추가 (Step 3)</h2>
            <p>연습하고 싶은 면접 질문을 추가해주세요.</p>

            {/* 질문 input 리스트 */}
            <div
              style={{
                marginBottom: '10px',
                maxHeight: '250px',
                overflowY: 'auto',
                paddingRight: '5px',
              }}
            >
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[idx] = e.target.value;
                      setQuestions(updated);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                    }}
                  />

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => {
                      const updated = [...questions];
                      updated.splice(idx, 1);
                      setQuestions(updated);
                    }}
                    style={{
                      marginLeft: '5px',
                    }}
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
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '10px',
              }}
            >
              새 질문 만들기
            </button>

            {/* 이동 버튼 */}
            <div style={{ marginTop: '20px' }}>
              <button onClick={handlePrev}>이전</button>
              <button
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
          <div>
            <h2>디바이스 체크</h2>

            {/* 캠 미리보기 영역 */}
            <div
              style={{
                width: '100%',
                height: '220px',
                backgroundColor: '#eee',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '15px',
              }}
            >
              <video
                id="previewVideo"
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            </div>

            {/* 상태 표시 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {/* 카메라 상태 */}
              <div
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: cameraOk ? '#d4f7d4' : '#ffd4d4',
                  color: cameraOk ? '#0a7a0a' : '#b80000',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {cameraOk ? '📷 카메라 연결됨' : '📷 카메라 연결 안됨'}
              </div>

              {/* 마이크 상태 */}
              <div
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: micOk ? '#d4f7d4' : '#ffd4d4',
                  color: micOk ? '#0a7a0a' : '#b80000',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {micOk ? '🎤 마이크 연결됨' : '🎤 마이크 연결 안됨'}
              </div>
            </div>
            <button
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
              onClick={async () => {
                if (!cameraOk || !micOk) {
                  alert('카메라 또는 마이크가 연결되지 않았습니다.');
                  return;
                }
                setStep(5);

                try {
                  await new Promise((resolve) => setTimeout(resolve, 1500));

                  const interviewId = 1; // 임시 값

                  navigate(`/interview/${interviewId}/webcam`);
                } catch (err) {
                  console.error(err);
                  alert('오류가 발생했습니다. 다시 시도해주세요.');
                  setStep(4);
                }
              }}
            >
              시작하기
            </button>
          </div>
        )}

        {step === 5 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '250px',
              textAlign: 'center',
            }}
          >
            <img src={loadingGif} alt="loading" width="60" />
            <p style={{ marginTop: '10px' }}>처리 중 입니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
