export default function GuestSearchInput({
  value,
  onChange,
  placeholder = 'Name suchen…',
  onCreateNew,
  createLabel = '+ Neu',
  createDisabled = false,
  disabled = false,
}) {
  const btnDisabled = disabled || createDisabled;

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
          fontFamily: 'var(--pe-font-body)',
          borderRadius: 'var(--pe-radius-md)',
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
          disabled={btnDisabled}
          style={{
            minHeight: '64px',
            padding: '0 20px',
            background: btnDisabled ? 'var(--pe-bg-elevated)' : 'var(--pe-blue-mid)',
            color: btnDisabled ? 'var(--pe-text-muted)' : 'var(--pe-text)',
            border: btnDisabled ? '1px solid var(--pe-border)' : 'none',
            borderRadius: 'var(--pe-radius-md)',
            fontFamily: 'var(--pe-font-body)',
            fontWeight: 'bold',
            cursor: btnDisabled ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            opacity: btnDisabled ? 0.6 : 1,
            transition: 'background 0.15s, color 0.15s, opacity 0.15s',
          }}
        >
          {createLabel}
        </button>
      )}
    </div>
  );
}
