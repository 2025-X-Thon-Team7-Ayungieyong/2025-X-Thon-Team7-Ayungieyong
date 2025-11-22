import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar_dark.css';
import logoWhite from '../../assets/logo_white.png';

function NavbarDark() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <nav className="navbar-dark">
      <img src={logoWhite} alt="logo" className="navbar-dark-logo" />

      <button className="navbar-dark-logout" onClick={handleLogout}>
        로그아웃
      </button>
    </nav>
  );
}

export default NavbarDark;
