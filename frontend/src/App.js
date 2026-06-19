import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import MapBackground from './components/MapBackground';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import RecorderPage from './pages/RecorderPage';
import RecordingsPage from './pages/RecordingsPage';
import MapPage from './pages/MapPage';
import MonitorPage from './pages/MonitorPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <MapBackground />
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/recorder"
              element={
                <PrivateRoute>
                  <RecorderPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/recordings"
              element={
                <PrivateRoute>
                  <RecordingsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/map"
              element={
                <PrivateRoute>
                  <MapPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/monitor"
              element={
                <PrivateRoute>
                  <MonitorPage />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </AuthProvider>
    </Router>
  );
}

export default App;
