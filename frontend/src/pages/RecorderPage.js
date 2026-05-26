import React from 'react';
import SoundRecorder from '../components/SoundRecorder';
import './RecorderPage.css';

function RecorderPage() {
  return (
    <div className="recorder-page-container">
      <div className="recorder-header">
        <h1>🎤 Grabadora de Sonido</h1>
        <p>Comienza a registrar el ruido de tu entorno</p>
      </div>
      <SoundRecorder />
    </div>
  );
}

export default RecorderPage;
