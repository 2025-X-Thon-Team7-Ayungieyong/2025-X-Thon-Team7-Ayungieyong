import { useState } from 'react';
import './Login.css';

export default function SignUp() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ id, password });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* 제목 */}
        <div className="login-title">SIGN UP</div>

        <form onSubmit={handleSubmit}>
          {/* 아이디 */}
          <input
            type="text"
            className="login-input"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="아이디"
            autoComplete="username"
          />

          {/* 비밀번호 */}
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
            />

            {/* 비밀번호 토글 */}
            <span
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute',
                right: '0px',
                top: '34%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '20px',
                color: '#ffffff',
              }}
            >
              {showPassword ? '🔓' : '🔒'}
            </span>
          </div>

          {/* 회원가입 버튼 */}
          <button type="submit" className="login-button" style={{ marginTop: '30px' }}>
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
}
