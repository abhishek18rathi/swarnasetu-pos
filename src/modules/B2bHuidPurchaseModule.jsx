import React, { useState, useMemo } from 'react';
import {
  Truck, Plus, Trash2, CheckCircle2, X, Search,
  Building2, ShieldCheck, Wallet, PackagePlus
} from 'lucide-react';

export default function B2bHuidPurchaseModule({
  currentUser,
  suppliers = [],
  setSuppliers,
  b2bPurchases = [],
  setB2bPurchases,
  inventoryItems = [],
  setInventoryItems
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin;
  const hasAccess = isAdmin || !!currentUser?.privileges?.orders_b2b_urd;

  const [tab, setTab] = useState('purchase'); // 'purchase' | 'suppliers' | 'huid'
  const [banner, setBanner] = useState('');

  // Supplier Form State
  const [supName, setSupName] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [supMobile, setSupMobile] = useState('');
  const [supCity, setSupCity] = useState('Jaipur');

  // Supplier Payment / Settlement State
  const [paySupId, setPaySupId] = useState('');
  const [payCashAmt, setPayCashAmt] = useState('');
  const [payFineMetalWt, setPayFineMetalWt] = useState('');
  const [payMode, setPayMode] = useState('RTGS / Bank');
  const [payNote, setPayNote] = useState('');

  // B2B Bill Entry State
  const [billSupplierId, setBillSupplierId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [settlementType, setSettlementType] = useState('cash_bill'); // 'cash_bill' | 'metal_plus_labour'
  const [billGstAmount, setBillGstAmount] = useState('');
  const [pushToStatus, setPushToStatus] = useState('draft'); // 'draft' | 'live'

  // Current Line Item Builder
  const [lineMetal, setLineMetal] = useState('Gold');
  const [linePurity, setLinePurity] = useState('22K');
  const [lineType, setLineType] = useState('Ring');
  const [lineHuid, setLineHuid] = useState('');
  const [lineGrossWt, setLineGrossWt] = useState('');
  const [lineNetWt, setLineNetWt] = useState('');
  const [lineDiaCt, setLineDiaCt] = useState('');
  const [lineAmountOrLabour, setLineAmountOrLabour] = useState('');
  const [billLines, setBillLines] = useState([]);

  // HUID Search
  const [huidSearch, setHuidSearch] = useState('');

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4500);
  };

  // All HUID items flattened across B2B purchases
  const allHuidRecords = useMemo(() => {
    const out = [];
    (b2bPurchases || []).forEach((p) => {
      (p.items || []).forEach((it) => {
        out.push({
          ...it,
          billNo: p.billNo,
          billDate: p.billDate,
          supplierName: p.supplierName
        });
      });
    });
    return out;
  }, [b2bPurchases]);

  if (!hasAccess) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center max-w-md mx-auto text-xs">
        <h3 className="text-sm font-bold text-slate-900">Access Restricted</h3>
        <p className="text-slate-500 mt-1">Ask Admin to enable "Orders / B2B / URD" privilege in Payroll.</p>
      </div>
    );
  }

  const handleAddSupplier = (e) => {
    e.preventDefault();
    if (!supName.trim()) return;
    const newSup = {
      id: `SUP-${Date.now()}`,
      name: supName.trim(),
      gstin: supGstin.trim().toUpperCase(),
      mobile: supMobile.trim(),
      city: supCity.trim() || 'Jaipur',
      cashDue: 0,
      fineGoldDue: 0,
      ledger: []
    };
    setSuppliers([newSup, ...(suppliers || [])]);
    setBillSupplierId(newSup.id);
    setPaySupId(newSup.id);
    setSupName('');
    setSupGstin('');
    setSupMobile('');
    showBanner(`Wholesaler "${newSup.name}" added.`);
  };

  const handleAddBillLine = () => {
    const gross = parseFloat(lineGrossWt);
    const net = parseFloat(lineNetWt) || gross;
    if (isNaN(gross) || gross <= 0) {
      return showBanner('Enter valid Gross Weight (g).');
    }

    const cleanHuid = lineHuid.trim().toUpperCase();
    const purityFactor =
      linePurity === '24K' ? 0.999 : linePurity === '18K' ? 0.75 : linePurity === 'Silver' ? 0.999 : 0.916;
    const fineWt = Math.round(net * purityFactor * 1000) / 1000;

    const line = {
      id: Date.now() + Math.random(),
      metal: lineMetal,
      purity: linePurity,
      type: lineType.trim() || 'Ornament',
      huid: cleanHuid,
      grossWeight: gross,
      netWeight: net,
      diamondCarat: parseFloat(lineDiaCt) || 0,
      fineWeight: fineWt,
      lineAmount: parseFloat(lineAmountOrLabour) || 0
    };

    setBillLines([...billLines, line]);
    setLineHuid('');
    setLineGrossWt('');
    setLineNetWt('');
    setLineDiaCt('');
    setLineAmountOrLabour('');
  };

  const handleSaveB2bPurchase = (e) => {
    e.preventDefault();
    if (billLines.length === 0) {
      return showBanner('Add at least 1 jewelry item to the B2B bill.');
    }

    const supplier = (suppliers || []).find((s) => s.id === billSupplierId);
    const supplierName = supplier ? supplier.name : 'Walk-in Wholesaler';
    const subAmount = billLines.reduce((s, l) => s + Number(l.lineAmount || 0), 0);
    const gstAmt = parseFloat(billGstAmount) || 0;
    const grandCashTotal = Math.round((subAmount + gstAmt) * 100) / 100;
    const totalFineGold =
      settlementType === 'metal_plus_labour'
        ? Math.round(
            billLines
              .filter((l) => l.metal !== 'Silver')
              .reduce((s, l) => s + Number(l.fineWeight || 0), 0) * 1000
          ) / 1000
        : 0;

    const purchaseRecord = {
      id: Date.now(),
      billNo: billNo.trim() || `B2B-${(b2bPurchases || []).length + 301}`,
      billDate,
      supplierId: supplier ? supplier.id : '',
      supplierName,
      settlementType,
      items: billLines,
      subAmount,
      gstAmount: gstAmt,
      grandCashTotal,
      totalFineGold,
      enteredBy: currentUser?.name || 'Admin'
    };

    setB2bPurchases([purchaseRecord, ...(b2bPurchases || [])]);

    // Update Supplier Payable Balance if linked
    if (supplier && setSuppliers) {
      setSuppliers(
        (suppliers || []).map((s) => {
          if (s.id !== supplier.id) return s;
          const nextCashDue = Math.round(((Number(s.cashDue) || 0) + grandCashTotal) * 100) / 100;
          const nextFineDue = Math.round(((Number(s.fineGoldDue) || 0) + totalFineGold) * 1000) / 1000;
          const txn = {
            id: Date.now(),
            date: billDate,
            label: `Purchase Bill ${purchaseRecord.billNo} (${billLines.length} pcs)`,
            cashDelta: grandCashTotal,
            fineDelta: totalFineGold,
            mode: settlementType === 'metal_plus_labour' ? 'Metal + Labour' : 'Tax Invoice'
          };
          return {
            ...s,
            cashDue: nextCashDue,
            fineGoldDue: nextFineDue,
            ledger: [txn, ...(s.ledger || [])]
          };
        })
      );
    }

    // Push all B2B items straight into Showroom Inventory
    if (setInventoryItems) {
      const baseCount = (inventoryItems || []).length;
      const newInvItems = billLines.map((line, idx) => {
        const prefix = line.metal === 'Silver' ? 'SLV' : line.metal === 'Gold-Diamond' ? 'GDM' : 'GLD';
        const typeCode = (line.type || 'ORN').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
        const autoTag = `${prefix}-${typeCode}-${1001 + baseCount + idx}`;
        return {
          id: Date.now() + idx + Math.random(),
          code: autoTag,
          huid: line.huid,
          material: line.metal,
          type: line.type,
          grossWeight: line.grossWeight,
          netWeight: line.netWeight,
          diamondCarat: line.diamondCarat,
          makingMode: 'percent',
          makingValue: 14,
          status: pushToStatus,
          supplierName,
          b2bBillNo: purchaseRecord.billNo,
          imageUrl: ''
        };
      });

      setInventoryItems([...newInvItems, ...(inventoryItems || [])]);
    }

    setBillNo('');
    setBillGstAmount('');
    setBillLines([]);
    showBanner(
      `B2B Bill ${purchaseRecord.billNo} saved & ${purchaseRecord.items.length} item(s) pushed to ${
        pushToStatus === 'live' ? 'Live Vault' : 'Inventory Drafts'
      }!`
    );
  };

  const handleSettleSupplier = (e) => {
    e.preventDefault();
    if (!paySupId) return;
    const cashPaid = parseFloat(payCashAmt) || 0;
    const fineGiven = parseFloat(payFineMetalWt) || 0;
    if (cashPaid <= 0 && fineGiven <= 0) {
      return showBanner('Enter Cash/RTGS paid or Fine Gold given.');
    }

    setSuppliers(
      (suppliers || []).map((s) => {
        if (s.id !== paySupId) return s;
        const nextCash = Math.round(((Number(s.cashDue) || 0) - cashPaid) * 100) / 100;
        const nextFine = Math.round(((Number(s.fineGoldDue) || 0) - fineGiven) * 1000) / 1000;
        const txn = {
          id: Date.now(),
          date: new Date().toISOString().slice(0, 10),
          label: payNote.trim() || `Supplier Payment (${payMode})`,
          cashDelta: -cashPaid,
          fineDelta: -fineGiven,
          mode: payMode
        };
        return {
          ...s,
          cashDue: nextCash,
          fineGoldDue: nextFine,
          ledger: [txn, ...(s.ledger || [])]
        };
      })
    );

    setPayCashAmt('');
    setPayFineMetalWt('');
    setPayNote('');
    showBanner('Supplier payment / fine metal settlement recorded.');
  };

  const filteredHuids = huidSearch.trim()
    ? allHuidRecords.filter(
        (r) =>
          (r.huid && r.huid.toLowerCase().includes(huidSearch.toLowerCase())) ||
          (r.supplierName && r.supplierName.toLowerCase().includes(huidSearch.toLowerCase())) ||
          (r.billNo && r.billNo.toLowerCase().includes(huidSearch.toLowerCase()))
      )
    : allHuidRecords;

  const totalCashPayable = (suppliers || []).reduce((s, sup) => s + Math.max(0, Number(sup.cashDue) || 0), 0);
  const totalFinePayable =
    Math.round((suppliers || []).reduce((s, sup) => s + Math.max(0, Number(sup.fineGoldDue) || 0), 0) * 1000) / 1000;

  return (
    <div className="space-y-4 text-xs">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex justify-between items-center">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      {/* Top Navigation & Payable Summary */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTab('purchase')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              tab === 'purchase' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck size={14} /> 1. B2B Purchase & Stock Entry ({(b2bPurchases || []).length})
          </button>
          <button
            onClick={() => setTab('suppliers')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              tab === 'suppliers' ? 'bg-cyan-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 size={14} /> 2. Wholesalers & Khata ({(suppliers || []).length})
          </button>
          <button
            onClick={() => setTab('huid')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              tab === 'huid' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck size={14} /> 3. BIS HUID Registry ({allHuidRecords.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-800 font-bold">
            Cash Payable: ₹{totalCashPayable.toLocaleString('en-IN')}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold">
            Fine Gold Payable: {totalFinePayable} g
          </span>
        </div>
      </div>

      {/* TAB 1: B2B PURCHASE BILL & DIRECT INVENTORY PUSH */}
      {tab === 'purchase' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveB2bPurchase} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Wholesaler B2B Purchase & HUID Tags</h3>
                <p className="text-[11px] text-slate-500">
                  Every item added below is automatically tagged and pushed into your Showroom Inventory.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Push Stock To:</span>
                <select
                  value={pushToStatus}
                  onChange={(e) => setPushToStatus(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold bg-teal-50/60 text-teal-900"
                >
                  <option value="draft">Inventory Drafts (For Photo Upload)</option>
                  <option value="live">Live Vault Directly</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Wholesaler / Supplier</label>
                <select
                  value={billSupplierId}
                  onChange={(e) => setBillSupplierId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="">-- Select Wholesaler --</option>
                  {(suppliers || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Supplier Bill / Voucher No *</label>
                <input
                  type="text"
                  required
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="e.g. JW-2026-884"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Bill Date</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Billing Basis</label>
                <select
                  value={settlementType}
                  onChange={(e) => setSettlementType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="cash_bill">Full Tax Invoice (Cash/RTGS ₹)</option>
                  <option value="metal_plus_labour">Fine Gold + Labour Bill</option>
                </select>
              </div>
            </div>

            {/* Line Item Entry Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="font-bold text-slate-800">Add Piece / HUID Line Item</div>
              <div className="grid grid-cols-2 sm:grid-cols-8 gap-2">
                <select
                  value={lineMetal}
                  onChange={(e) => {
                    const m = e.target.value;
                    setLineMetal(m);
                    setLinePurity(m === 'Silver' ? 'Silver' : m === 'Gold-Diamond' ? '18K' : '22K');
                  }}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold-Diamond">Gold-Diamond</option>
                </select>

                <select
                  value={linePurity}
                  onChange={(e) => setLinePurity(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                >
                  <option value="22K">22K</option>
                  <option value="18K">18K</option>
                  <option value="24K">24K</option>
                  <option value="Silver">Silver</option>
                </select>

                <input
                  type="text"
                  value={lineType}
                  onChange={(e) => setLineType(e.target.value)}
                  placeholder="Type (Ring/Chain)"
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />

                <input
                  type="text"
                  maxLength={8}
                  value={lineHuid}
                  onChange={(e) => setLineHuid(e.target.value)}
                  placeholder="6-Digit HUID"
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono uppercase"
                />

                <input
                  type="number"
                  step="0.001"
                  value={lineGrossWt}
                  onChange={(e) => setLineGrossWt(e.target.value)}
                  placeholder="Gross Wt (g)"
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold"
                />

                <input
                  type="number"
                  step="0.001"
                  value={lineNetWt}
                  onChange={(e) => setLineNetWt(e.target.value)}
                  placeholder="Net Wt (g)"
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold"
                />

                <input
                  type="number"
                  step="0.01"
                  value={lineAmountOrLabour}
                  onChange={(e) => setLineAmountOrLabour(e.target.value)}
                  placeholder={settlementType === 'metal_plus_labour' ? 'Labour ₹' : 'Item Amt ₹'}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                />

                <button
                  type="button"
                  onClick={handleAddBillLine}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg inline-flex items-center justify-center gap-1"
                >
                  <Plus size={13} /> Add Line
                </button>
              </div>
            </div>

            {/* Added Lines Table */}
            {billLines.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Ornament</th>
                      <th className="p-2.5">HUID Code</th>
                      <th className="p-2.5">Gross / Net</th>
                      <th className="p-2.5">Fine Eq.</th>
                      <th className="p-2.5 text-right">Amount / Labour</th>
                      <th className="p-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billLines.map((l, idx) => (
                      <tr key={l.id}>
                        <td className="p-2.5 font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-semibold">{l.purity} {l.type}</td>
                        <td className="p-2.5 font-mono font-bold text-amber-800">{l.huid || '-'}</td>
                        <td className="p-2.5">{l.grossWeight}g / {l.netWeight}g</td>
                        <td className="p-2.5 font-semibold">{l.fineWeight}g</td>
                        <td className="p-2.5 text-right font-bold">₹{l.lineAmount.toLocaleString('en-IN')}</td>
                        <td className="p-2.5">
                          <button
                            type="button"
                            onClick={() => setBillLines(billLines.filter((x) => x.id !== l.id))}
                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-slate-600">Bill GST Amount (₹):</label>
                <input
                  type="number"
                  step="0.01"
                  value={billGstAmount}
                  onChange={(e) => setBillGstAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
              >
                <PackagePlus size={14} /> Save B2B Bill & Push {billLines.length} Item(s) to Stock
              </button>
            </div>
          </form>

          {/* Past B2B Bills Register */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-sm">Recent B2B Purchase Bills</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-3">Bill No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Wholesaler</th>
                    <th className="p-3">Pieces & HUIDs</th>
                    <th className="p-3 text-right">Fine Gold</th>
                    <th className="p-3 text-right">Bill Cash/Labour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(b2bPurchases || []).map((p) => (
                    <tr key={p.id}>
                      <td className="p-3 font-bold text-slate-900">{p.billNo}</td>
                      <td className="p-3">{p.billDate}</td>
                      <td className="p-3 font-semibold">{p.supplierName}</td>
                      <td className="p-3">
                        {p.items.length} pcs ({p.items.filter((i) => i.huid).map((i) => i.huid).join(', ') || 'No HUID'})
                      </td>
                      <td className="p-3 text-right font-bold text-amber-800">
                        {p.totalFineGold > 0 ? `${p.totalFineGold} g` : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        ₹{Number(p.grandCashTotal || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {(!b2bPurchases || b2bPurchases.length === 0) && (
                    <tr><td colSpan="6" className="p-6 text-center text-slate-400">No B2B purchase bills recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WHOLESALERS & SUPPLIER PAYABLE LEDGER */}
      {tab === 'suppliers' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Add Wholesaler / Bullion Dealer</h3>
              <form onSubmit={handleAddSupplier} className="space-y-2.5">
                <input type="text" required value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="Firm / Wholesaler Name *" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold" />
                <input type="text" value={supGstin} onChange={(e) => setSupGstin(e.target.value)} placeholder="GSTIN (15-digit)" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono uppercase" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="tel" value={supMobile} onChange={(e) => setSupMobile(e.target.value)} placeholder="Mobile" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                  <input type="text" value={supCity} onChange={(e) => setSupCity(e.target.value)} placeholder="City (e.g. Jaipur)" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <button type="submit" className="w-full py-2 bg-slate-900 text-white font-semibold rounded-lg">Save Wholesaler</button>
              </form>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Wallet size={15} className="text-cyan-700" /> Record Supplier Payment / Metal Given
              </h3>
              <form onSubmit={handleSettleSupplier} className="space-y-2.5">
                <select required value={paySupId} onChange={(e) => setPaySupId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold">
                  <option value="">-- Select Wholesaler --</option>
                  {(suppliers || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.01" value={payCashAmt} onChange={(e) => setPayCashAmt(e.target.value)} placeholder="RTGS / Cash Paid ₹" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold" />
                  <input type="number" step="0.001" value={payFineMetalWt} onChange={(e) => setPayFineMetalWt(e.target.value)} placeholder="Fine Gold Given (g)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold" />
                </div>
                <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                  <option value="RTGS / Bank">RTGS / NEFT Bank Transfer</option>
                  <option value="Fine Bullion Given">Fine 999 Bullion Given</option>
                  <option value="Cash">Cash</option>
                </select>
                <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="UTR / Reference note" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                <button type="submit" className="w-full py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold rounded-lg">Update Supplier Account</button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-sm">Wholesaler Payable Balances</div>
            <div className="divide-y divide-slate-100">
              {(suppliers || []).map((s) => (
                <div key={s.id} className="p-4 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {s.city} {s.gstin ? `• GSTIN: ${s.gstin}` : ''} {s.mobile ? `• ${s.mobile}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-3 text-right">
                    <div>
                      <div className="text-[10px] text-slate-500">Cash / Labour Due</div>
                      <div className="font-bold text-red-700">₹{Number(s.cashDue || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Fine Gold Due</div>
                      <div className="font-bold text-amber-800">{Number(s.fineGoldDue || 0)} g</div>
                    </div>
                  </div>
                </div>
              ))}
              {(!suppliers || suppliers.length === 0) && (
                <div className="p-8 text-center text-slate-400">No wholesalers added yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BIS HUID REGISTRY */}
      {tab === 'huid' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">BIS Hallmarked HUID Traceability Register</h3>
              <p className="text-[11px] text-slate-500">Verify any 6-digit HUID number back to its supplier bill, date, and net weight</p>
            </div>
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 w-64">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                value={huidSearch}
                onChange={(e) => setHuidSearch(e.target.value)}
                placeholder="Search 6-digit HUID or supplier..."
                className="w-full bg-transparent outline-none font-mono uppercase"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-3">HUID Code</th>
                  <th className="p-3">Ornament</th>
                  <th className="p-3">Gross / Net Wt</th>
                  <th className="p-3">Wholesaler</th>
                  <th className="p-3">Purchase Bill & Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHuids.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-mono font-bold text-amber-800">{item.huid || 'N/A'}</td>
                    <td className="p-3 font-semibold">{item.purity} {item.type}</td>
                    <td className="p-3">{item.grossWeight}g / {item.netWeight}g</td>
                    <td className="p-3">{item.supplierName}</td>
                    <td className="p-3">{item.billNo} ({item.billDate})</td>
                  </tr>
                ))}
                {filteredHuids.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-400">No HUID records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
// END OF FILE
