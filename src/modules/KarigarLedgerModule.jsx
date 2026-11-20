import React, { useState, useMemo } from 'react';
import {
  Scale, UserPlus, ArrowUpRight, ArrowDownLeft,
  Wallet, CheckCircle2, X, PackageCheck, Send, Gem
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
  const [newKarigarSpecialty, setNewKarigarSpecialty] = useState('Gold, Silver & Stones');

  // STEP 1: Issue Metal + Diamonds/Stones Form
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [issueMetal, setIssueMetal] = useState('Gold');
  const [issuePurity, setIssuePurity] = useState('22K');
  const [issueTouch, setIssueTouch] = useState('91.6');
  const [issueWt, setIssueWt] = useState('100');
  const [stoneType, setStoneType] = useState('Diamond');
  const [stoneGivenCt, setStoneGivenCt] = useState('0');
  const [issueNote, setIssueNote] = useState('');

  // STEP 2: Receive Made Piece + Diamonds/Stones Taken & Difference Tally State
  const [selectedOpenIssueId, setSelectedOpenIssueId] = useState('');
  const [recvOrnamentWt, setRecvOrnamentWt] = useState('');
  const [recvScrapWt, setRecvScrapWt] = useState('0');
  const [recvTouchPct, setRecvTouchPct] = useState('');
  const [stoneTakenCt, setStoneTakenCt] = useState('0');
  const [stoneLossCt, setStoneLossCt] = useState('0');

  const [makingCalcMode, setMakingCalcMode] = useState('per_gram'); // 'per_gram' | 'percent' | 'flat'
  const [makingRateInput, setMakingRateInput] = useState('450');
  const [makingBasisWt, setMakingBasisWt] = useState('');
  const [closeOpenIssue, setCloseOpenIssue] = useState(true);
  const [recvRemarks, setRecvRemarks] = useState('');

  // Making Payout Form
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
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

  const openIssuesForKarigar = useMemo(() => {
    return entriesForKarigar.filter(
      (e) =>
        e.entryKind === 'issue' &&
        ((Number(e.remainingWt) || 0) > 0 || (Number(e.remainingStoneCt) || 0) > 0)
    );
  }, [entriesForKarigar]);

  const activeOpenIssue =
    openIssuesForKarigar.find((i) => String(i.id) === String(selectedOpenIssueId)) ||
    openIssuesForKarigar[0] ||
    null;

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

  // STEP 1: Issue Metal + Diamonds/Other Stones to Karigar
  const handleIssueMetalAndStones = (e) => {
    e.preventDefault();
    if (!activeKarigar) return showBanner('Select or add a Karigar first.');
    const wt = Math.max(0, parseFloat(issueWt) || 0);
    const sGiven = Math.max(0, parseFloat(stoneGivenCt) || 0);
    if (wt <= 0 && sGiven <= 0) {
      return showBanner('Enter Issued Metal Weight (g) or Diamond/Stone Weight (ct).');
    }

    const touch = Math.max(0, Math.min(100, parseFloat(issueTouch) || 0));
    const fineIssued = Math.round(wt * (touch / 100) * 1000) / 1000;

    const issueRow = {
      id: Date.now(),
      karigarId: activeKarigar.id,
      karigarName: activeKarigar.name,
      date: issueDate,
      entryKind: 'issue',
      metal: issueMetal,
      purity: issuePurity,
      touchPct: touch,
      issuedWt: wt,
      remainingWt: wt,
      fineWt: fineIssued,
      stoneType: stoneType.trim() || 'Diamond/Stone',
      stoneGivenCt: sGiven,
      remainingStoneCt: sGiven,
      makingChargeRs: 0,
      note:
        issueNote.trim() ||
        `Issued ${wt}g ${issuePurity} ${issueMetal}${sGiven > 0 ? ` + ${sGiven}ct ${stoneType}` : ''}`
    };

    setKarigarMetalEntries([issueRow, ...(karigarMetalEntries || [])]);
    setSelectedOpenIssueId(String(issueRow.id));
    setStoneGivenCt('0');
    setIssueNote('');
    showBanner(
      `Issued ${wt}g ${issueMetal}${sGiven > 0 ? ` & ${sGiven}ct ${stoneType}` : ''} to ${activeKarigar.name}.`
    );
  };

  // STEP 2 Live Calculations for Receive & Difference Tally (Metal + Stones)
  const effectiveTouch =
    recvTouchPct !== '' && !isNaN(parseFloat(recvTouchPct))
      ? Math.max(0, Math.min(100, parseFloat(recvTouchPct)))
      : activeOpenIssue
      ? Number(activeOpenIssue.touchPct) || 91.6
      : 91.6;

  const effectiveMetal = activeOpenIssue ? activeOpenIssue.metal : issueMetal;
  const effectivePurity = activeOpenIssue ? activeOpenIssue.purity : issuePurity;
  const effectiveStoneType = activeOpenIssue?.stoneType || stoneType || 'Diamond/Stone';

  const openRemainingG = activeOpenIssue ? Number(activeOpenIssue.remainingWt) || 0 : 0;
  const openRemainingStoneCt = activeOpenIssue ? Number(activeOpenIssue.remainingStoneCt) || 0 : 0;

  const madeOrnG = Math.max(0, parseFloat(recvOrnamentWt) || 0);
  const madeScrapG = Math.max(0, parseFloat(recvScrapWt) || 0);
  const totalRecvdG = Math.round((madeOrnG + madeScrapG) * 1000) / 1000;

  const sTaken = Math.max(0, parseFloat(stoneTakenCt) || 0);
  const sLoss = Math.max(0, parseFloat(stoneLossCt) || 0);
  const totalStoneAccountedCt = Math.round((sTaken + sLoss) * 1000) / 1000;
  const stoneDiffCt = activeOpenIssue
    ? Math.round((openRemainingStoneCt - totalStoneAccountedCt) * 1000) / 1000
    : 0;

  const diffAgainstIssueG = activeOpenIssue
    ? Math.round((openRemainingG - totalRecvdG) * 1000) / 1000
    : 0;

  const fineRecvdG = Math.round(totalRecvdG * (effectiveTouch / 100) * 1000) / 1000;
  const fineDiffG = activeOpenIssue
    ? Math.round((openRemainingG * ((Number(activeOpenIssue.touchPct) || 91.6) / 100) - fineRecvdG) * 1000) / 1000
    : 0;

  const metalRateForCalc =
    effectiveMetal === 'Silver'
      ? Number(liveRates?.silver) || 92
      : effectivePurity === '24K'
      ? Number(liveRates?.gold24) || 7850
      : effectivePurity === '18K'
      ? Number(liveRates?.gold18) || 5950
      : Number(liveRates?.gold22) || 7250;

  const basisWtVal =
    makingBasisWt !== '' && !isNaN(parseFloat(makingBasisWt))
      ? Math.max(0, parseFloat(makingBasisWt))
      : madeOrnG;
  const mRateVal = Math.max(0, parseFloat(makingRateInput) || 0);

  const calculatedMakingRs = useMemo(() => {
    if (makingCalcMode === 'flat') return Math.round(mRateVal * 100) / 100;
    if (makingCalcMode === 'percent') {
      return Math.round(basisWtVal * metalRateForCalc * (mRateVal / 100) * 100) / 100;
    }
    return Math.round(basisWtVal * mRateVal * 100) / 100;
  }, [makingCalcMode, mRateVal, basisWtVal, metalRateForCalc]);

  const handleReceiveAndTally = (e) => {
    e.preventDefault();
    if (!activeKarigar) return;
    if (totalRecvdG <= 0 && totalStoneAccountedCt <= 0 && calculatedMakingRs <= 0) {
      return showBanner('Enter Made Wt, Stone Taken Wt, or Making Charge.');
    }

    const today = new Date().toISOString().slice(0, 10);
    const lockedMetalDiff = closeOpenIssue ? diffAgainstIssueG : 0;
    const lockedStoneDiff = closeOpenIssue ? stoneDiffCt : 0;

    const receiveRow = {
      id: Date.now(),
      karigarId: activeKarigar.id,
      karigarName: activeKarigar.name,
      linkedIssueId: activeOpenIssue ? activeOpenIssue.id : null,
      date: today,
      entryKind: 'receive',
      metal: effectiveMetal,
      purity: effectivePurity,
      touchPct: effectiveTouch,
      ornamentWt: madeOrnG,
      scrapWt: madeScrapG,
      totalReturnedWt: totalRecvdG,
      fineWt: fineRecvdG,
      diffMetalWt: lockedMetalDiff,
      fineDiffWt: closeOpenIssue ? fineDiffG : 0,
      stoneType: effectiveStoneType,
      stoneTakenCt: sTaken,
      stoneLossCt: sLoss,
      stoneDiffCt: lockedStoneDiff,
      makingChargeRs: calculatedMakingRs,
      note:
        recvRemarks.trim() ||
        `Recvd ${madeOrnG}g made (${madeScrapG}g scrap)${sTaken > 0 ? ` + ${sTaken}ct ${effectiveStoneType}` : ''}`
    };

    const nextEntries = (karigarMetalEntries || []).map((item) => {
      if (!activeOpenIssue || item.id !== activeOpenIssue.id) return item;
      if (closeOpenIssue) {
        return { ...item, remainingWt: 0, remainingStoneCt: 0, closedDate: today };
      }
      const nextRemWt = Math.max(0, Math.round((Number(item.remainingWt) - totalRecvdG) * 1000) / 1000);
      const nextRemStone = Math.max(
        0,
        Math.round((Number(item.remainingStoneCt || 0) - totalStoneAccountedCt) * 1000) / 1000
      );
      return { ...item, remainingWt: nextRemWt, remainingStoneCt: nextRemStone };
    });

    setKarigarMetalEntries([receiveRow, ...nextEntries]);
    setRecvOrnamentWt('');
    setRecvScrapWt('0');
    setRecvTouchPct('');
    setStoneTakenCt('0');
    setStoneLossCt('0');
    setMakingBasisWt('');
    setRecvRemarks('');
    showBanner(
      `Tally saved • Metal Diff: ${lockedMetalDiff}g • Stone Diff: ${lockedStoneDiff}ct • Making: ₹${calculatedMakingRs.toLocaleString('en-IN')}.`
    );
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
      metal: issueMetal,
      purity: issuePurity,
      touchPct: 0,
      ornamentWt: 0,
      scrapWt: 0,
      totalReturnedWt: 0,
      fineWt: 0,
      diffMetalWt: 0,
      stoneTakenCt: 0,
      stoneLossCt: 0,
      stoneDiffCt: 0,
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

  const karigarSummary = useMemo(() => {
    const goldOpenWt =
      Math.round(
        entriesForKarigar
          .filter((e) => e.entryKind === 'issue' && e.metal === 'Gold')
          .reduce((s, e) => s + Number(e.remainingWt || 0), 0) * 1000
      ) / 1000;

    const silverOpenWt =
      Math.round(
        entriesForKarigar
          .filter((e) => e.entryKind === 'issue' && e.metal === 'Silver')
          .reduce((s, e) => s + Number(e.remainingWt || 0), 0) * 1000
      ) / 1000;

    const stoneOpenCt =
      Math.round(
        entriesForKarigar
          .filter((e) => e.entryKind === 'issue')
          .reduce((s, e) => s + Number(e.remainingStoneCt || 0), 0) * 1000
      ) / 1000;

    const stoneDiffTotalCt =
      Math.round(
        entriesForKarigar
          .filter((e) => e.entryKind === 'receive')
          .reduce((s, e) => s + Number(e.stoneDiffCt || 0), 0) * 1000
      ) / 1000;

    const goldMakingEarned =
      Math.round(
        entriesForKarigar
          .filter((e) => e.entryKind === 'receive' && e.metal === 'Gold')
          .reduce((s, e) => s + Number(e.makingChargeRs || 0), 0) * 100
      ) / 100;

    const silverMakingEarned =
      Math.round(
        entriesForKarigar
          .filter((e) => e.entryKind === 'receive' && e.metal === 'Silver')
          .reduce((s, e) => s + Number(e.makingChargeRs || 0), 0) * 100
      ) / 100;

    const totalMakingEarned = Math.round((goldMakingEarned + silverMakingEarned) * 100) / 100;
    const totalMakingPaid =
      Math.round(
        entriesForKarigar
          .filter((e) => e.entryKind === 'payout')
          .reduce((s, e) => s + Math.abs(Number(e.makingChargeRs || 0)), 0) * 100
      ) / 100;

    const pendingMakingDue = Math.round((totalMakingEarned - totalMakingPaid) * 100) / 100;

    return {
      goldOpenWt, silverOpenWt, stoneOpenCt, stoneDiffTotalCt,
      goldMakingEarned, silverMakingEarned, totalMakingEarned, totalMakingPaid, pendingMakingDue
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
          <span className="font-bold text-slate-900 text-sm">Karigar Metal, Stones & Making Ledger</span>
          <select
            value={activeKarigarId}
            onChange={(e) => {
              setSelectedKarigarId(e.target.value);
              setSelectedOpenIssueId('');
            }}
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
            <option value="Gold, Silver & Stones">Gold, Silver & Stones</option>
            <option value="Diamond & Stone Setting">Diamond & Stone Setting</option>
            <option value="Gold & Silver">Gold & Silver</option>
          </select>
          <button type="submit" className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg inline-flex items-center gap-1">
            <UserPlus size={13} /> Add Karigar
          </button>
        </form>
      </div>

      {/* Summary Cards: Gold, Silver, Diamonds/Stones, Making Due */}
      {activeKarigar && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-amber-800">GOLD & SILVER OPEN</div>
            <div className="text-sm font-bold text-slate-900">
              Gold: {karigarSummary.goldOpenWt}g • Silver: {karigarSummary.silverOpenWt}g
            </div>
            <div className="text-[11px] text-slate-600">
              Gold Making: <strong>₹{karigarSummary.goldMakingEarned.toLocaleString('en-IN')}</strong> • Silver: <strong>₹{karigarSummary.silverMakingEarned.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
              <Gem size={12} /> DIAMONDS & STONES
            </div>
            <div className="text-sm font-bold text-slate-900">Open With Karigar: {karigarSummary.stoneOpenCt} ct</div>
            <div className="text-[10px] text-slate-500">Tallied Stone Diff Total: <strong>{karigarSummary.stoneDiffTotalCt} ct</strong></div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] text-slate-500">Total Making Earned</div>
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
            <div className="text-[10px] text-slate-500">Open Issues: {openIssuesForKarigar.length}</div>
          </div>
        </div>
      )}

      {activeKarigar && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            {/* STEP 1: GIVE METAL + DIAMONDS/STONES */}
            <form onSubmit={handleIssueMetalAndStones} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <Send size={14} className="text-amber-600" /> Step 1: Give Metal & Stones to Karigar
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Metal</label>
                  <select
                    value={issueMetal}
                    onChange={(e) => {
                      const m = e.target.value;
                      setIssueMetal(m);
                      if (m === 'Silver') {
                        setIssuePurity('Silver');
                        setIssueTouch('99.9');
                        setMakingRateInput('80');
                      } else {
                        setIssuePurity('22K');
                        setIssueTouch('91.6');
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
                    value={issuePurity}
                    onChange={(e) => {
                      const p = e.target.value;
                      setIssuePurity(p);
                      if (DEFAULT_TOUCH_BY_PURITY[p] !== undefined) {
                        setIssueTouch(String(DEFAULT_TOUCH_BY_PURITY[p]));
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
                    value={issueTouch}
                    onChange={(e) => setIssueTouch(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Metal Given (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={issueWt}
                    onChange={(e) => setIssueWt(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Diamonds / Other Stones Given */}
              <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-2">
                <div className="font-bold text-rose-950 flex items-center gap-1">
                  <Gem size={13} /> Diamonds / Other Stones Given (Optional)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Stone / Diamond Type</label>
                    <input
                      type="text"
                      value={stoneType}
                      onChange={(e) => setStoneType(e.target.value)}
                      placeholder="Diamond, Ruby, Emerald..."
                      className="w-full px-2.5 py-1 bg-white border border-rose-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Stone Given (ct)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={stoneGivenCt}
                      onChange={(e) => setStoneGivenCt(e.target.value)}
                      placeholder="0.000"
                      className="w-full px-2.5 py-1 bg-white border border-rose-200 rounded-lg font-bold"
                    />
                  </div>
                </div>
              </div>

              <input
                type="text"
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                placeholder="Order / ornament note (e.g. Ring making)"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />

              <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg">
                Issue Metal & Stones to Karigar
              </button>
            </form>

            {/* STEP 2: RECEIVE MADE PIECE + STONES TAKEN & DIFFERENCE TALLY */}
            <form onSubmit={handleReceiveAndTally} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <PackageCheck size={15} className="text-emerald-600" /> Step 2: Receive Made Piece, Stones & Tally
              </h3>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Open Issue to Tally</label>
                <select
                  value={activeOpenIssue ? String(activeOpenIssue.id) : ''}
                  onChange={(e) => setSelectedOpenIssueId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold bg-slate-50"
                >
                  {openIssuesForKarigar.map((iss) => (
                    <option key={iss.id} value={String(iss.id)}>
                      {iss.date} • {iss.remainingWt}g {iss.metal}
                      {(Number(iss.remainingStoneCt) || 0) > 0 ? ` + ${iss.remainingStoneCt}ct ${iss.stoneType}` : ''} ({iss.note})
                    </option>
                  ))}
                  {openIssuesForKarigar.length === 0 && <option value="">No Open Issue (Direct Receive)</option>}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Made Wt (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={recvOrnamentWt}
                    onChange={(e) => {
                      setRecvOrnamentWt(e.target.value);
                      if (makingBasisWt === '') setMakingBasisWt(e.target.value);
                    }}
                    placeholder="0.000"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Scrap Wt (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={recvScrapWt}
                    onChange={(e) => setRecvScrapWt(e.target.value)}
                    placeholder="0.000"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Actual Touch %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={recvTouchPct}
                    onChange={(e) => setRecvTouchPct(e.target.value)}
                    placeholder={String(activeOpenIssue?.touchPct || 91.6)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* Diamonds / Stones Taken Back & Loss */}
              <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-2">
                <div className="font-bold text-rose-950 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Gem size={13} /> {effectiveStoneType} Taken Back</span>
                  <span className="text-[10px]">Open: {openRemainingStoneCt} ct</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Stone Taken (ct)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={stoneTakenCt}
                      onChange={(e) => setStoneTakenCt(e.target.value)}
                      placeholder="0.000"
                      className="w-full px-2.5 py-1 bg-white border border-rose-200 rounded-lg font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Stone Loss / Breakage (ct)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={stoneLossCt}
                      onChange={(e) => setStoneLossCt(e.target.value)}
                      placeholder="0.000"
                      className="w-full px-2.5 py-1 bg-white border border-rose-200 rounded-lg font-semibold text-red-700"
                    />
                  </div>
                </div>
              </div>

              {/* Making Charge Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">{effectiveMetal} Making Charges</div>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={makingCalcMode}
                    onChange={(e) => setMakingCalcMode(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="per_gram">₹ / Gram</option>
                    <option value="percent">% Metal</option>
                    <option value="flat">Flat ₹</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={makingRateInput}
                    onChange={(e) => setMakingRateInput(e.target.value)}
                    placeholder="Rate / % / ₹"
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                  <input
                    type="number"
                    step="0.001"
                    value={makingBasisWt}
                    onChange={(e) => setMakingBasisWt(e.target.value)}
                    placeholder="Basis g"
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="text-[11px] pt-1.5 border-t border-slate-200 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Metal Diff: <strong>{diffAgainstIssueG}g</strong></span>
                    <span>Stone Diff: <strong>{stoneDiffCt}ct</strong></span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Fine Diff: {fineDiffG}g</span>
                    <span className="text-emerald-700">Making: ₹{calculatedMakingRs.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={closeOpenIssue}
                  onChange={(e) => setCloseOpenIssue(e.target.checked)}
                />
                Close selected open issue & lock metal/stone differences
              </label>

              <input
                type="text"
                value={recvRemarks}
                onChange={(e) => setRecvRemarks(e.target.value)}
                placeholder="Receive / tally notes"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />

              <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">
                Save Receive & Difference Tally
              </button>
            </form>

            {/* Making Charge Payout Form */}
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
                placeholder="Payment note"
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

          {/* Right 2 Columns: Karigar Passbook */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{activeKarigar.name} — Metal, Stone & Making Log</h3>
                <p className="text-[11px] text-slate-500">Tracks metal (g), diamonds/stones (ct), purity/touch, differences & making charges</p>
              </div>
              <span className="text-[11px] text-slate-500">{entriesForKarigar.length} entries</span>
            </div>

            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-3">Date & Particulars</th>
                    <th className="p-3">Metal & Touch</th>
                    <th className="p-3">Metal Given/Recvd</th>
                    <th className="p-3">Stones (ct)</th>
                    <th className="p-3 text-right">Making / Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entriesForKarigar.map((row) => {
                    const isPayout = row.entryKind === 'payout';
                    const isIssue = row.entryKind === 'issue';
                    return (
                      <tr key={row.id}>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{row.note}</div>
                          <div className="text-[10px] text-slate-500">
                            {row.date} • {isIssue ? (row.remainingWt > 0 || row.remainingStoneCt > 0 ? 'Open Issue' : 'Tallied') : isPayout ? row.payMode : 'Receive Tally'}
                          </div>
                        </td>
                        <td className="p-3 font-semibold">
                          {row.metal} {row.touchPct ? `(${row.purity} • ${row.touchPct}%)` : ''}
                        </td>
                        <td className="p-3">
                          {isIssue
                            ? `${row.issuedWt}g (Open: ${row.remainingWt}g)`
                            : row.entryKind === 'receive'
                            ? `${row.totalReturnedWt}g (Diff: ${row.diffMetalWt}g)`
                            : '-'}
                        </td>
                        <td className="p-3 font-semibold text-rose-900">
                          {isIssue && (Number(row.stoneGivenCt) || 0) > 0
                            ? `Given: ${row.stoneGivenCt}ct (Open: ${row.remainingStoneCt}ct)`
                            : row.entryKind === 'receive' && ((Number(row.stoneTakenCt) || 0) > 0 || (Number(row.stoneLossCt) || 0) > 0)
                            ? `Taken: ${row.stoneTakenCt}ct • Diff: ${row.stoneDiffCt}ct`
                            : '-'}
                        </td>
                        <td className={`p-3 text-right font-bold ${isPayout ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {Number(row.makingChargeRs || 0) !== 0 ? (
                            <span className="inline-flex items-center gap-0.5">
                              {isPayout ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                              ₹{Math.abs(Number(row.makingChargeRs)).toLocaleString('en-IN')}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {entriesForKarigar.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        No metal, stone, or making entries for {activeKarigar.name} yet.
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
