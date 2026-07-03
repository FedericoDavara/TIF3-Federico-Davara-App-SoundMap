import React, { useEffect, useState, useRef } from 'react';
import { recordingService } from '../services/api';
import api from '../services/api';
import './RecordingsPage.css';

function RecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [soundTypeFilter, setSoundTypeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const audioRef = useRef(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const getUniqueSoundTypes = () => {
    const types = new Set();
    recordings.forEach((recording) => {
      if (recording.description) {
        types.add(recording.description);
      }
    });
    return Array.from(types).sort();
  };

  const getFilteredRecordings = () => {
    let filtered = recordings;

    // Filter by sound type
    if (soundTypeFilter !== 'all') {
      filtered = filtered.filter((r) => r.description === soundTypeFilter);
    }

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      
      filtered = filtered.filter((recording) => {
        const recDate = new Date(recording.created_at);
        const daysDiff = Math.floor((now - recDate) / (1000 * 60 * 60 * 24));

        if (dateRangeFilter === 'week') {
          return daysDiff <= 7;
        } else if (dateRangeFilter === 'month') {
          return daysDiff <= 30;
        }
        return true;
      });
    }

    return filtered;
  };

  const filteredRecordings = getFilteredRecordings();
  const soundTypes = getUniqueSoundTypes();

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      console.log('📡 Obteniendo grabaciones...');
      const data = await recordingService.getUserRecordings();
      console.log('✅ Grabaciones obtenidas:', data);
      setRecordings(data || []);
      if (!data || data.length === 0) {
        console.warn('⚠️ No hay grabaciones o la respuesta está vacía');
      }
    } catch (err) {
      console.error('❌ Error fetching recordings:', err);
      console.error('Detalles del error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRecording = async (recording) => {
    try {
      // Si ya está reproduciéndose, pausar
      if (playingId === recording.id && audioRef.current) {
        audioRef.current.pause();
        setPlayingId(null);
        return;
      }

      // Pausar audio anterior
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      console.log(`🎵 Reproduciendo grabación ${recording.id}...`);
      
      // Obtener audio como blob
      const response = await api.get(`/api/recordings/${recording.id}/audio`, {
        responseType: 'blob'
      });
      
      console.log(`📦 Audio blob recibido, tamaño: ${response.data.size} bytes`);
      
      const audioUrl = URL.createObjectURL(response.data);
      
      const audio = new Audio();
      audio.src = audioUrl;
      audio.volume = 1.0;
      
      audio.addEventListener('play', () => {
        console.log('🔊 Reproduciendo');
        setPlayingId(recording.id);
      });
      
      audio.addEventListener('ended', () => {
        console.log('⏹️ Reproducción terminada');
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('❌ Error de audio:', audio.error);
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
      });
      
      audioRef.current = audio;
      await audio.play();
      
    } catch (err) {
      console.error('❌ Error reproduciendo:', err);
      setPlayingId(null);
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

      {!loading && recordings.length > 0 && (
        <div className="filters-section">
          <div className="filters-container">
            <div className="filter-group">
              <label htmlFor="sound-type-filter">Tipo de Sonido</label>
              <select
                id="sound-type-filter"
                value={soundTypeFilter}
                onChange={(e) => setSoundTypeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos los sonidos</option>
                {soundTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="date-range-filter">Rango de Fecha</label>
              <select
                id="date-range-filter"
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todas las fechas</option>
                <option value="week">Última semana</option>
                <option value="month">Último mes</option>
              </select>
            </div>
          </div>

          {(soundTypeFilter !== 'all' || dateRangeFilter !== 'all') && (
            <div className="filter-results">
              Mostrando {filteredRecordings.length} de {recordings.length} grabaciones
            </div>
          )}
        </div>
      )}

      <div className="recordings-list">
        {filteredRecordings.map((recording) => (
          <div key={recording.id} className="recording-card">
            <div className="recording-info">
              <h3>{recording.description || 'Sin descripción'}</h3>
              <p className="recording-location">
                📍 {recording.latitude?.toFixed(4)}, {recording.longitude?.toFixed(4)}
              </p>
              <div className="noise-stats">
                <div className="stat-item">
                  <span className="stat-label">Mínimo:</span>
                  <span className="stat-value">{recording.min_noise_level?.toFixed(1) || 'N/A'} dB</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Promedio:</span>
                  <span className="stat-value">{recording.noise_level?.toFixed(1)} dB</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Máximo:</span>
                  <span className="stat-value">{recording.max_noise_level?.toFixed(1) || 'N/A'} dB</span>
                </div>
              </div>
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
                {playingId === recording.id ? '⏸️ Pausar' : '▶️ Reproducir'}
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
