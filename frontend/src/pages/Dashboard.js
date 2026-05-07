import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';
import ruido from '../assets/images/ruido.png';

function Dashboard() {
  const { user } = useContext(AuthContext);

  return (
    <div className="dashboard-container">
      <div className="welcome-card">
        <div className="welcome-icon"> <img src={ruido} alt="Ruido" /> </div>
        <h1>¡Bienvenido a SoundMap+!</h1>
        <p className="welcome-subtitle">
          Hola <span className="username">{user?.username}</span>, nos alegra tenerte aquí
        </p>
        <p className="welcome-description">
        </p>
        <div className="feature-grid">
          <div className="feature-item">
            <div className="feature-icon">🗺️</div>
            <h3>Mapa Interactivo</h3>

          </div>
          <div className="feature-item">
            <div className="feature-icon">🎤</div>
            <h3>Compartir tus grabaciones</h3>
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
