import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import './MapPage.css';

// Función para calcular distancia entre dos puntos en km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Función para agrupar grabaciones por proximidad
const clusterRecordings = (recordings, maxDistanceKm = 1) => {
  if (recordings.length === 0) return [];
  
  const clusters = [];
  const visited = new Set();

  recordings.forEach((recording, idx) => {
    if (visited.has(idx)) return;

    const cluster = [recording];
    visited.add(idx);

    recordings.forEach((otherRecording, otherIdx) => {
      if (visited.has(otherIdx)) return;
      
      const distance = calculateDistance(
        recording.latitude,
        recording.longitude,
        otherRecording.latitude,
        otherRecording.longitude
      );

      if (distance <= maxDistanceKm) {
        cluster.push(otherRecording);
        visited.add(otherIdx);
      }
    });

    clusters.push(cluster);
  });

  return clusters;
};

// Función para calcular el promedio de un cluster
const calculateClusterStats = (cluster) => {
  const avgLat = cluster.reduce((sum, r) => sum + r.latitude, 0) / cluster.length;
  const avgLon = cluster.reduce((sum, r) => sum + r.longitude, 0) / cluster.length;
  const avgNoise = cluster.reduce((sum, r) => sum + r.noise_level, 0) / cluster.length;
  const minNoise = Math.min(...cluster.map(r => r.min_noise_level || r.noise_level));
  const maxNoise = Math.max(...cluster.map(r => r.max_noise_level || r.noise_level));
  return { avgLat, avgLon, avgNoise, minNoise, maxNoise, count: cluster.length };
};

// Componente para manejar el centro del mapa
function MapCenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);
  return null;
}

function MapPage() {
  const [recordings, setRecordings] = useState([]);
  const [userLocation, setUserLocation] = useState([40.4168, -3.7038]); // Madrid por defecto
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [selectedClusterStats, setSelectedClusterStats] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [filterDays, setFilterDays] = useState(30);
  const audioRef = React.useRef(null);

  useEffect(() => {
    // Obtener ubicación del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = [position.coords.latitude, position.coords.longitude];
          setUserLocation(newLocation);
        },
        (error) => {
          console.warn("No se pudo obtener ubicación:", error);
          // Usar ubicación por defecto
        }
      );
    }

    // Obtener grabaciones
    fetchRecordings();
  }, []);

  useEffect(() => {
    if (recordings.length > 0) {
      const newClusters = clusterRecordings(recordings, 1);
      setClusters(newClusters);
    }
  }, [recordings]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/recordings/all');
      setRecordings(response.data || []);
    } catch (err) {
      console.error('Error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener estadísticas de un cluster
  const fetchClusterStats = async (cluster) => {
    try {
      if (cluster.length === 0) return;
      
      const stats = calculateClusterStats(cluster);
      
      // Obtener estadísticas detalladas del backend
      const response = await api.get('/api/recordings/statistics/cluster', {
        params: {
          latitude: stats.avgLat,
          longitude: stats.avgLon,
          radius_km: 1,
          days_back: filterDays
        }
      });
      
      setSelectedClusterStats(response.data);
    } catch (err) {
      console.error('Error fetching cluster stats:', err);
    }
  };

  // Calcular color según nivel de ruido (verde → amarillo → naranja → rojo)
  const getNoiseColor = (noiseLevel) => {
    if (noiseLevel < 30) return '#10b981'; // Verde - silencio/muy bajo
    if (noiseLevel < 60) return '#60a5fa'; // Azul - bajo
    if (noiseLevel < 75) return '#fbbf24'; // Amarillo - moderado
    if (noiseLevel < 90) return '#f97316'; // Naranja - fuerte
    return '#ef4444'; // Rojo - muy fuerte
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
      
      // Obtener audio como blob (sin base64)
      const response = await api.get(`/api/recordings/${recording.id}/audio`, {
        responseType: 'blob'
      });
      
      console.log(`📦 Audio blob recibido, tamaño: ${response.data.size} bytes`);
      
      const audioUrl = URL.createObjectURL(response.data);
      
      // Crear y reproducir audio
      const audio = new Audio();
      audio.src = audioUrl;
      audio.volume = 1.0;
      
      audio.addEventListener('loadstart', () => console.log('📡 Cargando audio...'));
      audio.addEventListener('canplay', () => console.log('▶️ Listo para reproducir'));
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

  const handleClusterClick = (cluster, idx) => {
    if (expandedCluster === idx) {
      setExpandedCluster(null);
      setSidebarVisible(false);
      setSelectedClusterStats(null);
    } else {
      setExpandedCluster(idx);
      setSidebarVisible(true);
      fetchClusterStats(cluster);
    }
  };

  if (loading) {
    return <div className="map-loading">Cargando mapa...</div>;
  }

  const mapCenter = userLocation || [40.4168, -3.7038];

  return (
    <div className="map-page-container">
      <div className="map-header">
        <h1>🗺️ Mapa Interactivo de Ruido</h1>
        <p>Visualiza las grabaciones de sonido y niveles de ruido en tu área</p>
        <div className="noise-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
            <span>&lt; 30 dB (Silencio)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#60a5fa' }}></div>
            <span>30-60 dB (Bajo)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#fbbf24' }}></div>
            <span>60-75 dB (Moderado)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#f97316' }}></div>
            <span>75-90 dB (Fuerte)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
            <span>&gt; 90 dB (Muy Fuerte)</span>
          </div>
        </div>
      </div>

      <div className={`map-wrapper ${sidebarVisible ? 'with-sidebar' : ''}`}>
        <MapContainer center={mapCenter} zoom={13} className="map">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          <MapCenter position={userLocation} />

          {/* Marcador de ubicación del usuario */}
          {userLocation && (
            <Marker position={userLocation}>
              <Popup>📍 Mi ubicación actual</Popup>
            </Marker>
          )}

          {/* Mostrar clusters */}
          {clusters.map((cluster, idx) => {
            const stats = calculateClusterStats(cluster);
            const isExpanded = expandedCluster === idx;

            return (
              <div key={idx}>
                {/* Área del cluster */}
                <CircleMarker
                  center={[stats.avgLat, stats.avgLon]}
                  radius={isExpanded ? 5 : 25}
                  fillColor={getNoiseColor(stats.avgNoise)}
                  color={getNoiseColor(stats.avgNoise)}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={isExpanded ? 0.3 : 0.6}
                  eventHandlers={{
                    click: () => handleClusterClick(cluster, idx),
                  }}
                >
                  <Popup>
                    <div className="popup-content">
                      <h4>📍 Área de ruido</h4>
                      <p>📊 Grabaciones: {stats.count}</p>
                      <p>🔊 Promedio: {stats.avgNoise.toFixed(1)} dB</p>
                      <p>📉 Mínimo: {stats.minNoise.toFixed(1)} dB</p>
                      <p>📈 Máximo: {stats.maxNoise.toFixed(1)} dB</p>
                      <p>Click para {isExpanded ? 'contraer' : 'expandir'}</p>
                    </div>
                  </Popup>
                </CircleMarker>

                {/* Mostrar puntos individuales si está expandido */}
                {isExpanded && cluster.map((recording) => (
                  <CircleMarker
                    key={recording.id}
                    center={[recording.latitude, recording.longitude]}
                    radius={8}
                    fillColor={getNoiseColor(recording.noise_level)}
                    color={getNoiseColor(recording.noise_level)}
                    weight={1}
                    opacity={1}
                    fillOpacity={0.8}
                    eventHandlers={{
                      click: () => handlePlayRecording(recording),
                    }}
                  >
                    <Popup>
                      <div className="popup-content">
                        <h4>{recording.description || 'Sin descripción'}</h4>
                        <p>🔊 Promedio: {recording.noise_level?.toFixed(1)} dB</p>
                        <p>📉 Mínimo: {recording.min_noise_level?.toFixed(1) || 'N/A'} dB</p>
                        <p>📈 Máximo: {recording.max_noise_level?.toFixed(1) || 'N/A'} dB</p>
                        <p>📅 {new Date(recording.created_at).toLocaleDateString()} {new Date(recording.created_at).toLocaleTimeString()}</p>
                        <button
                          className="btn-play-popup"
                          onClick={() => handlePlayRecording(recording)}
                        >
                          {playingId === recording.id ? '⏸️ Pausar' : '▶️ Reproducir'}
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </div>
            );
          })}
        </MapContainer>

        {/* Sidebar con estadísticas */}
        {sidebarVisible && selectedClusterStats && (
          <div className="map-sidebar">
            <div className="sidebar-header">
              <h3>📊 Estadísticas del Área</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setSidebarVisible(false);
                  setExpandedCluster(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="sidebar-content">
              {/* Filtro de días */}
              <div className="filter-section">
                <label>Período:</label>
                <select 
                  value={filterDays}
                  onChange={(e) => {
                    setFilterDays(Number(e.target.value));
                    if (expandedCluster !== null) {
                      fetchClusterStats(clusters[expandedCluster]);
                    }
                  }}
                  className="filter-select"
                >
                  <option value={1}>Últimas 24 horas</option>
                  <option value={7}>Últimos 7 días</option>
                  <option value={30}>Últimos 30 días</option>
                  <option value={365}>Últimos 365 días</option>
                </select>
              </div>

              {/* Estadísticas generales */}
              <div className="stats-summary">
                <div className="stat-box">
                  <span className="stat-label">📊 Grabaciones</span>
                  <span className="stat-value">{selectedClusterStats.total_recordings}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">📈 Máximo</span>
                  <span className="stat-value">{selectedClusterStats.max_noise.toFixed(1)} dB</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">📉 Mínimo</span>
                  <span className="stat-value">{selectedClusterStats.min_noise.toFixed(1)} dB</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">🔊 Promedio</span>
                  <span className="stat-value">{selectedClusterStats.average_noise.toFixed(1)} dB</span>
                </div>
              </div>

              {/* Gráfico de barras por hora */}
              <div className="chart-section">
                <h4>🕐 Ruido por Hora del Día</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={selectedClusterStats.hourly_stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" label={{ value: 'Hora', position: 'insideBottomRight', offset: -5 }} />
                    <YAxis label={{ value: 'dB', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average_noise" fill="#f97316" name="Promedio" />
                    <Bar dataKey="max_noise" fill="#ef4444" name="Máximo" />
                    <Bar dataKey="min_noise" fill="#10b981" name="Mínimo" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Clasificación de sonidos */}
              {Object.keys(selectedClusterStats.recordings_by_description).length > 0 && (
                <div className="classification-section">
                  <h4>🔍 Tipos de Ruido Detectados</h4>
                  <div className="classification-list">
                    {Object.entries(selectedClusterStats.recordings_by_description).map(([type, count]) => (
                      <div key={type} className="classification-item">
                        <span className="type-name">{type}</span>
                        <span className="type-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="recordings-summary">
        <p>Clusters: <strong>{clusters.length}</strong> | Total grabaciones: <strong>{recordings.length}</strong></p>
      </div>
    </div>
  );
}

export default MapPage;
