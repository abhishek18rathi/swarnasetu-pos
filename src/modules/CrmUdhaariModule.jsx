import React, { useState, useMemo } from 'react';
import {
  BookOpen, UserPlus, Search, ArrowUpRight, ArrowDownLeft,
  MessageCircle, CheckCircle2, X, Phone, Calendar, Wallet
} from 'lucide-react';

export default function CrmUdhaariModule({
  currentUser,
  customerLedger = [],
  setCustomerLedger,
  invoices = []
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin;
  const hasAccess = isAdmin || currentUser?.privileges?.crm_ledger !== false;

  const [banner, setBanner] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'udhaari' | 'advance'
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Add Customer Form State
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custCity, setCustCity] = useState('Ajmer');
  const [custOccasion, setCustOccasion] = useState('');

  // Ledger Entry Form State
  const [entryCustomerId, setEntryCustomerId] = useState('');
  const [entryType, setEntryType] = useState('udhaari_add'); // 'udhaari_add' | 'payment_in' | 'advance_add' | 'advance_use'
  const [entryAmount, setEntryAmount] = useState('');
  const [entryPayMode, setEntryPayMode] = useState('UPI / Bank');
  const [entryNote, setEntryNote] = useState('');

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4000);
  };

  // Merge explicit CRM records with any customer names from generated invoices
  const customers = useMemo(() => {
    const map = new Map();

    (customerLedger || []).forEach((c) => {
      map.set(c.id, {
        ...c,
        transactions: Array.isArray(c.transactions) ? c.transactions : []
      });
    });

    (invoices || []).forEach((inv) => {
      const name = (inv.customerName || '').trim();
      if (!name || name.toLowerCase() === 'walk-in customer') return;
      const mobile = (inv.customerMobile || '').trim();
      const existing = Array.from(map.values()).find(
        (c) =>
          (mobile && c.mobile && c.mobile.replace(/\D/g, '').slice(-10) === mobile.replace(/\D/g, '').slice(-10)) ||
          c.name.toLowerCase() === name.toLowerCase()
      );
      if (!existing) {
        const autoId = `INV-CUST-${name.toLowerCase().replace(/\W+/g, '_')}`;
        map.set(autoId, {
          id: autoId,
          name,
          mobile,
          city: 'Ajmer',
          occasion: '',
          balance: 0, // Positive = Customer owes Udhaari (₹), Negative = Showroom holds Customer Advance (₹)
          transactions: []
        });
      }
    });

    return Array.from(map.values());
  }, [customerLedger, invoices]);

  const persistCustomers = (nextList) => {
    if (setCustomerLedger) {
      setCustomerLedger(nextList);
    }
  };

  const handleAddCustomer = (e) => {
    e.preventDefault();
    const cleanName = custName.trim();
    if (!cleanName) return;

    const newCust = {
      id: `CUST-${Date.now()}`,
      name: cleanName,
      mobile: custMobile.trim(),
      city: custCity.trim() || 'Ajmer',
      occasion: custOccasion.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      balance: 0,
      transactions: []
    };

    const updated = [newCust, ...customers];
    persistCustomers(updated);
    setEntryCustomerId(newCust.id);
    setSelectedCustomerId(newCust.id);
    setCustName('');
    setCustMobile('');
    setCustOccasion('');
    showBanner(`Customer "${cleanName}" added to CRM Khata.`);
  };

  const handleRecordEntry = (e) => {
    e.preventDefault();
    const amt = parseFloat(entryAmount);
    if (!entryCustomerId || isNaN(amt) || amt <= 0) {
      return showBanner('Select a customer and enter a valid amount.');
    }

    const today = new Date().toISOString().slice(0, 10);
    const nextList = customers.map((c) => {
      if (c.id !== entryCustomerId) return c;

      let delta = 0;
      let label = '';
      if (entryType === 'udhaari_add') {
        delta = amt;
        label = 'Udhaari Added (+Balance Due)';
      } else if (entryType === 'payment_in') {
        delta = -amt;
        label = 'Payment Received (-Balance)';
      } else if (entryType === 'advance_add') {
        delta = -amt;
        label = 'Advance Deposited (Customer Credit)';
      } else if (entryType === 'advance_use') {
        delta = amt;
        label = 'Advance Adjusted / Settled';
      }

      const txn = {
        id: Date.now(),
        date: today,
        type: entryType,
        label,
        amount: amt,
        payMode: entryPayMode,
        note: entryNote.trim() || label,
        recordedBy: currentUser?.name || 'Staff'
      };

      const nextBal = Math.round(((Number(c.balance) || 0) + delta) * 100) / 100;
      return {
        ...c,
        balance: nextBal,
        transactions: [txn, ...(c.transactions || [])]
      };
    });

    persistCustomers(nextList);
    setEntryAmount('');
    setEntryNote('');
    showBanner('Khata ledger entry recorded and balance updated.');
  };

  const handleSendReminder = (cust) => {
    const bal = Number(cust.balance) || 0;
    const statusLine =
      bal > 0
        ? `Pending Udhaari Balance: *₹${bal.toLocaleString('en-IN')}*`
        : bal < 0
        ? `Available Advance Balance: *₹${Math.abs(bal).toLocaleString('en-IN')}*`
        : 'Account Balance: *₹0 (Settled)*';

    const msg =
      `*SWARNASETU JEWELLERS - KHATA STATEMENT*%0A` +
      `Customer: *${cust.name}*%0A` +
      `${statusLine}%0A` +
      `Thank you for your patronage!`;

    const digits = (cust.mobile || '').replace(/\D/g, '');
    const url =
      digits.length >= 10
        ? `https://wa.me/91${digits.slice(-10)}?text=${msg}`
        : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  if (!hasAccess) {
    return (
      <div className="bg-white p-8 rounded-2xl border text-center max-w-md mx-auto text-xs">
        <h3 className="text-sm font-bold text-slate-900">Access Restricted</h3>
        <p className="text-slate-500 mt-1">Ask Admin to enable CRM & Udhaari access in Payroll privileges.</p>
      </div>
    );
  }

  const totalUdhaari = customers
    .filter((c) => (Number(c.balance) || 0) > 0)
    .reduce((sum, c) => sum + Number(c.balance), 0);

  const totalAdvance = customers
    .filter((c) => (Number(c.balance) || 0) < 0)
    .reduce((sum, c) => sum + Math.abs(Number(c.balance)), 0);

  const filteredCustomers = customers.filter((c) => {
    const bal = Number(c.balance) || 0;
    const matchMode =
      filterMode === 'all' ||
      (filterMode === 'udhaari' && bal > 0) ||
      (filterMode === 'advance' && bal < 0);
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.mobile && c.mobile.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q));
    return matchMode && matchSearch;
  });

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId) || filteredCustomers[0] || null;

  return (
    <div className="space-y-4 text-xs">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex justify-between items-center">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      {/* Top Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Total Customers</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">{customers.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Total Udhaari Receivable</div>
          <div className="text-base font-bold text-red-700 mt-0.5">₹{totalUdhaari.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Customer Advances Held</div>
          <div className="text-base font-bold text-emerald-700 mt-0.5">₹{totalAdvance.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Udhaari Accounts</div>
          <div className="text-base font-bold text-amber-700 mt-0.5">
            {customers.filter((c) => (Number(c.balance) || 0) > 0).length} Active
          </div>
        </div>
      </div>

      {/* Left Column: Add Customer + Khata Entry */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <UserPlus size={15} className="text-emerald-600" /> Add Customer Profile
            </h3>
            <form onSubmit={handleAddCustomer} className="space-y-2.5">
              <input
                type="text"
                required
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="Customer Full Name *"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={custMobile}
                  onChange={(e) => setCustMobile(e.target.value)}
                  placeholder="Mobile (10-digit)"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={custCity}
                  onChange={(e) => setCustCity(e.target.value)}
                  placeholder="Area / City"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <input
                type="text"
                value={custOccasion}
                onChange={(e) => setCustOccasion(e.target.value)}
                placeholder="Birthday / Anniversary / Family Note"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
              <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">
                Save Customer
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Wallet size={15} className="text-amber-600" /> Record Udhaari / Payment / Advance
            </h3>
            <form onSubmit={handleRecordEntry} className="space-y-2.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Customer *</label>
                <select
                  required
                  value={entryCustomerId}
                  onChange={(e) => setEntryCustomerId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile || 'No Mobile'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Entry Type</label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="udhaari_add">Add Udhaari (+Due)</option>
                    <option value="payment_in">Payment Received (-Due)</option>
                    <option value="advance_add">Advance Received (+Credit)</option>
                    <option value="advance_use">Advance Adjusted</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Payment Mode</label>
                <select
                  value={entryPayMode}
                  onChange={(e) => setEntryPayMode(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                >
                  <option value="UPI / Bank">UPI / Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Old Gold Exchange">Old Gold Exchange</option>
                </select>
              </div>

              <input
                type="text"
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
                placeholder="Bill / Slip reference or note"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />

              <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">
                Update Khata Balance
              </button>
            </form>
          </div>
        </div>

        {/* Right 2 Columns: Customer Directory + Selected Ledger Detail */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen size={15} className="text-slate-700" /> Customer Khata Directory ({filteredCustomers.length})
              </h3>
              <div className="flex gap-1.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'udhaari', label: 'Udhaari Due' },
                  { id: 'advance', label: 'Advances' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFilterMode(m.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      filterMode === m.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer name, mobile, or area..."
                className="w-full bg-transparent outline-none"
              />
            </div>

            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {filteredCustomers.map((c) => {
                const bal = Number(c.balance) || 0;
                const isSelected = activeCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setEntryCustomerId(c.id);
                    }}
                    className={`py-2.5 px-2 rounded-lg cursor-pointer flex flex-wrap justify-between items-center gap-2 ${
                      isSelected ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-2">
                        {c.mobile && <span className="inline-flex items-center gap-0.5"><Phone size={10} /> {c.mobile}</span>}
                        <span>• {c.city || 'Ajmer'}</span>
                        {c.occasion && <span className="inline-flex items-center gap-0.5"><Calendar size={10} /> {c.occasion}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        {bal > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold">
                            Due: ₹{bal.toLocaleString('en-IN')}
                          </span>
                        ) : bal < 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                            Advance: ₹{Math.abs(bal).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            Settled (₹0)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendReminder(c);
                        }}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded inline-flex items-center gap-1"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredCustomers.length === 0 && (
                <div className="p-6 text-center text-slate-400">No customers match this filter.</div>
              )}
            </div>
          </div>

          {/* Selected Customer Passbook / History */}
          {activeCustomer && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2 pb-2.5 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{activeCustomer.name} — Khata Passbook</h4>
                  <p className="text-[11px] text-slate-500">
                    Mobile: <strong>{activeCustomer.mobile || '