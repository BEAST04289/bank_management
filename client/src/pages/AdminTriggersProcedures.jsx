import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ShieldCheck, UserPlus, Sliders, Activity, Sparkles, RefreshCw,
  Trash2, Edit3, CheckCircle2, AlertTriangle, KeyRound, Terminal,
  UserCheck, Database
} from 'lucide-react';

const AdminTriggersProcedures = () => {
  // Stored Procedure State
  const [newEmpId, setNewEmpId] = useState('4');
  const [newEmpFname, setNewEmpFname] = useState('Vikram');
  const [newEmpLname, setNewEmpLname] = useState('Aditya');
  const [addingEmp, setAddingEmp] = useState(false);
  const [procMsg, setProcMsg] = useState('');

  // GetAccountsByType Procedure State
  const [selectedAccType, setSelectedAccType] = useState('Savings');
  const [procAccounts, setProcAccounts] = useState([]);
  const [loadingProcAcc, setLoadingProcAcc] = useState(false);

  // Trigger Audit Monitor State (Split screen)
  const [employees, setEmployees] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  // Cursor Batch Interest State (Add. Exp 1)
  const [annualRate, setAnnualRate] = useState('3.5');
  const [runningBatch, setRunningBatch] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  // DCL Demo State (Lab 10)
  const [runningDcl, setRunningDcl] = useState(false);
  const [dclResult, setDclResult] = useState(null);

  const fetchTriggerData = async () => {
    setLoadingAudit(true);
    try {
      const [empRes, auditRes] = await Promise.all([
        api.get('/admin/employees'),
        api.get('/admin/audit-log')
      ]);
      const empList = empRes.data.data || [];
      setEmployees(empList);
      setAuditLog(auditRes.data.data || []);

      if (empList.length > 0) {
        const maxId = Math.max(...empList.map((e) => Number(e.employee_id)));
        setNewEmpId(String(maxId + 1));
      } else {
        setNewEmpId('1');
      }
    } catch (err) {
      console.error('Failed to load trigger data:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleFetchAccountsByType = async (type) => {
    setSelectedAccType(type);
    setLoadingProcAcc(true);
    try {
      const res = await api.get(`/admin/accounts-by-type/${type}`);
      setProcAccounts(res.data.data || []);
    } catch (err) {
      console.error('Procedure call failed:', err);
    } finally {
      setLoadingProcAcc(false);
    }
  };

  useEffect(() => {
    fetchTriggerData();
    handleFetchAccountsByType('Savings');
  }, []);

  const handleAddEmployeeProcedure = async (e) => {
    e.preventDefault();
    setAddingEmp(true);
    setProcMsg('');
    try {
      const res = await api.post('/admin/add-employee', {
        employeeId: newEmpId,
        firstName: newEmpFname,
        lastName: newEmpLname
      });
      setProcMsg(res.data.message);
      setNewEmpId(String(parseInt(newEmpId, 10) + 1));
      fetchTriggerData(); // Auto refresh employee and trigger audit log!
    } catch (err) {
      alert('Procedure execution error: ' + (err.response?.data?.message || err.message));
    } finally {
      setAddingEmp(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm(`Delete Employee #${id}? This will fire the AFTER DELETE trigger!`)) return;
    try {
      const res = await api.delete(`/admin/employees/${id}`);
      setProcMsg(res.data.message);
      fetchTriggerData();
    } catch (err) {
      console.error('Delete employee failed:', err);
    }
  };

  const handleRunBatchInterest = async (e) => {
    e.preventDefault();
    setRunningBatch(true);
    setBatchResult(null);
    try {
      const res = await api.post('/admin/batch-interest', {
        annualRate,
        employeeId: 1
      });
      setBatchResult(res.data);
    } catch (err) {
      alert('Batch interest cursor error: ' + (err.response?.data?.message || err.message));
    } finally {
      setRunningBatch(false);
    }
  };

  const handleRunDclDemo = async () => {
    setRunningDcl(true);
    setDclResult(null);
    try {
      const res = await api.post('/admin/dcl-demo');
      setDclResult(res.data);
    } catch (err) {
      alert('DCL Demo failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setRunningDcl(false);
    }
  };

  const formatCurrency = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Stored Procedures, Triggers & DCL Command Console
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Security & Triggers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time execution of MySQL Stored Procedures, AFTER INSERT/UPDATE/DELETE triggers with audit logging, batch CURSOR interest distribution, and complete DCL security lifecycles.
          </p>
        </div>

        {procMsg && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{procMsg}</span>
          </div>
        )}
      </div>

      {/* SECTION 2: LIVE TRIGGER AUDIT MONITOR (SPLIT SCREEN) */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-white">
              Real-Time Trigger Audit Monitor
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono bg-rose-900/30 text-rose-300 border border-rose-700/40 px-2 py-0.5 rounded">
              AFTER INSERT • AFTER UPDATE • AFTER DELETE
            </span>
            <button
              onClick={fetchTriggerData}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Employee Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-200">1. Target Table: Employee</span>
              <span>Modifying here triggers audit row</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold bg-slate-900/40">
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Officer Name</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Salary</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[11px]">
                  {employees.map((e) => (
                    <tr key={e.employee_id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-2.5 font-mono text-slate-400">#{e.employee_id}</td>
                      <td className="p-2.5 font-medium text-slate-200">{e.First_name} {e.Last_name}</td>
                      <td className="p-2.5 text-blue-400">{e.role}</td>
                      <td className="p-2.5 font-mono text-slate-300">{formatCurrency(e.salary)}</td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleDeleteEmployee(e.employee_id)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete (fires trg_employee_delete)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Live Audit Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-200">2. Audit Log Table: employee_audit</span>
              <span className="text-emerald-400 font-mono text-[11px]">Auto-populated by Triggers</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold bg-slate-900/40 font-sans">
                    <th className="p-2.5">Audit ID</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Details</th>
                    <th className="p-2.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[11px]">
                  {auditLog.map((log) => {
                    const isInsert = log.action === 'INSERT';
                    const isUpdate = log.action === 'UPDATE';
                    return (
                      <tr key={log.audit_id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-2.5 text-slate-500">#{log.audit_id}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                            isInsert
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : isUpdate
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300 font-sans max-w-[200px] truncate">{log.details}</td>
                        <td className="p-2.5 text-slate-400 whitespace-nowrap">
                          {String(log.timestamp).replace('T', ' ').substring(0, 19)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: STORED PROCEDURES (AddEmployee & GetAccountsByType) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Procedure 1: CALL AddEmployee */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-400" />
              <span>Stored Procedure: CALL AddEmployee(id, fname, lname)</span>
            </h2>
            <span className="text-[10px] font-mono bg-blue-900/30 text-blue-300 border border-blue-700/40 px-2 py-0.5 rounded">
              Stored Procedure
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Executes a parameterized stored procedure to insert an employee, auto-generate work email, and immediately trigger the AFTER INSERT audit logging.
          </p>

          <form onSubmit={handleAddEmployeeProcedure} className="grid grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Employee ID</label>
              <input
                type="number" required
                value={newEmpId} onChange={(e) => setNewEmpId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">First Name</label>
              <input
                type="text" required
                value={newEmpFname} onChange={(e) => setNewEmpFname(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Last Name</label>
              <input
                type="text" required
                value={newEmpLname} onChange={(e) => setNewEmpLname(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>

            <div className="col-span-3 pt-2">
              <button
                type="submit" disabled={addingEmp}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {addingEmp ? 'Calling Procedure...' : 'Execute CALL AddEmployee'}
              </button>
            </div>
          </form>
        </div>

        {/* Procedure 2: CALL GetAccountsByType */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Stored Procedure: CALL GetAccountsByType(type)</span>
            </h2>
            <span className="text-[10px] font-mono bg-indigo-900/30 text-indigo-300 border border-indigo-700/40 px-2 py-0.5 rounded">
              Stored Procedure
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Account Type:</span>
            {['Savings', 'Current', 'Salary'].map((type) => (
              <button
                key={type}
                onClick={() => handleFetchAccountsByType(type)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedAccType === type
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60 max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold bg-slate-900/40 font-sans">
                  <th className="p-2">Account No</th>
                  <th className="p-2">Branch</th>
                  <th className="p-2">Client Name</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-[11px]">
                {loadingProcAcc ? (
                  <tr><td colSpan="4" className="p-4 text-center text-slate-500 font-sans">Calling procedure...</td></tr>
                ) : procAccounts.map((a) => (
                  <tr key={a.Account_id} className="hover:bg-slate-900/50">
                    <td className="p-2 text-blue-400">{a.Account_number}</td>
                    <td className="p-2 text-slate-300 font-sans">{a.branch_name}</td>
                    <td className="p-2 text-slate-200 font-sans">{a.First_name} {a.Last_name}</td>
                    <td className="p-2 text-right text-emerald-400 font-bold">{formatCurrency(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3 & 4: CURSOR BATCH INTEREST & DCL LIFECYCLE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Additional Experiment 1: Cursor Batch Procedure */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Batch Interest CURSOR Procedure</span>
            </h2>
            <span className="text-[10px] font-mono bg-amber-900/30 text-amber-300 border border-amber-700/40 px-2 py-0.5 rounded">
              DECLARE CURSOR
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Iterates through all Savings accounts using a MySQL <code className="font-mono text-amber-300">CURSOR</code>, computes quarterly interest, credits account balance, records an Interest Credit transaction, and outputs the totals via OUT parameters.
          </p>

          <form onSubmit={handleRunBatchInterest} className="flex items-center gap-3 text-xs">
            <div className="w-1/2">
              <label className="text-slate-400 block mb-1">Annual Interest Rate (%)</label>
              <input
                type="number" step="0.1" min="1" max="15"
                value={annualRate} onChange={(e) => setAnnualRate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono font-bold"
              />
            </div>
            <div className="w-1/2 pt-4">
              <button
                type="submit" disabled={runningBatch}
                className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
              >
                {runningBatch ? 'Iterating Cursor...' : 'Run Cursor Batch'}
              </button>
            </div>
          </form>

          {batchResult && (
            <div className="p-4 rounded-xl bg-black/60 border border-amber-500/30 space-y-2 text-xs">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cursor Iteration Complete</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 font-mono">
                <div>Accounts Credited: <strong className="text-white">{batchResult.accountsCredited}</strong></div>
                <div>Total Interest: <strong className="text-emerald-400">{formatCurrency(batchResult.totalInterestPaid)}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Lab 10: Complete DCL Security Lifecycle Demo */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Complete DCL Security & Access Lifecycle</span>
            </h2>
            <span className="text-[10px] font-mono bg-emerald-900/30 text-emerald-300 border border-emerald-700/40 px-2 py-0.5 rounded">
              DCL: GRANT, REVOKE, SHOW
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Executes the full authorization lifecycle: <code className="font-mono text-emerald-300">CREATE USER</code> → <code className="font-mono text-emerald-300">CREATE ROLE</code> → <code className="font-mono text-emerald-300">GRANT</code> → <code className="font-mono text-emerald-300">SHOW GRANTS</code> → <code className="font-mono text-emerald-300">REVOKE</code> → <code className="font-mono text-emerald-300">DROP</code>.
          </p>

          <button
            onClick={handleRunDclDemo}
            disabled={runningDcl}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            {runningDcl ? 'Executing DCL Sequence...' : 'Run Full DCL Lifecycle Demo'}
          </button>

          {dclResult && (
            <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 space-y-2 max-h-44 overflow-y-auto font-mono text-[11px]">
              <div className="text-emerald-400 font-sans font-semibold">
                Lifecycle Sequence Verified:
              </div>
              {dclResult.steps?.map((s, idx) => (
                <div key={idx} className="border-b border-slate-800/60 pb-1">
                  <div className="text-slate-400 font-bold">{s.step}</div>
                  <div className="text-blue-300 text-[10px]">{s.sql}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTriggersProcedures;
