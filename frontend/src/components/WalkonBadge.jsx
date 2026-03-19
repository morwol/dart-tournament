// Walk-On status badge — single source of truth for all walk-on states.
// Props:
//   status  : 'loading' | 'error' | 'ready' | 'none' | null | undefined
//   artist  : string (used when status === 'ready')
//   title   : string (used when status === 'ready')
//   error   : string (used when status === 'error')
import { useRef, useState, useEffect } from 'react';
import { Loader2, AlertCircle, Music } from 'lucide-react';

const badgeBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  borderRadius: '6px',
  padding: '2px 7px',
  fontSize: '11px',
  fontFamily: 'var(--pe-font-body)',
  maxWidth: '100%',
  overflow: 'hidden',
};

// Marquee label: scrolls overflowing text left↔right on hover
function MarqueeLabel({ text }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shift, setShift] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !textRef.current) return;
    const overflow = textRef.current.scrollWidth - containerRef.current.clientWidth;
    setShift(overflow > 2 ? overflow : 0);
  }, [text]);

  const duration = shift > 0 ? Math.max(2, shift / 60) : 0;

  return (
    <span
      ref={containerRef}
      style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          ...(hovered && shift > 0 ? {
            '--walkon-shift': `-${shift}px`,
            animation: `walkon-marquee ${duration}s ease-in-out infinite alternate`,
          } : {}),
        }}
      >
        {text}
      </span>
    </span>
  );
}

export default function WalkonBadge({ status, artist, title, error }) {
  if (!status || status === 'none') return null;

  const resolvedStatus =
    status === 'pending' || status === 'downloading' ? 'loading' : status;

  if (resolvedStatus === 'loading') {
    return (
      <span style={{ ...badgeBase, background: 'rgba(255,176,32,0.1)', border: '1px solid rgba(255,176,32,0.3)', color: 'var(--pe-warning)', whiteSpace: 'nowrap' }}>
        <Loader2 size={11} style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
        Lädt...
      </span>
    );
  }

  if (resolvedStatus === 'error') {
    return (
      <span style={{ ...badgeBase, background: 'rgba(255,69,96,0.1)', border: '1px solid rgba(255,69,96,0.3)', color: 'var(--pe-danger)', whiteSpace: 'nowrap' }}>
        <AlertCircle size={11} style={{ flexShrink: 0 }} />
        {error || 'Fehler'}
      </span>
    );
  }

  if (resolvedStatus === 'ready') {
    const label = artist && title ? `${artist} — ${title}` : (title || artist || 'bereit');
    return (
      <span style={{ ...badgeBase, background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', color: 'var(--pe-success)', overflow: 'hidden' }}>
        <Music size={11} style={{ flexShrink: 0 }} />
        <MarqueeLabel text={label} />
      </span>
    );
  }

  return (
    <span style={{ ...badgeBase, background: 'transparent', border: '1px solid transparent', color: 'var(--pe-text-muted)' }}>
      <Music size={11} style={{ flexShrink: 0 }} />
    </span>
  );
}
