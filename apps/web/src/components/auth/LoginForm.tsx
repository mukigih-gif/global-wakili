'use client';
import { useState } from 'react';
import { login } from '../../api/auth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = await login(email, password);
      if (!token) { setError('Login failed'); return; }
      // Store token securely — never log JWT to console
      sessionStorage.setItem('auth_token', token);
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='Email' required />
      <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='Password' required />
      {error && <p role='alert'>{error}</p>}
      <button type='submit'>Login</button>
    </form>
  );
}
