import { Link } from 'react-router-dom';

export default function BackButton({ to = '/', label = 'Zurück' }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '10px',
        background: 'var(--pe-bg-elevated)',
        border: '1px solid var(--pe-border)',
        color: 'var(--pe-text-sub)',
        textDecoration: 'none',
        fontFamily: 'var(--pe-font-body)',
        fontWeight: 'bold',
        fontSize: '13px',
        minHeight: '64px',
        transition: 'border-color 0.15s, color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--pe-cyan-bright)'; e.currentTarget.style.color = 'var(--pe-cyan-bright)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--pe-border)'; e.currentTarget.style.color = 'var(--pe-text-sub)'; }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
        <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </Link>
  );
}
