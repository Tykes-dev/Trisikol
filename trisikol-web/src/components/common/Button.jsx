import { useState } from 'react';

export default function Button({ children, onClick, type = 'button', disabled = false }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '14px',
        marginTop: '20px',
        background: hovered ? '#4f1c1c' : 'var(--color-brand-mid)',
        color: 'var(--color-brand-light)',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontFamily: 'sans-serif',
        letterSpacing: '0.02em',
        boxShadow: hovered
          ? '0 6px 18px rgba(56,20,20,0.45)'
          : '0 4px 14px rgba(56,20,20,0.3)',
        WebkitAppearance: 'none',
        appearance: 'none',
        transition: 'background 0.15s, box-shadow 0.15s',
      }}
    >
      {children}
    </button>
  );
}
