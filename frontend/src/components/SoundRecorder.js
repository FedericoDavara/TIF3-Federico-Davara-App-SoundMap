import React, { useState, useRef, useEffect } from 'react';
import { recordingService } from '../services/api';
import { audioClassifier } from '../services/audioClassifier';
import './SoundRecorder.css';

function SoundRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [noiseDescription, setNoiseDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [averageNoiseLevel, setAverageNoiseLevel] = useState(0);
  const [minNoiseLevel, setMinNoiseLevel] = useState(0);
  const [maxNoiseLevel, setMaxNoiseLevel] = useState(0);
  const [predictions, setPredictions] = useState([]);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [classificationLocked, setClassificationLocked] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const animationIdRef = useRef(null);
  const noiseLevelsRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const classificationIntervalRef = useRef(null);

  // Cargar modelo YAMNet al montar el componente
  useEffect(() => {
    const loadModel = async () => {
      try {
        setModelLoading(true);
        await audioClassifier.loadModel();
        const hasModel = audioClassifier.model !== null && audioClassifier.model !== undefined;
        
        if (hasModel) {
          console.log('✓ YAMNet cargado - Usando clasificación profunda con IA');
        } else {
          console.log('⚠ YAMNet no disponible - Usando análisis inteligente de frecuencias');
        }
      } catch (error) {
        console.error('Error al cargar modelo YAMNet:', error);
        console.log('✓ Usando análisis inteligente de frecuencias (modo local)');
      } finally {
        setModelLoading(false);
      }
    };

    loadModel();

    return () => {
      // Limpiar al desmontar
      if (classificationIntervalRef.current) {
        clearInterval(classificationIntervalRef.current);
      }
    };
  }, []);

  // Clasificar audio periódicamente
  const startClassification = () => {
    if (!audioClassifier.isModelReady) return;

    classificationIntervalRef.current = setInterval(async () => {
      try {
        if (analyserRef.current && audioContextRef.current && !classificationLocked) {
          const result = await audioClassifier.classifyFromAnalyser(analyserRef.current, audioContextRef.current);
          const topPredictions = result.predictions;
          
          setPredictions(topPredictions);
          
          // Seleccionar automáticamente la predicción principal si tiene alta confianza
          // pero solo si el usuario no ha bloqueado la clasificación
          if (topPredictions[0] && topPredictions[0].confidence > 50 && !classificationLocked) {
            setSelectedPrediction(topPredictions[0].class);
          }
        }
      } catch (error) {
        console.error('Error en clasificación:', error);
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

  // Obtener el color según el nivel de ruido
  const getNoiseColor = (db) => {
    if (db < 30) return '#4ade80'; // Verde - silencio/muy bajo
    if (db < 60) return '#60a5fa'; // Azul - bajo
    if (db < 75) return '#fbbf24'; // Amarillo - moderado
    if (db < 90) return '#f97316'; // Naranja - fuerte
    return '#f87171'; // Rojo - muy fuerte/peligroso
  };

  // Obtener ubicación del usuario
  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.error("Error obteniendo ubicación:", error);
            reject(error);
          }
        );
      } else {
        reject(new Error("Geolocalización no soportada"));
      }
    });
  };

  // Iniciar grabación
  const startRecording = async () => {
    try {
      setUploadStatus('');
      noiseLevelsRef.current = [];
      setAverageNoiseLevel(0);
      setRecordingTime(0);
      setClassificationLocked(false); // Reset clasificación
      setPredictions([]); // Limpiar predicciones anteriores
      audioClassifier.lastClassification = null; // Reset cache

      // Solicitar permiso de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Crear contexto de audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Crear analizador de frecuencia
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      // Crear MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Iniciar análisis en tiempo real
      analyzeNoiseLevel(analyser);

      // Iniciar clasificación automática
      startClassification();

      // Contador de tiempo
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error al iniciar grabación:", error);
      setUploadStatus('Error al acceder al micrófono');
    }
  };

  // Analizar nivel de ruido en tiempo real
  const analyzeNoiseLevel = (analyser) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const analyze = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calcular promedio de ruido (en rango 0-255)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      // Convertir a escala dB usando logaritmo
      // Fórmula ajustada: 40 * log10(amplitud/255 * 100 + 0.1) + 20
      // En silencio: 0 dB
      // Conversación: ~80-85 dB
      // Parlante fuerte: ~95-100 dB
      const normalizedValue = Math.max(average / 255 * 100, 0.1);
      const db = Math.max(0, Math.round(40 * Math.log10(normalizedValue) + 20));
      
      setNoiseLevel(db);
      noiseLevelsRef.current.push(db);

      animationIdRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  };

  // Detener grabación
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      stopClassification();
      mediaRecorderRef.current.stop();

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        clearInterval(recordingIntervalRef.current);
        cancelAnimationFrame(animationIdRef.current);

        // Calcular promedio, mínimo y máximo de ruido
        const avgNoise = Math.round(
          noiseLevelsRef.current.reduce((a, b) => a + b, 0) / noiseLevelsRef.current.length
        );
        const minNoise = Math.min(...noiseLevelsRef.current);
        const maxNoise = Math.max(...noiseLevelsRef.current);
        
        setAverageNoiseLevel(avgNoise);
        setMinNoiseLevel(minNoise);
        setMaxNoiseLevel(maxNoise);

        // Detener stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // Cerrar audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    }
  };

  // Guardar grabación
  const saveRecording = async () => {
    if (chunksRef.current.length === 0) {
      setUploadStatus('No hay grabación para guardar');
      return;
    }

    try {
      setIsLoading(true);
      setUploadStatus('Guardando grabación...');

      // Obtener ubicación
      const location = await getLocation();

      // Crear blob de audio
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

      // Convertir a base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]; // Remover el prefijo data:

        try {
          // Usar predicción seleccionada o descripción manual
          const description = selectedPrediction || noiseDescription || 'Sin clasificación';

          // Enviar al servidor
          await recordingService.uploadRecording(
            location.latitude,
            location.longitude,
            averageNoiseLevel,
            minNoiseLevel,
            maxNoiseLevel,
            base64Audio,
            description
          );

          setUploadStatus('✓ Grabación guardada exitosamente');
          setNoiseDescription('');
          setSelectedPrediction(null);
          setPredictions([]);
          setRecordingTime(0);
          noiseLevelsRef.current = [];
          chunksRef.current = [];
          setAverageNoiseLevel(0);
          setMinNoiseLevel(0);
          setMaxNoiseLevel(0);
        } catch (error) {
          console.error('Error al guardar grabación:', error);
          setUploadStatus('Error al guardar la grabación: ' + (error.response?.data?.detail || error.message));
        } finally {
          setIsLoading(false);
        }
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error:', error);
      setUploadStatus('Error: ' + error.message);
      setIsLoading(false);
    }
  };

  // Descartar grabación
  const discardRecording = () => {
    chunksRef.current = [];
    setRecordingTime(0);
    setNoiseLevel(0);
    setAverageNoiseLevel(0);
    setNoiseDescription('');
    setSelectedPrediction(null);
    setClassificationLocked(false);
    setPredictions([]);
    setUploadStatus('Grabación descartada');
  };

  return (
    <div className="sound-recorder-container">
      <div className="recorder-card">
        <h2>🎤 Medidor de Sonido</h2>

        {/* Nivel de ruido en tiempo real */}
        <div className="noise-display">
          <div className={`noise-meter ${isRecording ? 'recording' : ''}`}>
            <div className="noise-level-bar">
              <div
                className="noise-level-fill"
                style={{
                  width: `${Math.min((isRecording ? noiseLevel : averageNoiseLevel) / 100 * 100, 100)}%`,
                  height: '100%',
                  background: getNoiseColor(isRecording ? noiseLevel : averageNoiseLevel)
                }}
              ></div>
            </div>
            <p className="noise-value">
              {isRecording ? noiseLevel : averageNoiseLevel} dB
            </p>
          </div>
          {isRecording && (
            <p className="recording-time">
              ⏱️ {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </p>
          )}
        </div>

        {/* Predicciones y Descripción del ruido */}
        <div className="classification-section">
          {modelLoading && (
            <p className="status-text">⏳ Cargando modelo de IA...</p>
          )}
          
          {predictions.length > 0 && !isRecording && (
            <div className="predictions-container">
              <h3>🤖 Clasificación Automática</h3>
              <div className="predictions-list">
                {predictions.map((pred, index) => (
                  <button
                    key={index}
                    className={`prediction-chip ${selectedPrediction === pred.class ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPrediction(pred.class);
                      setClassificationLocked(true); // Bloquear la clasificación
                      setNoiseDescription(''); // Limpiar entrada manual
                    }}
                  >
                    <span className="pred-name">{pred.class}</span>
                    <span className="pred-confidence">{pred.confidence}%</span>
                  </button>
                ))}
              </div>
              {selectedPrediction && (
                <div className="selected-text">
                  <p>✓ Seleccionado: <strong>{selectedPrediction}</strong></p>
                  {classificationLocked && (
                    <button 
                      className="btn-unlock"
                      onClick={() => setClassificationLocked(false)}
                      title="Desbloquear para cambiar clasificación"
                    >
                      🔒 Cambiar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="description-input">
            <label htmlFor="noise-description">
              {predictions.length > 0 ? 'Corregir clasificación (opcional):' : '¿Qué tipo de ruido es?'}
            </label>
            <input
              id="noise-description"
              type="text"
              placeholder="Ej: Autos, obras, construcción, tráfico..."
              value={noiseDescription}
              onChange={(e) => setNoiseDescription(e.target.value)}
              disabled={isRecording}
            />
          </div>
        </div>

        {/* Botones de control */}
        <div className="button-group">
          {!isRecording && averageNoiseLevel === 0 && (
            <button
              className="btn btn-primary"
              onClick={startRecording}
              disabled={isLoading}
            >
              ▶ Iniciar Medición
            </button>
          )}

          {isRecording && (
            <button
              className="btn btn-danger"
              onClick={stopRecording}
            >
              ⏹ Detener
            </button>
          )}

          {!isRecording && averageNoiseLevel > 0 && (
            <>
              <button
                className="btn btn-success"
                onClick={saveRecording}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Guardando...' : '💾 Guardar Grabación'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={discardRecording}
                disabled={isLoading}
              >
                🗑️ Descartar
              </button>
            </>
          )}
        </div>

        {/* Estado de carga */}
        {uploadStatus && (
          <p className={`status-message ${uploadStatus.includes('✓') ? 'success' : 'error'}`}>
            {uploadStatus}
          </p>
        )}

        {/* Información */}
        <div className="info-box">
          <p><strong>💡 Tip:</strong> Presiona iniciar para medir el nivel de sonido en tu ubicación. El nivel se mostrará en tiempo real.</p>
          <p><strong>📍 Ubicación:</strong> Se guardará automáticamente cuando guardes la grabación.</p>
        </div>
      </div>
    </div>
  );
}

export default SoundRecorder;
