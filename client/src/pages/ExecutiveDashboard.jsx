import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users, Wallet, TrendingUp, ArrowDownRight, ArrowUpRight,
  Landmark, RefreshCw, Layers, Award, Eye, CheckCircle2,
  AlertCircle, Table, ChevronRight
} from 'lucide-react';

const ExecutiveDashboard = () => {
  const [kpi, setKpi] = useState(null);
  const [groupedData, setGroupedData] = useState([]);
  const [topAccounts, setTopAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Views explorer state
  const [activeView, setActiveView] = useState('High_Value_Customers');
  const [viewData, setViewData] = useState([]);
  const [loadingView, setLoadingView] = useState(false);
  const [viewUpdateMsg, setViewUpdateMsg] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [kpiRes, grpRes, topRes] = await Promise.all([
        api.get('/dashboard/kpi'),
        api.get('/dashboard/grouped'),
        api.get('/dashboard/top-accounts')
      ]);

      setKpi(kpiRes.data.kpi);
      setGroupedData(grpRes.data.data);
      setTopAccounts(topRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchViewData = async (viewName) => {
    setLoadingView(true);
    setViewUpdateMsg('');
    try {
      const res = await api.get(`/dashboard/views/${viewName}`);
      setViewData(res.data.data);
    } catch (err) {
      console.error('Failed to load view:', err);
      setViewData([]);
    } finally {
      setLoadingView(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchViewData(activeView);
  }, [activeView]);

  const handleToggleAccountStatus = async (accountId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const res = await api.put('/dashboard/views/update-status', {
        accountId,
        newStatus
      });
      setViewUpdateMsg(res.data.message);
      // Refresh view data and KPIs
      fetchViewData('Account_Summary');
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to update status through view:', err);
    }
  };

  const formatCurrency = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header with Title and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Executive Analytics & Views Hub
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Live Stream
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time portfolio metrics, branch distribution, and database views.
          </p>
        </div>

        <button
          onClick={() => { fetchDashboardData(); fetchViewData(activeView); }}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-semibold shadow-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh Live Metrics</span>
        </button>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total Customers */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Total Clients</div>
          <div className="text-xl font-bold text-white mt-1">
            {loading ? '...' : kpi?.totalCustomers ?? 0}
          </div>
          <div className="text-[10px] text-blue-400 font-mono mt-1">Active Accounts</div>
        </div>

        {/* Card 2: Total Deposits */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Total Deposits</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {loading ? '...' : formatCurrency(kpi?.totalDeposits)}
          </div>
          <div className="text-[10px] text-emerald-400/80 font-mono mt-1">Gross Balance</div>
        </div>

        {/* Card 3: Average Balance */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Average Balance</div>
          <div className="text-xl font-bold text-purple-300 mt-1">
            {loading ? '...' : formatCurrency(kpi?.avgBalance)}
          </div>
          <div className="text-[10px] text-purple-400/80 font-mono mt-1">Portfolio Mean</div>
        </div>

        {/* Card 4: Min Balance */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Lowest Balance</div>
          <div className="text-xl font-bold text-amber-300 mt-1">
            {loading ? '...' : formatCurrency(kpi?.minBalance)}
          </div>
          <div className="text-[10px] text-amber-400/80 font-mono mt-1">Minimum Floor</div>
        </div>

        {/* Card 5: Max Balance */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Highest Balance</div>
          <div className="text-xl font-bold text-cyan-300 mt-1">
            {loading ? '...' : formatCurrency(kpi?.maxBalance)}
          </div>
          <div className="text-[10px] text-cyan-400/80 font-mono mt-1">Maximum Apex</div>
        </div>

        {/* Card 6: Loan Portfolio */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Loan Portfolio</div>
          <div className="text-xl font-bold text-rose-300 mt-1">
            {loading ? '...' : formatCurrency(kpi?.totalLoanVolume)}
          </div>
          <div className="text-[10px] text-rose-400/80 font-mono mt-1">Issued Debt</div>
        </div>
      </div>

      {/* Row 2: Grouped Analytics & Top Depositors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Grouped Aggregations (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">
                Portfolio Distribution by Account Type & Branch
              </h2>
            </div>
            <span className="text-[10px] font-mono bg-blue-900/40 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded">
              Grouped Aggregations
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-2.5">Account Type</th>
                  <th className="pb-2.5">Branch Location</th>
                  <th className="pb-2.5 text-center">Accounts</th>
                  <th className="pb-2.5 text-right">Avg Balance</th>
                  <th className="pb-2.5 text-right">Total Liquidity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {groupedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-medium text-slate-200">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        row.account_type === 'Savings'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : row.account_type === 'Current'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                      }`}>
                        {row.account_type}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">{row.branch_name}</td>
                    <td className="py-2.5 text-center font-mono text-slate-300">{row.count}</td>
                    <td className="py-2.5 text-right font-mono text-slate-300">{formatCurrency(row.avg_bal)}</td>
                    <td className="py-2.5 text-right font-mono font-semibold text-emerald-400">{formatCurrency(row.total_bal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top 3 Depositors Leaderboard */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Top 3 Depositors</h2>
            </div>
            <span className="text-[10px] font-mono bg-amber-900/30 text-amber-300 border border-amber-700/40 px-2 py-0.5 rounded">
              High Value Tier
            </span>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-around">
            {topAccounts.map((acc, idx) => (
              <div
                key={acc.Account_id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    idx === 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : idx === 1
                      ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      {acc.First_name} {acc.Last_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {acc.Account_number} • {acc.account_type}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400 font-mono">
                    {formatCurrency(acc.balance)}
                  </div>
                  <div className="text-[9px] text-slate-500">{acc.branch_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Database Views Explorer Panel */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">
              Database Views Explorer & Analytical Reports
            </h2>
            <span className="text-[10px] font-mono bg-purple-900/40 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded">
              Active Database Views
            </span>
          </div>

          {/* View Tab Buttons */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveView('High_Value_Customers')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeView === 'High_Value_Customers'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              High_Value_Customers
            </button>
            <button
              onClick={() => setActiveView('Account_Summary')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeView === 'Account_Summary'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Account_Summary (Updatable)
            </button>
            <button
              onClick={() => setActiveView('Loan_Amortization_Schedule_View')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeView === 'Loan_Amortization_Schedule_View'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Loan_Amortization_Schedule_View
            </button>
          </div>
        </div>

        {/* View Description & Update Notice */}
        <div className="mb-3 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            {activeView === 'High_Value_Customers' && (
              <span>🔍 <strong>Filter View:</strong> Lists Customers joined with Accounts having balance &gt; ₹50,000.</span>
            )}
            {activeView === 'Account_Summary' && (
              <span>⚡ <strong>Updatable View:</strong> Single-table base view allowing direct DML UPDATE on status column.</span>
            )}
            {activeView === 'Loan_Amortization_Schedule_View' && (
              <span>📊 <strong>Computed Math View:</strong> Joins Loan, Customers, Employee and calculates EMI using <code className="font-mono text-purple-300">fn_calculate_emi</code>.</span>
            )}
          </div>
          {viewUpdateMsg && (
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{viewUpdateMsg}</span>
            </div>
          )}
        </div>

        {/* View Data Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
          {loadingView ? (
            <div className="py-12 text-center text-xs text-slate-500">Querying database view...</div>
          ) : viewData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No records found in view.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold bg-slate-900/40">
                  {Object.keys(viewData[0]).map((key) => (
                    <th key={key} className="p-3 whitespace-nowrap">{key.replace(/_/g, ' ')}</th>
                  ))}
                  {activeView === 'Account_Summary' && (
                    <th className="p-3 text-right">Updatable View Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {viewData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    {Object.entries(row).map(([k, v], cIdx) => (
                      <td key={cIdx} className="p-3 whitespace-nowrap text-slate-300">
                        {k.toLowerCase().includes('balance') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('emi')
                          ? formatCurrency(v)
                          : String(v ?? 'NULL')}
                      </td>
                    ))}
                    {activeView === 'Account_Summary' && (
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleToggleAccountStatus(row.Account_id, row.status)}
                          className="px-2.5 py-1 rounded bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600 hover:text-white transition-colors text-[11px] font-sans font-medium"
                        >
                          Toggle {row.status === 'Active' ? 'Suspended' : 'Active'}
                        </button>
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

export default ExecutiveDashboard;
