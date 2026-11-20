import React, { useState, useMemo } from 'react';
import {
  Coins, CheckCircle2, X, Printer, MessageCircle,
  Flame, AlertTriangle, FileText
} from 'lucide-react';

export default function UrdModule({
  currentUser,
  liveRates,
  urdRecords = [],
  setUrdRecords,
  rojmelEntries = [],
  setRojmelEntries,
  melterJobs = [],
  setMelterJobs
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin;
  const hasAccess = isAdmin || !!currentUser?.privileges?.orders_b2b_urd;

  const [tab, setTab] = useState('intake'); // 'intake' | 'register'
  const [banner, setBanner] = useState('');

  // Customer & URD Intake Form State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  const [metal, setMetal] = useState('Gold'); // 'Gold' | 'Silver'
  const [itemDesc, setItemDesc] = useState('Old Gold Ornaments');
  const [grossWeight, setGrossWeight] = useState('');
  const [lossGrams, setLossGrams] = useState('0');
  const [testedTouchPct, setTestedTouchPct] = useState('84.0');
  const [ratePerGram, setRatePerGram] = useState('');
  const [settlementMode, setSettlementMode] = useState('Cash Payout'); // 'Cash Payout' | 'UPI / Bank' | 'Adjust in New Bill'
  const [postCashToRojmel, setPostCashToRojmel] = useState(true);
  const [sendToMelterQueue, setSendToMelterQueue] = useState(true);
  const [printVoucher, setPrintVoucher] = useState(null);

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4500);
  };

  if (!hasAccess) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center max-w-md mx-auto text-xs">
        <h3 className="text-sm font-bold text-slate-900">Access Restricted</h3>
        <p className="text-slate-500 mt-1">Ask Admin to enable "Orders / B2B / URD" privilege in Payroll.</p>
      </div>
    );
  }

  const defaultRate =
    metal === 'Silver'
      ? Number(liveRates?.silver) || 92
      : Number(liveRates?.gold24) || 7850;

  const activeRate = ratePerGram !== '' && !isNaN(parseFloat(ratePerGram))
    ? parseFloat(ratePerGram)
    : defaultRate;

  const gWt = parseFloat(grossWeight) || 0;
  const lossWt = Math.max(0, parseFloat(lossGrams) || 0);
  const netTestedWt = Math.max(0, Math.round((gWt - lossWt) * 1000) / 1000);
  const touchPct = Math.max(0, Math.min(100, parseFloat(testedTouchPct) || 0));
  const fineWt = Math.round(netTestedWt * (touchPct / 100) * 1000) / 1000;

  // Value calculated on equivalent fine weight (for Gold touch %) or tested weight (for Silver/custom rate)
  const payableAmount =
    metal === 'Gold'
      ? Math.round(fineWt * activeRate)
      : Math.round(netTestedWt * activeRate);

  const requiresPanAlert = payableAmount >= 200000 && !customerPan.trim();

  const handleSaveUrd = (e) => {
    e.preventDefault();
    if (!customerName.trim() || gWt <= 0) {
      return showBanner('Enter Customer Name and valid Gross Weight (g).');
    }

    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const voucherNo = `URD-${String((urdRecords || []).length + 501)}`;

    const record = {
      id: Date.now(),
      voucherNo,
      date: today,
      time: nowTime,
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      customerPan: customerPan.trim().toUpperCase(),
      metal,
      itemDesc: itemDesc.trim() || `Old ${metal}`,
      grossWeight: gWt,
      lossGrams: lossWt,
      netTestedWt,
      testedTouchPct: touchPct,
      fineWt,
      ratePerGram: activeRate,
      payableAmount,
      settlementMode,
      createdBy: currentUser?.name || 'Staff'
    };

    setUrdRecords([record, ...(urdRecords || [])]);

    // Optionally post cash payout to Accounts & Rojmel
    if (settlementMode === 'Cash Payout' && postCashToRojmel && setRojmelEntries && payableAmount > 0) {
      const rojmelRow = {
        id: Date.now() + 1,
        date: today,
        time: nowTime,
        type: 'out',
        mode: 'Cash',
        category: 'Old Gold (URD) Purchase',
        particulars: `${voucherNo} — ${record.customerName} (${record.grossWeight}g ${record.metal})`,
        amount: payableAmount,
        by: currentUser?.name || 'Staff'
      };
      setRojmelEntries([rojmelRow, ...(rojmelEntries || [])]);
    }

    // Optionally push raw URD lot straight into Melter & Silly queue
    if (sendToMelterQueue && setMelterJobs && netTestedWt > 0) {
      const melterLot = {
        id: Date.now() + 2,
        lotNo: `MLT-${voucherNo}`,
        date: today,
        metal: record.metal,
        sourceCode: record.voucherNo,
        sourceType: 'URD Old Metal',
        grossWeight: record.netTestedWt,
        expectedTouch: record.testedTouchPct,
        expectedFineWt: record.fineWt,
        status: 'Pending Melting',
        createdBy: currentUser?.name || 'Staff'
      };
      setMelterJobs([melterLot, ...(melterJobs || [])]);
    }

    setPrintVoucher(record);
    setCustomerName('');
    setCustomerMobile('');
    setCustomerPan('');
    setGrossWeight('');
    setLossGrams('0');
    setRatePerGram('');
    setTab('register');
    showBanner(`URD Voucher ${voucherNo} saved (₹${payableAmount.toLocaleString('en-IN')}).`);
  };

  const handleSendWhatsApp = (rec) => {
    const msg =
      `*SWARNASETU JEWELLERS - OLD GOLD (URD) VOUCHER*%0A` +
      `Voucher No: *${rec.voucherNo}*%0A` +
      `Date: ${rec.date}%0A` +
      `Customer: *${rec.customerName}*%0A` +
      `Item: ${rec.itemDesc} (${rec.metal})%0A` +
      `Gross Wt: ${rec.grossWeight}g | Loss: ${rec.lossGrams}g | Net Wt: *${rec.netTestedWt}g*%0A` +
      `Tested Touch: *${rec.testedTouchPct}%* (Fine: ${rec.fineWt}g)%0A` +
      `Rate: ₹${rec.ratePerGram}/g%0A` +
      `*Settlement Amount: ₹${rec.payableAmount.toLocaleString('en-IN')}* (${rec.settlementMode})%0A` +
      `Thank you!`;

    const digits = (rec.customerMobile || '').replace(/\D/g, '');
    const url =
      digits.length >= 10
        ? `https://wa.me/91${digits.slice(-10)}?text=${msg}`
        : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const summary = useMemo(() => {
    const list = urdRecords || [];
    const totalGoldGross = Math.round(list.filter((r) => r.metal === 'Gold').reduce((s, r) => s + Number(r.grossWeight || 0), 0) * 1000) / 1000;
    const totalSilverGross = Math.round(list.filter((r) => r.metal === 'Silver').reduce((s, r) => s + Number(r.grossWeight || 0), 0) * 1000) / 1000;
    const totalFineGold = Math.round(list.filter((r) => r.metal === 'Gold').reduce((s, r) => s + Number(r.fineWt || 0), 0) * 1000) / 1000;
    const totalPayout = list.reduce((s, r) => s + Number(r.payableAmount || 0), 0);
    return { totalGoldGross, totalSilverGross, totalFineGold, totalPayout };
  }, [urdRecords]);

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
          <div className="text-[11px] text-slate-500">Old Gold Intake (Gross)</div>
          <div className="text-base font-bold text-amber-800 mt-0.5">{summary.totalGoldGross} g</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Fine Gold Equivalent</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">{summary.totalFineGold} g</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Old Silver Intake (Gross)</div>
          <div className="text-base font-bold text-slate-700 mt-0.5">{summary.totalSilverGross} g</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500">Total URD Value Settled</div>
          <div className="text-base font-bold text-emerald-700 mt-0.5">₹{summary.totalPayout.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setTab('intake')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
            tab === 'intake' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Coins size={14} /> 1. New Old Gold / URD Entry
        </button>
        <button
          onClick={() => setTab('register')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
            tab === 'register' ? 'bg-yellow-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText size={14} /> 2. URD Purchase Register ({(urdRecords || []).length})
        </button>
      </div>

      {/* TAB 1: NEW URD INTAKE & CALCULATOR */}
      {tab === 'intake' && (
        <form onSubmit={handleSaveUrd} className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Old Jewelry Purchase / Exchange & Purity Testing
            </h3>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">PAN Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={customerPan}
                  onChange={(e) => setCustomerPan(e.target.value)}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Metal Type</label>
                <select
                  value={metal}
                  onChange={(e) => {
                    const m = e.target.value;
                    setMetal(m);
                    setRatePerGram('');
                    setItemDesc(m === 'Silver' ? 'Old Silver Ornaments' : 'Old Gold Ornaments');
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Item Description</label>
                <input
                  type="text"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Chain, Bangles, Payal..."
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Gross Weight (g) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  placeholder="0.000"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Stone / Melting Loss (g)</label>
                <input
                  type="number"
                  step="0.001"
                  value={lossGrams}
                  onChange={(e) => setLossGrams(e.target.value)}
                  placeholder="0.000"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-red-700 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Tested Touch / Purity (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={testedTouchPct}
                  onChange={(e) => setTestedTouchPct(e.target.value)}
                  placeholder="e.g. 84.0"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Rate (₹/g) {metal === 'Gold' ? '[24K Ref]' : '[Silver Ref]'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ratePerGram}
                  onChange={(e) => setRatePerGram(e.target.value)}
                  placeholder={String(defaultRate)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">Settlement Mode</label>
                <select
                  value={settlementMode}
                  onChange={(e) => setSettlementMode(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="Cash Payout">Cash Payout to Customer</option>
                  <option value="UPI / Bank">UPI / Bank Transfer</option>
                  <option value="Adjust in New Bill">Adjust Against New Jewelry Purchase</option>
                </select>
              </div>
            </div>

            {/* Post-Intake Automation Options */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap gap-5 text-[11px]">
              {settlementMode === 'Cash Payout' && (
                <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postCashToRojmel}
                    onChange={(e) => setPostCashToRojmel(e.target.checked)}
                  />
                  Auto-record Cash Out in Daily Rojmel
                </label>
              )}
              <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendToMelterQueue}
                  onChange={(e) => setSendToMelterQueue(e.target.checked)}
                />
                <Flame size={13} className="text-amber-600" /> Send tested weight ({netTestedWt}g) to Melter & Silly Queue
              </label>
            </div>

            {requiresPanAlert && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-2 text-[11px] font-semibold">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                High-value transaction (₹{payableAmount.toLocaleString('en-IN')}): consider capturing Customer PAN before payout.
              </div>
            )}
          </div>

          {/* Right Column: Live URD Valuation Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              URD Valuation Summary
            </h3>

            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Gross Weight:</span>
                <strong>{gWt.toFixed(3)} g</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Less Melting/Stone Loss:</span>
                <strong className="text-red-700">- {lossWt.toFixed(3)} g</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Net Tested Weight:</span>
                <strong>{netTestedWt.toFixed(3)} g</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tested Touch ({touchPct}%):</span>
                <strong className="text-amber-900">Fine: {fineWt.toFixed(3)} g</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Applied Rate:</span>
                <strong>₹{activeRate.toLocaleString('en-IN')} / g</strong>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-amber-200">
                <span>Total URD Value:</span>
                <span className="text-emerald-700">₹{payableAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
            >
              Save URD Voucher & Print Receipt
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: URD PURCHASE REGISTER */}
      {tab === 'register' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-sm">
            Old Gold & Silver (URD) Register ({(urdRecords || []).length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-3">Voucher</th>
                  <th className="p-3">Date & Customer</th>
                  <th className="p-3">Metal & Wt</th>
                  <th className="p-3">Touch / Fine</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(urdRecords || []).map((rec) => (
                  <tr key={rec.id}>
                    <td className="p-3 font-bold text-slate-900">{rec.voucherNo}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{rec.customerName}</div>
                      <div className="text-[10px] text-slate-500">{rec.date} • {rec.settlementMode}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">{rec.metal} ({rec.itemDesc})</div>
                      <div className="text-[10px] text-slate-500">Gross: {rec.grossWeight}g • Net: {rec.netTestedWt}g</div>
                    </td>
                    <td className="p-3 font-semibold text-amber-900">
                      {rec.testedTouchPct}% ({rec.fineWt}g)
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      ₹{Number(rec.payableAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setPrintVoucher(rec)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-md inline-flex items-center gap-1"
                      >
                        <Printer size={12} /> Voucher
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(rec)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-md inline-flex items-center gap-1"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
                {(!urdRecords || urdRecords.length === 0) && (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">No URD old gold records yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable URD Voucher Modal */}
      {printVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b print:hidden">
              <span className="font-bold text-slate-900">URD Old Gold Purchase Voucher</span>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-3 py-1 bg-slate-900 text-white rounded-lg font-semibold inline-flex items-center gap-1">
                  <Printer size={12} /> Print
                </button>
                <button onClick={() => setPrintVoucher(null)} className="px-3 py-1 bg-slate-100 rounded-lg font-semibold">
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-slate-400 rounded-xl space-y-2">
              <div className="text-center border-b pb-2">
                <div className="font-bold text-sm text-slate-900">SWARNASETU JEWELLERS</div>
                <div className="text-[11px] text-slate-500">Old Gold / Silver Purchase & Testing Slip</div>
              </div>
              <div className="flex justify-between">
                <span>Voucher: <strong>{printVoucher.voucherNo}</strong></span>
                <span>Date: <strong>{printVoucher.date}</strong></span>
              </div>
              <div>Seller: <strong>{printVoucher.customerName}</strong> ({printVoucher.customerMobile || 'N/A'})</div>
              {printVoucher.customerPan && <div>PAN: <strong className="font-mono">{printVoucher.customerPan}</strong></div>}
              <div>Ornament: <strong>{printVoucher.metal} — {printVoucher.itemDesc}</strong></div>
              <div>Gross Wt: <strong>{printVoucher.grossWeight}g</strong> | Loss: <strong>{printVoucher.lossGrams}g</strong> | Net: <strong>{printVoucher.netTestedWt}g</strong></div>
              <div>Touch: <strong>{printVoucher.testedTouchPct}%</strong> | Fine Wt: <strong>{printVoucher.fineWt}g</strong> @ ₹{printVoucher.ratePerGram}/g</div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t">
                <span>Settled Amount ({printVoucher.settlementMode}):</span>
                <span>₹{printVoucher.payableAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// END OF FILE
