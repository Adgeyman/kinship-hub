import { useState, useEffect } from 'react';

export default function AddToHomeScreen() {
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else setPlatform(null);
    
    const dismissed = localStorage.getItem('addToHomeDismissed');
    if (!dismissed && (isIOS || isAndroid)) {
      setShowBanner(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem('addToHomeDismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner || !platform) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      right: '16px',
      background: '#1a1a2e',
      color: 'white',
      padding: '16px',
      borderRadius: '16px',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>📱</span>
            <strong style={{ fontSize: '14px' }}>Install Kinship Hub</strong>
          </div>
          <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8, margin: 0 }}>
            {platform === 'ios' && 'Tap Share icon → "Add to Home Screen"'}
            {platform === 'android' && 'Tap Menu (⋮) → "Install App" or "Add to Home Screen"'}
          </p>
          <p style={{ fontSize: '11px', marginTop: '6px', opacity: 0.5 }}>
            Works like a real app on your phone
          </p>
        </div>
        <button 
          onClick={dismiss} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'rgba(255,255,255,0.6)', 
            fontSize: '18px', 
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
