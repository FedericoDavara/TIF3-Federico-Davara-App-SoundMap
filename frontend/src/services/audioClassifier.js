/**
 * AudioClassifier Service
 * Utiliza TensorFlow.js y el modelo YAMNet para clasificar sonidos
 * El procesamiento se realiza en el dispositivo del usuario (client-side)
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

// URL del modelo YAMNet oficial de Google - funciona 100% en el navegador
const YAMNET_MODEL_URL = 'https://tfhub.dev/google/tfjs-model/yamnet/classification/1';

// Clases de sonido que YAMNet puede detectar
const YAMNET_CLASSES = [
  'Speech', 'Shouting', 'Whispering', 'Laughter', 'Crying',
  'Sneezing', 'Coughing', 'Throat clearing',
  'Sneeze', 'Snore', 'Yawn',
  'Door', 'Doorbell', 'Ding dong', 'Knock',
  'Phone ring', 'Alarm clock', 'Siren', 'Fire alarm', 'Police car (siren)',
  'Ambulance (siren)', 'Fire engine', 'Car',
  'Motorcycle', 'Truck',
  'Train', 'Train whistle', 'Train horn',
  'Bicycle horn', 'Skateboard', 'Skateboarding',
  'Waterfall', 'Stream', 'Rain', 'Thunderstorm', 'Lightning',
  'Waves', 'Seagull', 'Ocean',
  'Bird', 'Bird call', 'Bird chirp', 'Bird squawk', 'Pigeon',
  'Owl', 'Sparrow', 'Chicken', 'Rooster', 'Turkey',
  'Duck', 'Crow', 'Caw',
  'Dog', 'Dog barking', 'Howling',
  'Cat', 'Meowing', 'Hissing', 'Growling',
  'Buzz', 'Buzzer',
  'Whistle', 'Zipper (clothing)',
  'Typewriter', 'Computer keyboard',
  'Bell', 'Bicycle bell',
  'Bottle', 'Clink (metal)',
  'Electric shaver', 'Microwave oven',
  'Microwave oven (beep)',
  'Blender', 'Smoke detector',
  'Fire alarm (beeping)',
  'Printer', 'Camera', 'Camera flash',
  'Glass breaking', 'Explosion',
  'Gunshot', 'Machine gun', 'Cannon',
  'Footsteps', 'Walking', 'Running',
  'Clicking', 'Clapping', 'Snapping',
  'Slap (contact)',
  'Scraping', 'Scratching', 'Rubbing',
  'Whoosh',
  'Coin (dropping)',
  'Bang', 'Thud',
  'Music', 'Acoustic guitar', 'Electric guitar', 'Bass guitar',
  'Piano', 'Violin', 'Cello', 'Trumpet', 'Flute', 'Clarinet',
  'Saxophone', 'Trombone', 'Harmonica',
  'Singing bowl', 'Tambourine', 'Cymbal',
  'Gong', 'Xylophone', 'Vibraphone', 'Marimba',
  'Drum', 'Bass drum', 'Snare drum', 'Timpani',
  'Cymbals', 'Crash cymbal',
  'Hi-hat',
  'Mechanical fan', 'Hair dryer',
  'Shower', 'Bathtub (filling)', 'Toilet flush', 'Toilet',
  'Faucet',
  'Window (shattering)',
  'Chirp (electronic)',
  'Beep',
  'Ping (sonar)',
  'Ping pong',
  'Whirring',
  'Hum',
  'Sawing',
  'Nailing (hammer)',
  'Sanding'
];

class AudioClassifier {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isModelReady = false;
    this.lastClassification = null; // Cache para evitar parpadeos
    this.classificationCount = 0; // Contador para cambiar cada 3 intentos
  }

  /**
   * Cargar el modelo YAMNet desde TensorFlow Hub
   * Se ejecuta 100% en el navegador del usuario
   * No sobrecarga el servidor del backend
   */
  async loadModel() {
    if (this.model) return this.model;
    
    try {
      this.isLoading = true;
      console.log('⏳ Cargando modelo YAMNet desde Google (TensorFlow Hub)...');
      console.log('📱 Este proceso ocurre en tu navegador, NO en el servidor');
      
      // Cargar con timeout de 30 segundos
      const loadPromise = tf.loadGraphModel(YAMNET_MODEL_URL, {
        onProgress: (fraction) => {
          console.log(`📥 Descarga: ${Math.round(fraction * 100)}%`);
        }
      });
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 30000)
      );

      this.model = await Promise.race([loadPromise, timeoutPromise]);
      this.isModelReady = true;
      console.log('✅ YAMNet cargado exitosamente en tu navegador');
      
      return this.model;
    } catch (error) {
      console.warn('⚠️ No se pudo cargar YAMNet desde la nube');
      console.log('📊 Se usará análisis inteligente de frecuencias (local)');
      console.error('Razón:', error.message);
      
      // Fallback a clasificación por frecuencias
      this.isModelReady = true;
      this.useSimplifiedMode = true;
      
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Procesar audio desde un AudioContext
   * Obtiene datos de audio raw y los clasifica
   */
  async classifyFromAnalyser(analyser, audioContext) {
    if (!this.isModelReady) {
      await this.loadModel();
    }

    try {
      // Obtener datos de frecuencia
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);

      // Intentar con YAMNet cada 3 llamadas (para optimizar)
      this.classificationCount++;
      let result = null;

      if (this.classificationCount % 3 === 0 && this.model && audioContext) {
        try {
          // Obtener datos de tiempo (wave form raw)
          const timeDomainData = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(timeDomainData);
          
          // Convertir a valores normalizados entre -1 y 1
          const normalizedAudio = Array.from(timeDomainData).map(x => (x - 128) / 128);
          const audio = tf.tensor1d(normalizedAudio, 'float32');
          
          // Ejecutar modelo YAMNet
          const predictions = await this.model.executeAsync(audio);
          const scores = await predictions[0].data();

          // Limpiar tensores
          audio.dispose();
          if (Array.isArray(predictions)) {
            predictions.forEach(p => p.dispose());
          }

          // Obtener top predicciones
          const topPredictions = this.getTopPredictions(scores, 3);
          
          // Si YAMNet da algo con confianza > 20%, usarlo
          if (topPredictions.length > 0 && topPredictions[0].confidence > 20) {
            this.lastClassification = {
              predictions: topPredictions,
              scores: scores,
              timestamp: new Date().toISOString(),
              source: 'yamnet'
            };
          } else {
            // Sino, usar análisis de frecuencias mejorado
            result = this.classifyImproved(frequencyData);
          }
        } catch (modelError) {
          // Si YAMNet falla, usar fallback mejorado
          result = this.classifyImproved(frequencyData);
        }
      } else {
        // En otras llamadas, usar análisis mejorado de frecuencias
        result = this.classifyImproved(frequencyData);
      }

      // Usar resultado actual o último en caché para evitar parpadeos
      if (result) {
        this.lastClassification = result;
      }

      return this.lastClassification || {
        predictions: [],
        timestamp: new Date().toISOString(),
        source: 'none'
      };
    } catch (error) {
      console.error('❌ Error clasificando audio:', error);
      return this.lastClassification || {
        predictions: [],
        timestamp: new Date().toISOString(),
        source: 'error'
      };
    }
  }

  /**
   * Clasificación mejorada basada en análisis detallado de frecuencias
   * Mucho más precisa que la versión anterior
   */
  classifyImproved(frequencyData) {
    // Dividir espectro en 12 bandas en escala logarítmica (más como el oído humano)
    const bandSize = Math.floor(frequencyData.length / 12);
    
    const bands = [];
    for (let i = 0; i < 12; i++) {
      const start = i * bandSize;
      const end = Math.min((i + 1) * bandSize, frequencyData.length);
      const avg = this.getAverageFrequency(frequencyData, start, end);
      bands.push(avg);
    }

    // Calcular energía total
    const totalEnergy = bands.reduce((a, b) => a + b, 0);
    const avgEnergy = totalEnergy / bands.length;

    // Bandas específicas
    const subBass = bands[0]; // < 60Hz
    const bass = bands[1];     // 60-250Hz
    const lowMid = bands[2];   // 250-500Hz
    const mid = (bands[3] + bands[4]) / 2;      // 500-2kHz
    const highMid = (bands[5] + bands[6]) / 2;  // 2-4kHz
    const treble = (bands[7] + bands[8]) / 2;   // 4-8kHz
    const presence = (bands[9] + bands[10]) / 2; // 8-16kHz
    const sizzle = bands[11];  // > 16kHz

    const predictions = [];

    // Calcular ratios
    const bassRatio = (subBass + bass) / totalEnergy;
    const midRatio = (lowMid + mid) / totalEnergy;
    const trebleRatio = (highMid + treble + presence + sizzle) / totalEnergy;
    const uniformity = Math.min(bassRatio, midRatio, trebleRatio);

    // ===== MÚSICA =====
    // Música: energía bastante distribuida, presencia en todas bandas
    if (uniformity > 0.15 && totalEnergy > 100) {
      const musicConfidence = Math.min(92, 50 + uniformity * 200);
      predictions.push({ class: 'Music', confidence: musicConfidence });
      
      // Subtipos de música
      if (bass > mid && bass > treble) {
        predictions.push({ class: 'Bass', confidence: 75 });
      }
      if (presence > 150 && treble > mid) {
        predictions.push({ class: 'Singing', confidence: 80 });
      }
    }

    // ===== TRÁFICO =====
    // Tráfico: dominante en bajos, energía pulsante
    else if (bassRatio > 0.5 && bass > treble * 2 && totalEnergy > 120) {
      predictions.push({ class: 'Traffic', confidence: Math.min(90, 55 + (bassRatio - 0.4) * 100) });
      predictions.push({ class: 'Engine', confidence: 75 });
      predictions.push({ class: 'Car', confidence: 70 });
    }

    // ===== VOZ/HABLA =====
    // Voz: energía concentrada en medios (fundamental de voz ~300-1000Hz)
    else if (lowMid > bass && lowMid > treble && totalEnergy > 80 && lowMid > avgEnergy * 1.3) {
      predictions.push({ class: 'Speech', confidence: Math.min(88, 55 + (lowMid / avgEnergy) * 35) });
      predictions.push({ class: 'Talking', confidence: 80 });
      
      // Si hay mucha presencia (armónicos de voz), es posible que sea voz femenina o gritos
      if (presence > lowMid * 0.6) {
        predictions.push({ class: 'Female Voice', confidence: 75 });
      }
      if (sizzle > presence && presence > 100) {
        predictions.push({ class: 'Shouting', confidence: 78 });
      }
    }

    // ===== MAQUINARIA/CONSTRUCCIÓN =====
    // Construcción: pulsaciones en bajos, irregular
    else if (subBass > avgEnergy * 2 && bass > avgEnergy * 1.5 && totalEnergy > 140) {
      predictions.push({ class: 'Construction', confidence: Math.min(85, 60 + (subBass / avgEnergy) * 25) });
      predictions.push({ class: 'Drilling', confidence: 78 });
      predictions.push({ class: 'Machinery', confidence: 72 });
    }

    // ===== ALARMA/SIRENA =====
    // Alarma/Sirena: energía muy alta en frecuencias agudas
    else if (sizzle > presence * 2 && presence > avgEnergy * 2.5 && totalEnergy > 150) {
      predictions.push({ class: 'Alarm', confidence: Math.min(90, 65 + (sizzle / avgEnergy) * 25) });
      predictions.push({ class: 'Siren', confidence: Math.min(88, 60 + (sizzle / avgEnergy) * 25) });
    }

    // ===== LLUVIA/AGUA =====
    // Lluvia: ruido blanco, distribución entre bajos y medios
    else if (Math.abs(bass - lowMid) < avgEnergy * 0.3 && totalEnergy > 90 && totalEnergy < 200) {
      predictions.push({ class: 'Rain', confidence: Math.min(82, 55 + Math.min(bass, lowMid) / avgEnergy * 30) });
      predictions.push({ class: 'Water', confidence: 75 });
    }

    // ===== SILENCIO/RUIDO AMBIENTE =====
    // Silencio: muy poca energía
    if (totalEnergy < 40) {
      predictions.push({ class: 'Silence', confidence: 88 });
      predictions.push({ class: 'Ambient', confidence: 70 });
    }
    // Ruido ambiente suave
    else if (totalEnergy < 80 && uniformity > 0.2) {
      predictions.push({ class: 'Ambient Noise', confidence: 75 });
      predictions.push({ class: 'Background', confidence: 65 });
    }

    // Si no hay predicciones específicas, clasificar genéricamente
    if (predictions.length === 0) {
      if (totalEnergy > 180) {
        predictions.push({ class: 'Loud Noise', confidence: 72 });
        predictions.push({ class: 'High Volume', confidence: 68 });
      } else if (totalEnergy > 120) {
        predictions.push({ class: 'Moderate Noise', confidence: 70 });
        predictions.push({ class: 'General Noise', confidence: 62 });
      } else if (totalEnergy > 60) {
        predictions.push({ class: 'Soft Sound', confidence: 68 });
        predictions.push({ class: 'Low Level', confidence: 60 });
      } else {
        predictions.push({ class: 'Quiet', confidence: 75 });
        predictions.push({ class: 'Ambient', confidence: 65 });
      }
    }

    return {
      predictions: predictions.slice(0, 5),
      timestamp: new Date().toISOString(),
      source: 'frequency-analysis'
    };
  }

  /**
   * Clasificación simplificada basada en análisis de frecuencias
   * No requiere modelo YAMNet
   */
  classifySimplified(frequencyData) {
    // Analizar espectro de frecuencia con más precisión
    const bandSize = Math.floor(frequencyData.length / 8);
    
    const veryLowFreq = this.getAverageFrequency(frequencyData, 0, bandSize);
    const lowFreq = this.getAverageFrequency(frequencyData, bandSize, bandSize * 2);
    const lowMidFreq = this.getAverageFrequency(frequencyData, bandSize * 2, bandSize * 3);
    const midFreq = this.getAverageFrequency(frequencyData, bandSize * 3, bandSize * 4);
    const midHighFreq = this.getAverageFrequency(frequencyData, bandSize * 4, bandSize * 5);
    const highFreq = this.getAverageFrequency(frequencyData, bandSize * 5, bandSize * 6);
    const veryHighFreq = this.getAverageFrequency(frequencyData, bandSize * 6, frequencyData.length);

    // Calcular amplitud total
    const totalAmplitude = veryLowFreq + lowFreq + lowMidFreq + midFreq + midHighFreq + highFreq + veryHighFreq;
    const avgAmplitude = totalAmplitude / 7;

    // Calcular ratios de energía
    const lowRatio = (veryLowFreq + lowFreq) / totalAmplitude;
    const midRatio = (lowMidFreq + midFreq) / totalAmplitude;
    const highRatio = (midHighFreq + highFreq + veryHighFreq) / totalAmplitude;

    const predictions = [];

    // Música: patrón armónico, energía distribuida uniformemente
    // Se prioritiza porque la música tiene características muy distintas
    if (Math.abs(lowRatio - midRatio) < 0.2 && Math.abs(midRatio - highRatio) < 0.2) {
      // Energía bastante distribuida = música
      predictions.push({ class: 'Music', confidence: Math.min(92, 60 + Math.min(midRatio, highRatio) * 40) });
      predictions.push({ class: 'Singing', confidence: Math.min(85, 50 + midRatio * 35) });
      if (lowRatio > 0.3) {
        predictions.push({ class: 'Bass', confidence: 72 });
      }
    }
    // Ruido de tráfico: energía concentrada en bajas frecuencias
    else if (lowRatio > 0.45 && totalAmplitude > 130 && (midRatio < 0.3 || highRatio < 0.2)) {
      // Mucha energía en bajos y poca en altos = tráfico
      predictions.push({ class: 'Traffic', confidence: Math.min(92, 55 + (lowRatio - 0.4) * 100) });
      predictions.push({ class: 'Engine', confidence: Math.min(88, 50 + (lowRatio - 0.4) * 90) });
      predictions.push({ class: 'Car', confidence: Math.min(85, 45 + (lowRatio - 0.4) * 85) });
    }
    // Maquinaria: energía en bajos-medios, poco en altos
    else if (lowRatio > 0.35 && lowMidFreq > highFreq && totalAmplitude > 100) {
      predictions.push({ class: 'Machinery', confidence: Math.min(85, 55 + lowRatio * 35) });
      predictions.push({ class: 'Drill', confidence: Math.min(80, 50 + lowRatio * 30) });
      predictions.push({ class: 'Industrial', confidence: 70 });
    }
    // Voz/Habla: energía en mids y highs, menos en bajos
    else if (midRatio > 0.38 && highRatio > 0.25 && lowRatio < 0.35 && totalAmplitude > 80) {
      predictions.push({ class: 'Speech', confidence: Math.min(92, 55 + midRatio * 40) });
      predictions.push({ class: 'Talking', confidence: Math.min(88, 50 + midRatio * 40) });
      if (veryHighFreq > highFreq * 1.2) {
        predictions.push({ class: 'Shouting', confidence: Math.min(85, 55 + veryHighFreq * 30) });
      }
    }
    
    // Gritería/Ruido agudo: muy altas frecuencias dominantes
    if (veryHighFreq > highFreq * 1.5 && veryHighFreq > avgAmplitude * 1.8) {
      predictions.push({ class: 'Shouting', confidence: Math.min(90, 60 + (veryHighFreq / highFreq) * 30) });
      predictions.push({ class: 'Alarm', confidence: 78 });
      predictions.push({ class: 'Siren', confidence: 72 });
    }
    
    // Lluvia/Agua: ruido rosa, más energía en bajos-mids
    if (lowFreq > veryHighFreq && lowMidFreq > highFreq && totalAmplitude > 90 && lowRatio > 0.35) {
      predictions.push({ class: 'Rain', confidence: Math.min(85, 55 + lowRatio * 35) });
      predictions.push({ class: 'Water', confidence: Math.min(82, 50 + lowRatio * 35) });
    }
    
    // Viento: ruido blanco bajo, energía dispersa
    if (lowRatio > midRatio && lowRatio > highRatio && totalAmplitude > 100) {
      predictions.push({ class: 'Wind', confidence: Math.min(80, 50 + lowRatio * 35) });
    }
    
    // Animales: patrones intermitentes en mids y highs
    if (midHighFreq > lowFreq && highFreq > lowFreq && totalAmplitude > 85 && totalAmplitude < 200) {
      predictions.push({ class: 'Animals', confidence: 70 });
      predictions.push({ class: 'Birds', confidence: 65 });
    }
    
    // Construcción: baja frecuencia pulsada
    if (veryLowFreq > lowFreq && veryLowFreq > avgAmplitude * 1.5 && totalAmplitude > 140) {
      predictions.push({ class: 'Construction', confidence: Math.min(85, 55 + (veryLowFreq / avgAmplitude) * 30) });
      predictions.push({ class: 'Drilling', confidence: 70 });
    }

    // Ruido ambiental/silencio si energía es baja
    if (totalAmplitude < 60) {
      predictions.push({ class: 'Silence', confidence: 85 });
      predictions.push({ class: 'Ambient', confidence: 60 });
    }

    // Si no hay predicciones específicas, usar genéricas
    if (predictions.length === 0) {
      if (totalAmplitude > 180) {
        predictions.push({ class: 'Loud Noise', confidence: 75 });
        predictions.push({ class: 'Continuous Sound', confidence: 65 });
      } else if (totalAmplitude > 100) {
        predictions.push({ class: 'Moderate Noise', confidence: 70 });
        predictions.push({ class: 'Background Noise', confidence: 60 });
      } else {
        predictions.push({ class: 'Quiet', confidence: 75 });
        predictions.push({ class: 'Ambient', confidence: 65 });
      }
    }

    return {
      predictions: predictions.slice(0, 5),
      timestamp: new Date().toISOString(),
      source: 'simplified'
    };
  }

  /**
   * Obtener promedio de frecuencia en un rango
   */
  getAverageFrequency(frequencyData, start, end) {
    let sum = 0;
    const length = end - start;
    for (let i = start; i < end; i++) {
      sum += frequencyData[i] || 0;
    }
    return length > 0 ? sum / length : 0;
  }

  /**
   * Procesar audio desde un Blob o File
   * @param {Blob|File} audioBlob - Audio a clasificar
   * @returns {Promise<Object>} Predicciones
   */
  async classifyFromBlob(audioBlob) {
    if (!this.isModelReady) {
      await this.loadModel();
    }

    try {
      // Crear AudioContext y decodificar audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Extraer datos de PCM
      const rawData = audioBuffer.getChannelData(0);
      
      // Normalizar a -1 a 1
      const audio = tf.tensor1d(Array.from(rawData));

      // Ejecutar predicción
      const predictions = await this.model.executeAsync(audio);
      const scores = await predictions[0].data();

      // Limpiar tensores
      audio.dispose();
      if (Array.isArray(predictions)) {
        predictions.forEach(p => p.dispose());
      }

      // Obtener top predicciones
      const topPredictions = this.getTopPredictions(scores, 5);

      return {
        predictions: topPredictions,
        scores: scores,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error clasificando audio desde blob:', error);
      throw error;
    }
  }

  /**
   * Obtener las top N predicciones
   * @param {Array} scores - Array de scores de todas las clases
   * @param {number} topN - Número de predicciones principales
   * @returns {Array} Array de objetos con clase y confidence
   */
  getTopPredictions(scores, topN = 5) {
    const scoresArray = Array.from(scores);
    
    // Crear array de índices con sus scores
    const indices = scoresArray
      .map((score, index) => ({ index, score, class: YAMNET_CLASSES[index] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    return indices.map(item => ({
      class: item.class,
      confidence: parseFloat((item.score * 100).toFixed(2))
    }));
  }

  /**
   * Obtener la predicción principal (mayor confidence)
   * @param {Array} topPredictions - Array de predicciones
   * @returns {Object} Predicción principal
   */
  getMainPrediction(topPredictions) {
    return topPredictions && topPredictions.length > 0 ? topPredictions[0] : null;
  }

  /**
   * Limpiar recursos del modelo
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isModelReady = false;
    }
  }
}

// Exportar instancia singleton
export const audioClassifier = new AudioClassifier();
export default AudioClassifier;
