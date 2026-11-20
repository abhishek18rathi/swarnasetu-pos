import React, { useState, useMemo } from 'react';
import {
  Wallet, PlusCircle, MinusCircle, CheckCircle2, X,
  Calendar, ArrowDownLeft, ArrowUpRight, Lock, Calculator
} from 'lucide-react';

const EXPENSE_HEADS = [
  'Showroom Tea / Hospitality',
  'Karigar Cash Labor (Majoori)',
  'Packing Boxes / Pouches / Tags',
  'Electricity / Internet / Rent',
  'Courier / Security / Transport',
  'Staff Advance / Misc Expense'
];

export default function AccountsRojmelModule({
  currentUser,
  rojmelEntries = [],
  setRojmelEntries,
  openingCashMap = {},
  setOpeningCashMap,
  dayLocks = {},
  setDayLocks,
  invoices = [],
  customerLedger = []
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin;
  const hasAccess = isAdmin || !!currentUser?.privileges?.accounts_rojmel;

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [banner, setBanner] = useState('');

  // Manual Voucher Form
  const [voucherType, setVoucherType] = useState('out'); // 'in' (Jama) | 'out' (Naam)
  const [payMode, setPayMode] = useState('Cash'); // 'Cash' | 'UPI / Bank'
  const [category, setCategory] = useState(EXPENSE_HEADS[0]);
  const [particulars, setParticulars] = useState('');
  const [amount, setAmount] = useState('');

  // Opening & Closing Drawer Check
  const [openingInput, setOpeningInput] = useState('');
  const [physicalDrawerInput, setPhysicalDrawerInput] = useState('');

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4000);
  };

  const isDayLocked = !!(dayLocks && dayLocks[selectedDate]?.locked);
  const openingCash = Number((openingCashMap && openingCashMap[selectedDate]) || 0);

  // Combine Auto-Synced Sales/CRM entries with Manual Rojmel entries for selectedDate
  const dayTransactions = useMemo(() => {
    const list = [];

    // 1. Auto-pull GST Invoices for selectedDate
    (invoices || []).forEach((inv) => {
      if (inv.date !== selectedDate) return;
      const isCash = (inv.paymentMode || '').toLowerCase().includes('cash') && !(inv.paymentMode || '').toLowerCase().includes('upi');
      list.push({
        id: `INV-${inv.id}`,
        time: inv.time || '',
        source: 'Auto: GST Bill',
        type: 'in',
        mode: isCash ? 'Cash' : 'UPI / Bank',
        category: 'Jewelry Sale',
        particulars: `${inv.invoiceNo} — ${inv.customerName} (${inv.paymentMode})`,
        amount: Number(inv.grandTotal) || 0,
        by: inv.cashierName || 'Billing'
      });
    });

    // 2. Auto-pull CRM Khata cash/UPI receipts for selectedDate
    (customerLedger || []).forEach((cust) => {
      (cust.transactions || []).forEach((t) => {
        if (t.date !== selectedDate) return;
        if (t.type === 'payment_in' || t.type === 'advance_add') {
          const isCash = (t.payMode || '').toLowerCase() === 'cash';
          list.push({
            id: `CRM-${t.id}`,
            time: '',
            source: 'Auto: Khata',
            type: 'in',
            mode: isCash ? 'Cash' : 'UPI / Bank',
            category: t.type === 'advance_add' ? 'Customer Advance' : 'Udhaari Recovery',
            particulars: `${cust.name} — ${t.note || t.label}`,
            amount: Number(t.amount) || 0,
            by: t.recordedBy || 'CRM'
          });
        }
      });
    });

    // 3. Manual Rojmel entries for selectedDate
    (rojmelEntries || []).forEach((entry) => {
      if (entry.date !== selectedDate) return;
      list.push({
        ...entry,
        source: 'Manual Voucher'
      });
    });

    return list;
  }, [invoices, customerLedger, rojmelEntries, selectedDate]);

  if (!hasAccess) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center max-w-md mx-auto text-xs">
        <h3 className="text-sm font-bold text-slate-900">Access Restricted</h3>
        <p className="text-slate-500 mt-1">Ask Admin to enable "Accounts & Rojmel" access in Payroll privileges.</p>
      </div>
    );
  }

  const cashIn = dayTransactions
    .filter((t) => t.type === 'in' && t.mode === 'Cash')
    .reduce((s, t) => s + t.amount, 0);

  const cashOut = dayTransactions
    .filter((t) => t.type === 'out' && t.mode === 'Cash')
    .reduce((s, t) => s + t.amount, 0);

  const bankIn = dayTransactions
    .filter((t) => t.type === 'in' && t.mode !== 'Cash')
    .reduce((s, t) => s + t.amount, 0);

  const bankOut = dayTransactions
    .filter((t) => t.type === 'out' && t.mode !== 'Cash')
    .reduce((s, t) => s + t.amount, 0);

  const expectedClosingCash = Math.round((openingCash + cashIn - cashOut) * 100) / 100;
  const netBankDay = Math.round((bankIn - bankOut) * 100) / 100;

  const handleSaveOpening = (e) => {
    e.preventDefault();
    if (isDayLocked) return;
    const val = parseFloat(openingInput);
    if (isNaN(val) || val < 0) return showBanner('Enter valid Opening Cash amount.');
    setOpeningCashMap({ ...(openingCashMap || {}), [selectedDate]: val });
    setOpeningInput('');
    showBanner(`Opening Cash for ${selectedDate} set to ₹${val.toLocaleString('en-IN')}.`);
  };

  const handleAddVoucher = (e) => {
    e.preventDefault();
    if (isDayLocked) return showBanner('This date is locked. Unlock first to edit.');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return showBanner('Enter a valid amount.');

    const newEntry = {
      id: Date.now(),
      date: selectedDate,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: voucherType,
      mode: payMode,
      category: voucherType === 'out' ? category : 'Misc Receipt',
      particulars: particulars.trim() || (voucherType === 'out' ? category : 'Cash/Bank Receipt'),
      amount: amt,
      by: currentUser?.name || 'Staff'
    };

    setRojmelEntries([newEntry, ...(rojmelEntries || [])]);
    setParticulars('');
    setAmount('');
    showBanner(`${voucherType === 'in' ? 'Jama (Receipt)' : 'Naam (Expense)'} of ₹${amt.toLocaleString('en-IN')} recorded.`);
  };

  const handleLockDay = (e) => {
    e.preventDefault();
    const counted = parseFloat(physicalDrawerInput);
    if (isNaN(counted) || counted < 0) return showBanner('Enter actual counted cash in drawer.');
    const diff = Math.round((counted - expectedClosingCash) * 100) / 100;

    setDayLocks({
      ...(dayLocks || {}),
      [selectedDate]: {
        locked: true,
        expectedCash: expectedClosingCash,
        countedCash: counted,
        difference: diff,
        closedBy: currentUser?.name || 'Admin',
        closedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });
    setPhysicalDrawerInput('');
    showBanner(`Rojmel closed & locked for ${selectedDate}.`);
  };

  const handleUnlockDay = () => {
    if (!isAdmin) return;
    const copy = { ...(dayLocks || {}) };
    delete copy[selectedDate];
    setDayLocks(copy);
    showBanner(`Rojmel unlocked for ${selectedDate}.`);
  };

  // Running cash balance calculation for table display
  let runningCash = openingCash;
  const rowsWithRunning = [...dayTransactions].reverse().map((row) => {
    if (row.mode === 'Cash') {
      runningCash += row.type === 'in' ? row.amount : -row.amount;
    }
    return { ...row, runningCash: Math.round(runningCash * 100) / 100 };
  }).reverse();

  const lockInfo = dayLocks && dayLocks[selectedDate];

  return (
    <div className="space-y-4 text-xs">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex justify-between items-center">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      {/* Date Header & Opening Cash Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Calendar size={16} className="text-purple-600" />
          <span className="font-bold text-slate-900 text-sm">Daily Rojmel & Cash Book</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg font-semibold bg-slate-50"
          />
          {isDayLocked && (
            <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white font-bold text-[10px] inline-flex items-center gap-1">
              <Lock size={11} /> Day Closed & Locked
            </span>
          )}
        </div>

        {!isDayLocked ? (
          <form onSubmit={handleSaveOpening} className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">
              Opening Drawer Cash: <strong className="text-slate-900">₹{openingCash.toLocaleString('en-IN')}</strong>
            </span>
            <input
              type="number"
              step="1"
              value={openingInput}
              onChange={(e) => setOpeningInput(e.target.value)}
              placeholder="Set Opening ₹"
              className="w-32 px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
            />
            <button type="submit" className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg">
              Update
            </button>
          </form>
        ) : (
          isAdmin && (
            <button onClick={handleUnlockDay} className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 font-semibold rounded-lg">
              Unlock Day (Admin)
            </button>
          )
        )}
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Cash In (Jama)</div>
          <div className="text-base font-bold text-emerald-700 mt-0.5">+ ₹{cashIn.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Cash Out (Expenses)</div>
          <div className="text-base font-bold text-red-700 mt-0.5">- ₹{cashOut.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Expected Drawer Cash</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">₹{expectedClosingCash.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Net UPI / Bank Collection</div>
          <div className="text-base font-bold text-indigo-700 mt-0.5">₹{netBankDay.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left Column: Manual Voucher + Evening Drawer Closing */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Wallet size={15} className="text-purple-600" /> New Rojmel Entry
            </h3>

            <form onSubmit={handleAddVoucher} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVoucherType('out')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1 border ${
                    voucherType === 'out' ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <MinusCircle size={13} /> Expense / Paid
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherType('in')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1 border ${
                    voucherType === 'in' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <PlusCircle size={13} /> Receipt / Jama
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Mode</label>
                  <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold">
                    <option value="Cash">Cash Drawer</option>
                    <option value="UPI / Bank">UPI / Bank</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={isDayLocked}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              {voucherType === 'out' && (
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Expense Head</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                    {EXPENSE_HEADS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Details / Narration *</label>
                <input
                  type="text"
                  required
                  disabled={isDayLocked}
                  value={particulars}
                  onChange={(e) => setParticulars(e.target.value)}
                  placeholder="e.g. Velvet ring boxes from Naya Bazar"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={isDayLocked}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-lg"
              >
                Save Rojmel Voucher
              </button>
            </form>
          </div>

          {/* Evening Cash Box Reconciliation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calculator size={15} className="text-amber-600" /> Evening Cash Box Tally
            </h3>

            {lockInfo?.locked ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">System Cash:</span>
                  <strong>₹{lockInfo.expectedCash.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Physical Counted:</span>
                  <strong>₹{lockInfo.countedCash.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-bold">Difference:</span>
                  <strong className={lockInfo.difference === 0 ? 'text-emerald-700' : 'text-red-700'}>
                    {lockInfo.difference === 0 ? 'Matched (₹0)' : `₹${lockInfo.difference.toLocaleString('en-IN')}`}
                  </strong>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Closed by {lockInfo.closedBy} at {lockInfo.closedAt}
                </div>
              </div>
            ) : (
              <form onSubmit={handleLockDay} className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900">
                  Expected Physical Cash in Drawer: <strong>₹{expectedClosingCash.toLocaleString('en-IN')}</strong>
                </div>
                <input
                  type="number"
                  step="1"
                  required
                  value={physicalDrawerInput}
                  onChange={(e) => setPhysicalDrawerInput(e.target.value)}
                  placeholder="Enter counted notes/coins total ₹"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold"
                />
                <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg">
                  Verify & Close Day Rojmel
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Full Day Rojmel Register */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rojmel Register — {selectedDate} ({rowsWithRunning.length} entries)</h3>
              <p className="text-[11px] text-slate-500">Auto-includes GST Invoices & Khata payments alongside manual vouchers</p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              Opening Cash: ₹{openingCash.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-3">Particulars</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Jama (In)</th>
                  <th className="p-3 text-right">Naam (Out)</th>
                  <th className="p-3 text-right">Cash Bal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rowsWithRunning.map((row) => (
                  <tr key={row.id}>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{row.particulars}</div>
                      <div className="text-[10px] text-slate-500">
                        {row.source} • {row.category} {row.time ? `• ${row.time}` : ''}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.mode === 'Cash' ? 'bg-amber-50 text-amber-800' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {row.mode}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      {row.type === 'in' ? (
                        <span className="inline-flex items-center gap-0.5">
                          <ArrowDownLeft size={12} /> ₹{row.amount.toLocaleString('en-IN')}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-red-700">
                      {row.type === 'out' ? (
                        <span className="inline-flex items-center gap-0.5">
                          <ArrowUpRight size={12} /> ₹{row.amount.toLocaleString('en-IN')}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ₹{row.runningCash.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}

                {rowsWithRunning.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      No cash or bank transactions recorded for {selectedDate} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
// END OF FILE
