export default function CheckoutSuggestions({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-bold mb-2" style={{ color: 'var(--pe-text-muted)' }}>Checkout:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <span
            key={i}
            className="text-xs px-3 py-1 rounded-full font-bold"
            style={{ background: 'rgba(0,229,160,0.15)', color: 'var(--pe-success)', border: '1px solid var(--pe-success)' }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
