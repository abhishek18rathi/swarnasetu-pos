import React, { useState, useMemo } from 'react';
import {
  Scale, UserPlus, ArrowUpRight, ArrowDownLeft,
  Wallet, CheckCircle2, X, Flame
} from 'lucide-react';

const DEFAULT_TOUCH_BY_PURITY = {
  '22K': 91.6,
  '18K': 75.0,
  '24K': 99.9,
  'Silver': 99.9
};

export default function KarigarLedgerModule({
  currentUser,
  liveRates,
  karigarList = [],
  setKarigarList,
  karigarMetalEntries = [],
  setKarigarMetalEntries,
  rojmelEntries = [],
  setRojmelEntries
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin;
  const hasAccess = isAdmin || !!currentUser?.privileges?.karigar_melter;

  const [banner, setBanner] = useState('');
  const [selectedKarigarId, setSelectedKarigarId] = useState('');

  // Add Karigar Form
  const [newKarigarName, setNewKarigarName] = useState('');
  const [newKarigarMobile, setNewKarigarMobile] = useState('');
  const [newKarigarSpecialty, setNewKarigarSpecialty] = useState('Gold & Silver');

  // Metal Issue & Return / Making Entry Form
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [metalType, setMetalType] = useState('Gold'); // 'Gold' | 'Silver'
  const [purityLabel, setPurityLabel] = useState('22K');
  const [touchPct, setTouchPct] = useState('91.6');
  const [issuedWt, setIssuedWt] = useState('100');
  const [returnedOrnamentWt, setReturnedOrnamentWt] = useState('10');
  const [returnedScrapWt, setReturnedScrapWt] = useState('0');
  const [markJobSettled, setMarkJobSettled] = useState(false);

  // Separate Making Charge Calculator (Gold & Silver tracked independently)
  const [makingCalcMode, setMakingCalcMode] = useState('per_gram'); // 'per_gram' | 'percent' | 'flat'
  const [makingRateInput, setMakingRateInput] = useState('450'); // ₹/g or % or flat ₹
  const [makingBasisWt, setMakingBasisWt] = useState('10'); // e.g. finished ornament weight (10g)
  const [jobNote, setJobNote] = useState('');

  // Karigar Making Payout Form
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash'); // 'Cash' | 'UPI / Bank' | 'Advance Adjust'
  const [payNote, setPayNote] = useState('');
  const [syncCashToRojmel, setSyncCashToRojmel] = useState(true);

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4500);
  };

  const activeKarigarId = selectedKarigarId || (karigarList[0]?.id ?? '');
  const activeKarigar = (karigarList || []).find((k) => k.id === activeKarigarId) || null;

  const entriesForKarigar = useMemo(() => {
    return (karigarMetalEntries || []).filter((e) => e.karigarId === activeKarigarId);
  }, [karigarMetalEntries, activeKarigarId]);

  if (!hasAccess) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center max-w-md mx-auto text-xs">
        <h3 className="text-sm font-bold text-slate-900">Access Restricted</h3>
        <p className="text-slate-500 mt-1">Ask Admin to enable "Karigar & Melter" privilege in Payroll.</p>
      </div>
    );
  }

  const handleAddKarigar = (e) => {
    e.preventDefault();
    if (!newKarigarName.trim()) return;
    const created = {
      id: `KGR-${Date.now()}`,
      name: newKarigarName.trim(),
      mobile: newKarigarMobile.trim(),
      specialty: newKarigarSpecialty
    };
    const nextList = [created, ...(karigarList || [])];
    setKarigarList(nextList);
    setSelectedKarigarId(created.id);
    setNewKarigarName('');
    setNewKarigarMobile('');
    showBanner(`Karigar "${created.name}" added.`);
  };

  // Live preview of current job entry
  const issuedG = Math.max(0, parseFloat(issuedWt) || 0);
  const ornG = Math.max(0, parseFloat(returnedOrnamentWt) || 0);
  const scrapG = Math.max(0, parseFloat(returnedScrapWt) || 0);
  const totalReturnedG = Math.round((ornG + scrapG) * 1000) / 1000;
  const balanceWithKarigarG = Math.round((issuedG - totalReturnedG) * 1000) / 1000;
  const touchVal = Math.max(0, Math.min(100, parseFloat(touchPct) || 0));
  const fineIssuedG = Math.round(issuedG * (touchVal / 100) * 1000) / 1000;
  const fineReturnedG = Math.round(totalReturnedG * (touchVal / 100) * 1000) / 1000;
  const diffMetalG = markJobSettled ? Math.round((issuedG - totalReturnedG) * 1000) / 1000 : 0;

  const metalRateForCalc =
    metalType === 'Silver'
      ? Number(liveRates?.silver) || 92
      : purityLabel === '24K'
      ? Number(liveRates?.gold24) || 7850
      : purityLabel === '18K'
      ? Number(liveRates?.gold18) || 5950
      : Number(liveRates?.gold22) || 7250;

  const basisG = Math.max(0, parseFloat(makingBasisWt) || ornG || 0);
  const mRateVal = Math.max(0, parseFloat(makingRateInput) || 0);

  const calculatedMakingRs = useMemo(() => {
    if (makingCalcMode === 'flat') return Math.round(mRateVal * 100) / 100;
    if (makingCalcMode === 'percent') {
      const metalAmt = basisG * metalRateForCalc;
      return Math.round(metalAmt * (mRateVal / 100) * 100) / 100;
    }
    return Math.round(basisG * mRateVal * 100) / 100;
  }, [makingCalcMode, mRateVal, basisG, metalRateForCalc]);

  const handleRecordJobEntry = (e) => {
    e.preventDefault();
    if (!activeKarigar) return showBanner('Select or add a Karigar first.');
    if (issuedG <= 0 && calculatedMakingRs <= 0) {
      return showBanner('Enter Issued Weight or Making Charge amount.');
    }

    const row = {
      id: Date.now(),
      karigarId: activeKarigar.id,
      karigarName: activeKarigar.name,
      date: entryDate,
      entryKind: 'job',
      metal: metalType,
      purity: purityLabel,
      touchPct: touchVal,
      issuedWt: issuedG,
      ornamentWt: ornG,
      scrapWt: scrapG,
      totalReturnedWt: totalReturnedG,
      balanceWithKarigarWt: markJobSettled ? 0 : balanceWithKarigarG,
      diffMetalWt: diffMetalG, // + means loss/shortage, - means gain/excess
      makingCalcMode,
      makingRateInput: mRateVal,
      makingBasisWt: basisG,
      makingChargeRs: calculatedMakingRs,
      note: jobNote.trim() || `${purityLabel} ${metalType} job (${ornG}g returned of ${issuedG}g issued)`
    };

    setKarigarMetalEntries([row, ...(karigarMetalEntries || [])]);
    setReturnedOrnamentWt('0');
    setReturnedScrapWt('0');
    setJobNote('');
    showBanner(`Recorded ${metalType} job for ${activeKarigar.name} • Making: ₹${calculatedMakingRs.toLocaleString('en-IN')}.`);
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!activeKarigar) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return showBanner('Enter a valid payout amount.');

    const today = new Date().toISOString().slice(0, 10);
    const payRow = {
      id: Date.now(),
      karigarId: activeKarigar.id,
      karigarName: activeKarigar.name,
      date: today,
      entryKind: 'payout',
      metal: metalType,
      purity: purityLabel,
      touchPct: touchVal,
      issuedWt: 0,
      ornamentWt: 0,
      scrapWt: 0,
      totalReturnedWt: 0,
      balanceWithKarigarWt: 0,
      diffMetalWt: 0,
      makingChargeRs: -amt,
      payMode,
      note: payNote.trim() || `Making payout (${payMode})`
    };

    setKarigarMetalEntries([payRow, ...(karigarMetalEntries || [])]);

    if (payMode === 'Cash' && syncCashToRojmel && setRojmelEntries) {
      setRojmelEntries([
        {
          id: Date.now() + 1,
          date: today,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'out',
          mode: 'Cash',
          category: 'Karigar Cash Labor (Majoori)',
          particulars: `${activeKarigar.name} — ${payRow.note}`,
          amount: amt,
          by: currentUser?.name || 'Admin'
        },
        ...(rojmelEntries || [])
      ]);
    }

    setPayAmount('');
    setPayNote('');
    showBanner(`Recorded ₹${amt.toLocaleString('en-IN')} making payment to ${activeKarigar.name}.`);
  };

  // Compute Gold & Silver totals for active Karigar
  const karigarSummary = useMemo(() => {
    const goldJobs = entriesForKarigar.filter((e) => e.entryKind === 'job' && e.metal === 'Gold');
    const silverJobs = entriesForKarigar.filter((e) => e.entryKind === 'job' && e.metal === 'Silver');

    const goldIssued = Math.round(goldJobs.reduce((s, e) => s + Number(e.issuedWt || 0), 0) * 1000) / 1000;
    const goldReturned = Math.round(goldJobs.reduce((s, e) => s + Number(e.totalReturnedWt || 0), 0) * 1000) / 1000;
    const goldBalWithKarigar = Math.round((goldIssued - goldReturned) * 1000) / 1000;
    const goldDiff = Math.round(goldJobs.reduce((s, e) => s + Number(e.diffMetalWt || 0), 0) * 1000) / 1000;
    const goldMakingTotal = Math.round(goldJobs.reduce((s, e) => s + Number(e.makingChargeRs || 0), 0) * 100) / 100;

    const silverIssued = Math.round(silverJobs.reduce((s, e) => s + Number(e.issuedWt || 0), 0) * 1000) / 1000;
    const silverReturned = Math.round(silverJobs.reduce((s, e) => s + Number(e.totalReturnedWt || 0), 0) * 1000) / 1000;
    const silverBalWithKarigar = Math.round((silverIssued - silverReturned) * 1000) / 1000;
    const silverDiff = Math.round(silverJobs.reduce((s, e) => s + Number(e.diffMetalWt || 0), 0) * 1000) / 1000;
    const silverMakingTotal = Math.round(silverJobs.reduce((s, e) => s + Number(e.makingChargeRs || 0), 0) * 100) / 100;

    const totalMakingEarned = Math.round((goldMakingTotal + silverMakingTotal) * 100) / 100;
    const totalMakingPaid = Math.round(
      entriesForKarigar
        .filter((e) => e.entryKind === 'payout')
        .reduce((s, e) => s + Math.abs(Number(e.makingChargeRs || 0)), 0) * 100
    ) / 100;
    const pendingMakingDue = Math.round((totalMakingEarned - totalMakingPaid) * 100) / 100;

    return {
      goldIssued, goldReturned, goldBalWithKarigar, goldDiff, goldMakingTotal,
      silverIssued, silverReturned, silverBalWithKarigar, silverDiff, silverMakingTotal,
      totalMakingEarned, totalMakingPaid, pendingMakingDue
    };
  }, [entriesForKarigar]);

  return (
    <div className="space-y-4 text-xs">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex justify-between items-center">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      {/* Karigar Selector & Quick Add */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Scale size={17} className="text-amber-600" />
          <span className="font-bold text-slate-900 text-sm">Karigar Gold/Silver & Making Ledger</span>
          <select
            value={activeKarigarId}
            onChange={(e) => setSelectedKarigarId(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold bg-slate-50"
          >
            {(karigarList || []).map((k) => (
              <option key={k.id} value={k.id}>{k.name} ({k.specialty || 'Karigar'})</option>
            ))}
            {(!karigarList || karigarList.length === 0) && <option value="">No Karigar Added Yet</option>}
          </select>
        </div>

        <form onSubmit={handleAddKarigar} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            required
            value={newKarigarName}
            onChange={(e) => setNewKarigarName(e.target.value)}
            placeholder="New Karigar Name"
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
          />
          <input
            type="tel"
            value={newKarigarMobile}
            onChange={(e) => setNewKarigarMobile(e.target.value)}
            placeholder="Mobile"
            className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-lg"
          />
          <select
            value={newKarigarSpecialty}
            onChange={(e) => setNewKarigarSpecialty(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg"
          >
            <option value="Gold & Silver">Gold & Silver</option>
            <option value="Gold Only">Gold Only</option>
            <option value="Silver Only">Silver Only</option>
          </select>
          <button type="submit" className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg inline-flex items-center gap-1">
            <UserPlus size={13} /> Add Karigar
          </button>
        </form>
      </div>

      {/* Separate Gold & Silver Summary Cards */}
      {activeKarigar && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-amber-800">GOLD ACCOUNT ({activeKarigar.name})</div>
            <div className="text-sm font-bold text-slate-900">With Karigar: {karigarSummary.goldBalWithKarigar} g</div>
            <div className="text-[10px] text-slate-500">
              Issued: {karigarSummary.goldIssued}g • Returned: {karigarSummary.goldReturned}g • Diff: {karigarSummary.goldDiff}g
            </div>
            <div className="text-[11px] font-semibold text-amber-900 pt-0.5">
              Gold Making Total: ₹{karigarSummary.goldMakingTotal.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-slate-700">SILVER ACCOUNT ({activeKarigar.name})</div>
            <div className="text-sm font-bold text-slate-900">With Karigar: {karigarSummary.silverBalWithKarigar} g</div>
            <div className="text-[10px] text-slate-500">
              Issued: {karigarSummary.silverIssued}g • Returned: {karigarSummary.silverReturned}g • Diff: {karigarSummary.silverDiff}g
            </div>
            <div className="text-[11px] font-semibold text-slate-800 pt-0.5">
              Silver Making Total: ₹{karigarSummary.silverMakingTotal.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] text-slate-500">Total Making Earned (Gold + Silver)</div>
            <div className="text-base font-bold text-slate-900">₹{karigarSummary.totalMakingEarned.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              Paid: ₹{karigarSummary.totalMakingPaid.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] text-slate-500">Pending Making Payable</div>
            <div className={`text-base font-bold ${karigarSummary.pendingMakingDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              ₹{karigarSummary.pendingMakingDue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500">Settle via Cash, UPI, or Advance below</div>
          </div>
        </div>
      )}

      {activeKarigar && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left Column: Issue/Return + Making Charge + Payment */}
          <div className="space-y-4">
            <form onSubmit={handleRecordJobEntry} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                Record Metal Issue / Return & Making
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Metal</label>
                  <select
                    value={metalType}
                    onChange={(e) => {
                      const m = e.target.value;
                      setMetalType(m);
                      if (m === 'Silver') {
                        setPurityLabel('Silver');
                        setTouchPct('99.9');
                        setMakingRateInput('80');
                      } else {
                        setPurityLabel('22K');
                        setTouchPct('91.6');
                        setMakingRateInput('450');
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Purity</label>
                  <select
                    value={purityLabel}
                    onChange={(e) => {
                      const p = e.target.value;
                      setPurityLabel(p);
                      if (DEFAULT_TOUCH_BY_PURITY[p] !== undefined) {
                        setTouchPct(String(DEFAULT_TOUCH_BY_PURITY[p]));
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="22K">22K</option>
                    <option value="18K">18K</option>
                    <option value="24K">24K</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Touch %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={touchPct}
                    onChange={(e) => setTouchPct(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Issued Wt (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={issuedWt}
                    onChange={(e) => setIssuedWt(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Ornament Ret (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={returnedOrnamentWt}
                    onChange={(e) => {
                      setReturnedOrnamentWt(e.target.value);
                      setMakingBasisWt(e.target.value);
                    }}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Scrap Ret (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={returnedScrapWt}
                    onChange={(e) => setReturnedScrapWt(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Making Charge Formula Bar */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="font-bold text-amber-950">{metalType} Making Charges</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Basis</label>
                    <select
                      value={makingCalcMode}
                      onChange={(e) => setMakingCalcMode(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg font-semibold"
                    >
                      <option value="per_gram">₹ / Gram</option>
                      <option value="percent">% of Metal</option>
                      <option value="flat">Flat ₹</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      {makingCalcMode === 'percent' ? 'Making %' : makingCalcMode === 'flat' ? 'Flat ₹' : 'Rate ₹/g'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={makingRateInput}
                      onChange={(e) => setMakingRateInput(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Piece Wt (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={makingBasisWt}
                      onChange={(e) => setMakingBasisWt(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg font-semibold"
                    />
                  </div>
                </div>
                <div className="text-[11px] font-bold text-slate-900 pt-1 border-t border-amber-200/70 flex justify-between">
                  <span>Fine Issued: {fineIssuedG}g • Fine Ret: {fineReturnedG}g</span>
                  <span className="text-emerald-800">Making: ₹{calculatedMakingRs.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                <span>Unreturned Balance: <strong>{balanceWithKarigarG} g</strong></span>
                <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markJobSettled}
                    onChange={(e) => setMarkJobSettled(e.target.checked)}
                  />
                  Close Job & Lock Diff ({balanceWithKarigarG}g)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={jobNote}
                  onChange={(e) => setJobNote(e.target.value)}
                  placeholder="Order / Ring / Slip note"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">
                Save Job & Making Entry
              </button>
            </form>

            {/* Record Making Payment to Karigar */}
            <form onSubmit={handleRecordPayment} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Wallet size={15} className="text-emerald-600" /> Pay Making Charges to Karigar
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`Due: ₹${Math.max(0, karigarSummary.pendingMakingDue)}`}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold"
                />
                <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold">
                  <option value="Cash">Cash Drawer</option>
                  <option value="UPI / Bank">UPI / Bank</option>
                  <option value="Advance Adjust">Advance Adjust</option>
                </select>
              </div>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Payment remarks"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
              {payMode === 'Cash' && (
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={syncCashToRojmel} onChange={(e) => setSyncCashToRojmel(e.target.checked)} />
                  Also record Cash Out in Accounts & Rojmel
                </label>
              )}
              <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">
                Record Making Payout
              </button>
            </form>
          </div>

          {/* Right 2 Columns: Karigar Passbook Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{activeKarigar.name} — Metal & Making Passbook</h3>
                <p className="text-[11px] text-slate-500">Tracks issued metal, returned weight, purity/touch, difference & making charges</p>
              </div>
              <span className="text-[11px] text-slate-500">{entriesForKarigar.length} entries</span>
            </div>

            <div className="overflow-x-auto max-h-[540px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-3">Date & Particulars</th>
                    <th className="p-3">Metal & Touch</th>
                    <th className="p-3">Issued / Ret</th>
                    <th className="p-3">Diff</th>
                    <th className="p-3 text-right">Making / Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entriesForKarigar.map((row) => {
                    const isPayout = row.entryKind === 'payout';
                    return (
                      <tr key={row.id}>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{row.note}</div>
                          <div className="text-[10px] text-slate-500">{row.date} • {isPayout ? row.payMode : 'Job Entry'}</div>
                        </td>
                        <td className="p-3 font-semibold">
                          {row.metal} ({row.purity} • {row.touchPct}%)
                        </td>
                        <td className="p-3">
                          {isPayout ? '-' : `${row.issuedWt}g / ${row.totalReturnedWt}g`}
                        </td>
                        <td className="p-3 font-semibold text-amber-900">
                          {!isPayout && row.diffMetalWt !== 0 ? `${row.diffMetalWt}g` : '-'}
                        </td>
                        <td className={`p-3 text-right font-bold ${isPayout ? 'text-emerald-700' : 'text-slate-900'}`}>
                          <span className="inline-flex items-center gap-0.5">
                            {isPayout ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                            ₹{Math.abs(Number(row.makingChargeRs || 0)).toLocaleString('en-IN')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {entriesForKarigar.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        No metal or making entries recorded for {activeKarigar.name} yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// END OF FILE
