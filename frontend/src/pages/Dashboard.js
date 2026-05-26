import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';
import ruido from '../assets/images/ruido.png';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <div className="welcome-card">
        <div className="welcome-icon"> <img src={ruido} alt="Ruido" /> </div>
        <h1>¡Bienvenido a SoundMap+!</h1>
        <p className="welcome-subtitle">
          Hola <span className="username">{user?.username}</span>, nos alegra tenerte aquí
        </p>
        <div className="feature-grid">
          <div className="feature-item" onClick={() => navigate('/recordings')}>
            <div className="feature-icon">📊</div>
            <h3>Mis Grabaciones</h3>
            <p>Escucha y gestiona tus grabaciones de sonido</p>
          </div>
          <div className="feature-item" onClick={() => navigate('/recorder')}>
            <div className="feature-icon">🎤</div>
            <h3>Grabadora</h3>
            <p>Comienza a registrar el ruido de tu entorno</p>
          </div>
          <div className="feature-item" onClick={() => navigate('/map')}>
            <div className="feature-icon">🗺️</div>
            <h3>Mapa Interactivo</h3>
            <p>Visualiza las grabaciones y niveles de ruido</p>
          </div>
        </div>
        <p className="coming-soon">
          Próximamente: ¡Más funcionalidades emocionantes!
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
