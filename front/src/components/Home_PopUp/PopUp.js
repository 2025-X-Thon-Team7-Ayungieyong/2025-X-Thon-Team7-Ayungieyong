import React, { useState } from 'react';
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
            <p>이력서/자소서를 업로드 해주세요.</p>

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
                // 파일 업로드 후에는 파일명만 표시
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
                  alert('이력서와 자소서를 모두 업로드해주세요.');
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
            <h2>디바이스 체크 (Step 4)</h2>
            <p>카메라/마이크 테스트</p>
            <button onClick={handlePrev}>이전</button>
            <button
              onClick={async () => {
                setStep(5); // 로딩 화면

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
