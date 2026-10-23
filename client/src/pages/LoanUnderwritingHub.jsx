import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Landmark, Calculator, CheckCircle2, XCircle, DollarSign,
  TrendingUp, HelpCircle, FileText, RefreshCw, Layers,
  ChevronRight, AlertCircle, Award
} from 'lucide-react';

const LoanUnderwritingHub = () => {
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Loan Application State
  const [newLoan, setNewLoan] = useState({
    customerId: '',
    loanType: 'Home Loan',
    attribute: 'Secured',
    amount: '1200000',
    interestRate: '8.5',
    tenure: '120'
  });
  const [liveEmi, setLiveEmi] = useState(null);
  const [submittingLoan, setSubmittingLoan] = useState(false);
  const [loanAlert, setLoanAlert] = useState('');

  // Pay EMI Modal State
  const [payEmiModal, setPayEmiModal] = useState(null); // loan object
  const [payAccount, setPayAccount] = useState('');
  const [payingEmi, setPayingEmi] = useState(false);

  // Subquery Explorer State (Lab 8)
  const [activeSubquery, setActiveSubquery] = useState('second-highest');
  const [subqueryData, setSubqueryData] = useState([]);
  const [subqueryTitle, setSubqueryTitle] = useState('');
  const [subquerySql, setSubquerySql] = useState('');
  const [loadingSubquery, setLoadingSubquery] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [loanRes, custRes, accRes, empRes] = await Promise.all([
        api.get('/loans'),
        api.get('/customers'),
        api.get('/customers/accounts'),
        api.get('/admin/employees')
      ]);

      const loanList = loanRes.data.data || [];
      const custList = custRes.data.data || [];
      const accList = accRes.data.data || [];
      const empList = empRes.data.data || [];

      setLoans(loanList);
      setCustomers(custList);
      setAccounts(accList);
      setEmployees(empList);

      if (custList.length > 0 && !newLoan.customerId) {
        setNewLoan(prev => ({ ...prev, customerId: custList[0].customer_id }));
      }
      if (accList.length > 0 && !payAccount) {
        setPayAccount(accList[0].Account_id);
      }
    } catch (err) {
      console.error('Failed to load loan data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Live EMI Calculator fetch (Additional Exp 1: fn_calculate_emi)
  useEffect(() => {
    const fetchEmi = async () => {
      if (!newLoan.amount || !newLoan.interestRate || !newLoan.tenure) return;
      try {
        const res = await api.get(`/loans/calculate-emi?principal=${newLoan.amount}&rate=${newLoan.interestRate}&tenure=${newLoan.tenure}`);
        setLiveEmi(res.data.emi);
      } catch (err) {
        console.error('EMI calculation error:', err);
      }
    };
    fetchEmi();
  }, [newLoan.amount, newLoan.interestRate, newLoan.tenure]);

  const fetchSubquery = async (type) => {
    setLoadingSubquery(true);
    setActiveSubquery(type);
    try {
      const res = await api.get(`/loans/subquery/${type}`);
      setSubqueryData(res.data.data);
      setSubqueryTitle(res.data.title || type);
      setSubquerySql(res.data.sqlMeta?.executedSql || '');
    } catch (err) {
      console.error('Failed to load subquery:', err);
    } finally {
      setLoadingSubquery(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchSubquery('second-highest');
  }, []);

  const handleApplyLoan = async (e) => {
    e.preventDefault();
    setSubmittingLoan(true);
    setLoanAlert('');
    try {
      const res = await api.post('/loans', newLoan);
      setLoanAlert(res.data.message);
      fetchInitialData();
    } catch (err) {
      alert('Application failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingLoan(false);
    }
  };

  const handleApprove = async (loanId) => {
    try {
      const officerId = employees[0]?.employee_id || 1;
      const res = await api.put(`/loans/${loanId}/approve`, { approvedBy: officerId });
      setLoanAlert(res.data.message);
      fetchInitialData();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleReject = async (loanId) => {
    try {
      const res = await api.put(`/loans/${loanId}/reject`);
      setLoanAlert(res.data.message);
      fetchInitialData();
    } catch (err) {
      console.error('Rejection failed:', err);
    }
  };

  const handleExecuteEmiPayment = async (e) => {
    e.preventDefault();
    if (!payEmiModal) return;
    setPayingEmi(true);

    try {
      const emiAmount = Math.round(payEmiModal.amount * (payEmiModal.interest_rate / 1200) / (1 - Math.pow(1 + (payEmiModal.interest_rate / 1200), -payEmiModal.tenure)));
      const res = await api.post(`/loans/${payEmiModal.loan_id}/pay-emi`, {
        accountId: payAccount,
        amount: emiAmount || 15000,
        processedBy: employees[0]?.employee_id || 1
      });

      setLoanAlert(res.data.message);
      setPayEmiModal(null);
      fetchInitialData();
    } catch (err) {
      alert('EMI Payment declined: ' + (err.response?.data?.message || err.message));
    } finally {
      setPayingEmi(false);
    }
  };

  const formatCurrency = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const subqueryCards = [
    { id: 'second-highest', label: '2nd Highest Balance', badge: 'Scalar Subquery' },
    { id: 'above-average', label: 'Above Average Balance', badge: 'Scalar AVG' },
    { id: 'pending-loan-customers', label: 'Pending Loan Clients', badge: 'IN Subquery' },
    { id: 'above-all-salary', label: 'Balance > ALL Salary', badge: 'ALL Subquery' },
    { id: 'no-loans', label: 'Zero-Loan Clients', badge: 'NOT EXISTS' },
    { id: 'has-transactions', label: 'Active Transactors', badge: 'EXISTS' }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Loan Underwriting & Intelligence Hub
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Underwriting & Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end loan application, stored function mathematical EMI calculations (<code className="font-mono text-purple-300">fn_calculate_emi</code>), officer approval pipeline, and advanced nested subqueries.
          </p>
        </div>

        {loanAlert && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{loanAlert}</span>
          </div>
        )}
      </div>

      {/* Row 1: Loan Application Form + Live EMI Math Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Form */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-400" />
              <span>Apply for New Loan (Underwriting Pipeline)</span>
            </h2>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
              Status: Pending Review
            </span>
          </div>

          <form onSubmit={handleApplyLoan} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Applicant Customer</label>
              <select
                required
                value={newLoan.customerId}
                onChange={(e) => setNewLoan({ ...newLoan, customerId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.First_name} {c.Last_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Loan Category</label>
              <select
                value={newLoan.loanType}
                onChange={(e) => setNewLoan({ ...newLoan, loanType: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Home Loan">Home Loan (Housing & Property)</option>
                <option value="Personal Loan">Personal Loan (General Purpose)</option>
                <option value="Education Loan">Education Loan (Academic)</option>
                <option value="Vehicle Loan">Vehicle / Auto Loan</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Collateral Attribute</label>
              <select
                value={newLoan.attribute}
                onChange={(e) => setNewLoan({ ...newLoan, attribute: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Secured">Secured (Mortgage / Pledge)</option>
                <option value="Unsecured">Unsecured</option>
                <option value="Student">Student Endorsement</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Principal Amount (₹)</label>
              <input
                type="number" min="50000" step="50000" required
                value={newLoan.amount}
                onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Annual Interest Rate (%)</label>
              <input
                type="number" min="1" max="30" step="0.1" required
                value={newLoan.interestRate}
                onChange={(e) => setNewLoan({ ...newLoan, interestRate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Tenure (Months)</label>
              <input
                type="number" min="6" max="360" step="6" required
                value={newLoan.tenure}
                onChange={(e) => setNewLoan({ ...newLoan, tenure: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="sm:col-span-2 pt-2 flex justify-end">
              <button
                type="submit" disabled={submittingLoan}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {submittingLoan ? 'Submitting...' : 'Submit Loan Application'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Stored Function Math Widget: fn_calculate_emi */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live MySQL EMI Formula
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-purple-900/40 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded">
                fn_calculate_emi
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Real-time server math executed inside the MySQL storage engine via mathematical power functions:
              <br />
              <code className="text-purple-300 font-mono text-[10px]">
                P * r * (1+r)^n / ((1+r)^n - 1)
              </code>
            </p>

            <div className="p-4 rounded-xl bg-black/50 border border-purple-500/20 text-center space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Monthly Installment (EMI)</div>
              <div className="text-2xl font-extrabold text-purple-300 font-mono">
                {liveEmi !== null ? formatCurrency(liveEmi) : 'Calculating...'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Per month for {newLoan.tenure} months</div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Principal:</span>
                <span className="font-mono text-slate-200">{formatCurrency(newLoan.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Est. Total Payable:</span>
                <span className="font-mono text-purple-300 font-semibold">
                  {formatCurrency((liveEmi || 0) * (parseInt(newLoan.tenure, 10) || 1))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Loan Portfolio & Approval Pipeline */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Active Loan Portfolio & Officer Approval Queue</h2>
          </div>
          <button onClick={fetchInitialData} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold bg-slate-900/40 font-sans">
                <th className="p-3">Loan ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Type & Security</th>
                <th className="p-3 text-right">Principal</th>
                <th className="p-3 text-center">Interest / Tenure</th>
                <th className="p-3">Status</th>
                <th className="p-3">Approved By</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loans.map((ln) => {
                const isApproved = ln.status === 'Approved';
                const isPending = ln.status === 'Pending';

                return (
                  <tr key={ln.loan_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-slate-400">#{ln.loan_id}</td>
                    <td className="p-3 font-sans text-slate-200">
                      <div className="font-medium">{ln.First_name} {ln.Last_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{ln.email}</div>
                    </td>
                    <td className="p-3 font-sans">
                      <div className="text-slate-300">{ln.loan_type}</div>
                      <div className="text-[10px] text-slate-500">{ln.Attribute}</div>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      {formatCurrency(ln.amount)}
                    </td>
                    <td className="p-3 text-center text-slate-300">
                      {ln.interest_rate}% • {ln.tenure}m
                    </td>
                    <td className="p-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : isPending
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {ln.status}
                      </span>
                    </td>
                    <td className="p-3 font-sans text-slate-400">
                      {ln.officer_fname ? `Officer ${ln.officer_fname}` : 'Awaiting Review'}
                    </td>
                    <td className="p-3 text-center font-sans">
                      {isPending ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleApprove(ln.loan_id)}
                            className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white transition-colors text-[11px] font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(ln.loan_id)}
                            className="px-2 py-1 rounded bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white transition-colors text-[11px] font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      ) : isApproved ? (
                        <button
                          onClick={() => setPayEmiModal(ln)}
                          className="px-2.5 py-1 rounded bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600 hover:text-white transition-colors text-[11px] font-medium"
                        >
                          Pay EMI (sp_pay)
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: ADVANCED NESTED SUBQUERY CONSOLE */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Advanced Analytical Subquery Console</h2>
          </div>
          <span className="text-[10px] font-mono bg-purple-900/30 text-purple-300 border border-purple-700/40 px-2 py-0.5 rounded">
            Scalar, Multi-Row (IN, ALL), Correlated (EXISTS, NOT EXISTS)
          </span>
        </div>

        {/* 6 Subquery Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {subqueryCards.map((sc) => (
            <button
              key={sc.id}
              onClick={() => fetchSubquery(sc.id)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeSubquery === sc.id
                  ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-lg shadow-purple-600/20'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-xs truncate">{sc.label}</div>
              <div className="text-[10px] font-mono text-purple-400 mt-1">{sc.badge}</div>
            </button>
          ))}
        </div>

        {/* Subquery SQL Display */}
        {subquerySql && (
          <div className="p-3 rounded-xl bg-black/60 border border-slate-800 text-blue-200 font-mono text-xs whitespace-pre-wrap break-all">
            {subquerySql}
          </div>
        )}

        {/* Subquery Results Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60 max-h-72 overflow-y-auto">
          {loadingSubquery ? (
            <div className="py-10 text-center text-xs text-slate-500">Executing subquery...</div>
          ) : subqueryData.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No records returned.</div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold bg-slate-900/40 font-sans">
                  {Object.keys(subqueryData[0]).map((k) => (
                    <th key={k} className="p-2.5 whitespace-nowrap">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-[11px]">
                {subqueryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                    {Object.values(row).map((v, c) => (
                      <td key={c} className="p-2.5 whitespace-nowrap text-slate-300">
                        {String(v ?? 'NULL')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pay EMI Modal */}
      {payEmiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">
              Pay Loan EMI via Stored Procedure
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Loan #{payEmiModal.loan_id} ({payEmiModal.loan_type}) • Applicant: {payEmiModal.First_name} {payEmiModal.Last_name}
            </p>

            <form onSubmit={handleExecuteEmiPayment} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Debit From Bank Account</label>
                <select
                  required
                  value={payAccount}
                  onChange={(e) => setPayAccount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.Account_id} value={a.Account_id}>
                      {a.Account_number} — {a.First_name} ({formatCurrency(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-200">
                <div className="text-[11px] font-sans">
                  Executes <code className="font-mono text-purple-300">CALL sp_pay_loan_installment(...)</code> which automatically debits account, records an EMI transaction, and updates weak entity <code className="font-mono text-purple-300">Loan_payments</code> inside an atomic transaction.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button" onClick={() => setPayEmiModal(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={payingEmi}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {payingEmi ? 'Processing Procedure...' : 'Confirm Installment Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanUnderwritingHub;
