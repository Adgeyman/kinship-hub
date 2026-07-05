import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated (Supabase auto-logs them in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        // If not authenticated, check for token in URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        if (!accessToken) {
          setError('Invalid or expired reset link. Please request a new one.');
        } else {
          // If token exists but user not authenticated, try to set session
          supabase.auth.setSession({ access_token: accessToken, refresh_token: '' })
            .then(({ data, error }) => {
              if (error) {
                setError('Invalid or expired reset link.');
              } else if (data.session) {
                setIsAuthenticated(true);
              }
            });
        }
      }
    });
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
      setMessage('✅ Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        supabase.auth.signOut();
        window.location.href = '/';
      }, 2000);
    }
    setLoading(false);
  };

  if (!isAuthenticated && !error) {
    return (
      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        🔐 Create New Password
      </h1>
      
      <p style={{ color: '#64748B', marginBottom: '20px' }}>
        Enter your new password below.
      </p>
      
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
        <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
          New Password
        </label>
        <input
          type="password"
          placeholder="Minimum 6 characters"
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
        
        <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
          Confirm Password
        </label>
        <input
          type="password"
          placeholder="Confirm your new password"
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
