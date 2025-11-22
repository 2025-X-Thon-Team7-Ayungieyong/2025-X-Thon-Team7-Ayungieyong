import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PopUp from './PopUp';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [openPopup, setOpenPopup] = useState(false);

  // 임시 데이터
  const interviews = [
    { id: 1, title: '삼성 SDK 면접', date: '2025-11-01' },
    { id: 2, title: '카카오 백엔드', date: '2025-11-01' },
  ];

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">INTERVIEW</h1>

        {/* 인터뷰 카드 리스트 */}
        <div className="interview-wrapper">
          {interviews.map((item) => (
            <div key={item.id} className="interview-card">
              <h3>{item.title}</h3>
              <p>일시: {item.date}</p>

              <button className="interview-button" onClick={() => navigate(`/interview/${item.id}/summary`)}>
                조회하기
              </button>
            </div>
          ))}

          {/* 새 면접 만들기 박스 */}
          <div onClick={() => setOpenPopup(true)} className="new-card">
            <div className="new-plus">+</div>
            <div>새 면접 만들기</div>
          </div>
        </div>
      </div>

      {/* 팝업 */}
      {openPopup && <PopUp onClose={() => setOpenPopup(false)} />}
    </div>
  );
}
