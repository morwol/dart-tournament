// Walk-On status badge — single source of truth for all walk-on states.
// Props:
//   status  : 'loading' | 'error' | 'ready' | 'none' | null | undefined
//   artist  : string (used when status === 'ready')
//   title   : string (used when status === 'ready')
//   error   : string (used when status === 'error')
import { Loader2, AlertCircle, Music } from 'lucide-react';

export default function WalkonBadge({ status, artist, title, error }) {
  if (!status || status === 'none') return null;

  // Map legacy backend values to our four canonical states
  const resolvedStatus =
    status === 'pending' || status === 'downloading' ? 'loading' : status;

  if (resolvedStatus === 'loading') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(255,176,32,0.1)',
          border: '1px solid rgba(255,176,32,0.3)',
          borderRadius: '6px',
          padding: '2px 7px',
          fontSize: '11px',
          color: 'var(--pe-warning)',
          fontFamily: 'var(--pe-font-body)',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <Loader2
          size={11}
          style={{
            flexShrink: 0,
            animation: 'spin 1s linear infinite',
          }}
        />
        Lädt...
      </span>
    );
  }

  if (resolvedStatus === 'error') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(255,69,96,0.1)',
          border: '1px solid rgba(255,69,96,0.3)',
          borderRadius: '6px',
          padding: '2px 7px',
          fontSize: '11px',
          color: 'var(--pe-danger)',
          fontFamily: 'var(--pe-font-body)',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <AlertCircle size={11} style={{ flexShrink: 0 }} />
        {error || 'Fehler'}
      </span>
    );
  }

  if (resolvedStatus === 'ready') {
    const label = artist && title ? `${artist} — ${title}` : 'bereit';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(0,229,160,0.1)',
          border: '1px solid rgba(0,229,160,0.3)',
          borderRadius: '6px',
          padding: '2px 7px',
          fontSize: '11px',
          color: 'var(--pe-success)',
          fontFamily: 'var(--pe-font-body)',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <Music size={11} style={{ flexShrink: 0 }} />
        {label}
      </span>
    );
  }

  // Unknown / fallback — muted music icon
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: '6px',
        padding: '2px 7px',
        fontSize: '11px',
        color: 'var(--pe-text-muted)',
        fontFamily: 'var(--pe-font-body)',
      }}
    >
      <Music size={11} style={{ flexShrink: 0 }} />
    </span>
  );
}
