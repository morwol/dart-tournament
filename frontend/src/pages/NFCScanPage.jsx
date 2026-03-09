import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import NFCScanner from '../components/nfc/NFCScanner';

export default function NFCScanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const uid = searchParams.get('uid');
    if (uid) {
      handleScan(uid);
    }
  }, [searchParams]);

  const handleScan = async (uid) => {
    setScanning(true);
    setError('');
    try {
      const guest = await api.post('/nfc/scan', { uid });
      navigate(`/orders/${uid}`);
    } catch (err) {
      setError(err.message || 'NFC-Code nicht erkannt');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-2xl no-underline" style={{ color: 'var(--pe-text-sub)' }}>&larr;</Link>
        <img src="/logo.jpeg" alt="DartEvent" className="h-10" />
      </div>

      <h1
        className="text-xl font-bold text-center mb-8"
        style={{ background: 'var(--pe-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        NFC Scan
      </h1>

      <NFCScanner onScan={handleScan} scanning={scanning} />

      {error && (
        <p className="text-center mt-4" style={{ color: 'var(--pe-danger)' }}>{error}</p>
      )}
    </div>
  );
}
