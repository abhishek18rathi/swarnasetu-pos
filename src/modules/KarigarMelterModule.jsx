import React, { useState } from 'react';
import {
  Flame, Hammer, Wrench, CheckCircle2, X,
  Printer, UserPlus, Sparkles
} from 'lucide-react';

export default function KarigarMelterModule({
  currentUser,
  inventoryItems = [],
  setInventoryItems,
  melterJobs = [],
  setMelterJobs,
  karigarList = [],
  setKarigarList,
  karigarLedger = [],
  setKarigarLedger,
  repairJobs = [],
  setRepairJobs
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin;
  const hasAccess = isAdmin || !!currentUser?.privileges?.karigar_melter;

  const [tab, setTab] = useState('melter');
  const [banner, setBanner] = useState('');

  const [returningMeltId, setReturningMeltId] = useState(null);
  const [sillyWtInput, setSillyWtInput] = useState('');
  const [purityInput, setPurityInput] = useState('91.6');

  const [karigarSubTab, setKarigarSubTab] = useState('issue');
  const [selectedKarigarFilter, setSelectedKarigarFilter] = useState('All');

  const [printRepairSlip, setPrintRepairSlip] = useState(null);

  const [completingAlterId, setCompletingAlterId] = useState(null);
  const [newGrossInput, setNewGrossInput] = useState('');
  const [newNetInput, setNewNetInput] = useState('');
  const [alterPurityInput, setAlterPurityInput] = useState('91.6');
  const [alterLaborInput, setAlterLaborInput] = useState('150');
  const [metalSourceMode, setMetalSourceMode] = useState('karigar');

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 5000);
  };

  if (!hasAccess) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center max-w-md mx-auto text-xs">
        <h3 className="text-sm font-bold text-slate-900">Access Restricted</h3>
        <p className="text-slate-500 mt-1">Ask Admin to enable "Karigar & Melter Access" in Payroll privileges.</p>
      </div>
    );
  }

  const handleSendToMelter = (e) => {
    e.preventDefault();
    const f = e.target;
    const oldWt = parseFloat(f.oldWeight.value) || 0;
    if (oldWt <= 0) return;

    const newJob = {
      id: Date.now(),
      lotNo: `MLT-${String(melterJobs.length + 101)}`,
      dateOut: new Date().toISOString().slice(0, 10),
      melterName: f.melterName.value.trim(),
      metal: f.metal.value,
      sourceRef: f.sourceRef.value.trim() || 'Old Customer Exchange',
      oldWeight: oldWt,
      status: 'melting',
      sillyWeight: 0,
      purityPercent: 0,
      meltingLoss: 0,
      fineWeight: 0,
      dateReturned: ''
    };

    setMelterJobs([newJob, ...melterJobs]);
    f.reset();
    showBanner(`Lot ${newJob.lotNo} (${oldWt}g) sent to Melter ${newJob.melterName}.`);
  };

  const handleCompleteSillyReturn = (job) => {
    const sillyWt = parseFloat(sillyWtInput);
    const purity = parseFloat(purityInput);
    if (isNaN(sillyWt) || sillyWt <= 0 || isNaN(purity) || purity <= 0 || purity > 100) {
      showBanner('Enter valid Silly weight and Purity % (1 to 100).');
      return;
    }

    const loss = Math.round((job.oldWeight - sillyWt) * 1000) / 1000;
    const fine = Math.round(sillyWt * (purity / 100) * 1000) / 1000;

    setMelterJobs(melterJobs.map(m =>
      m.id === job.id
        ? { ...m, status: 'completed', sillyWeight: sillyWt, purityPercent: purity, meltingLoss: loss, fineWeight: fine, dateReturned: new Date().toISOString().slice(0, 10) }
        : m
    ));

    setReturningMeltId(null);
    setSillyWtInput('');
    showBanner(`Silly recorded for ${job.lotNo}! Fine ${job.metal}: ${fine}g (Loss: ${loss}g).`);
  };

  const handleAddKarigar = (e) => {
    e.preventDefault();
    const f = e.target;
    const name = f.kName.value.trim();
    if (!name) return;

    const newK = {
      id: `KRG-${Date.now()}`,
      name,
      mobile: f.kMobile.value.trim(),
      specialty: f.kSpecialty.value.trim() || 'Gold & Diamond Work'
    };
    setKarigarList([...karigarList, newK]);
    f.reset();
    showBanner(`Karigar "${name}" added.`);
  };

  const handleIssueMetalToKarigar = (e) => {
    e.preventDefault();
    const f = e.target;
    const kId = f.karigarId.value;
    const karigar = karigarList.find(k => k.id === kId);
    if (!karigar) return showBanner('Please select a Karigar first.');

    const rawWt = parseFloat(f.issueWt.value) || 0;
    const purity = parseFloat(f.issuePurity.value) || 100;
    const fineWt = Math.round(rawWt * (purity / 100) * 1000) / 1000;

    const entry = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      type: 'issue',
      karigarId: karigar.id,
      karigarName: karigar.name,
      metal: f.metal.value,
      description: f.description.value.trim() || 'New Ornament Order',
      rawWeight: rawWt,
      purityPercent: purity,
      wastagePercent: 0,
      fineWeight: fineWt,
      laborCharge: 0
    };

    setKarigarLedger([entry, ...karigarLedger]);
    f.reset();
    showBanner(`Issued ${fineWt}g Fine ${entry.metal} to ${karigar.name}.`);
  };

  const handleReceiveFromKarigar = (e) => {
    e.preventDefault();
    const f = e.target;
    const kId = f.karigarId.value;
    const karigar = karigarList.find(k => k.id === kId);
    if (!karigar) return showBanner('Please select a Karigar first.');

    const ornamentWt = parseFloat(f.ornamentWt.value) || 0;
    const touchPct = parseFloat(f.touchPct.value) || 91.6;
    const wastagePct = parseFloat(f.wastagePct.value) || 0;
    const laborRs = parseFloat(f.laborCharge.value) || 0;
    const fineAccounted = Math.round(ornamentWt * ((touchPct + wastagePct) / 100) * 1000) / 1000;

    const entry = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      type: 'receive',
      karigarId: karigar.id,
      karigarName: karigar.name,
      metal: f.metal.value,
      description: f.description.value.trim() || 'Finished Ornament',
      rawWeight: ornamentWt,
      purityPercent: touchPct,
      wastagePercent: wastagePct,
      fineWeight: fineAccounted,
      laborCharge: laborRs
    };

    setKarigarLedger([entry, ...karigarLedger]);
    f.reset();
    showBanner(`Received ${ornamentWt}g from ${karigar.name} (Fine Accounted: ${fineAccounted}g, Labor: ₹${laborRs}).`);
  };

  const getKarigarSummary = (kId, metalType) => {
    const entries = karigarLedger.filter(e => e.karigarId === kId && e.metal === metalType);
    const issued = entries.filter(e => e.type === 'issue').reduce((s, e) => s + Number(e.fineWeight || 0), 0);
    const accounted = entries.filter(e => e.type === 'receive').reduce((s, e) => s + Number(e.fineWeight || 0), 0);
    const labor = entries.filter(e => e.type === 'receive').reduce((s, e) => s + Number(e.laborCharge || 0), 0);
    return {
      fineBalance: Math.round((issued - accounted) * 1000) / 1000,
      totalLabor: Math.round(labor)
    };
  };

  const handleCreateRepair = (e) => {
    e.preventDefault();
    const f = e.target;
    const kId = f.assignedKarigarId.value;
    const karigar = karigarList.find(k => k.id === kId);

    const ticket = {
      id: Date.now(),
      ticketNo: `REP-${String(repairJobs.length + 501)}`,
      date: new Date().toISOString().slice(0, 10),
      customerName: f.custName.value.trim(),
      customerMobile: f.custMobile.value.trim(),
      metal: f.metal.value,
      itemDesc: f.itemDesc.value.trim(),
      grossWeight: parseFloat(f.grossWeight.value) || 0,
      issueNote: f.issueNote.value.trim(),
      dueDate: f.dueDate.value,
      estCharge: parseFloat(f.estCharge.value) || 0,
      karigarName: karigar ? karigar.name : 'In-House',
      status: 'In Repair'
    };

    setRepairJobs([ticket, ...repairJobs]);
    setPrintRepairSlip(ticket);
    f.reset();
    showBanner(`Repair Ticket ${ticket.ticketNo} created!`);
  };

  const openAlterationReturnForm = (item) => {
    setCompletingAlterId(item.id);
    setNewGrossInput(String(item.grossWeight));
    setNewNetInput(String(item.netWeight));
    setAlterPurityInput(item.material === 'Silver' ? '99.9' : item.material === 'Gold-Diamond' ? '75.0' : '91.6');
    setAlterLaborInput('150');
    setMetalSourceMode('karigar');
  };

  const handleCompleteAlteration = (item) => {
    const newGross = parseFloat(newGrossInput);
    const newNet = parseFloat(newNetInput) || newGross;
    const purity = parseFloat(alterPurityInput) || 91.6;
    const laborRs = parseFloat(alterLaborInput) || 0;

    if (isNaN(newGross) || newGross <= 0) {
      showBanner('Enter valid post-amendment Gross Weight.');
      return;
    }

    const oldNet = Number(item.netWeight) || Number(item.grossWeight) || 0;
    const weightDiff = Math.round((newNet - oldNet) * 1000) / 1000;
    const fineDiff = Math.round(Math.abs(weightDiff) * (purity / 100) * 1000) / 1000;
    const todayStr = new Date().toISOString().slice(0, 10);
    const metalCat = item.material === 'Silver' ? 'Silver' : 'Gold';
    const kId = item.alteration?.karigarId;
    const kName = item.alteration?.karigarName || 'In-House Workshop';

    let extraMsg = '';

    if (weightDiff > 0 && kId) {
      const ledgerEntry = {
        id: Date.now() + 1,
        date: todayStr,
        type: metalSourceMode === 'karigar' ? 'receive' : 'issue',
        karigarId: kId,
        karigarName: kName,
        metal: metalCat,
        description: `Amend +${weightDiff}g (${item.code} ${item.type})`,
        rawWeight: weightDiff,
        purityPercent: purity,
        wastagePercent: 0,
        fineWeight: fineDiff,
        laborCharge: laborRs
      };
      setKarigarLedger([ledgerEntry, ...karigarLedger]);
      extraMsg = ` +${weightDiff}g (${fineDiff}g Fine) logged to ${kName}'s Khata.`;
    } else if (weightDiff < 0) {
      const scrapWt = Math.abs(weightDiff);
      const scrapLot = {
        id: Date.now() + 2,
        lotNo: `SCRAP-${item.code}`,
        dateOut: todayStr,
        melterName: kName,
        metal: metalCat,
        sourceRef: `Amendment Cut: ${item.code} ${item.type} (${item.alteration?.instruction || ''})`,
        oldWeight: scrapWt,
        status: 'completed',
        sillyWeight: scrapWt,
        purityPercent: purity,
        meltingLoss: 0,
        fineWeight: fineDiff,
        dateReturned: todayStr
      };
      setMelterJobs([scrapLot, ...melterJobs]);

      if (kId && laborRs > 0) {
        setKarigarLedger([{
          id: Date.now() + 3,
          date: todayStr,
          type: 'receive',
          karigarId: kId,
          karigarName: kName,
          metal: metalCat,
          description: `Amendment Labor (${item.code} ${item.type})`,
          rawWeight: 0,
          purityPercent: purity,
          wastagePercent: 0,
          fineWeight: 0,
          laborCharge: laborRs
        }, ...karigarLedger]);
      }
      extraMsg = ` Cut scrap ${scrapWt}g (${fineDiff}g Fine) added to Melter Pool.`;
    } else if (kId && laborRs > 0) {
      setKarigarLedger([{
        id: Date.now() + 4,
        date: todayStr,
        type: 'receive',
        karigarId: kId,
        karigarName: kName,
        metal: metalCat,
        description: `Amendment Work (${item.code} ${item.type})`,
        rawWeight: 0,
        purityPercent: purity,
        wastagePercent: 0,
        fineWeight: 0,
        laborCharge: laborRs
      }, ...karigarLedger]);
    }

    if (setInventoryItems) {
      setInventoryItems(inventoryItems.map(inv =>
        inv.id === item.id
          ? {
              ...inv,
              status: 'live',
              grossWeight: newGross,
              netWeight: newNet,
              reservedFor: item.alteration?.customerName || '',
              reservedMobile: item.alteration?.customerMobile || '',
              alterationNote: item.alteration?.instruction || '',
              alteration: null
            }
          : inv
      ));
    }

    setCompletingAlterId(null);
    showBanner(`${item.code} (${item.type}) updated to ${newGross}g & unlocked in Live Vault for ${item.alteration?.customerName}!${extraMsg}`);
  };

  const completedGoldMelts = melterJobs.filter(m => m.status === 'completed' && m.metal === 'Gold');
  const completedSilverMelts = melterJobs.filter(m => m.status === 'completed' && m.metal === 'Silver');
  const totalRefinedGold = Math.round(completedGoldMelts.reduce((s, m) => s + Number(m.fineWeight || 0), 0) * 1000) / 1000;
  const totalRefinedSilver = Math.round(completedSilverMelts.reduce((s, m) => s + Number(m.fineWeight || 0), 0) * 1000) / 1000;
  const alterationItems = inventoryItems.filter(i => i.status === 'alteration');

  return (
    <div className="space-y-4">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap gap-1.5">
        {[
          { id: 'melter', label: `1. Melter & Silly (${melterJobs.length})`, icon: Flame },
          { id: 'karigar', label: `2. Karigar Ledger (${karigarList.length})`, icon: Hammer },
          { id: 'repair', label: `3. Customer Repairs (${repairJobs.filter(r => r.status !== 'Delivered').length})`, icon: Wrench },
          { id: 'sizing', label: `4. Stock Amendments (${alterationItems.length})`, icon: Sparkles }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'melter' && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] text-slate-500">Total Melted Fine Gold (24K)</div>
              <div className="text-base font-bold text-amber-700 mt-0.5">{totalRefinedGold} g</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] text-slate-500">Total Melted Fine Silver (999)</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">{totalRefinedSilver} g</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] text-slate-500">Currently at Melter</div>
              <div className="text-base font-bold text-orange-600 mt-0.5">{melterJobs.filter(m => m.status === 'melting').length} Lots</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] text-slate-500">Completed Silly & Scrap Lots</div>
              <div className="text-base font-bold text-emerald-700 mt-0.5">{melterJobs.filter(m => m.status === 'completed').length} Lots</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Send Old Metal to Melter (Galaai)</h3>
              <form onSubmit={handleSendToMelter} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Melter / Refiner Name *</label>
                  <input name="melterName" type="text" required placeholder="e.g. Mahesh Galaai Wala" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Metal Type *</label>
                  <select name="metal" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold">
                    <option value="Gold">Old Gold</option>
                    <option value="Silver">Old Silver</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Old Gross Weight Given (g) *</label>
                  <input name="oldWeight" type="number" step="0.001" required placeholder="e.g. 45.200" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Customer / Lot Reference</label>
                  <input name="sourceRef" type="text" placeholder="Customer name or URD voucher" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">Issue to Melter</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Melting, Silly & Amendment Scrap Register</h3>
                <span className="text-[11px] text-slate-500">Auto-calculates Loss & Fine Weight</span>
              </div>

              <div className="divide-y divide-slate-100">
                {melterJobs.map(job => {
                  const isReturning = returningMeltId === job.id;
                  const previewLoss = isReturning && sillyWtInput ? Math.round((job.oldWeight - parseFloat(sillyWtInput)) * 1000) / 1000 : 0;
                  const previewFine = isReturning && sillyWtInput && purityInput
                    ? Math.round(parseFloat(sillyWtInput) * (parseFloat(purityInput) / 100) * 1000) / 1000
                    : 0;

                  return (
                    <div key={job.id} className="p-4 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900">{job.lotNo}</span> • <strong>{job.melterName}</strong> ({job.metal})
                          <div className="text-[11px] text-slate-500">Issued: <strong>{job.oldWeight}g</strong> on {job.dateOut} • Ref: {job.sourceRef}</div>
                        </div>

                        {job.status === 'melting' ? (
                          <button type="button" onClick={() => { setReturningMeltId(isReturning ? null : job.id); setSillyWtInput(''); setPurityInput('91.6'); }} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg">
                            {isReturning ? 'Cancel' : 'Receive Silly & Purity'}
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">In Fine Pool ✓</span>
                        )}
                      </div>

                      {job.status === 'completed' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px]">
                          <div>Returned Wt: <strong className="text-slate-900">{job.sillyWeight}g</strong></div>
                          <div>Purity: <strong className="text-slate-900">{job.purityPercent}%</strong></div>
                          <div>Loss: <strong className="text-red-600">{job.meltingLoss}g</strong></div>
                          <div>Net Fine ({job.metal === 'Gold' ? '24K' : '999'}): <strong className="text-emerald-700">{job.fineWeight}g</strong></div>
                        </div>
                      )}

                      {isReturning && (
                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Returned Silly Wt (g) *</label>
                              <input type="number" step="0.001" value={sillyWtInput} onChange={(e) => setSillyWtInput(e.target.value)} placeholder="e.g. 44.850" className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold" />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Purity (%) *</label>
                              <input type="number" step="0.01" value={purityInput} onChange={(e) => setPurityInput(e.target.value)} placeholder="e.g. 88.50" className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold" />
                            </div>
                            <div className="flex items-end">
                              <button type="button" onClick={() => handleCompleteSillyReturn(job)} className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">Save Silly Report</button>
                            </div>
                          </div>
                          {sillyWtInput && (
                            <div className="text-[11px] text-slate-700 flex gap-4">
                              <span>Auto Melting Wastage: <strong className="text-red-600">{previewLoss}g</strong></span>
                              <span>Converted Fine Metal: <strong className="text-emerald-700">{previewFine}g</strong></span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {melterJobs.length === 0 && (
                  <div className="p-8 text-center text-slate-400">No melting lots recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'karigar' && (
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setKarigarSubTab('issue')} className={`px-3 py-1.5 rounded-lg font-semibold ${karigarSubTab === 'issue' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>+ Issue Metal to Karigar</button>
            <button onClick={() => setKarigarSubTab('receive')} className={`px-3 py-1.5 rounded-lg font-semibold ${karigarSubTab === 'receive' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>+ Receive Finished Jewelry</button>
            <button onClick={() => setKarigarSubTab('karigars')} className={`px-3 py-1.5 rounded-lg font-semibold ${karigarSubTab === 'karigars' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>Manage Karigars ({karigarList.length})</button>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              {karigarSubTab === 'karigars' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><UserPlus size={16} /> Register New Karigar</h3>
                  <form onSubmit={handleAddKarigar} className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Karigar Name *</label>
                      <input name="kName" type="text" required placeholder="e.g. Rahim Bhai Bengali" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Mobile Number</label>
                      <input name="kMobile" type="tel" placeholder="10-digit mobile" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Specialty</label>
                      <input name="kSpecialty" type="text" placeholder="e.g. Casting, Jadau, Amendments" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>
                    <button type="submit" className="w-full py-2 bg-slate-900 text-white font-semibold rounded-lg">Save Karigar</button>
                  </form>
                </div>
              )}

              {karigarSubTab === 'issue' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Issue Raw / Fine Metal</h3>
                  <form onSubmit={handleIssueMetalToKarigar} className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Select Karigar *</label>
                      <select name="karigarId" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold">
                        <option value="">-- Choose Karigar --</option>
                        {karigarList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Metal</label>
                        <select name="metal" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                          <option value="Gold">Gold</option>
                          <option value="Silver">Silver</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Purity (%) *</label>
                        <input name="issuePurity" type="number" step="0.01" defaultValue="99.5" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Weight Issued (g) *</label>
                      <input name="issueWt" type="number" step="0.001" required placeholder="e.g. 25.000" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Design / Order Note</label>
                      <input name="description" type="text" placeholder="e.g. 2 Ladies Rings 22K" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>
                    <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg">Issue Metal</button>
                  </form>
                </div>
              )}

              {karigarSubTab === 'receive' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Receive Finished Jewelry</h3>
                  <form onSubmit={handleReceiveFromKarigar} className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Select Karigar *</label>
                      <select name="karigarId" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold">
                        <option value="">-- Choose Karigar --</option>
                        {karigarList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Metal</label>
                        <select name="metal" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                          <option value="Gold">Gold</option>
                          <option value="Silver">Silver</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Net Ornament Wt (g) *</label>
                        <input name="ornamentWt" type="number" step="0.001" required placeholder="e.g. 22.400" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Ornament Touch (%)</label>
                        <input name="touchPct" type="number" step="0.01" defaultValue="91.6" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Wastage / Ghat (%)</label>
                        <input name="wastagePct" type="number" step="0.01" defaultValue="3.0" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Karigar Labor / Majoori (₹) *</label>
                      <input name="laborCharge" type="number" step="1" required placeholder="e.g. 3500" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Item Description</label>
                      <input name="description" type="text" placeholder="e.g. 22K Designer Necklace" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>
                    <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">Record Receipt</button>
                  </form>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              {karigarList.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {karigarList.map(k => {
                    const goldBal = getKarigarSummary(k.id, 'Gold');
                    const silverBal = getKarigarSummary(k.id, 'Silver');
                    return (
                      <div key={k.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900">{k.name}</div>
                          <div className="text-[11px] text-slate-500">{k.specialty} • {k.mobile || 'No Phone'}</div>
                        </div>
                        <div className="text-right text-[11px]">
                          <div>Fine Gold Bal: <strong className={goldBal.fineBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}>{goldBal.fineBalance}g</strong></div>
                          {silverBal.fineBalance !== 0 && <div>Fine Silver Bal: <strong>{silverBal.fineBalance}g</strong></div>}
                          <div>Total Labor: <strong className="text-slate-900">₹{(goldBal.totalLabor + silverBal.totalLabor).toLocaleString('en-IN')}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Karigar Issue & Receipt Ledger</h3>
                  <select value={selectedKarigarFilter} onChange={(e) => setSelectedKarigarFilter(e.target.value)} className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs">
                    <option value="All">All Karigars</option>
                    {karigarList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="p-3">Date & Karigar</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Item / Note</th>
                        <th className="p-3">Gross Wt</th>
                        <th className="p-3">Fine Eq.</th>
                        <th className="p-3 text-right">Labor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {karigarLedger
                        .filter(e => selectedKarigarFilter === 'All' || e.karigarId === selectedKarigarFilter)
                        .map(entry => (
                          <tr key={entry.id}>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{entry.karigarName}</div>
                              <div className="text-[11px] text-slate-500">{entry.date} • {entry.metal}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${entry.type === 'issue' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {entry.type === 'issue' ? 'Issued' : 'Received'}
                              </span>
                            </td>
                            <td className="p-3">{entry.description}</td>
                            <td className="p-3 font-semibold">{entry.rawWeight}g ({entry.purityPercent}%{entry.wastagePercent ? ` + ${entry.wastagePercent}% Ghat` : ''})</td>
                            <td className="p-3 font-bold text-slate-900">{entry.fineWeight}g</td>
                            <td className="p-3 text-right font-semibold">{entry.laborCharge ? `₹${entry.laborCharge}` : '-'}</td>
                          </tr>
                        ))}
                      {karigarLedger.length === 0 && (
                        <tr><td colSpan="6" className="p-8 text-center text-slate-400">No Karigar transactions yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'repair' && (
        <div className="grid lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">New Customer Repair Intake</h3>
            <form onSubmit={handleCreateRepair} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Customer Name *</label>
                <input name="custName" type="text" required placeholder="Customer Name" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Mobile Number *</label>
                <input name="custMobile" type="tel" required placeholder="10-digit mobile" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Metal</label>
                  <select name="metal" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Diamond">Diamond</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Item Weight (g) *</label>
                  <input name="grossWeight" type="number" step="0.001" required placeholder="e.g. 8.500" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Item Description *</label>
                <input name="itemDesc" type="text" required placeholder="e.g. Broken Gold Chain / Ring Polish" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Repair Work Needed *</label>
                <input name="issueNote" type="text" required placeholder="e.g. Laser soldering + Rhodium polish" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Assign Karigar</label>
                  <select name="assignedKarigarId" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                    <option value="">In-House / Self</option>
                    {karigarList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Est. Charges (₹)</label>
                  <input name="estCharge" type="number" defaultValue="250" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Delivery Date *</label>
                <input name="dueDate" type="date" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
              </div>
              <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">Create Ticket & Print Receipt</button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Active & Completed Repair Tickets</h3>
              <span className="text-[11px] text-slate-500">Track Karigar progress & delivery</span>
            </div>
            <div className="divide-y divide-slate-100">
              {repairJobs.map(rep => (
                <div key={rep.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{rep.ticketNo} • {rep.customerName} ({rep.customerMobile})</div>
                    <div className="text-slate-600 mt-0.5">{rep.metal} • {rep.itemDesc} (<strong>{rep.grossWeight}g</strong>) — {rep.issueNote}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Karigar: <strong>{rep.karigarName}</strong> • Due: {rep.dueDate} • Charge: <strong>₹{rep.estCharge}</strong></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPrintRepairSlip(rep)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md inline-flex items-center gap-1">
                      <Printer size={12} /> Slip
                    </button>
                    {rep.status === 'In Repair' && (
                      <button type="button" onClick={() => setRepairJobs(repairJobs.map(r => r.id === rep.id ? { ...r, status: 'Ready' } : r))} className="px-2.5 py-1 bg-amber-600 text-white font-semibold rounded-md">Mark Ready</button>
                    )}
                    {rep.status === 'Ready' && (
                      <button type="button" onClick={() => setRepairJobs(repairJobs.map(r => r.id === rep.id ? { ...r, status: 'Delivered' } : r))} className="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-md">Deliver & Collect ₹{rep.estCharge}</button>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      rep.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' :
                      rep.status === 'Ready' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>{rep.status}</span>
                  </div>
                </div>
              ))}
              {repairJobs.length === 0 && (
                <div className="p-8 text-center text-slate-400">No customer repair tickets yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'sizing' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Showroom Stock Custom Amendments Desk ({alterationItems.length})</h3>
              <p className="text-[11px] text-slate-500">Enter post-amendment weight for any jewelry item. Software updates Vault weight, adjusts Karigar Khata (+g), or sends cut scrap (-g) to Melter Pool.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {alterationItems.map(item => {
              const isCompleting = completingAlterId === item.id;
              const oldNet = Number(item.netWeight) || Number(item.grossWeight) || 0;
              const parsedNewNet = parseFloat(newNetInput) || parseFloat(newGrossInput) || oldNet;
              const diff = isCompleting ? Math.round((parsedNewNet - oldNet) * 1000) / 1000 : 0;

              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={item.imageUrl} alt={item.code} className="w-12 h-12 rounded-lg object-cover border" />
                      <div>
                        <div className="font-bold text-slate-900">{item.code} • {item.material} {item.type} (Original Net: {oldNet}g)</div>
                        <div className="text-amber-800 font-semibold mt-0.5">Customer Demand: {item.alteration?.instruction}</div>
                        <div className="text-[11px] text-slate-500">
                          Reserved for: <strong>{item.alteration?.customerName}</strong> • Karigar: <strong>{item.alteration?.karigarName}</strong> • Advance: ₹{item.alteration?.advancePaid || 0}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => (isCompleting ? setCompletingAlterId(null) : openAlterationReturnForm(item))}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                    >
                      {isCompleting ? 'Cancel' : 'Receive & Adjust Weight'}
                    </button>
                  </div>

                  {isCompleting && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">New Gross Wt (g) *</label>
                          <input
                            type="number"
                            step="0.001"
                            value={newGrossInput}
                            onChange={(e) => { setNewGrossInput(e.target.value); setNewNetInput(e.target.value); }}
                            className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">New Net Wt (g) *</label>
                          <input
                            type="number"
                            step="0.001"
                            value={newNetInput}
                            onChange={(e) => setNewNetInput(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Purity / Touch (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={alterPurityInput}
                            onChange={(e) => setAlterPurityInput(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Karigar Labor (₹)</label>
                          <input
                            type="number"
                            step="1"
                            value={alterLaborInput}
                            onChange={(e) => setAlterLaborInput(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => handleCompleteAlteration(item)}
                            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                          >
                            Update Stock & Unlock
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/80 text-[11px]">
                        <div>
                          Weight Difference:{' '}
                          <strong className={diff > 0 ? 'text-amber-800' : diff < 0 ? 'text-red-700' : 'text-emerald-700'}>
                            {diff > 0 ? `+${diff}g (Metal Added)` : diff < 0 ? `${diff}g (Scrap Cut -> Melter Pool)` : '0.000g (No Weight Change)'}
                          </strong>
                        </div>
                        {diff > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">Added Metal Source:</span>
                            <select value={metalSourceMode} onChange={(e) => setMetalSourceMode(e.target.value)} className="px-2 py-0.5 bg-white border border-slate-300 rounded font-semibold">
                              <option value="karigar">Karigar Used Own Gold (Credit Karigar)</option>
                              <option value="showroom">Showroom Gold Given (Debit Karigar)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {alterationItems.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                No items pending custom amendment. Click <strong>"Amend / Alter"</strong> on any jewelry piece in <strong>Inventory & Vault</strong> to send it here.
              </div>
            )}
          </div>
        </div>
      )}

      {printRepairSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b print:hidden">
              <span className="font-bold text-slate-900">Customer Repair Receipt</span>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-3 py-1 bg-slate-900 text-white rounded-lg font-semibold inline-flex items-center gap-1"><Printer size={12} /> Print</button>
                <button onClick={() => setPrintRepairSlip(null)} className="px-3 py-1 bg-slate-100 rounded-lg font-semibold">Close</button>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-slate-400 rounded-xl space-y-2">
              <div className="text-center border-b pb-2">
                <div className="font-bold text-sm text-slate-900">SWARNASETU JEWELLERS</div>
                <div className="text-[11px] text-slate-500">Customer Ornament Repair Acknowledgement</div>
              </div>
              <div className="flex justify-between">
                <span>Ticket: <strong>{printRepairSlip.ticketNo}</strong></span>
                <span>Date: <strong>{printRepairSlip.date}</strong></span>
              </div>
              <div>Customer: <strong>{printRepairSlip.customerName}</strong> ({printRepairSlip.customerMobile})</div>
              <div>Item: <strong>{printRepairSlip.metal} - {printRepairSlip.itemDesc}</strong></div>
              <div>Received Weight: <strong>{printRepairSlip.grossWeight} g</strong></div>
              <div>Work Details: <strong>{printRepairSlip.issueNote}</strong></div>
              <div className="flex justify-between pt-2 border-t">
                <span>Est. Charges: <strong>₹{printRepairSlip.estCharge}</strong></span>
                <span>Delivery Date: <strong>{printRepairSlip.dueDate}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// END OF FILE