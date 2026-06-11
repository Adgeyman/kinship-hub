import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have the access token in the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (!accessToken) {
      setError('Invalid or expired reset link. Please request a new one.');
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        supabase.auth.signOut();
        window.location.href = '/';
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Create New Password
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
      
      <form onSubmit={handleResetPassword}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            marginBottom: '12px',
            fontSize: '16px',
          }}
          required
          minLength={6}
        />
        
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
            fontSize: '16px',
          }}
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
          {loading ? 'Updating...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
