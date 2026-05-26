/**
 * Solicita permiso para acceder al micrófono del usuario
 * @returns {Promise<MediaStream|null>} Stream del micrófono o null si se rechaza
 */
export const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });
    console.log("✓ Permiso de micrófono otorgado");
    return stream;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.log("✗ Permiso de micrófono rechazado por el usuario");
    } else if (error.name === 'NotFoundError') {
      console.log("✗ No se encontró dispositivo de micrófono");
    } else {
      console.error("✗ Error al solicitar micrófono:", error.message);
    }
    return null;
  }
};

/**
 * Detiene el stream del micrófono
 * @param {MediaStream} stream - Stream del micrófono a detener
 */
export const stopMicrophoneStream = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

/**
 * Verifica si el navegador soporta acceso al micrófono
 * @returns {boolean}
 */
export const isMicrophoneSupported = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};
