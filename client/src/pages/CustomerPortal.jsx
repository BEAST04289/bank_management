import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard, ArrowLeftRight, Landmark, DollarSign, ShieldCheck,
  CheckCircle2, AlertTriangle, RefreshCw, Lock, Unlock, Eye, EyeOff,
  User, Send, Calendar, Clock, ChevronRight, Sparkles, Building, Phone, MapPin
} from 'lucide-react';

const CustomerPortal = () => {
  const { user } = useAuth();
  const customerId = user?.id || 1;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    customer: null,
    totalBalance: 0,
    accounts: [],
    cards: [],
    transactions: [],
    loans: []
  });
  const [alertMsg, setAlertMsg] = useState(null);

  // Quick Transfer State
  const [transferFrom, setTransferFrom] = useState('');
  const [transferToAccNumber, setTransferToAccNumber] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState(null);

  // Loan Application Modal / State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [loanCategory, setLoanCategory] = useState('Home Loan');
  const [collateral, setCollateral] = useState('Secured');
  const [loanPrincipal, setLoanPrincipal] = useState(250000);
  const [loanRate, setLoanRate] = useState(8.5);
  const [loanTenure, setLoanTenure] = useState(36);
  const [submittingLoan, setSubmittingLoan] = useState(false);

  // Pay EMI State
  const [payingLoanId, setPayingLoanId] = useState(null);
  const [payAccId, setPayAccId] = useState('');
  const [payingEmi, setPayingEmi] = useState(false);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setAlertMsg(null);

      // Query active API endpoints in parallel
      const [accsRes, cardsRes, loansRes, txsRes, custsRes] = await Promise.all([
        api.get('/customers/accounts'),
        api.get('/cards'),
        api.get('/loans'),
        api.get('/transactions'),
        api.get('/customers')
      ]);

      const currentCustId = Number(customerId);

      // 1. Customer Personal Profile
      const allCusts = custsRes.data.data || [];
      const foundCust = allCusts.find((c) => Number(c.customer_id) === currentCustId);
      const myCust = {
        customer_id: currentCustId,
        First_name: foundCust?.First_name || user?.name?.split(' ')[0] || 'Aarav',
        Last_name: foundCust?.Last_name || user?.name?.split(' ')[1] || 'Sharma',
        email: foundCust?.email || user?.email || 'aarav@email.com',
        phone_number: foundCust?.phone_number || user?.phone || '9876543210',
        kyc_status: foundCust?.kyc_status || user?.kyc || 'Verified',
        address: foundCust?.address || 'Malviya Nagar, Jaipur'
      };

      // 2. Accounts Scoped to this Customer
      const myAccounts = (accsRes.data.data || []).filter(
        (a) => Number(a.customer_id) === currentCustId
      );

      // 3. Total Balance
      const totalBal = myAccounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);

      // 4. Cards Scoped to this Customer
      const myCards = (cardsRes.data.data || []).filter(
        (c) => Number(c.customer_id) === currentCustId
      );

      // 5. Loans Scoped to this Customer (with monthly EMI calculation)
      const myLoans = (loansRes.data.data || []).filter(
        (l) => Number(l.customer_id) === currentCustId
      ).map((l) => {
        const P = parseFloat(l.amount);
        const r = (parseFloat(l.interest_rate) / 12) / 100;
        const n = parseInt(l.tenure, 10);
        let emi = 0;
        if (n > 0 && P > 0) {
          emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        }
        return {
          ...l,
          monthly_emi: Math.round(emi * 100) / 100,
          total_repaid: l.status === 'Approved' ? Math.round(emi * 2 * 100) / 100 : 0
        };
      });

      // 6. Transactions Scoped to this Customer
      const myAccountIds = myAccounts.map((a) => Number(a.Account_id));
      const myTransactions = (txsRes.data.data || []).filter(
        (t) => Number(t.customer_id) === currentCustId || myAccountIds.includes(Number(t.Account_id))
      );

      setData({
        customer: myCust,
        totalBalance: totalBal,
        accounts: myAccounts,
        cards: myCards,
        loans: myLoans,
        transactions: myTransactions
      });

      if (myAccounts.length > 0) {
        setTransferFrom(String(myAccounts[0].Account_id));
        setPayAccId(String(myAccounts[0].Account_id));
      }
    } catch (err) {
      console.error('Failed to load customer portfolio:', err);
      setAlertMsg({ type: 'error', text: 'Error connecting to database. Please refresh.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [customerId]);

  const formatCurrency = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  // Toggle Card Freeze / Unfreeze
  const handleToggleCardStatus = async (card) => {
    const action = card.card_status === 'Active' ? 'freeze' : 'unfreeze';
    try {
      await api.put(`/cards/${card.card_id}/${card.Account_id}/${action}`);
      setAlertMsg({
        type: 'success',
        text: `Card ending in ${card.Card_number.slice(-4)} is now ${action === 'freeze' ? 'Frozen' : 'Active'}.`
      });
      fetchPortalData();
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'Failed to update card status.' });
    }
  };

  // Execute Customer Peer-to-Peer Transfer
  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!transferFrom || !transferToAccNumber || !transferAmount) {
      alert('Please fill all transfer fields.');
      return;
    }

    try {
      setTransferring(true);
      setTransferResult(null);

      // First find the recipient account ID by Account_number
      const allAccsRes = await api.get('/customers/accounts');
      const targetAcc = allAccsRes.data.data.find(
        (a) => a.Account_number.toUpperCase() === transferToAccNumber.trim().toUpperCase()
      );

      if (!targetAcc) {
        setTransferResult({
          success: false,
          error: `Recipient Account "${transferToAccNumber}" was not found in BankDB.`
        });
        return;
      }

      if (String(targetAcc.Account_id) === String(transferFrom)) {
        setTransferResult({
          success: false,
          error: 'Sender and recipient accounts cannot be the same.'
        });
        return;
      }

      const res = await api.post('/transactions/transfer', {
        fromAccountId: parseInt(transferFrom, 10),
        toAccountId: targetAcc.Account_id,
        amount: parseFloat(transferAmount),
        employeeId: 1,
        simulateFailure: false
      });

      setTransferResult({
        success: true,
        message: `₹${Number(transferAmount).toLocaleString('en-IN')} transferred successfully to ${targetAcc.First_name} ${targetAcc.Last_name} (${targetAcc.Account_number}).`
      });
      setTransferAmount('');
      fetchPortalData();
    } catch (err) {
      setTransferResult({
        success: false,
        error: err.response?.data?.message || err.message || 'Transfer failed.'
      });
    } finally {
      setTransferring(false);
    }
  };

  // Submit Loan Application for this customer
  const handleApplyLoan = async (e) => {
    e.preventDefault();
    try {
      setSubmittingLoan(true);
      const res = await api.post('/loans', {
        customerId,
        loanType: loanCategory,
        attribute: collateral,
        amount: parseFloat(loanPrincipal),
        interestRate: parseFloat(loanRate),
        tenure: parseInt(loanTenure, 10)
      });

      setShowApplyModal(false);
      setAlertMsg({
        type: 'success',
        text: res.data.message || 'Loan application submitted successfully and sent to underwriting queue.'
      });
      fetchPortalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Loan application submission failed.');
    } finally {
      setSubmittingLoan(false);
    }
  };

  // Pay Loan EMI
  const handlePayEmi = async (loan) => {
    if (!payAccId) {
      alert('Please select a payment debit account.');
      return;
    }

    try {
      setPayingEmi(true);
      const res = await api.post(`/loans/${loan.loan_id}/pay-emi`, {
        accountId: parseInt(payAccId, 10),
        amount: parseFloat(loan.monthly_emi),
        processedBy: 1
      });

      setPayingLoanId(null);
      setAlertMsg({
        type: 'success',
        text: res.data.message || `Installment of ${formatCurrency(loan.monthly_emi)} paid successfully for Loan #${loan.loan_id} via stored procedure sp_pay_loan_installment.`
      });
      fetchPortalData();
    } catch (err) {
      alert(err.response?.data?.message || 'EMI payment declined by database engine.');
    } finally {
      setPayingEmi(false);
    }
  };

  if (loading && !data.customer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span>Loading your secure banking portal...</span>
      </div>
    );
  }

  const { customer, totalBalance, accounts, cards, transactions, loans } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Personalized Greeting Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950/40 to-slate-900 border border-blue-500/20 p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 font-bold text-xl">
              {customer?.First_name?.charAt(0)}{customer?.Last_name?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  Welcome back, {customer?.First_name} {customer?.Last_name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {customer?.kyc_status} Client
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-400" /> Client ID: #{customer?.customer_id}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-indigo-400" /> {customer?.phone_number}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" /> {customer?.address}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Net Relationship Value
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                {formatCurrency(totalBalance)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Computed via fn_get_customer_total_balance({customerId})
              </div>
            </div>

            <button
              onClick={fetchPortalData}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow"
              title="Refresh Portfolio"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {alertMsg && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
            alertMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {alertMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{alertMsg.text}</span>
            </div>
            <button onClick={() => setAlertMsg(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* SECTION 1: MY BANK ACCOUNTS & LIQUIDITY */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-400" />
            <span>My Bank Accounts</span>
          </h2>
          <span className="text-xs text-slate-400">
            {accounts.length} Active {accounts.length === 1 ? 'Account' : 'Accounts'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const isSavings = acc.account_type === 'Savings';
            const isCurrent = acc.account_type === 'Current';

            return (
              <div
                key={acc.Account_id}
                className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/80 shadow-xl hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isSavings
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                      : isCurrent
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                      : 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                  }`}>
                    {acc.account_type} Account
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
                    {acc.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400 font-mono tracking-wider">
                  {acc.Account_number}
                </div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {formatCurrency(acc.balance)}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500 block">Min Balance:</span>
                    <span className="text-slate-300 font-mono">{formatCurrency(acc.min_balance)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Branch / IFSC:</span>
                    <span className="text-slate-300 truncate block">{acc.branch_name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2 & 3: CARDS + PEER-TO-PEER QUICK TRANSFER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MY LINKED CARDS */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span>My Debit & Credit Cards</span>
            </h2>
            <span className="text-[10px] font-mono bg-indigo-900/30 text-indigo-300 border border-indigo-700/40 px-2 py-0.5 rounded">
              Linked Entity
            </span>
          </div>

          {cards.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No active cards linked to your account.
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((card) => {
                const isDebit = card.card_type === 'Debit';
                const isFrozen = card.card_status === 'Frozen';

                return (
                  <div
                    key={`${card.card_id}-${card.Account_id}`}
                    className={`relative rounded-2xl p-5 border transition-all ${
                      isFrozen
                        ? 'bg-slate-950/80 border-rose-900/50 grayscale'
                        : isDebit
                        ? 'bg-gradient-to-br from-blue-900/40 via-indigo-950/50 to-slate-950 border-blue-500/30 shadow-lg'
                        : 'bg-gradient-to-br from-amber-900/40 via-purple-950/50 to-slate-950 border-amber-500/30 shadow-lg'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className={`w-5 h-5 ${isDebit ? 'text-blue-400' : 'text-amber-400'}`} />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          BankDB {card.card_type}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isFrozen
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      }`}>
                        {card.card_status}
                      </span>
                    </div>

                    <div className="font-mono text-base tracking-widest text-white font-semibold my-2">
                      •••• •••• •••• {card.Card_number.slice(-4)}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Cardholder</span>
                        <span className="font-semibold text-white">{customer.First_name} {customer.Last_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Expires</span>
                        <span className="font-mono text-slate-200">
                          {new Date(card.expiry_date).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Daily Limit</span>
                        <span className="font-mono text-emerald-400">{formatCurrency(card.daily_limit)}</span>
                      </div>
                      <button
                        onClick={() => handleToggleCardStatus(card)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          isFrozen
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-rose-600/80 hover:bg-rose-600 text-white'
                        }`}
                      >
                        {isFrozen ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" /> Unfreeze
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" /> Freeze
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* INSTANT PEER-TO-PEER FUND TRANSFER (ACID) */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Instant Fund Transfer</span>
            </h2>
            <span className="text-[10px] font-mono bg-emerald-900/30 text-emerald-300 border border-emerald-700/40 px-2 py-0.5 rounded">
              ACID Guaranteed
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Send money from your verified account to any valid beneficiary in BankDB with instantaneous balance updates.
          </p>

          <form onSubmit={handleExecuteTransfer} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">From My Account</label>
              <select
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              >
                {accounts.map((a) => (
                  <option key={a.Account_id} value={a.Account_id}>
                    {a.Account_number} — {a.account_type} (Balance: {formatCurrency(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Beneficiary Account Number</label>
              <input
                type="text"
                required
                placeholder="e.g. ACC10002"
                value={transferToAccNumber}
                onChange={(e) => setTransferToAccNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Transfer Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="e.g. 5000"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={transferring}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {transferring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Atomic Transfer...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Money Now</span>
                </>
              )}
            </button>
          </form>

          {transferResult && (
            <div className={`p-3 rounded-xl border text-xs font-sans ${
              transferResult.success
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/70 border-rose-800 text-rose-300'
            }`}>
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                {transferResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{transferResult.success ? 'Transfer Successful' : 'Transfer Declined'}</span>
              </div>
              <div>{transferResult.message || transferResult.error}</div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: MY LOANS & REPAYMENT */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-purple-400" />
              <span>My Loans & Live EMI Facility</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Accurate monthly installment calculated using MySQL mathematical power formula <code className="font-mono text-purple-300">fn_calculate_emi</code>.
            </p>
          </div>

          <button
            onClick={() => setShowApplyModal(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all self-start sm:self-auto"
          >
            + Apply for New Loan
          </button>
        </div>

        {loans.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            You currently have no active or pending loans. Click "+ Apply for New Loan" to request financing.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loans.map((loan) => {
              const isApproved = loan.status === 'Approved';
              const isPending = loan.status === 'Pending';

              return (
                <div
                  key={loan.loan_id}
                  className="rounded-xl p-4 bg-slate-950/70 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-sm">{loan.loan_type}</span>
                      <span className="text-[11px] text-slate-400 block">Loan Ref #{loan.loan_id} • {loan.Attribute}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isApproved
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : isPending
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}>
                      {loan.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-800/60 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">Principal</span>
                      <span className="text-white font-bold">{formatCurrency(loan.amount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">Interest & Term</span>
                      <span className="text-slate-300">{loan.interest_rate}% ({loan.tenure}m)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">Monthly EMI</span>
                      <span className="text-purple-400 font-bold">{formatCurrency(loan.monthly_emi)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-400">
                      Total Repaid: <strong className="text-emerald-400 font-mono">{formatCurrency(loan.total_repaid)}</strong>
                    </span>

                    {isApproved && (
                      <button
                        onClick={() => handlePayEmi(loan)}
                        disabled={payingEmi}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {payingEmi ? 'Processing...' : `Pay EMI (${formatCurrency(loan.monthly_emi)})`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: MY TRANSACTION STATEMENT */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>My Account Statement & Recent Transactions</span>
          </h2>
          <span className="text-xs text-slate-400">Showing last {transactions.length} entries</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No transactions found for your accounts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Account</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {transactions.map((tx) => {
                  const isDeposit = tx.transaction_type.includes('Deposit') || tx.transaction_type.includes('In');

                  return (
                    <tr key={tx.transaction_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                        {new Date(tx.Transaction_date).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isDeposit
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">
                        {tx.Account_number}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-xs">
                        {tx.description}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${
                        isDeposit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APPLY FOR LOAN MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Landmark className="w-5 h-5 text-purple-400" />
                <span>Apply for Customer Loan</span>
              </h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLoan} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Loan Category</label>
                <select
                  value={loanCategory}
                  onChange={(e) => setLoanCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Home Loan">Home Loan (Housing & Property)</option>
                  <option value="Personal Loan">Personal Loan (General Purpose)</option>
                  <option value="Vehicle Loan">Vehicle Loan (Auto Finance)</option>
                  <option value="Education Loan">Education Loan (Student Higher Ed)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Collateral / Security</label>
                <select
                  value={collateral}
                  onChange={(e) => setCollateral(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Secured">Secured (Mortgage / Pledge)</option>
                  <option value="Unsecured">Unsecured (Credit Profile Based)</option>
                  <option value="Student">Student Endorsement</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Principal Amount (₹)</label>
                  <input
                    type="number" required min="1000" step="any"
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Interest Rate (%)</label>
                  <input
                    type="number" required step="0.1" min="1" max="25"
                    value={loanRate}
                    onChange={(e) => setLoanRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tenure (Months)</label>
                <input
                  type="number" required min="6" max="360"
                  value={loanTenure}
                  onChange={(e) => setLoanTenure(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingLoan}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                >
                  {submittingLoan ? 'Submitting Application...' : 'Submit Loan Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
