import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem('cookie-consent');
    if (!consented) {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setVisible(false);
  };

  const rejectCookies = () => {
    localStorage.setItem('cookie-consent', 'false');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#1a1a2e',
      color: '#fff',
      padding: '16px 20px',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      zIndex: 9999,
      borderTop: '1px solid #333',
      fontSize: '14px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ flex: 3, minWidth: '200px' }}>
        <strong>🍪 We use cookies</strong>
        <span style={{ opacity: 0.8, marginLeft: '8px' }}>
          Essential cookies keep you logged in. No tracking or analytics cookies are used.
        </span>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={rejectCookies}
          style={{
            background: 'transparent',
            border: '1px solid #666',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Reject (essential only)
        </button>
        <button
          onClick={acceptCookies}
          style={{
            background: '#4f46e5',
            border: 'none',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
