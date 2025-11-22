import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainbackgroundImage from '../../assets/main_background.png';
import AICOLogo from '../../assets/AICO_logo.png';

export default function Main() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundImage: `url(${MainbackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* 컨텐츠 중앙 */}
      <div style={{ textAlign: 'center', color: '#F5F5F5' }}>
        {/* 로고 */}
        <img
          src={AICOLogo}
          alt="AICO Logo"
          style={{
            width: '282px',
          }}
        />

        {/* 텍스트 */}
        <div
          style={{
            fontFamily: 'Noto Sans, sans-serif',
            fontWeight: 800, // ExtraBold
            fontSize: '40px',
            marginBottom: '100px',
          }}
        >
          당신의 개인 AI 면접 코치, AICO
        </div>

        {/* 버튼 */}
        <button
          onClick={() => navigate('/login')}
          style={{
            width: '270px',
            height: '60px',
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 600,
            color: 'white',

            background: 'linear-gradient(90deg, #7326F5 0%, #0A091A 50%, #2006A7 100%)',

            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.45)',
          }}
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
