export default function GuestSearchInput({
  value,
  onChange,
  placeholder = 'Name suchen…',
  onCreateNew,
  createLabel = '+ Neu',
  disabled = false,
}) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1,
          minHeight: '64px',
          background: 'var(--pe-bg-card)',
          border: '1px solid var(--pe-border)',
          color: 'var(--pe-text)',
          fontFamily: 'Verdana, Geneva, sans-serif',
          borderRadius: '12px',
          padding: '0 16px',
          fontSize: '16px',
          outline: 'none',
          width: '100%',
        }}
      />
      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          disabled={disabled}
          style={{
            minHeight: '64px',
            padding: '0 20px',
            background: 'var(--pe-blue-mid)',
            color: 'var(--pe-text)',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'Verdana, Geneva, sans-serif',
            fontWeight: 'bold',
            cursor: disabled ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {createLabel}
        </button>
      )}
    </div>
  );
}
