import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ArrowLeftRight, ArrowDownRight, ArrowUpRight, ShieldCheck,
  AlertTriangle, CheckCircle2, RefreshCw, Zap, Flame, ShieldAlert,
  Clock, DollarSign, UserCheck, RotateCcw, Info, ArrowRight
} from 'lucide-react';

const TransactionAcidCenter = () => {
  const [accounts, setAccounts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Counter Form (Deposit / Withdraw)
  const [counterAcc, setCounterAcc] = useState('');
  const [counterType, setCounterType] = useState('Deposit'); // 'Deposit' | 'Withdrawal'
  const [counterAmount, setCounterAmount] = useState('5000');
  const [counterDesc, setCounterDesc] = useState('Counter Branch Cash Operation');
  const [counterOfficer, setCounterOfficer] = useState('');
  const [processingCounter, setProcessingCounter] = useState(false);
  const [counterAlert, setCounterAlert] = useState(null);

  // Transfer Console (ACID Lab 11)
  const [fromAcc, setFromAcc] = useState('');
  const [toAcc, setToAcc] = useState('');
  const [transferAmount, setTransferAmount] = useState('10000');
  const [transferOfficer, setTransferOfficer] = useState('');
  const [processingTransfer, setProcessingTransfer] = useState(false);
  const [transferResult, setTransferResult] = useState(null);

  // Reversal Console
  const [reversingTxId, setReversingTxId] = useState(null);
  const [reversalAlert, setReversalAlert] = useState(null);

  const fetchCoreData = async () => {
    setLoading(true);
    try {
      const [accRes, empRes, txRes] = await Promise.all([
        api.get('/customers/accounts'),
        api.get('/admin/employees'),
        api.get('/transactions')
      ]);

      const accData = accRes.data.data || [];
      const empData = empRes.data.data || [];
      setAccounts(accData);
      setEmployees(empData);
      setTransactions(txRes.data.data || []);

      if (accData.length >= 2) {
        if (!fromAcc) setFromAcc(accData[0].Account_id);
        if (!toAcc) setToAcc(accData[1].Account_id);
        if (!counterAcc) setCounterAcc(accData[0].Account_id);
      }
      if (empData.length > 0) {
        if (!counterOfficer) setCounterOfficer(empData[0].employee_id);
        if (!transferOfficer) setTransferOfficer(empData[0].employee_id);
      }
    } catch (err) {
      console.error('Failed to load transaction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoreData();
  }, []);

  const handleCounterSubmit = async (e) => {
    e.preventDefault();
    setProcessingCounter(true);
    setCounterAlert(null);

    try {
      const endpoint = counterType === 'Deposit' ? '/transactions/deposit' : '/transactions/withdraw';
      const res = await api.post(endpoint, {
        accountId: counterAcc,
        amount: counterAmount,
        description: counterDesc,
        processedBy: counterOfficer
      });

      setCounterAlert({
        success: true,
        message: res.data.message
      });
      fetchCoreData();
    } catch (err) {
      setCounterAlert({
        success: false,
        message: err.response?.data?.message || err.message,
        errorTitle: err.response?.data?.errorTitle
      });
    } finally {
      setProcessingCounter(false);
    }
  };

  const handleAcidTransfer = async (simulateFailure) => {
    setProcessingTransfer(true);
    setTransferResult(null);

    const senderObj = accounts.find(a => String(a.Account_id) === String(fromAcc));
    const senderBal = senderObj ? parseFloat(senderObj.balance) : 0;
    const numAmt = parseFloat(transferAmount) || 0;

    try {
      const res = await api.post('/transactions/transfer', {
        fromAccountId: fromAcc,
        toAccountId: toAcc,
        amount: transferAmount,
        processedBy: transferOfficer,
        simulateFailure
      });

      setTransferResult({
        success: true,
        rolledBack: res.data.rolledBack,
        message: res.data.message,
        initialBalance: res.data.initialBalance || senderBal,
        debitAmount: numAmt,
        inFlightBalance: res.data.inFlightBalance || Math.max(0, senderBal - numAmt),
        restoredBalance: res.data.restoredBalance || senderBal,
        sqlMeta: res.data.sqlMeta
      });

      fetchCoreData();
    } catch (err) {
      setTransferResult({
        success: false,
        error: err.response?.data?.message || err.message,
        errorTitle: err.response?.data?.errorTitle,
        sqlMeta: err.response?.data?.sqlMeta
      });
    } finally {
      setProcessingTransfer(false);
    }
  };

  const handleReverseTransfer = async (tx) => {
    setReversingTxId(tx.transaction_id);
    setReversalAlert(null);

    try {
      let res;
      try {
        res = await api.post(`/transactions/${tx.transaction_id}/reverse`, {
          processedBy: transferOfficer || 1
        });
      } catch (endpointErr) {
        // Fallback: If route is not reloaded in older node instance, perform compensating transfer directly
        const match = tx.description.match(/Acc #?(\d+)/i);
        const counterpartAccId = match ? parseInt(match[1], 10) : null;
        if (!counterpartAccId) throw endpointErr;

        const isOut = tx.transaction_type.toLowerCase().includes('out');
        const fromAccountId = isOut ? counterpartAccId : tx.Account_id; // reclaim from receiver
        const toAccountId = isOut ? tx.Account_id : counterpartAccId; // refund to sender

        res = await api.post('/transactions/transfer', {
          fromAccountId,
          toAccountId,
          amount: tx.amount,
          processedBy: transferOfficer || 1,
          simulateFailure: false
        });
      }

      setReversalAlert({
        success: true,
        message: `✅ Reversal Successful! ₹${Number(tx.amount).toLocaleString('en-IN')} has been refunded and balances restored in MySQL.`,
        sqlMeta: res.data.sqlMeta
      });

      fetchCoreData();
    } catch (err) {
      setReversalAlert({
        success: false,
        message: `Failed to reverse TX #${tx.transaction_id}: ` + (err.response?.data?.message || err.message)
      });
    } finally {
      setReversingTxId(null);
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
              ACID Transaction Center & TCL Simulator
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
              ACID Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time InnoDB ACID transactions with row-level locking (<code className="font-mono text-blue-300">FOR UPDATE</code>), <code className="font-mono text-purple-300">SAVEPOINT</code>, and simulated mid-flight crash rollbacks.
          </p>
        </div>

        <button
          onClick={fetchCoreData}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold shadow-lg self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh Balances</span>
        </button>
      </div>

      {/* SECTION 2: ACID FUND TRANSFER CONSOLE */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border border-indigo-500/30 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>ACID Atomic Fund Transfer & Rollback Simulator</span>
              </h2>
              <div className="text-[11px] text-slate-400">
                Picks a dedicated MySQL connection to execute START TRANSACTION → SELECT FOR UPDATE → SAVEPOINT → COMMIT or ROLLBACK.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 px-2.5 py-1 rounded-full self-start sm:self-auto">
            InnoDB Row Lock • Isolation Level: REPEATABLE READ
          </span>
        </div>

        {/* Transfer Selection Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Sender */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <label className="text-slate-400 block font-semibold text-[11px]">1. Sender Account (Debited)</label>
            <select
              value={fromAcc} onChange={(e) => setFromAcc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-medium"
            >
              {accounts.map((a) => (
                <option key={a.Account_id} value={a.Account_id}>
                  {a.Account_number} — {a.First_name} ({formatCurrency(a.balance)})
                </option>
              ))}
            </select>
            {accounts.find(a => String(a.Account_id) === String(fromAcc)) && (
              <div className="text-[11px] text-emerald-400 font-mono">
                Available: {formatCurrency(accounts.find(a => String(a.Account_id) === String(fromAcc)).balance)}
              </div>
            )}
          </div>

          {/* Receiver */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <label className="text-slate-400 block font-semibold text-[11px]">2. Receiver Account (Credited)</label>
            <select
              value={toAcc} onChange={(e) => setToAcc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-medium"
            >
              {accounts.map((a) => (
                <option key={a.Account_id} value={a.Account_id}>
                  {a.Account_number} — {a.First_name} ({formatCurrency(a.balance)})
                </option>
              ))}
            </select>
            {accounts.find(a => String(a.Account_id) === String(toAcc)) && (
              <div className="text-[11px] text-emerald-400 font-mono">
                Current: {formatCurrency(accounts.find(a => String(a.Account_id) === String(toAcc)).balance)}
              </div>
            )}
          </div>

          {/* Transfer Amount */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <label className="text-slate-400 block font-semibold text-[11px]">3. Transfer Amount (₹)</label>
            <input
              type="number"
              min="100"
              step="500"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
            />
            <div className="text-[11px] text-slate-500">Subject to sender min balance</div>
          </div>

          {/* Authorizing Officer */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <label className="text-slate-400 block font-semibold text-[11px]">4. Authorizing Officer</label>
            <select
              value={transferOfficer} onChange={(e) => setTransferOfficer(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-medium"
            >
              {employees.map((e) => (
                <option key={e.employee_id} value={e.employee_id}>
                  {e.First_name} {e.Last_name} ({e.role})
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500">Logged in audit trail</div>
          </div>
        </div>

        {/* Action Buttons: COMMIT vs ROLLBACK */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {/* Green Button: Commit */}
          <button
            type="button"
            disabled={processingTransfer}
            onClick={() => handleAcidTransfer(false)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Execute Atomic Transfer (COMMIT)</span>
          </button>

          {/* Red Button: Simulate Failure & Rollback */}
          <button
            type="button"
            disabled={processingTransfer}
            onClick={() => handleAcidTransfer(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-rose-600/25 transition-all disabled:opacity-50"
          >
            <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>Simulate Failure & Rollback (SAVEPOINT Demo)</span>
          </button>
        </div>

        {/* Transfer Proof Card */}
        {transferResult && (
          <div className={`p-4 rounded-xl border text-xs font-mono space-y-4 transition-all ${
            transferResult.rolledBack
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-xl shadow-amber-950/30'
              : transferResult.success
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}>
            <div className="flex items-center justify-between font-sans">
              <div className="flex items-center gap-2 font-bold text-sm">
                {transferResult.rolledBack ? (
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                ) : transferResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                )}
                <span>
                  {transferResult.rolledBack
                    ? 'ACID Atomicity Verified — Balance Protected by ROLLBACK!'
                    : transferResult.success
                    ? 'Transfer Committed Successfully (ACID Upheld)'
                    : 'Transaction Declined by Database Engine'}
                </span>
              </div>
              <span className="text-[10px] bg-black/40 px-2.5 py-1 rounded-full border border-white/10 font-mono text-amber-300">
                {transferResult.sqlMeta?.labTag?.replace(/^Lab \d+:\s*/i, '') || 'ACID TCL Engine'}
              </span>
            </div>

            <div className="font-sans text-xs">
              {transferResult.message || transferResult.error}
            </div>

            {/* Step-by-Step Atomicity Visualizer for SAVEPOINT Rollback */}
            {transferResult.rolledBack && (
              <div className="space-y-3.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-sans">
                  {/* Step 1 */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/60 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>1. SAVEPOINT Set</span>
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    </div>
                    <div className="text-sm font-extrabold text-white font-mono">
                      {formatCurrency(transferResult.initialBalance || transferResult.restoredBalance)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Baseline captured in MySQL buffer
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 space-y-1">
                    <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>2. In-Flight Debit</span>
                      <span className="text-[10px] font-mono text-amber-300">-{formatCurrency(transferResult.debitAmount || transferAmount)}</span>
                    </div>
                    <div className="text-sm font-extrabold text-amber-300 font-mono">
                      {formatCurrency(transferResult.inFlightBalance)}
                    </div>
                    <div className="text-[10px] text-amber-400/80">
                      Temporary uncommitted debit
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 space-y-1">
                    <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>3. Simulated Crash</span>
                      <span className="text-xs">💥</span>
                    </div>
                    <div className="text-xs font-bold text-rose-300 font-sans">
                      Connection Severed!
                    </div>
                    <div className="text-[10px] text-rose-400/80">
                      Receiver credit interrupted
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/50 space-y-1">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>4. Balance Restored</span>
                      <span className="text-[10px] font-mono text-emerald-400">₹0 Lost</span>
                    </div>
                    <div className="text-sm font-extrabold text-emerald-300 font-mono">
                      {formatCurrency(transferResult.restoredBalance || transferResult.initialBalance)}
                    </div>
                    <div className="text-[10px] text-emerald-400/80">
                      Restored via ROLLBACK TO SAVEPOINT
                    </div>
                  </div>
                </div>

                {/* Educational Explanation Box */}
                <div className="p-3.5 rounded-xl bg-blue-950/50 border border-blue-500/40 space-y-2 text-xs font-sans text-blue-200">
                  <div className="flex items-center gap-2 font-bold text-blue-300">
                    <Info className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Understanding Why the Sender Balance is {formatCurrency(transferResult.restoredBalance || transferResult.initialBalance)}:</span>
                  </div>
                  <p className="text-[11px] text-blue-200/90 leading-relaxed pl-6">
                    In SQL RDBMS (InnoDB), <code>ROLLBACK TO SAVEPOINT</code> protects an <em>active, uncommitted</em> transaction.
                    Because the rollback succeeded, the ₹{Number(transferResult.debitAmount || transferAmount).toLocaleString('en-IN')} in-flight debit was <strong>aborted and undone</strong> before it could be lost!
                    Had the rollback failed, the sender would have lost money while the receiver got ₹0.
                  </p>
                  <div className="pl-6 pt-1 text-[11px] text-amber-300 font-medium flex items-center gap-1.5 border-t border-blue-800/50 mt-1">
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong>Want to undo a previous transfer you already committed?</strong> Scroll down to the <strong>Live Transactions Ledger</strong> and click the <strong>"Reverse Transfer"</strong> button on any past transfer!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {transferResult.sqlMeta?.executedSql && (
              <pre className="bg-black/60 p-3 rounded-lg text-blue-200/90 text-[11px] whitespace-pre-wrap break-all border border-white/5">
                {transferResult.sqlMeta.executedSql}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* SECTION 1: COUNTER DEPOSIT & WITHDRAWAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Counter Form */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Counter Cash Operations</span>
            </h2>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
              ACID: START TRANSACTION
            </span>
          </div>

          {/* Toggle Type */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCounterType('Deposit')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                counterType === 'Deposit'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => setCounterType('Withdrawal')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                counterType === 'Withdrawal'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdrawal</span>
            </button>
          </div>

          {counterAlert && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              counterAlert.success
                ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/50 border border-rose-800 text-rose-300'
            }`}>
              {counterAlert.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{counterAlert.message}</span>
            </div>
          )}

          <form onSubmit={handleCounterSubmit} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Target Account</label>
              <select
                value={counterAcc} onChange={(e) => setCounterAcc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {accounts.map((a) => (
                  <option key={a.Account_id} value={a.Account_id}>
                    {a.Account_number} — {a.First_name} ({formatCurrency(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Amount (₹)</label>
              <input
                type="number" min="1" step="500" required
                value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Description</label>
              <input
                type="text"
                value={counterDesc} onChange={(e) => setCounterDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Teller Officer</label>
              <select
                value={counterOfficer} onChange={(e) => setCounterOfficer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {employees.map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.First_name} {e.Last_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={processingCounter}
              className={`w-full py-2.5 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
                counterType === 'Deposit'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              {processingCounter ? 'Executing TCL...' : `Execute ${counterType}`}
            </button>
          </form>
        </div>

        {/* Right: Real-time Transaction Ledger (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Live Transactions Ledger</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {transactions.length} records logged
            </span>
          </div>

          {reversalAlert && (
            <div className={`mb-3 p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
              reversalAlert.success
                ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/60 border border-rose-500/50 text-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {reversalAlert.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{reversalAlert.message}</span>
              </div>
              <button onClick={() => setReversalAlert(null)} className="text-[10px] underline text-slate-400 hover:text-white">
                Dismiss
              </button>
            </div>
          )}

          <div className="overflow-x-auto flex-1 border border-slate-800 rounded-xl bg-slate-950/60 max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold bg-slate-900/40 font-sans">
                  <th className="p-2.5">TX ID</th>
                  <th className="p-2.5">Date & Time</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Account</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Amount</th>
                  <th className="p-2.5">Officer</th>
                  <th className="p-2.5 text-center">TCL Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-[11px]">
                {transactions.map((tx) => {
                  const isDeposit = tx.transaction_type.toLowerCase().includes('deposit') ||
                                    tx.transaction_type.toLowerCase().includes('in') ||
                                    tx.transaction_type.toLowerCase().includes('credit') ||
                                    tx.transaction_type.toLowerCase().includes('interest');
                  const isTransfer = tx.transaction_type.toLowerCase().includes('transfer');
                  const isAlreadyReversed = tx.description?.toLowerCase().includes('revers');

                  return (
                    <tr key={tx.transaction_id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-2.5 text-slate-400">#{tx.transaction_id}</td>
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">
                        {String(tx.Transaction_date).replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                          isDeposit
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="p-2.5 text-blue-400">{tx.Account_number}</td>
                      <td className="p-2.5 text-slate-300 font-sans max-w-[180px] truncate">{tx.description}</td>
                      <td className={`p-2.5 text-right font-bold ${isDeposit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="p-2.5 text-slate-400 font-sans">
                        {tx.officer_fname ? `${tx.officer_fname} ${tx.officer_lname || ''}` : 'System'}
                      </td>
                      <td className="p-2.5 text-center">
                        {isTransfer && !isAlreadyReversed ? (
                          <button
                            type="button"
                            disabled={reversingTxId === tx.transaction_id}
                            onClick={() => handleReverseTransfer(tx)}
                            className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[10px] font-sans font-semibold flex items-center gap-1 mx-auto transition-all disabled:opacity-50"
                            title="Execute Compensating Reversal Transaction in MySQL to refund this transfer"
                          >
                            <RotateCcw className={`w-3 h-3 ${reversingTxId === tx.transaction_id ? 'animate-spin text-indigo-400' : ''}`} />
                            <span>Reverse</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-sans">—</span>
                        )}
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
  );
};

export default TransactionAcidCenter;
