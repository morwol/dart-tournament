import { useState, useEffect } from 'react';

export default function NFCScanner({ onScan, scanning }) {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('idle'); // 'idle' | 'reading' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  const startNFC = async () => {
    if (nfcStatus !== 'idle') return;
    try {
      setNfcStatus('reading');
      setErrorMessage('');
      const ndef = new window.NDEFReader();
      await ndef.scan();
      ndef.addEventListener('reading', ({ serialNumber }) => {
        onScan(serialNumber);
        setNfcStatus('idle');
      });
    } catch (err) {
      setNfcStatus('error');
      setErrorMessage(err?.message || 'NFC konnte nicht gestartet werden.');
    }
  };

  const statusText = () => {
    if (scanning) return 'Wird verarbeitet...';
    if (nfcStatus === 'reading') return 'NFC aktiv \u2013 Chip heranhalten';
    if (nfcStatus === 'error') return errorMessage || 'Fehler beim NFC-Scan';
    return 'Tippen zum Starten';
  };

  const circleColor = () => {
    if (nfcStatus === 'error') return 'var(--pe-danger)';
    if (nfcStatus === 'reading') return 'var(--pe-cyan-bright)';
    return 'var(--pe-blue-mid)';
  };

  return (
    <div className="text-center">
      {nfcSupported ? (
        <div>
          <button
            onClick={startNFC}
            disabled={nfcStatus === 'reading' || nfcStatus === 'error' || scanning}
            style={{
              background: 'none',
              border: 'none',
              cursor: nfcStatus === 'idle' && !scanning ? 'pointer' : 'default',
              padding: 0,
              display: 'block',
              margin: '0 auto 1.5rem',
            }}
            aria-label={statusText()}
          >
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                width: '8rem',
                height: '8rem',
                minWidth: '64px',
                minHeight: '64px',
                background: 'var(--pe-bg-elevated)',
                border: `2px solid ${circleColor()}`,
                animation: nfcStatus === 'reading' ? 'pulse 2s infinite' : 'none',
              }}
            >
              <span className="text-4xl" style={{ color: circleColor(), fontFamily: 'Verdana, Geneva, sans-serif' }}>NFC</span>
            </div>
          </button>
          <p style={{ color: nfcStatus === 'error' ? 'var(--pe-danger)' : 'var(--pe-text-sub)', fontFamily: 'Verdana, Geneva, sans-serif' }}>
            {statusText()}
          </p>
          {nfcStatus === 'error' && (
            <button
              onClick={() => setNfcStatus('idle')}
              style={{
                marginTop: '1rem',
                color: 'var(--pe-cyan-bright)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'Verdana, Geneva, sans-serif',
                fontSize: '0.875rem',
              }}
            >
              Erneut versuchen
            </button>
          )}
        </div>
      ) : (
        <div>
          <div
            className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6"
            style={{
              width: '8rem',
              height: '8rem',
              minWidth: '64px',
              minHeight: '64px',
              background: 'var(--pe-bg-elevated)',
              border: '2px solid var(--pe-text-muted)',
            }}
          >
            <span className="text-4xl" style={{ color: 'var(--pe-text-muted)', fontFamily: 'Verdana, Geneva, sans-serif' }}>QR</span>
          </div>
          <p className="mb-4" style={{ color: 'var(--pe-text-sub)', fontFamily: 'Verdana, Geneva, sans-serif' }}>
            NFC nicht verfuegbar. Nutze einen QR-Code mit UID-Parameter.
          </p>
          <p className="text-sm" style={{ color: 'var(--pe-text-muted)', fontFamily: 'Verdana, Geneva, sans-serif' }}>
            URL-Format: /nfc?uid=DEIN_CODE
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--pe-cyan-bright) 40%, transparent); }
          70% { box-shadow: 0 0 0 20px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `}</style>
    </div>
  );
}
