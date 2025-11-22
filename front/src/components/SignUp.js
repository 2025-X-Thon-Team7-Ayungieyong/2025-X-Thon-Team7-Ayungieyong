import { useState } from 'react';

export default function SignUp() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ id, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>SIGN UP</h2>

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
        <button type="button">회원가입</button>
      </div>
    </form>
  );
}
