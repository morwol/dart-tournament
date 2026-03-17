import { useState } from 'react';

const stations = [
  {
    id: 'bar',
    emoji: '🍺',
    label: 'Bar',
    description: 'Bestellungen aufnehmen',
    accent: 'var(--pe-cyan-bright)',
  },
  {
    id: 'register',
    emoji: '💳',
    label: 'Kasse',
    description: 'Gäste abrechnen',
    accent: 'var(--pe-success)',
  },
];

export default function StationSelector({ onSelect }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--pe-bg)',
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
    >
      {/* Header */}
      <img src="/logo.png" alt="Logo" style={{ height: 56, marginBottom: 16 }} />
      <h1
        style={{
          color: 'var(--pe-text)',
          fontSize: 22,
          fontWeight: 'bold',
          margin: 0,
        }}
      >
        Station wählen
      </h1>
      <p
        style={{
          color: 'var(--pe-text-sub)',
          fontSize: 14,
          margin: '8px 0 0',
        }}
      >
        Wähle deine Station für diese Schicht
      </p>

      {/* Responsive grid via style tag */}
      <style>{`
        .station-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          width: 100%;
          max-width: 480px;
          margin-top: 32px;
        }
        @media (min-width: 768px) {
          .station-grid {
            grid-template-columns: repeat(2, 1fr);
            max-width: 480px;
          }
        }
      `}</style>

      <div className="station-grid">
        {stations.map((station) => {
          const isHovered = hovered === station.id;
          return (
            <button
              key={station.id}
              onClick={() => onSelect(station.id)}
              onMouseEnter={() => setHovered(station.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                minHeight: 140,
                borderRadius: 16,
                border: `1px solid ${isHovered ? station.accent : 'var(--pe-border)'}`,
                background: isHovered ? 'var(--pe-bg-elevated)' : 'var(--pe-bg-card)',
                color: 'var(--pe-text)',
                fontFamily: 'Verdana, Geneva, sans-serif',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: 20,
                width: '100%',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <span style={{ fontSize: 40, lineHeight: 1 }}>{station.emoji}</span>
              <span style={{ fontSize: 18, fontWeight: 'bold' }}>{station.label}</span>
              <span style={{ fontSize: 12, color: 'var(--pe-text-sub)' }}>
                {station.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
