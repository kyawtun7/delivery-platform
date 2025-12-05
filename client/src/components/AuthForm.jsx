import React, { useState } from 'react';
import { api, setAuthToken } from '../api';

export default function AuthForm({ onAuthed }) {
  const [mode, setMode] = useState('login'); // or 'register'
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (mode === 'register') {
        res = await api.post('/auth/register', {
          ...form,
          role
        });
      } else {
        res = await api.post('/auth/login', {
          email: form.email,
          password: form.password,
          role
        });
      }
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setAuthToken(token);
      onAuthed(user);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Authentication failed, try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ width: 420 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div className="badge">On-Demand Delivery Platform</div>
          <h2 style={{ marginTop: 10 }}>Sign in or create account</h2>
        </div>
        <div>
          <button
            className="btn secondary"
            style={{ marginRight: 6 }}
            onClick={() => setMode('login')}
          >
            Log in
          </button>
          <button className="btn secondary" onClick={() => setMode('register')}>
            Register
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label>Role</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button
            type="button"
            className={`btn secondary ${role === 'customer' ? '' : 'inactive'}`}
            style={{
              flex: 1,
              borderColor: role === 'customer' ? '#f97316' : undefined
            }}
            onClick={() => setRole('customer')}
          >
            Customer
          </button>
          <button
            type="button"
            className={`btn secondary ${role === 'courier' ? '' : 'inactive'}`}
            style={{
              flex: 1,
              borderColor: role === 'courier' ? '#ec4899' : undefined
            }}
            onClick={() => setRole('courier')}
          >
            Courier
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="field">
            <label>Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        {error && (
          <div style={{ color: '#fecaca', fontSize: 13, marginBottom: 8 }}>
            {error}
          </div>
        )}
        <button className="btn" type="submit" disabled={loading}>
          {loading
            ? 'Please wait...'
            : mode === 'login'
            ? `Log in as ${role}`
            : `Register as ${role}`}
        </button>
      </form>
    </div>
  );
}
