import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import SqlLabInspector from './SqlLabInspector';
import {
  LayoutDashboard, Users, CreditCard, ArrowLeftRight, Landmark,
  ShieldCheck, LogOut, UserCircle2, RefreshCw, Database, Menu, X,
  ExternalLink, KeyRound
} from 'lucide-react';

const Layout = () => {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isCustomer = user?.type === 'customer' || user?.role === 'Customer';
  const isManager = user?.role === 'Branch Manager';
  const isLoanOfficer = user?.role === 'Loan Officer';
  const isTeller = user?.role === 'Senior Teller' || user?.role === 'Teller';

  const [liveCustomers, setLiveCustomers] = useState([]);

  useEffect(() => {
    api.get('/customers')
      .then((res) => {
        const unique = [];
        const seen = new Set();
        for (const c of res.data.data || []) {
          if (!seen.has(c.customer_id)) {
            seen.add(c.customer_id);
            unique.push(c);
          }
        }
        setLiveCustomers(unique);
      })
      .catch((err) => console.error('Failed to load customers for switcher:', err));
  }, [user]);

  const handleSwitchToCustomer = (c) => {
    switchRole({
      id: c.customer_id,
      name: `${c.First_name} ${c.Last_name}`,
      email: c.email,
      phone: c.phone_number,
      kyc: c.kyc_status,
      role: 'Customer',
      type: 'customer'
    }, `demo_token_customer_${c.customer_id}`);
    navigate('/customer-portal');
  };

  const handleQuickSwitch = (roleType) => {
    if (roleType === 'manager') {
      switchRole({
        id: 1,
        name: 'Rajesh Khanna',
        email: 'rajesh@bankdb.com',
        role: 'Branch Manager',
        branch: 'Jaipur Main',
        type: 'employee'
      }, 'demo_token_manager');
      navigate('/dashboard');
    } else if (roleType === 'loanofficer') {
      switchRole({
        id: 2,
        name: 'Anita Desai',
        email: 'anita@bankdb.com',
        role: 'Loan Officer',
        branch: 'Jaipur Main',
        type: 'employee'
      }, 'demo_token_loanofficer');
      navigate('/loans');
    } else if (roleType === 'teller') {
      switchRole({
        id: 3,
        name: 'Karan Mehta',
        email: 'karan@bankdb.com',
        role: 'Senior Teller',
        branch: 'MUJ Campus Branch',
        type: 'employee'
      }, 'demo_token_teller');
      navigate('/transactions');
    } else if (roleType === 'priya') {
      switchRole({
        id: 2,
        name: 'Priya Verma',
        email: 'priya@email.com',
        phone: '9876543211',
        kyc: 'Verified',
        role: 'Customer',
        type: 'customer'
      }, 'demo_token_priya');
      navigate('/customer-portal');
    } else {
      switchRole({
        id: 1,
        name: 'Aarav Sharma',
        email: 'aarav@email.com',
        phone: '9876543210',
        kyc: 'Verified',
        role: 'Customer',
        type: 'customer'
      }, 'demo_token_customer');
      navigate('/customer-portal');
    }
  };

  let navItems = [];
  if (isCustomer) {
    navItems = [
      { to: '/customer-portal', label: 'My Banking Portal', icon: LayoutDashboard }
    ];
  } else if (isLoanOfficer) {
    navItems = [
      { to: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      { to: '/loans', label: 'Loan Underwriting', icon: Landmark },
      { to: '/customers-accounts', label: 'Customers & Accounts', icon: Users }
    ];
  } else if (isTeller) {
    navItems = [
      { to: '/transactions', label: 'Fund Transactions', icon: ArrowLeftRight },
      { to: '/customers-accounts', label: 'Customers & Accounts', icon: Users },
      { to: '/cards', label: 'Card Services', icon: CreditCard }
    ];
  } else {
    // Branch Manager / Administrator
    navItems = [
      { to: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      { to: '/customers-accounts', label: 'Customers & Accounts', icon: Users },
      { to: '/cards', label: 'Card Services', icon: CreditCard },
      { to: '/transactions', label: 'Fund Transactions', icon: ArrowLeftRight },
      { to: '/loans', label: 'Loan Underwriting', icon: Landmark },
      { to: '/admin-lab', label: 'System Administration', icon: ShieldCheck }
    ];
  }

  return (
    <div className="flex h-screen bg-[#0a0e1a] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-950 border-r border-slate-800/80 z-20">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-slate-900/40">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
              BankDB
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>MySQL 8.0 Live</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 transition-transform group-hover:scale-110 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Role Switcher in Sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-1 flex items-center gap-1">
            <KeyRound className="w-3 h-3 text-amber-400" />
            <span>Role Switcher (Live RBAC)</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <button
              onClick={() => handleQuickSwitch('manager')}
              className={`px-1.5 py-1.5 rounded font-medium border text-center transition-colors truncate ${
                user?.role === 'Branch Manager'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              🏦 Manager
            </button>
            <button
              onClick={() => handleQuickSwitch('loanofficer')}
              className={`px-1.5 py-1.5 rounded font-medium border text-center transition-colors truncate ${
                user?.role === 'Loan Officer'
                  ? 'bg-purple-600/20 text-purple-400 border-purple-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              💼 Officer
            </button>
            <button
              onClick={() => handleQuickSwitch('teller')}
              className={`px-1.5 py-1.5 rounded font-medium border text-center transition-colors truncate ${
                user?.role === 'Senior Teller'
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              💵 Teller
            </button>
          </div>

          <div className="pt-1.5 border-t border-slate-800/80">
            <label className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">
              Customer Portal Persona:
            </label>
            <select
              value={user?.type === 'customer' ? user?.id : ''}
              onChange={(e) => {
                const selected = liveCustomers.find((c) => String(c.customer_id) === e.target.value);
                if (selected) handleSwitchToCustomer(selected);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-[11px] text-emerald-400 font-mono font-semibold truncate focus:outline-none focus:border-emerald-500"
            >
              <option value="" disabled>Select Customer ({liveCustomers.length} in DB)...</option>
              {liveCustomers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  #{c.customer_id} {c.First_name} {c.Last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-950/80 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="hidden sm:block">
              <span className="text-xs font-semibold text-slate-300">Enterprise Core Banking Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User status capsule */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <UserCircle2 className="w-5 h-5 text-blue-400" />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-medium text-slate-200 leading-tight">
                  {user?.name || 'Guest User'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {user?.role || (user?.type === 'customer' ? 'Customer' : 'Visitor')}
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950 border-b border-slate-800 p-4 space-y-2 z-30">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
                      isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Dynamic Page Content Viewport */}
        <main className="flex-1 overflow-y-auto pb-14 p-4 md:p-6 bg-[#0a0e1a]">
          <Outlet />
        </main>

        {/* Fixed SQL Lab Inspector Drawer */}
        <SqlLabInspector />
      </div>
    </div>
  );
};

export default Layout;
