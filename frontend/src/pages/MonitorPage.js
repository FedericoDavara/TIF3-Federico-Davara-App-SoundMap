import React, { useEffect, useState, useRef } from 'react';
import { audioClassifier } from '../services/audioClassifier';
import './MonitorPage.css';

function MonitorPage() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [averageNoise, setAverageNoise] = useState(0);
  const [riskLevel, setRiskLevel] = useState('safe');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [manualDescription, setManualDescription] = useState('');

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationIdRef = useRef(null);
  const classificationIntervalRef = useRef(null);
  const noiseLevelsRef = useRef([]);
  const previousRiskRef = useRef('safe');

  // Cargar modelo YAMNet al montar el componente
  useEffect(() => {
    const loadModel = async () => {
      try {
        setModelLoading(true);
        await audioClassifier.loadModel();
        console.log('Modelo YAMNet listo para usar');
      } catch (error) {
        console.error('Error al cargar modelo YAMNet:', error);
      } finally {
        setModelLoading(false);
      }
    };

    loadModel();

    return () => {
      if (classificationIntervalRef.current) {
        clearInterval(classificationIntervalRef.current);
      }
    };
  }, []);

  // Obtener el color según el nivel de ruido
  const getNoiseColor = (db) => {
    if (db < 50) return '#4ade80'; // Verde - seguro
    if (db < 70) return '#60a5fa'; // Azul - moderado
    if (db < 85) return '#fbbf24'; // Amarillo - elevado
    if (db < 100) return '#f97316'; // Naranja - peligroso
    return '#f87171'; // Rojo - crítico
  };

  // Obtener el riesgo según el nivel de ruido
  const getRiskLevel = (db) => {
    if (db < 50) return 'safe';
    if (db < 70) return 'moderate';
    if (db < 85) return 'warning';
    if (db < 100) return 'danger';
    return 'critical';
  };

  // Obtener descripción de riesgo
  const getRiskDescription = (risk, db) => {
    switch (risk) {
      case 'safe':
        return '✅ Ambiente seguro - Sin riesgo auditivo';
      case 'moderate':
        return '⚠️ Ruido moderado - Exposición prolongada puede causar fatiga';
      case 'warning':
        return '🔴 Ruido alto - Se recomienda usar protección auditiva';
      case 'danger':
        return '🚨 RUIDO MUY ALTO - ¡CUIDADO! Riesgo de daño auditivo permanente';
      case 'critical':
        return '🔴 ¡¡¡CRÍTICO!!! - ¡ABANDONA EL ÁREA INMEDIATAMENTE! Daño auditivo inmediato';
      default:
        return '';
    }
  };

  // Clasificar audio periódicamente
  const startClassification = () => {
    if (!audioClassifier.isModelReady) return;

    classificationIntervalRef.current = setInterval(async () => {
      try {
        if (analyserRef.current) {
          setIsClassifying(true);
          const result = await audioClassifier.classifyFromAnalyser(analyserRef.current);
          const topPredictions = result.predictions;
          
          setPredictions(topPredictions);
          
          // Seleccionar automáticamente la predicción principal si tiene alta confianza
          if (topPredictions[0] && topPredictions[0].confidence > 50) {
            setSelectedPrediction(topPredictions[0].class);
          }
          
          setIsClassifying(false);
        }
      } catch (error) {
        console.error('Error en clasificación:', error);
        setIsClassifying(false);
      }
    }, 2000); // Clasificar cada 2 segundos
  };

  // Detener clasificación
  const stopClassification = () => {
    if (classificationIntervalRef.current) {
      clearInterval(classificationIntervalRef.current);
      classificationIntervalRef.current = null;
    }
  };

  // Guardar corrección/feedback del usuario a localStorage
  const saveFeedback = () => {
    if (!selectedPrediction && !manualDescription) {
      alert('Por favor selecciona o escribe una clasificación');
      return;
    }

    const feedback = {
      timestamp: new Date().toISOString(),
      predictedClass: predictions[0]?.class || 'unknown',
      correctedClass: selectedPrediction || manualDescription,
      confidence: predictions[0]?.confidence || 0,
      noiseLevel: noiseLevel
    };

    // Guardar feedback en localStorage
    const existingFeedback = JSON.parse(localStorage.getItem('yamnetFeedback') || '[]');
    existingFeedback.push(feedback);
    localStorage.setItem('yamnetFeedback', JSON.stringify(existingFeedback));

    setManualDescription('');
    setSelectedPrediction(null);
    setPredictions([]);
    alert('✓ Feedback guardado. El modelo mejorará con tus correcciones');
  };

  // Iniciar monitoreo
  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsMonitoring(true);
      noiseLevelsRef.current = [];
      analyzeNoise(analyser);
      startClassification();
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono');
    }
  };

  // Analizar ruido en tiempo real
  const analyzeNoise = (analyser) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const analyze = () => {
      analyser.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const db = Math.round((average / 255) * 120);

      setNoiseLevel(db);
      noiseLevelsRef.current.push(db);

      if (noiseLevelsRef.current.length > 100) {
        noiseLevelsRef.current.shift();
      }

      const avg =
        Math.round(
          noiseLevelsRef.current.reduce((a, b) => a + b, 0) / noiseLevelsRef.current.length
        ) || 0;
      setAverageNoise(avg);

      const risk = getRiskLevel(db);
      setRiskLevel(risk);

      if (
        (risk === 'critical' || risk === 'danger') &&
        previousRiskRef.current !== risk
      ) {
        setAlertMessage(getRiskDescription(risk, db));
        setShowAlert(true);
        playAlertSound();
      }

      previousRiskRef.current = risk;

      animationIdRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  };

  // Reproducir sonido de alerta
  const playAlertSound = () => {
    try {
      const audioContext = audioContextRef.current;
      if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }
    } catch (err) {
      console.error('Error reproduciendo alerta:', err);
    }
  };

  // Detener monitoreo
  const stopMonitoring = () => {
    try {
      stopClassification();
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsMonitoring(false);
      setNoiseLevel(0);
      setAverageNoise(0);
      setRiskLevel('safe');
      setShowAlert(false);
      setPredictions([]);
      setSelectedPrediction(null);
      noiseLevelsRef.current = [];
      previousRiskRef.current = 'safe';
    } catch (err) {
      console.error('Error al detener monitoreo:', err);
      setIsMonitoring(false);
    }
  };

  useEffect(() => {
    return () => {
      stopClassification();
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.error('Error closing audio context:', e);
        }
      }
    };
  }, []);

  return (
    <div className="monitor-page-container">
      <div className="monitor-header">
        <h1>🔊 Monitor de Ruido Ambiental</h1>
        <p>Monitorea en tiempo real el nivel de ruido y recibe alertas sobre daño auditivo potencial</p>
      </div>

      {showAlert && (
        <div className={`alert alert-${riskLevel}`}>
          <button className="close-alert" onClick={() => setShowAlert(false)}>✕</button>
          <p className="alert-message">{alertMessage}</p>
          {riskLevel === 'critical' && (
            <p className="alert-critical">⚠️ ¡ABANDONA ESTA ÁREA INMEDIATAMENTE PARA PROTEGER TU AUDICIÓN!</p>
          )}
        </div>
      )}

      <div className="monitor-container">
        {/* Medidor de ruido (barra lineal estilo RecorderPage) */}
        <div className="noise-display">
          <div className={`noise-meter ${isMonitoring ? 'recording' : ''}`}>
            <div className="noise-level-bar">
              <div
                className="noise-level-fill"
                style={{
                  width: `${Math.min((noiseLevel / 120) * 100, 100)}%`,
                  background: getNoiseColor(noiseLevel),
                  minWidth: '8px'
                }}
              />
            </div>
            <p className="noise-value">{noiseLevel} dB</p>
          </div>
        </div>

        {/* Información de riesgo */}
        <div className={`risk-info risk-${riskLevel}`}>
          <h3>Estado Actual</h3>
          <p className="risk-description">{getRiskDescription(riskLevel, averageNoise)}</p>
          <div className="risk-details">
            <div className="detail-item">
              <span className="detail-label">Nivel Actual:</span>
              <span className="detail-value">{noiseLevel} dB</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Promedio:</span>
              <span className="detail-value">{averageNoise} dB</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Estado:</span>
              <span className={`detail-status status-${riskLevel}`}>{riskLevel.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clasificación automática con YAMNet */}
      {isMonitoring && (
        <div className="classification-section">
          {modelLoading && (
            <p className="status-text">⏳ Cargando modelo de IA...</p>
          )}
          
          {isClassifying && (
            <p className="status-text">🤖 Clasificando ruido...</p>
          )}

          {predictions.length > 0 && (
            <div className="predictions-container">
              <h3>🤖 Clasificación Automática</h3>
              <div className="predictions-list">
                {predictions.map((pred, index) => (
                  <button
                    key={index}
                    className={`prediction-chip ${selectedPrediction === pred.class ? 'selected' : ''}`}
                    onClick={() => setSelectedPrediction(pred.class)}
                  >
                    <span className="pred-name">{pred.class}</span>
                    <span className="pred-confidence">{pred.confidence}%</span>
                  </button>
                ))}
              </div>
              {selectedPrediction && (
                <p className="selected-text">✓ Seleccionado: <strong>{selectedPrediction}</strong></p>
              )}

              <div className="description-input">
                <label htmlFor="noise-description">
                  Corregir clasificación (opcional):
                </label>
                <input
                  id="noise-description"
                  type="text"
                  placeholder="Ej: Autos, obras, construcción..."
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                />
              </div>

              <button className="btn btn-success" onClick={saveFeedback}>
                ✓ Guardar Corrección
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guía de niveles de ruido */}
      <div className="noise-guide">
        <h3>📋 Guía de Niveles de Ruido</h3>
        <div className="guide-items">
          <div className="guide-item">
            <span className="guide-db">0-30 dB</span>
            <span className="guide-desc">Muy silencioso (biblioteca)</span>
          </div>
          <div className="guide-item">
            <span className="guide-db">30-50 dB</span>
            <span className="guide-desc">Conversación normal (seguro)</span>
          </div>
          <div className="guide-item">
            <span className="guide-db">50-70 dB</span>
            <span className="guide-desc">Ruido moderado (oficina, calle)</span>
          </div>
          <div className="guide-item">
            <span className="guide-db">70-85 dB</span>
            <span className="guide-desc">⚠️ Ruidoso (se recomienda protección)</span>
          </div>
          <div className="guide-item">
            <span className="guide-db">85-100 dB</span>
            <span className="guide-desc">🔴 Muy ruidoso (riesgo de daño)</span>
          </div>
          <div className="guide-item">
            <span className="guide-db">&gt;100 dB</span>
            <span className="guide-desc">🚨 Crítico (daño inmediato)</span>
          </div>
        </div>
      </div>

      {/* Botones de control */}
      <div className="monitor-controls">
        {!isMonitoring ? (
          <button className="btn btn-primary btn-large" onClick={startMonitoring}>
            ▶ Iniciar Monitoreo
          </button>
        ) : (
          <button className="btn btn-danger btn-large" onClick={stopMonitoring}>
            ⏹ Detener Monitoreo
          </button>
        )}
      </div>

      {/* Información de seguridad */}
      <div className="safety-info">
        <h3>🛡️ Información de Seguridad Auditiva</h3>
        <ul>
          <li><strong>85 dB:</strong> Límite máximo recomendado para exposición prolongada (sin protección)</li>
          <li><strong>Exposición de 8 horas:</strong> A más de 85 dB puede causar daño auditivo permanente</li>
          <li><strong>100 dB:</strong> Puede causar daño en minutos</li>
          <li><strong>Protección:</strong> Usa tapones auditivos o auriculares reductores de ruido en ambientes ruidosos</li>
          <li><strong>Tinnitus:</strong> Si experimentas zumbidos en los oídos, consulta a un audiólogo</li>
        </ul>
      </div>
    </div>
  );
}

export default MonitorPage;
