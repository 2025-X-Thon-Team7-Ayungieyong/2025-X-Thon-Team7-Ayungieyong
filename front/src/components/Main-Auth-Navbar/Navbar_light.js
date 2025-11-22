import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar_light.css';
import logoDark from '../../assets/logo_black.png';

function NavbarLight() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <nav className="navbar-light">
      <img src={logoDark} alt="logo" className="navbar-light-logo" />

      <button className="navbar-light-logout" onClick={handleLogout}>
        로그아웃
      </button>
    </nav>
  );
}

export default NavbarLight;
