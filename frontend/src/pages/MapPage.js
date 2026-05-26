import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
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
  return { avgLat, avgLon, avgNoise, count: cluster.length };
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

  // Calcular color según nivel de ruido (verde → amarillo → naranja → rojo)
  const getNoiseColor = (noiseLevel) => {
    if (noiseLevel < 50) return '#10b981'; // Verde
    if (noiseLevel < 65) return '#fbbf24'; // Amarillo
    if (noiseLevel < 80) return '#f97316'; // Naranja
    return '#ef4444'; // Rojo
  };

  const handlePlayRecording = async (recording) => {
    try {
      const response = await api.get(`/api/recordings/${recording.id}`);
      const recordingWithAudio = response.data;
      if (recordingWithAudio?.audio_data) {
        let audioData = recordingWithAudio.audio_data;
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
            <span>&lt; 50 dB (Bajo)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#fbbf24' }}></div>
            <span>50-65 dB (Medio)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#f97316' }}></div>
            <span>65-80 dB (Alto)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
            <span>&gt; 80 dB (Muy Alto)</span>
          </div>
        </div>
      </div>

      <div className="map-wrapper">
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
                    click: () => setExpandedCluster(isExpanded ? null : idx),
                  }}
                >
                  <Popup>
                    <div className="popup-content">
                      <h4>Área de ruido</h4>
                      <p>📍 Grabaciones: {stats.count}</p>
                      <p>🔊 Promedio: {stats.avgNoise.toFixed(1)} dB</p>
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
                        <p>🔊 Nivel: {recording.noise_level?.toFixed(1)} dB</p>
                        <p>📅 {new Date(recording.created_at).toLocaleDateString()}</p>
                        <button
                          className="btn-play-popup"
                          onClick={() => handlePlayRecording(recording)}
                        >
                          {playingId === recording.id ? '⏸️ Reproduciendo...' : '▶️ Reproducir'}
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </div>
            );
          })}
        </MapContainer>
      </div>

      <div className="recordings-summary">
        <p>Clusters: <strong>{clusters.length}</strong> | Total grabaciones: <strong>{recordings.length}</strong></p>
      </div>
    </div>
  );
}

export default MapPage;
