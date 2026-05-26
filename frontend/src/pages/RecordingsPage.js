import React, { useEffect, useState } from 'react';
import { recordingService } from '../services/api';
import './RecordingsPage.css';

function RecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const data = await recordingService.getUserRecordings();
      setRecordings(data || []);
    } catch (err) {
      console.error('Error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRecording = async (recording) => {
    try {
      // Obtener grabación con audio
      const response = await recordingService.getRecordingById(recording.id);
      if (response?.audio_data) {
        let audioData = response.audio_data;
        if (!audioData.startsWith('data:')) {
          audioData = `data:audio/webm;base64,${audioData}`;
        }
        
        const audio = new Audio(audioData);
        await audio.play();
        setPlayingId(recording.id);

        audio.onended = () => {
          setPlayingId(null);
        };
      }
    } catch (err) {
      console.error('Error playing recording:', err);
    }
  };

  const handleDeleteRecording = async (recordingId) => {
    try {
      await recordingService.deleteRecording(recordingId);
      setRecordings(recordings.filter(r => r.id !== recordingId));
    } catch (err) {
      console.error('Error deleting recording:', err);
    }
  };

  return (
    <div className="recordings-page-container">
      <div className="recordings-header">
        <h1>📊 Mis Grabaciones</h1>
        <p>Visualiza y escucha tus grabaciones de sonido</p>
      </div>

      {loading && <div className="loading">Cargando grabaciones...</div>}

      {!loading && recordings.length === 0 && (
        <div className="no-recordings">
          <p>No tienes grabaciones aún. ¡Crea tu primera grabación!</p>
        </div>
      )}

      <div className="recordings-list">
        {recordings.map((recording) => (
          <div key={recording.id} className="recording-card">
            <div className="recording-info">
              <h3>{recording.description || 'Sin descripción'}</h3>
              <p className="recording-location">
                📍 {recording.latitude?.toFixed(4)}, {recording.longitude?.toFixed(4)}
              </p>
              <p className="recording-noise">
                🔊 Nivel de ruido: {recording.noise_level?.toFixed(1)} dB
              </p>
              <p className="recording-date">
                📅 {new Date(recording.created_at).toLocaleDateString()} {new Date(recording.created_at).toLocaleTimeString()}
              </p>
            </div>
            <div className="recording-actions">
              <button
                className="btn-play"
                onClick={() => handlePlayRecording(recording)}
                disabled={playingId !== null && playingId !== recording.id}
              >
                {playingId === recording.id ? '⏸️ Reproduciendo...' : '▶️ Reproducir'}
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDeleteRecording(recording.id)}
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecordingsPage;
