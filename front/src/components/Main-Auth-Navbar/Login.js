import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (id === '1234' && password === '1234') {
      navigate('/');
    } else {
      alert('아이디와 비밀번호가 맞지 않습니다!');
    }
    console.log({ id, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>

      <label>
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="아이디"
          autoComplete="username"
        />
      </label>

      <label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
          />
          <span
            onClick={() => setShowPassword((v) => !v)}
            style={{
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {showPassword ? '🔓' : '🔒'}
          </span>
        </div>
      </label>

      <div>
        <button type="submit">로그인</button>
        <button type="button" onClick={() => navigate('/signup')}>
          회원가입
        </button>
      </div>
    </form>
  );
}
