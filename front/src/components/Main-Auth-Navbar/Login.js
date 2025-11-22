import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (id === '1234' && password === '1234') {
      navigate('/home');
    } else {
      alert('아이디와 비밀번호가 맞지 않습니다!');
    }
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-title">LOGIN</div>

        <input
          type="text"
          className="login-input"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="아이디"
          autoComplete="username"
        />

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            className="login-input"
            style={{ marginBottom: 0 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
          />
          <span
            onClick={() => setShowPassword((v) => !v)}
            style={{
              marginLeft: '-35px',
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '20px',
              color: '#ffffff',
            }}
          >
            {showPassword ? '🔓' : '🔒'}
          </span>
        </div>

        <button type="submit" className="login-button">
          로그인
        </button>

        <button type="button" className="signup-button" onClick={() => navigate('/signup')}>
          회원가입
        </button>
      </form>
    </div>
  );
}
