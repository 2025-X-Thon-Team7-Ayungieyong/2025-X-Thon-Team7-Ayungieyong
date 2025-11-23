import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Navbar_light.css';
import logoDark from '../../assets/logo_black.png';

function NavbarLight() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <nav className="navbar-light">
      <Link to="/home">
        <img src={logoDark} alt="logo" className="navbar-light-logo" />
      </Link>

      <button className="navbar-light-logout" onClick={handleLogout}>
        로그아웃
      </button>
    </nav>
  );
}

export default NavbarLight;
