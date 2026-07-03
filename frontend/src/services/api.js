import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para agregar el token a las solicitudes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: async (email, username, password) => {
    const response = await api.post('/api/auth/register', {
      email,
      username,
      password,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  },
};

export const recordingService = {
  uploadRecording: async (latitude, longitude, noiseLevel, minNoiseLevel, maxNoiseLevel, audioData, description) => {
    const response = await api.post('/api/recordings/upload', {
      latitude,
      longitude,
      noise_level: noiseLevel,
      min_noise_level: minNoiseLevel,
      max_noise_level: maxNoiseLevel,
      audio_data: audioData,
      description,
    });
    return response.data;
  },

  getUserRecordings: async () => {
    const response = await api.get('/api/recordings/me');
    return response.data;
  },

  getAllRecordings: async () => {
    const response = await api.get('/api/recordings/all');
    return response.data;
  },

  getRecordingById: async (recordingId) => {
    const response = await api.get(`/api/recordings/${recordingId}`);
    return response.data;
  },

  deleteRecording: async (recordingId) => {
    const response = await api.delete(`/api/recordings/${recordingId}`);
    return response.data;
  },
};

export default api;
