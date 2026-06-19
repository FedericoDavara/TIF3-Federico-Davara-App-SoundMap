import React, { useState } from 'react';
import './MapBackground.css';

function MapBackground() {
  const [hoveredZone, setHoveredZone] = useState(null);

  const zones = [
    {
      id: 1,
      cx: 350,
      cy: 280,
      r: 80,
      color: '#FF4444',
      label: 'Zona Roja - Alta Actividad',
      opacity: 0.4,
      city: 'Mendoza'
    },
    {
      id: 2,
      cx: 420,
      cy: 200,
      r: 90,
      color: '#FFFF44',
      label: 'Zona Amarilla - Actividad Media',
      opacity: 0.35,
      city: 'Godoy Cruz'
    },
    {
      id: 3,
      cx: 300,
      cy: 150,
      r: 75,
      color: '#44FF44',
      label: 'Zona Verde - Baja Actividad',
      opacity: 0.35,
      city: 'Las Heras'
    },
    {
      id: 4,
      cx: 500,
      cy: 320,
      r: 85,
      color: '#FF8800',
      label: 'Zona Naranja - Actividad Variable',
      opacity: 0.4,
      city: 'Luján de Cuyo'
    }
  ];

  return (
    <div className="map-background">
      <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className="map-svg">
        {/* Definiciones */}
        <defs>
          <linearGradient id="terrainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#0B0F19', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#111827', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#0D1117', stopOpacity: 1 }} />
          </linearGradient>
          
          <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#0F4C81', stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: '#064E3B', stopOpacity: 0.8 }} />
          </linearGradient>

          <filter id="terrainTexture">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
          </filter>

          <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.5" />
          </filter>

          <pattern id="desertPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#111827" />
            <circle cx="5" cy="5" r="1" fill="#1F2937" opacity="0.3" />
            <circle cx="15" cy="12" r="1" fill="#1F2937" opacity="0.2" />
            <circle cx="10" cy="15" r="0.5" fill="#1F2937" opacity="0.3" />
          </pattern>

          {/* Patrón para montañas - Andes */}
          <pattern id="mountainPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <polygon points="15,0 30,25 0,25" fill="#1F2937" opacity="0.4" />
            <polygon points="10,5 25,25 0,25" fill="#374151" opacity="0.3" />
          </pattern>
        </defs>

        {/* Fondo de terreno - Modo Oscuro/Radar */}
        <rect width="800" height="600" fill="url(#terrainGradient)" />
        <rect width="800" height="600" fill="url(#desertPattern)" opacity="0.5" />

        {/* Montañas - Cordillera de los Andes (al oeste) - Más sutiles en modo oscuro */}
        <g opacity="0.3">
          <path
            d="M 0 150 L 40 280 L 80 200 L 120 320 L 160 240 L 200 350 L 240 200 Q 270 120, 300 80"
            fill="#1F2937"
            opacity="0.5"
          />
          <path
            d="M 0 180 L 35 300 L 75 220 L 115 340 L 155 260 L 195 370 L 235 220 Q 265 140, 300 100"
            fill="#2D3748"
            opacity="0.4"
          />
        </g>

        {/* Ríos principales - Río Mendoza */}
        <path
          d="M 50 350 Q 150 320, 250 300 Q 350 280, 450 270 Q 550 260, 700 250"
          stroke="#0F4C81"
          strokeWidth="18"
          fill="none"
          opacity="0.7"
          filter="url(#terrainTexture)"
        />

        {/* Ríos secundarios */}
        <path
          d="M 200 100 Q 250 200, 300 350"
          stroke="#1B5E7F"
          strokeWidth="8"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M 450 50 Q 480 180, 500 350"
          stroke="#1B5E7F"
          strokeWidth="8"
          fill="none"
          opacity="0.6"
        />

        {/* Carreteras principales - Rutas (Gris azulado tenue) */}
        <g stroke="#00D4FF" strokeWidth="9" opacity="0.65" strokeDasharray="20,8">
          <line x1="50" y1="300" x2="750" y2="300" />
          <path d="M 350 0 Q 360 300, 350 600" fill="none" />
          <path d="M 200 550 Q 400 200, 600 80" fill="none" />
        </g>

        {/* Carreteras secundarias */}
        <g stroke="#1F4D6D" strokeWidth="5" opacity="0.55" strokeDasharray="10,5">
          <line x1="100" y1="200" x2="700" y2="250" />
          <line x1="150" y1="450" x2="650" y2="400" />
          <path d="M 280 100 Q 320 300, 350 550" fill="none" />
        </g>

        {/* Cuadrícula de mapa muy sutil - Estilo radar */}
        <g opacity="0.08" stroke="#1F2937" strokeWidth="0.5">
          {[...Array(20)].map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="600" />
          ))}
          {[...Array(15)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 40} x2="800" y2={i * 40} />
          ))}
        </g>

        {/* Pueblos y ciudades de Mendoza */}
        <g className="cities">
          {/* Mendoza Capital */}
          <circle cx="350" cy="280" r="6" fill="#00D4FF" />
          <circle cx="350" cy="280" r="9" fill="none" stroke="#00D4FF" strokeWidth="2" opacity="0.6" />
          <text x="350" y="265" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#00D4FF">Mendoza</text>
          
          {/* Godoy Cruz */}
          <circle cx="420" cy="200" r="5" fill="#64B5F6" />
          <text x="420" y="185" textAnchor="middle" fontSize="11" fill="#64B5F6">Godoy Cruz</text>
          
          {/* Las Heras */}
          <circle cx="300" cy="150" r="5" fill="#64B5F6" />
          <text x="300" y="135" textAnchor="middle" fontSize="11" fill="#64B5F6">Las Heras</text>
          
          {/* Luján de Cuyo */}
          <circle cx="500" cy="320" r="5" fill="#64B5F6" />
          <text x="500" y="305" textAnchor="middle" fontSize="11" fill="#64B5F6">Luján de Cuyo</text>

          {/* Maipú */}
          <circle cx="550" cy="250" r="4" fill="#90CAF9" />
          <text x="550" y="238" textAnchor="middle" fontSize="10" fill="#90CAF9">Maipú</text>
        </g>

        {/* Zonas de actividad de sonido */}
        {zones.map((zone) => (
          <g
            key={zone.id}
            onMouseEnter={() => setHoveredZone(zone.id)}
            onMouseLeave={() => setHoveredZone(null)}
            className="zone-group"
          >
            {/* Sombra de zona */}
            <circle
              cx={zone.cx}
              cy={zone.cy}
              r={zone.r + 8}
              fill={zone.color}
              opacity="0.1"
              filter="url(#shadow)"
            />

            {/* Círculo principal de zona */}
            <circle
              cx={zone.cx}
              cy={zone.cy}
              r={zone.r}
              fill={zone.color}
              opacity={hoveredZone === zone.id ? zone.opacity + 0.15 : zone.opacity}
              stroke={zone.color}
              strokeWidth="3"
              className="zone-circle"
            />

            {/* Borde pulsante */}
            <circle
              cx={zone.cx}
              cy={zone.cy}
              r={zone.r}
              fill="none"
              stroke={zone.color}
              strokeWidth={hoveredZone === zone.id ? 4 : 2}
              opacity={hoveredZone === zone.id ? 0.9 : 0.6}
              className="zone-border"
            />

            {/* Anillos internos */}
            <circle
              cx={zone.cx}
              cy={zone.cy}
              r={zone.r * 0.6}
              fill="none"
              stroke={zone.color}
              strokeWidth="1"
              opacity={hoveredZone === zone.id ? 0.5 : 0.2}
              strokeDasharray="5,5"
            />

            {/* Marcador de ciudad */}
            <circle
              cx={zone.cx}
              cy={zone.cy}
              r="4"
              fill="white"
              stroke={zone.color}
              strokeWidth="2"
              opacity={hoveredZone === zone.id ? 1 : 0.7}
            />

            {/* Etiqueta de zona */}
            {hoveredZone === zone.id && (
              <g className="zone-label-group">
                <rect
                  x={zone.cx - 90}
                  y={zone.cy - 45}
                  width="180"
                  height="60"
                  fill="#0B0F19"
                  opacity="0.95"
                  rx="8"
                  stroke={zone.color}
                  strokeWidth="2"
                  filter="url(#shadow)"
                />
                <text
                  x={zone.cx}
                  y={zone.cy - 20}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {zone.label}
                </text>
                <text
                  x={zone.cx}
                  y={zone.cy + 5}
                  textAnchor="middle"
                  fill={zone.color}
                  fontSize="11"
                >
                  🎵 {zone.city}
                </text>
                <text
                  x={zone.cx}
                  y={zone.cy + 25}
                  textAnchor="middle"
                  fill="#90CAF9"
                  fontSize="9"
                >
                  Mendoza, Argentina
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Brújula - Estilo Radar */}
        <g className="compass">
          <circle cx="750" cy="80" r="28" fill="#00D4FF" opacity="0.15" stroke="#00D4FF" strokeWidth="2" />
          <text x="750" y="70" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#00D4FF">N</text>
          <line x1="750" y1="55" x2="750" y2="40" stroke="#00D4FF" strokeWidth="2" />
          <text x="765" y="110" textAnchor="middle" fontSize="9" fill="#64B5F6">Mendoza</text>
        </g>

        {/* Nota de elevación de Andes */}
        <g className="legend">
          <text x="20" y="30" fontSize="11" fontWeight="bold" fill="#00D4FF">⛰️ Cordillera de los Andes</text>
          <text x="20" y="50" fontSize="10" fill="#64B5F6">~3,500m promedio</text>
        </g>
      </svg>
    </div>
  );
}

export default MapBackground;
