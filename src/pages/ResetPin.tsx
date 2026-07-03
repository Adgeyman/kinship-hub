import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ResetPin() {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated (they should be from the reset link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    });
  }, []);

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits');
      setLoading(false);
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      setLoading(false);
      return;
    }

    const hash = await hashPin(newPin);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setError('You must be logged in to reset your PIN');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ parent_pin_hash: hash })
      .eq('id', session.user.id);

    if (error) {
      setError(error.message);
    } else {
      setMessage('✅ PIN reset successfully! You can now close this page.');
      setTimeout(() => {
        window.location.href = '/settings';
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        🔐 Reset Parent PIN
      </h1>
      
      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}
      
      {message && (
        <div style={{ background: '#D1FAE5', color: '#065F46', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleResetPin}>
        <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
          New 4-digit PIN
        </label>
        <input
          type="password"
          placeholder="e.g. 1234"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            marginBottom: '12px',
            fontSize: '20px',
            textAlign: 'center',
            letterSpacing: '8px',
          }}
          maxLength={4}
          required
        />
        
        <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
          Confirm PIN
        </label>
        <input
          type="password"
          placeholder="Confirm your PIN"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
            fontSize: '20px',
            textAlign: 'center',
            letterSpacing: '8px',
          }}
          maxLength={4}
          required
        />
        
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Resetting...' : 'Reset PIN'}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECURITY: CLIENT-SIDE PIN HASHING (copied from App.tsx)
// ─────────────────────────────────────────────────────────────

const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`kinshiphub:parentpin:${pin}:v1`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};
