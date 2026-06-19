import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ruido from '../assets/images/ruido.png';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = location.pathname === '/';

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

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/recorder', label: 'Grabadora' },
    { path: '/recordings', label: 'Mis Grabaciones' },
    { path: '/map', label: 'Mapa' },
    { path: '/monitor', label: 'Monitor' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <button onClick={handleLogoClick} className="navbar-logo navbar-logo-btn">
          <img src={ruido} alt="SoundMap+" className="navbar-logo-img" />
          <span className="navbar-brand">SoundMap+</span>
        </button>
        
        {user && !isAuthPage && (
          <div className="nav-links">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
        
        <div className="nav-menu">
          {user ? (
            <>
              <span className="nav-username">Hola, {user.username}</span>
              <button onClick={handleLogout} className="nav-logout-btn">
                Cerrar Sesion
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
