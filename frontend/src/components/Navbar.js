import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ruido from '../assets/images/ruido.png';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLogoClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <button onClick={handleLogoClick} className="navbar-logo navbar-logo-btn">
          <img src={ruido} alt="SoundMap+" className="navbar-logo-img" />
          SoundMap+
        </button>
        <div className="nav-menu">
          {user ? (
            <>
              <span className="nav-username">Hola, {user.username}</span>
              <button onClick={handleLogout} className="nav-logout-btn">
                Cerrar Sesión
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
