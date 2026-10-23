import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  CreditCard, Plus, Snowflake, Sun, Sliders, Trash2,
  ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Lock
} from 'lucide-react';

const CardWeakEntityHub = () => {
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Issue Card Modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [cardType, setCardType] = useState('Debit');
  const [dailyLimit, setDailyLimit] = useState(50000);
  const [issuing, setIssuing] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  // Limit Edit Modal
  const [editLimitModal, setEditLimitModal] = useState(null); // card object
  const [newLimit, setNewLimit] = useState(50000);

  const fetchCardsAndAccounts = async () => {
    setLoading(true);
    try {
      const [cardsRes, accRes] = await Promise.all([
        api.get('/cards'),
        api.get('/customers/accounts')
      ]);
      setCards(cardsRes.data.data);
      setAccounts(accRes.data.data);
      if (accRes.data.data.length > 0 && !selectedAccount) {
        setSelectedAccount(accRes.data.data[0].Account_id);
      }
    } catch (err) {
      console.error('Failed to load card data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardsAndAccounts();
  }, []);

  const handleIssueCard = async (e) => {
    e.preventDefault();
    setIssuing(true);
    setAlertMsg('');
    try {
      const res = await api.post('/cards', {
        accountId: selectedAccount,
        cardType,
        dailyLimit
      });
      setAlertMsg(res.data.message);
      setShowIssueModal(false);
      fetchCardsAndAccounts();
    } catch (err) {
      alert('Failed to issue card: ' + (err.response?.data?.message || err.message));
    } finally {
      setIssuing(false);
    }
  };

  const handleToggleFreeze = async (card) => {
    const isFrozen = card.card_status === 'Frozen';
    const action = isFrozen ? 'unfreeze' : 'freeze';
    try {
      const res = await api.put(`/cards/${card.card_id}/${card.Account_id}/${action}`);
      setAlertMsg(res.data.message);
      fetchCardsAndAccounts();
    } catch (err) {
      console.error('Failed to toggle freeze:', err);
    }
  };

  const handleUpdateLimit = async (e) => {
    e.preventDefault();
    if (!editLimitModal) return;
    try {
      const res = await api.put(
        `/cards/${editLimitModal.card_id}/${editLimitModal.Account_id}/limit`,
        { limit: newLimit }
      );
      setAlertMsg(res.data.message);
      setEditLimitModal(null);
      fetchCardsAndAccounts();
    } catch (err) {
      alert('Failed to update limit: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteCard = async (card) => {
    if (!window.confirm(`Revoke and purge Card ending in ${card.Card_number.slice(-4)}?`)) return;
    try {
      const res = await api.delete(`/cards/${card.card_id}/${card.Account_id}`);
      setAlertMsg(res.data.message);
      fetchCardsAndAccounts();
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  };

  const formatCardNumber = (num) => {
    if (!num) return '•••• •••• •••• ••••';
    return num.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatCurrency = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Card Services & Issuance Hub
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Debit & Credit Entity
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Physical & digital card issuance linked via composite primary key <code className="font-mono text-blue-300">PRIMARY KEY(card_id, Account_id)</code> with CASCADE integrity.
          </p>
        </div>

        <button
          onClick={() => setShowIssueModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Card</span>
        </button>
      </div>

      {/* Weak Entity Info Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white text-xs">
              RDBMS Weak Entity Architecture: Cards ⊣ Accounts
            </div>
            <div className="text-[11px] text-slate-400">
              Cards have no independent existence without a parent Account. Foreign key constraint ensures automatic deletion cascade when an account closes.
            </div>
          </div>
        </div>

        {alertMsg && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-semibold text-[11px] flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{alertMsg}</span>
          </div>
        )}
      </div>

      {/* Realistic 3D Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-500">Loading cards...</div>
        ) : cards.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-500">
            No cards found. Click "Issue New Card" to provision one!
          </div>
        ) : (
          cards.map((card) => {
            const isDebit = card.card_type === 'Debit';
            const isFrozen = card.card_status === 'Frozen';

            return (
              <div
                key={`${card.card_id}-${card.Account_id}`}
                className="flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 shadow-xl hover:border-slate-700 transition-all space-y-4"
              >
                {/* Physical Card Visual */}
                <div
                  className={`w-full aspect-[1.586] rounded-2xl p-5 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden transition-transform duration-300 hover:scale-[1.02] ${
                    isFrozen
                      ? 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-slate-700 opacity-75'
                      : isDebit
                      ? 'bg-gradient-to-tr from-blue-900 via-indigo-950 to-slate-950 border border-blue-500/30 shadow-blue-950/50'
                      : 'bg-gradient-to-tr from-purple-900 via-slate-900 to-black border border-purple-500/30 shadow-purple-950/50'
                  }`}
                >
                  {/* Frosted overlay if frozen */}
                  {isFrozen && (
                    <div className="absolute inset-0 bg-cyan-950/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-900/80 border border-cyan-400/50 text-cyan-200 text-xs font-bold uppercase tracking-wider">
                        <Snowflake className="w-3.5 h-3.5 animate-spin" />
                        <span>Card Frozen</span>
                      </div>
                    </div>
                  )}

                  {/* Top Bar: Bank Logo & Card Type Badge */}
                  <div className="flex items-center justify-between z-0">
                    <div className="flex items-center gap-1.5 font-bold tracking-wider text-xs">
                      <span className="text-white">BankDB</span>
                      <span className="text-blue-400 font-light">Platinum</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isDebit ? 'bg-blue-500/30 text-blue-200' : 'bg-purple-500/30 text-purple-200'
                    }`}>
                      {card.card_type}
                    </span>
                  </div>

                  {/* Smart Chip Graphic */}
                  <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-amber-400 to-amber-200 border border-amber-500/50 flex flex-col justify-around p-1 shadow">
                    <div className="w-full h-0.5 bg-amber-600/50 rounded"></div>
                    <div className="w-full h-0.5 bg-amber-600/50 rounded"></div>
                  </div>

                  {/* Card Number */}
                  <div className="font-mono text-sm sm:text-base tracking-widest text-slate-100 font-bold drop-shadow">
                    {formatCardNumber(card.Card_number)}
                  </div>

                  {/* Bottom Bar: Cardholder, Expiry, CVV */}
                  <div className="flex items-end justify-between text-xs z-0">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400">Cardholder</div>
                      <div className="font-medium text-slate-200 truncate max-w-[140px]">
                        {card.First_name} {card.Last_name}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400">Expires</div>
                      <div className="font-mono text-slate-200 text-xs">
                        {card.expiry_date ? String(card.expiry_date).substring(0, 7) : '12/29'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400">CVV</div>
                      <div className="font-mono text-slate-200 text-xs">{card.cvv}</div>
                    </div>
                  </div>
                </div>

                {/* Card Meta & Control Bar */}
                <div className="space-y-3 pt-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                    <span>Linked Account:</span>
                    <span className="font-mono text-blue-400 font-semibold">{card.Account_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                    <span>Daily Limit:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{formatCurrency(card.daily_limit)}</span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={() => handleToggleFreeze(card)}
                      className={`py-1.5 rounded-lg border font-medium flex items-center justify-center gap-1 text-[11px] transition-colors ${
                        isFrozen
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-cyan-400'
                      }`}
                    >
                      {isFrozen ? <Sun className="w-3 h-3" /> : <Snowflake className="w-3 h-3" />}
                      <span>{isFrozen ? 'Unfreeze' : 'Freeze'}</span>
                    </button>

                    <button
                      onClick={() => { setEditLimitModal(card); setNewLimit(card.daily_limit); }}
                      className="py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:text-white flex items-center justify-center gap-1 text-[11px] transition-colors"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Limit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCard(card)}
                      className="py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 flex items-center justify-center gap-1 text-[11px] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Revoke</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Issue Card Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Issue Weak Entity Card</h3>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleIssueCard} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Select Parent Account</label>
                <select
                  required
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.Account_id} value={a.Account_id}>
                      {a.Account_number} — {a.First_name} {a.Last_name} ({a.account_type}, {formatCurrency(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Card Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCardType('Debit')}
                    className={`py-2 rounded-xl font-semibold border ${
                      cardType === 'Debit'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Debit Card (4532...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardType('Credit')}
                    className={`py-2 rounded-xl font-semibold border ${
                      cardType === 'Credit'
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Credit Card (5412...)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Daily Limit (₹)</label>
                <input
                  type="number"
                  min="5000"
                  step="5000"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button" onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={issuing}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {issuing ? 'Provisioning...' : 'Confirm Card Issuance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Limit Modal */}
      {editLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Adjust Daily Limit</h3>
            <p className="text-xs text-slate-400 mb-4">
              Card {formatCardNumber(editLimitModal.Card_number)}
            </p>

            <form onSubmit={handleUpdateLimit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">New Limit (₹)</label>
                <input
                  type="number"
                  min="1000"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button" onClick={() => setEditLimitModal(null)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardWeakEntityHub;
