import React, { useState } from 'react';
import { useSqlTelemetry } from '../context/SqlTelemetryContext';
import api from '../services/api';
import {
  Terminal, ChevronUp, ChevronDown, Trash2, Play, CheckCircle2,
  AlertTriangle, Copy, Database, ShieldAlert, Sparkles
} from 'lucide-react';

const SqlLabInspector = () => {
  const { queries, clearQueries } = useSqlTelemetry();
  const [isOpen, setIsOpen] = useState(false);
  const [customSql, setCustomSql] = useState('');
  const [isRunningCustom, setIsRunningCustom] = useState(false);
  const [customResult, setCustomResult] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleRunCustomQuery = async (e) => {
    e.preventDefault();
    if (!customSql.trim()) return;

    setIsRunningCustom(true);
    setCustomResult(null);
    try {
      const res = await api.post('/admin/run-query', { query: customSql });
      setCustomResult({ success: true, count: res.data.count, rows: res.data.data });
    } catch (err) {
      setCustomResult({
        success: false,
        error: err.response?.data?.message || err.message
      });
    } finally {
      setIsRunningCustom(false);
    }
  };

  const handleCopySql = (id, sql) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out font-sans ${isOpen ? 'h-96' : 'h-11'}`}>
      {/* Header bar / Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-11 bg-slate-900 border-t border-slate-700/80 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/90 transition-colors shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm tracking-wide">
            <Terminal className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>BankDB Live SQL Execution Inspector</span>
          </div>
          <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs px-2 py-0.5 rounded-full font-mono">
            {queries.length} queries logged
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-400">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            MySQL 8.0 Real-time Stream
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); clearQueries(); }}
              className="px-2 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded flex items-center gap-1 transition-colors"
              title="Clear Log"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
          <button
            className="text-slate-400 hover:text-white p-1 rounded"
            aria-label="Toggle SQL Drawer"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Drawer Content */}
      {isOpen && (
        <div className="h-[calc(24rem-2.75rem)] bg-slate-950/95 border-t border-slate-800 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
          {/* Left / Top: Live Log */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800">
              <span className="font-medium">Active Execution Stream</span>
              <span>Showing last {queries.length} queries</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 font-mono text-xs">
              {queries.length === 0 ? (
                <div className="text-center py-10 text-slate-500 italic font-sans">
                  No SQL queries captured yet. Perform actions on any page to see live MySQL execution!
                </div>
              ) : (
                queries.map((q) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-lg border transition-all ${
                      q.isError
                        ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                        : 'bg-slate-900/80 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2 font-sans">
                      <div className="flex items-center gap-2">
                        {q.isError ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          q.isError
                            ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                            : 'bg-blue-900/40 text-blue-300 border border-blue-700/40'
                        }`}>
                          {q.labTag ? q.labTag.replace(/^(Lab\s*\d+(\s*&.*?)?|Additional\s*Exp\s*\d+):\s*/i, '') : 'MySQL Execution'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>{q.timestamp}</span>
                        {q.durationMs !== undefined && (
                          <span className="text-amber-400/90">{q.durationMs}ms</span>
                        )}
                        {q.rowCount !== undefined && (
                          <span className="text-indigo-400/90">{q.rowCount} rows</span>
                        )}
                        <button
                          onClick={() => handleCopySql(q.id, q.executedSql)}
                          className="hover:text-white transition-colors"
                          title="Copy SQL"
                        >
                          {copiedId === q.id ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <pre className="whitespace-pre-wrap break-all text-xs bg-black/40 p-2 rounded text-blue-200/90 border border-white/5">
                      {q.executedSql}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right / Bottom: Ad-Hoc Viva Query Console */}
          <div className="w-full md:w-96 flex flex-col bg-slate-900/40">
            <div className="px-4 py-2 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 font-semibold">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>Ad-Hoc SQL Query Console</span>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">SELECT only</span>
            </div>

            <div className="p-3 flex-1 flex flex-col overflow-y-auto">
              <form onSubmit={handleRunCustomQuery} className="flex flex-col gap-2">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customSql}
                    onChange={(e) => setCustomSql(e.target.value)}
                    placeholder="e.g. SELECT * FROM High_Value_Customers"
                    className="flex-1 bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isRunningCustom || !customSql.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <span className="text-slate-500">Quick queries:</span>
                  <button
                    type="button"
                    onClick={() => setCustomSql('SELECT * FROM High_Value_Customers')}
                    className="text-blue-400 hover:underline"
                  >
                    High Value
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setCustomSql('SELECT * FROM Account_Summary LIMIT 5')}
                    className="text-blue-400 hover:underline"
                  >
                    Summary
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setCustomSql('SELECT * FROM employee_audit LIMIT 5')}
                    className="text-blue-400 hover:underline"
                  >
                    Audit
                  </button>
                </div>
              </form>

              {/* Custom Query Output */}
              {customResult && (
                <div className="mt-3 flex-1 overflow-y-auto border border-slate-800 rounded bg-black/50 p-2 font-mono text-[11px]">
                  {customResult.success ? (
                    <div>
                      <div className="text-emerald-400 text-xs mb-1 font-sans flex items-center justify-between">
                        <span>Query returned {customResult.count} row(s)</span>
                      </div>
                      {customResult.rows && customResult.rows.length > 0 ? (
                        <div className="overflow-x-auto max-h-48">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-700 text-slate-400">
                                {Object.keys(customResult.rows[0]).map((k) => (
                                  <th key={k} className="p-1 whitespace-nowrap">{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {customResult.rows.map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-900 text-slate-300">
                                  {Object.values(row).map((v, cIdx) => (
                                    <td key={cIdx} className="p-1 whitespace-nowrap">{String(v ?? 'NULL')}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-slate-500 italic">Empty result set</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-rose-400 font-sans flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{customResult.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SqlLabInspector;
