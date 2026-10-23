import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Landmark, Shield, User, Lock, ArrowRight, Settings,
  Database, CheckCircle2, AlertCircle, Key, Sparkles, Building2
} from 'lucide-react';

const LoginPortal = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState('employee'); // 'employee' | 'customer'
  const [email, setEmail] = useState('rajesh@bankdb.com');
  const [password, setPassword] = useState('emp123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // DB Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'BankDB'
  });
  const [configSuccess, setConfigSuccess] = useState('');
  const [configError, setConfigError] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setErrorMsg('');
    if (tab === 'employee') {
      setEmail('rajesh@bankdb.com');
      setPassword('emp123');
    } else {
      setEmail('aarav@email.com');
      setPassword('cust123');
    }
  };

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const endpoint = activeTab === 'employee' ? '/auth/login/employee' : '/auth/login/customer';
      const res = await api.post(endpoint, { email, password });

      if (res.data.success) {
        login(res.data.user, res.data.token);
        const destination = res.data.user?.type === 'customer' ? '/customer-portal' : '/dashboard';
        navigate(destination);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Login failed. Check server status.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = (role) => {
    if (role === 'employee') {
      setEmail('rajesh@bankdb.com');
      setPassword('emp123');
      setActiveTab('employee');
      setTimeout(() => {
        api.post('/auth/login/employee', { email: 'rajesh@bankdb.com', password: 'emp123' })
          .then(res => {
            if (res.data.success) {
              login(res.data.user, res.data.token);
              navigate('/dashboard');
            }
          })
          .catch(err => setErrorMsg(err.response?.data?.message || 'Login failed'));
      }, 50);
    } else {
      setEmail('aarav@email.com');
      setPassword('cust123');
      setActiveTab('customer');
      setTimeout(() => {
        api.post('/auth/login/customer', { email: 'aarav@email.com', password: 'cust123' })
          .then(res => {
            if (res.data.success) {
              login(res.data.user, res.data.token);
              navigate('/customer-portal');
            }
          })
          .catch(err => setErrorMsg(err.response?.data?.message || 'Login failed'));
      }, 50);
    }
  };

  const handleSaveDbConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess('');
    setConfigError('');

    try {
      const res = await api.post('/auth/db-config', dbConfig);
      if (res.data.success) {
        setConfigSuccess('MySQL pool connection successfully updated!');
        setTimeout(() => setShowConfigModal(false), 1500);
      }
    } catch (err) {
      setConfigError(err.response?.data?.message || 'Failed to reconnect with specified credentials.');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top right DB Settings button */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-medium shadow-lg backdrop-blur-md"
        >
          <Settings className="w-4 h-4 text-blue-400" />
          <span>MySQL DB Settings</span>
        </button>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 mb-3">
            <Landmark className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            BankDB Enterprise
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Next-Generation Enterprise Core Banking Platform
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/70 border border-slate-800 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => switchTab('employee')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'employee'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Employee Staff</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab('customer')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'customer'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Retail Customer</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {activeTab === 'employee' ? 'Employee Work Email' : 'Customer Account Email'}
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={activeTab === 'employee' ? 'rajesh@bankdb.com' : 'aarav@email.com'}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Demo credentials: <span className="text-slate-400 font-mono">{activeTab === 'employee' ? 'emp123' : 'cust123'}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating with MySQL...</span>
            ) : (
              <>
                <span>Sign In to Bank Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Quick Access Section */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Access Demo Profiles</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleInstantDemoLogin('employee')}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 text-slate-300 text-xs font-medium text-left transition-all"
            >
              <div className="text-blue-400 font-bold text-[11px]">Branch Manager</div>
              <div className="text-[10px] text-slate-500">Full Branch Operations</div>
            </button>
            <button
              type="button"
              onClick={() => handleInstantDemoLogin('customer')}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 text-slate-300 text-xs font-medium text-left transition-all"
            >
              <div className="text-emerald-400 font-bold text-[11px]">Aarav Sharma</div>
              <div className="text-[10px] text-slate-500">Retail Client View</div>
            </button>
          </div>
        </div>
      </div>

      {/* MySQL Connection Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">MySQL Runtime Configuration</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {configSuccess && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{configSuccess}</span>
              </div>
            )}

            {configError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{configError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDbConfig} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Host</label>
                  <input
                    type="text"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Port</label>
                  <input
                    type="text"
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Database Name</label>
                <input
                  type="text"
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">MySQL User</label>
                  <input
                    type="text"
                    value={dbConfig.user}
                    onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">MySQL Password</label>
                  <input
                    type="password"
                    placeholder="Enter root password"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingConfig ? 'Reconnecting...' : 'Apply & Test Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPortal;
