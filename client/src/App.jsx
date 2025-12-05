import React, { useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import CustomerDashboard from './components/CustomerDashboard';
import CourierDashboard from './components/CourierDashboard';
import { setAuthToken } from './api';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setAuthToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken(null);
    setUser(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">ON DEMAND DELIVERY PLATFORM</div>
        {user && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, opacity: 0.85 }}>
              {user.name} · {user.role}
            </span>
            <button className="btn secondary" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {!user ? (
          <AuthForm onAuthed={setUser} />
        ) : user.role === 'customer' ? (
          <CustomerDashboard user={user} />
        ) : (
          <CourierDashboard user={user} />
        )}
      </main>
    </div>
  );
}
