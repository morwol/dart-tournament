// frontend/src/pages/LoginSelectionPage.jsx
import { useNavigate } from 'react-router-dom';

const OPTIONS = [
  {
    icon: '📋',
    label: 'Schiedsrichter',
    sub: 'Boards verwalten & Würfe eingeben',
    path: '/referee',
    color: 'var(--pe-warning)',
    bg: 'rgba(255,176,32,0.1)',
    border: 'rgba(255,176,32,0.3)',
  },
  {
    icon: '🛒',
    label: 'Gastronomy / Kasse',
    sub: 'Bestellungen & Zahlungen',
    path: '/gastronomy',
    color: 'var(--pe-success)',
    bg: 'rgba(0,229,160,0.1)',
    border: 'rgba(0,229,160,0.3)',
  },
  {
    icon: '⚙️',
    label: 'Admin / Veranstalter',
    sub: 'Turniere, Spieler, Boards verwalten',
    path: '/admin',
    color: 'var(--pe-cyan-bright)',
    bg: 'rgba(0,184,255,0.1)',
    border: 'rgba(0,184,255,0.3)',
  },
];

export default function LoginSelectionPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'var(--pe-font-body)',
    }}>
      <p style={{
        fontSize: '10px',
        color: 'var(--pe-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: '20px',
      }}>
        Bereich auswählen
      </p>

      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.path}
            onClick={() => navigate(opt.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: opt.bg,
              border: `1px solid ${opt.border}`,
              borderRadius: '14px',
              padding: '18px 20px',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--pe-font-body)',
              minHeight: '72px',
              transition: 'opacity 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <span style={{ fontSize: '28px', flexShrink: 0 }}>{opt.icon}</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: opt.color }}>
                {opt.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginTop: '2px' }}>
                {opt.sub}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
