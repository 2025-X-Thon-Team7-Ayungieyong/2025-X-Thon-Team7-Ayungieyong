import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar_dark.css';
import logoWhite from '../../assets/logo_white.png';

function NavbarDark() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // 웹캠 경로 확인
  const isWebcamPage = /^\/interview\/\d+\/webcam$/.test(path);

  // 기본 버튼 텍스트 & 동작
  let buttonText = '로그아웃';
  let buttonAction = () => navigate('/');

  // 웹캠 제외한 Dark Navbar 경로에서는 로그인/회원가입 버튼 적용
  if (!isWebcamPage) {
    buttonText = '로그인/회원가입';
    buttonAction = () => navigate('/login');
  }

  return (
    <nav className="navbar-dark">
      <img src={logoWhite} alt="logo" className="navbar-dark-logo" />

      <button className="navbar-dark-logout" onClick={buttonAction}>
        {buttonText}
      </button>
    </nav>
  );
}

export default NavbarDark;
