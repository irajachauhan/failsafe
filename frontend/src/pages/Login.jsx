// src/pages/Login.jsx

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading, error } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

 const handleSubmit = async (e) => {
  e.preventDefault();
  await login(email, password);
};
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">

        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-700 tracking-tight">
            FAIL<span className="text-red-500">SAFE</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Early Intervention Risk Prediction System
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hod@failsafe.com"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white
                       font-semibold py-2.5 rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          FAILSAFE v1.0 — Restricted Access
        </p>
      </div>
    </div>
  );
}