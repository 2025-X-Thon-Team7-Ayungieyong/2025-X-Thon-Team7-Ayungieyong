import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PopUp from './PopUp';

export default function Home() {
  const navigate = useNavigate();
  const [openPopup, setOpenPopup] = useState(false);

  // 임시 데이터
  const interviews = [
    { id: 1, title: '삼성 SDK 면접', date: '2025-11-01' },
    { id: 2, title: '카카오 백엔드', date: '2025-11-01' },
  ];

  return (
    <div style={{ padding: '40px' }}>
      <h1>INTERVIEW</h1>

      {/* 인터뷰 카드 리스트 */}
      <div>
        {interviews.map((item) => (
          <div
            key={item.id}
            style={{
              border: '1px solid gray',
              padding: '20px',
              marginBottom: '20px',
              width: '300px',
            }}
          >
            <h3>{item.title}</h3>
            <p>일시: {item.date}</p>

            <button onClick={() => navigate(`/interview/${item.id}/summary`)}>조회하기</button>
          </div>
        ))}

        {/* 새 면접 만들기 박스 */}
        <div
          onClick={() => setOpenPopup(true)}
          style={{
            border: '2px dashed black',
            padding: '30px',
            width: '278px',
            textAlign: 'center',
            cursor: 'pointer',
            marginTop: '20px',
          }}
        >
          <div style={{ fontSize: '30px' }}>+</div>
          <div>새 면접 만들기</div>
        </div>
      </div>

      {/* 팝업 */}
      {openPopup && <PopUp onClose={() => setOpenPopup(false)} />}
    </div>
  );
}
