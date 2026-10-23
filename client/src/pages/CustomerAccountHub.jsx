import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users, UserPlus, ShieldAlert, Filter, GitMerge, Search,
  Trash2, Edit3, CheckCircle2, AlertTriangle, RefreshCw,
  Archive, Award, ChevronDown, Check
} from 'lucide-react';

const CustomerAccountHub = () => {
  // Customers List State
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // New Customer Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCust, setNewCust] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '2000-01-01',
    address: 'Jaipur, Rajasthan',
    accountType: 'Savings',
    initialBalance: '15000',
    branchName: 'Jaipur Main',
    ifsc: 'BANK0001001'
  });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  // Constraint Tester State (Lab 3)
  const [constraintResult, setConstraintResult] = useState(null);
  const [testingConstraint, setTestingConstraint] = useState(false);

  // Filter Bar State (Lab 5)
  const [patternMode, setPatternMode] = useState('starts_with');
  const [patternInput, setPatternInput] = useState('A');
  const [minBal, setMinBal] = useState('10000');
  const [maxBal, setMaxBal] = useState('100000');
  const [selectedTypes, setSelectedTypes] = useState(['Savings', 'Current']);
  const [filterResults, setFilterResults] = useState(null);
  const [distinctTypes, setDistinctTypes] = useState([]);

  // Join Laboratory State (Lab 7)
  const [activeJoin, setActiveJoin] = useState('inner');
  const [joinData, setJoinData] = useState([]);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [joinDescription, setJoinDescription] = useState('');

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchJoinData = async (joinType) => {
    setLoadingJoin(true);
    setActiveJoin(joinType);
    try {
      const res = await api.get(`/customers/join/${joinType}`);
      setJoinData(res.data.data);

      const descriptions = {
        'inner': 'INNER JOIN: Returns customers who possess an active linked bank account.',
        'left': 'LEFT OUTER JOIN: Returns all customers, including those with NULL loan records.',
        'right': 'RIGHT OUTER JOIN: Returns all employees (officers), even if they haven\'t approved any loans.',
        'full-outer': 'FULL OUTER JOIN (UNION Emulation): Combines left and right joins to display all customers and all loans.',
        'non-equi': 'NON-EQUI JOIN: Matches Accounts with Account_Tiers using BETWEEN Min_Balance AND Max_Balance.'
      };
      setJoinDescription(descriptions[joinType] || '');
    } catch (err) {
      console.error('Failed to load join data:', err);
    } finally {
      setLoadingJoin(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchJoinData('inner');
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg('');
    try {
      const res = await api.post('/customers', newCust);
      setCreateMsg(res.data.message);
      setShowAddForm(false);
      setNewCust({
        firstName: '', lastName: '', email: '', phone: '', dob: '2000-01-01',
        address: 'Jaipur, Rajasthan', accountType: 'Savings', initialBalance: '15000',
        branchName: 'Jaipur Main', ifsc: 'BANK0001001'
      });
      fetchCustomers();
    } catch (err) {
      setConstraintResult({
        isError: true,
        title: err.response?.data?.errorTitle || 'Insert Failed',
        code: err.response?.data?.mysqlErrorCode,
        state: err.response?.data?.sqlState,
        message: err.response?.data?.message || err.message,
        sql: err.response?.data?.sqlMeta?.executedSql
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm(`Delete Customer #${id}? This will CASCADE delete their accounts and cards!`)) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  const handleTestConstraint = async (type) => {
    setTestingConstraint(true);
    setConstraintResult(null);
    try {
      if (type === 'check') await api.post('/customers/test-check');
      if (type === 'unique') await api.post('/customers/test-unique');
      if (type === 'fk') await api.post('/customers/test-fk');
    } catch (err) {
      setConstraintResult({
        isError: true,
        title: err.response?.data?.errorTitle || 'Constraint Violation',
        code: err.response?.data?.mysqlErrorCode || 400,
        state: err.response?.data?.sqlState || '42000',
        message: err.response?.data?.message || err.message,
        sql: err.response?.data?.sqlMeta?.executedSql || 'SQL query rejected',
        labTag: err.response?.data?.sqlMeta?.labTag
      });
    } finally {
      setTestingConstraint(false);
    }
  };

  const handlePatternSearch = async () => {
    try {
      const res = await api.get(`/customers/search?pattern=${encodeURIComponent(patternInput)}&mode=${patternMode}`);
      setFilterResults(res.data.data);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleRangeFilter = async () => {
    try {
      const res = await api.get(`/customers/filter?minBal=${minBal}&maxBal=${maxBal}&types=${selectedTypes.join(',')}`);
      setFilterResults(res.data.data);
    } catch (err) {
      console.error('Filter failed:', err);
    }
  };

  const handleFetchDistinct = async () => {
    try {
      const res = await api.get('/customers/distinct-types');
      setDistinctTypes(res.data.data);
    } catch (err) {
      console.error('Distinct fetch failed:', err);
    }
  };

  const handleSyncArchive = async () => {
    try {
      const res = await api.post('/customers/sync-archive');
      alert(res.data.message);
    } catch (err) {
      alert('Archive sync failed: ' + err.message);
    }
  };

  const formatCurrency = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Customer & Account Management Hub
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Directory & Operations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Core customer onboarding, account provisioning, integrity constraint enforcement, and relational querying.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncArchive}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium"
            title="INSERT INTO Customer_Archive SELECT ..."
          >
            <Archive className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sync Archive Backup</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>{showAddForm ? 'Close Form' : 'Onboard Client'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: CONSTRAINT VIOLATION SIMULATOR BANNER */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 to-slate-900/90 border border-rose-900/50 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Live Integrity Constraint Failure Simulator
              </h2>
            </div>
            <p className="text-xs text-rose-200/70 mt-1">
              Click any red test button to intentionally trigger real MySQL constraint errors and verify engine rejection.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTestConstraint('check')}
              disabled={testingConstraint}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-all shadow-md shadow-rose-600/20"
            >
              Test CHECK (Bal &lt; 0)
            </button>
            <button
              onClick={() => handleTestConstraint('unique')}
              disabled={testingConstraint}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-all shadow-md shadow-amber-600/20"
            >
              Test UNIQUE (Duplicate Email)
            </button>
            <button
              onClick={() => handleTestConstraint('fk')}
              disabled={testingConstraint}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all shadow-md shadow-purple-600/20"
            >
              Test FK (Invalid Cust ID)
            </button>
          </div>
        </div>

        {/* Diagnostic Output Card */}
        {constraintResult && (
          <div className="p-4 rounded-xl bg-black/70 border border-rose-800/80 font-mono text-xs text-rose-300 space-y-2">
            <div className="flex items-center justify-between border-b border-rose-900/50 pb-2">
              <span className="font-bold text-rose-400 flex items-center gap-1.5 font-sans">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                {constraintResult.title}
              </span>
              <div className="space-x-3 text-[11px] text-slate-400 font-sans">
                <span>MySQL Errno: <strong className="text-rose-400 font-mono">{constraintResult.code}</strong></span>
                <span>SQLSTATE: <strong className="text-amber-400 font-mono">{constraintResult.state}</strong></span>
              </div>
            </div>
            <div className="text-slate-300 font-sans text-xs">
              <strong>Engine Message:</strong> {constraintResult.message}
            </div>
            <div className="text-[11px] bg-slate-950 p-2 rounded text-blue-200 border border-white/5 break-all">
              {constraintResult.sql}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: ONBOARDING MODAL / FORM */}
      {showAddForm && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-blue-500/30 shadow-2xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <span>Onboard New Customer & Open Account</span>
          </h2>

          <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">First Name</label>
              <input
                type="text" required placeholder="Aarav"
                value={newCust.firstName} onChange={(e) => setNewCust({ ...newCust, firstName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Last Name</label>
              <input
                type="text" required placeholder="Sharma"
                value={newCust.lastName} onChange={(e) => setNewCust({ ...newCust, lastName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Email (UNIQUE)</label>
              <input
                type="email" required placeholder="client@email.com"
                value={newCust.email} onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Phone Number (UNIQUE)</label>
              <input
                type="tel" required placeholder="9876543210"
                value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Account Type</label>
              <select
                value={newCust.accountType} onChange={(e) => setNewCust({ ...newCust, accountType: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              >
                <option value="Savings">Savings (Min ₹2,000)</option>
                <option value="Current">Current (Min ₹10,000)</option>
                <option value="Salary">Salary (Zero Min Balance)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Initial Opening Balance (₹)</label>
              <input
                type="number" required min="0" placeholder="15000"
                value={newCust.initialBalance} onChange={(e) => setNewCust({ ...newCust, initialBalance: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button" onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={creating}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 disabled:opacity-50"
              >
                {creating ? 'Inserting...' : 'Execute DML INSERT'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 1 TABLE: CUSTOMERS DIRECTORY */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Active Customers & Linked Bank Accounts</h2>
          </div>
          <button
            onClick={fetchCustomers}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reload</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold bg-slate-900/40">
                <th className="p-3">Client ID</th>
                <th className="p-3">Full Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Account No</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loadingCustomers ? (
                <tr><td colSpan="8" className="p-6 text-center text-slate-500">Loading directory...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan="8" className="p-6 text-center text-slate-500">No customers found.</td></tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono text-slate-400">#{c.customer_id}</td>
                    <td className="p-3 font-medium text-slate-200">{c.First_name} {c.Last_name}</td>
                    <td className="p-3 text-slate-300 font-mono text-[11px]">{c.email}</td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{c.phone_number}</td>
                    <td className="p-3 text-blue-400 font-mono text-[11px]">{c.Account_number || 'N/A'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {c.account_type || 'None'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                      {formatCurrency(c.balance)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteCustomer(c.customer_id)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete (CASCADE)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: ADVANCED SEARCH & FILTER BAR */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Advanced Search & Set Filtering</h2>
          </div>
          <span className="text-[10px] font-mono bg-emerald-900/30 text-emerald-300 border border-emerald-700/40 px-2 py-0.5 rounded">
            Multi-Criteria Filters
          </span>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. LIKE Pattern matching */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-slate-400 block font-semibold text-[11px]">1. Pattern Search (LIKE)</label>
            <div className="flex gap-1.5">
              <select
                value={patternMode} onChange={(e) => setPatternMode(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
              >
                <option value="starts_with">Starts with</option>
                <option value="ends_with">Ends with</option>
                <option value="contains">Contains</option>
                <option value="exact_length">Exact length</option>
              </select>
              <input
                type="text" value={patternInput} onChange={(e) => setPatternInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
              />
            </div>
            <button
              onClick={handlePatternSearch}
              className="w-full py-1 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white transition-colors text-[11px] font-medium"
            >
              Run LIKE Query
            </button>
          </div>

          {/* 2. BETWEEN Range */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-slate-400 block font-semibold text-[11px]">2. Range Filter (BETWEEN)</label>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <input
                type="number" value={minBal} onChange={(e) => setMinBal(e.target.value)}
                className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
              />
              <span className="text-slate-500">to</span>
              <input
                type="number" value={maxBal} onChange={(e) => setMaxBal(e.target.value)}
                className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
              />
            </div>
            <button
              onClick={handleRangeFilter}
              className="w-full py-1 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-colors text-[11px] font-medium"
            >
              Filter by Balance
            </button>
          </div>

          {/* 3. IN Set */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-slate-400 block font-semibold text-[11px]">3. Type Set (IN Operator)</label>
            <div className="flex gap-2">
              {['Savings', 'Current', 'Salary'].map((type) => (
                <label key={type} className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTypes([...selectedTypes, type]);
                      else setSelectedTypes(selectedTypes.filter(t => t !== type));
                    }}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleRangeFilter}
              className="w-full py-1 rounded bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white transition-colors text-[11px] font-medium"
            >
              Apply IN Set Filter
            </button>
          </div>

          {/* 4. SELECT DISTINCT */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <label className="text-slate-400 block font-semibold text-[11px]">4. Unique Types (DISTINCT)</label>
              <div className="text-[11px] text-slate-400 mt-1">
                {distinctTypes.length > 0 ? distinctTypes.join(', ') : 'Click to fetch'}
              </div>
            </div>
            <button
              onClick={handleFetchDistinct}
              className="w-full py-1 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white transition-colors text-[11px] font-medium"
            >
              SELECT DISTINCT
            </button>
          </div>
        </div>

        {/* Filter Results Table */}
        {filterResults && (
          <div className="mt-3 overflow-x-auto border border-slate-800 rounded-xl bg-slate-950 p-2">
            <div className="text-xs text-emerald-400 font-semibold mb-2">
              Filter returned {filterResults.length} record(s):
            </div>
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                  {Object.keys(filterResults[0] || {}).map((k) => (
                    <th key={k} className="p-2 whitespace-nowrap">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filterResults.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-900/50">
                    {Object.values(r).map((v, c) => (
                      <td key={c} className="p-2 whitespace-nowrap text-slate-300">{String(v ?? 'NULL')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 4: INTERACTIVE RELATIONAL JOIN CONSOLE */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Interactive Relational Join Console (5 Modes)</h2>
          </div>
          <span className="text-[10px] font-mono bg-cyan-900/30 text-cyan-300 border border-cyan-700/40 px-2 py-0.5 rounded">
            INNER, LEFT, RIGHT, FULL OUTER, NON-EQUI
          </span>
        </div>

        {/* Segmented Buttons for Joins */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'inner', label: 'INNER JOIN' },
            { id: 'left', label: 'LEFT OUTER' },
            { id: 'right', label: 'RIGHT OUTER' },
            { id: 'full-outer', label: 'FULL OUTER (UNION)' },
            { id: 'non-equi', label: 'NON-EQUI JOIN (Tiers)' }
          ].map((j) => (
            <button
              key={j.id}
              onClick={() => fetchJoinData(j.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeJoin === j.id
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {j.label}
            </button>
          ))}
        </div>

        {/* Join Description Explanation */}
        <div className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          💡 {joinDescription}
        </div>

        {/* Join Results Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60 max-h-80 overflow-y-auto">
          {loadingJoin ? (
            <div className="py-10 text-center text-xs text-slate-500">Executing join query...</div>
          ) : joinData.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No records returned by join.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold bg-slate-900/40">
                  {Object.keys(joinData[0]).map((key) => (
                    <th key={key} className="p-3 whitespace-nowrap">{key.replace(/_/g, ' ')}</th>
                  ))}
                  {activeJoin === 'non-equi' && <th className="p-3">Customer Tier Badge</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {joinData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    {Object.entries(row).map(([k, v], cIdx) => (
                      <td key={cIdx} className="p-3 whitespace-nowrap text-slate-300">
                        {k.toLowerCase().includes('balance') || k.toLowerCase().includes('amount')
                          ? formatCurrency(v)
                          : String(v ?? 'NULL')}
                      </td>
                    ))}
                    {activeJoin === 'non-equi' && (
                      <td className="p-3 whitespace-nowrap font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.Tier_Name === 'Platinum'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : row.Tier_Name === 'Gold'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-400/20 text-slate-300 border border-slate-400/40'
                        }`}>
                          {row.Tier_Name} VIP
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerAccountHub;
