import { useId, useState } from 'react';

export default function InputField({ label, icon, type, placeholder, value, onChange, autoComplete, required, minLength, maxLength }) {
  const [focused, setFocused] = useState(false);
  const id = useId();

  return (
    <div style={{ marginBottom: '16px' }}>

      {/* Label */}
      <label htmlFor={id} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--color-brand-dark)',
        marginBottom: '7px',
        letterSpacing: '0.01em',
        fontFamily: 'sans-serif',
      }}>
        {icon && (
          <i
            className={`ti ${icon}`}
            aria-hidden="true"
            style={{ fontSize: '14px', color: 'var(--color-brand-primary)' }}
          />
        )}
        {label}
      </label>

      {/* Input */}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px 14px',
          borderRadius: '10px',
          border: focused
            ? '1.5px solid var(--color-brand-primary)'
            : '1.5px solid rgba(56,20,20,0.18)',
          background: focused ? '#FAF3EB' : '#F5EDE3',
          fontSize: '15px',
          color: 'var(--color-brand-dark)',
          boxSizing: 'border-box',
          outline: 'none',
          fontFamily: 'sans-serif',
          boxShadow: focused
            ? '0 0 0 3px rgba(187,162,136,0.25)'
            : 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        }}
      />
    </div>
  );
}
