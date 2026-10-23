import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPortal from './pages/LoginPortal';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import CustomerAccountHub from './pages/CustomerAccountHub';
import CardWeakEntityHub from './pages/CardWeakEntityHub';
import TransactionAcidCenter from './pages/TransactionAcidCenter';
import LoanUnderwritingHub from './pages/LoanUnderwritingHub';
import AdminTriggersProcedures from './pages/AdminTriggersProcedures';
import CustomerPortal from './pages/CustomerPortal';
import { useAuth } from './context/AuthContext';

// Route guard for employee-only pages
function EmployeeRoute({ children }) {
  const { user } = useAuth();
  const isCustomer = user?.type === 'customer' || user?.role === 'Customer';
  if (isCustomer) {
    return <Navigate to="/customer-portal" replace />;
  }
  return children;
}

// Default redirect based on active user role
function HomeRedirect() {
  const { user } = useAuth();
  const isCustomer = user?.type === 'customer' || user?.role === 'Customer';
  return <Navigate to={isCustomer ? "/customer-portal" : "/dashboard"} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPortal />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomeRedirect />} />
        
        {/* Customer Dedicated Portal (Scoped to logged in customer) */}
        <Route path="/customer-portal" element={<CustomerPortal />} />

        {/* Employee Only Administration & Core Banking Pages */}
        <Route path="/dashboard" element={<EmployeeRoute><ExecutiveDashboard /></EmployeeRoute>} />
        <Route path="/customers-accounts" element={<EmployeeRoute><CustomerAccountHub /></EmployeeRoute>} />
        <Route path="/cards" element={<EmployeeRoute><CardWeakEntityHub /></EmployeeRoute>} />
        <Route path="/transactions" element={<EmployeeRoute><TransactionAcidCenter /></EmployeeRoute>} />
        <Route path="/loans" element={<EmployeeRoute><LoanUnderwritingHub /></EmployeeRoute>} />
        <Route path="/admin-lab" element={<EmployeeRoute><AdminTriggersProcedures /></EmployeeRoute>} />

        <Route path="*" element={<HomeRedirect />} />
      </Route>
    </Routes>
  );
}

export default App;

