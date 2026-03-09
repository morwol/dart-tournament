import { useState, useEffect } from 'react';

export default function NFCScanner({ onScan, scanning }) {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('idle');

  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
      startNFC();
    }
  }, []);

  const startNFC = async () => {
    try {
      setNfcStatus('reading');
      const ndef = new window.NDEFReader();
      await ndef.scan();
      ndef.addEventListener('reading', ({ serialNumber }) => {
        onScan(serialNumber);
      });
    } catch {
      setNfcStatus('error');
    }
  };

  return (
    <div className="text-center">
      {nfcSupported ? (
        <div>
          <div
            className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6"
            style={{
              background: 'var(--pe-bg-elevated)',
              border: '2px solid var(--pe-cyan-bright)',
              animation: nfcStatus === 'reading' ? 'pulse 2s infinite' : 'none',
            }}
          >
            <span className="text-4xl" style={{ color: 'var(--pe-cyan-bright)' }}>NFC</span>
          </div>
          <p style={{ color: 'var(--pe-text-sub)' }}>
            {scanning ? 'Wird verarbeitet...' : 'Halte NFC-Tag ans Geraet'}
          </p>
        </div>
      ) : (
        <div>
          <div
            className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6"
            style={{ background: 'var(--pe-bg-elevated)', border: '2px solid var(--pe-text-muted)' }}
          >
            <span className="text-4xl" style={{ color: 'var(--pe-text-muted)' }}>QR</span>
          </div>
          <p className="mb-4" style={{ color: 'var(--pe-text-sub)' }}>
            NFC nicht verfuegbar. Nutze einen QR-Code mit UID-Parameter.
          </p>
          <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>
            URL-Format: /nfc?uid=DEIN_CODE
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 184, 255, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(0, 184, 255, 0); }
        }
      `}</style>
    </div>
  );
}
