import { useState } from 'react';
import { api } from '../../api/client';
import { useToastStore } from '../../store/toasts';

const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];

export default function ThrowInput({ game, onThrow }) {
  const { addToast } = useToastStore();
  const [value, setValue] = useState('');
  const [isDouble, setIsDouble] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isDoubleOut = game.checkout === 'double_out';

  const handleKey = (key) => {
    if (key === 'C') {
      setValue('');
      return;
    }
    if (key === 'OK') {
      handleSubmit();
      return;
    }
    const next = value + key;
    if (parseInt(next) <= 180) {
      setValue(next);
    }
  };

  const handleSubmit = async () => {
    const score = parseInt(value);
    if (isNaN(score) || score < 0 || score > 180) return;
    setSubmitting(true);
    try {
      await api.post(`/games/${game.id}/throw`, {
        score,
        is_double: isDouble,
      });
      setValue('');
      setIsDouble(false);
      onThrow();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Fehler beim Eintragen' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      <div
        className="text-center p-4 rounded-xl mb-3 pe-score"
        style={{ fontSize: '2rem', background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', color: 'var(--pe-text)', minHeight: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {value || '0'}
      </div>

      {isDoubleOut && (
        <button
          onClick={() => setIsDouble(!isDouble)}
          className="w-full py-3 rounded-xl mb-3 font-bold text-sm"
          style={{
            background: isDouble ? 'var(--pe-blue-deep)' : 'var(--pe-bg-elevated)',
            border: `1px solid ${isDouble ? 'var(--pe-blue-mid)' : 'var(--pe-border)'}`,
            color: isDouble ? 'var(--pe-text)' : 'var(--pe-text-sub)',
            minHeight: '64px',
            fontFamily: 'var(--pe-font-body)',
          }}
        >
          {isDouble ? 'Double Out: AN' : 'Double Out: AUS'}
        </button>
      )}

      <div className="grid grid-cols-3 gap-2">
        {numpadKeys.map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            disabled={submitting}
            className="rounded-xl font-bold text-lg disabled:opacity-50"
            style={{
              background: key === 'OK' ? 'var(--pe-success)' : key === 'C' ? 'var(--pe-danger)' : 'var(--pe-bg-elevated)',
              border: '1px solid var(--pe-border)',
              color: key === 'OK' || key === 'C' ? '#000' : 'var(--pe-text)',
              minHeight: '64px',
              fontFamily: 'var(--pe-font-body)',
            }}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
