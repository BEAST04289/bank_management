import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SqlTelemetryContext = createContext(null);
const MAX_ENTRIES = 100;

// Global listener hook for axios interceptor
let globalTelemetryListener = null;

export const registerTelemetryListener = (fn) => {
  globalTelemetryListener = fn;
};

export const pushGlobalTelemetry = (sqlMeta) => {
  if (globalTelemetryListener && sqlMeta) {
    globalTelemetryListener(sqlMeta);
  }
};

export const SqlTelemetryProvider = ({ children }) => {
  const [queries, setQueries] = useState([
    {
      id: 'init-0',
      executedSql: '-- BankDB MySQL Telemetry Engine Ready\n-- Connected to MySQL Server (bankdb)\n-- Monitoring real-time SQL execution stream...',
      labTag: 'System Initialization',
      durationMs: 0.1,
      rowCount: 0,
      timestamp: new Date().toLocaleTimeString(),
      isError: false
    }
  ]);

  const addQuery = useCallback((sqlMeta) => {
    if (!sqlMeta) return;
    const entry = {
      ...sqlMeta,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: sqlMeta.timestamp || new Date().toLocaleTimeString()
    };
    setQueries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
  }, []);

  const clearQueries = useCallback(() => {
    setQueries([]);
  }, []);

  useEffect(() => {
    registerTelemetryListener(addQuery);
    return () => registerTelemetryListener(null);
  }, [addQuery]);

  return (
    <SqlTelemetryContext.Provider value={{ queries, addQuery, clearQueries }}>
      {children}
    </SqlTelemetryContext.Provider>
  );
};

export const useSqlTelemetry = () => useContext(SqlTelemetryContext);
export default SqlTelemetryContext;
