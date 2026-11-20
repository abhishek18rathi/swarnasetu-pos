import React, { useState } from 'react';
import { Search, Trash2, Send, Percent, Printer, CheckCircle2, FileText, MessageCircle, Archive, X, Lock, AlertCircle, ShoppingBag, Wrench } from 'lucide-react';

export default function SalesBillingModule({
  currentUser, liveRates, inventoryItems = [], setInventoryItems,
  estimates = [], setEstimates, invoices = [], setInvoices
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin;
  const canEstimate = isAdmin || !!currentUser?.privileges?.sales_estimate;
  const canDiscount = isAdmin || !!currentUser?.privileges?.sales_discount;
  const canPrintBill = isAdmin || !!currentUser?.privileges?.billing_print;

  const [tab, setTab] = useState('estimate');
  const [banner, setBanner] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [activeDiscountEstId, setActiveDiscountEstId] = useState(null);
  const [targetFinalInput, setTargetFinalInput] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI / Bank');
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [confirmClearId, setConfirmClearId] = useState(null);

  const showBanner = (m) => { setBanner(m); setTimeout(() => setBanner(''), 4000); };

  const liveStock = inventoryItems.filter(i => i.status === 'live');
  const inAmendmentStock = inventoryItems.filter(i => i.status === 'alteration');
  const soldStock = inventoryItems.filter(i => i.status === 'sold');

  const getRate = (item) => item.material === 'Silver' ? Number(liveRates.silver) || 0 : item.material === 'Gold-Diamond' ? Number(liveRates.gold18) || 0 : Number(liveRates.gold22) || 0;
  const getPurity = (item) => item.material === 'Silver' ? 'Silver' : item.material === 'Gold-Diamond' ? '18K' : '22K';

  const handleAddItem = (item) => {
    if (cartItems.some(c => c.id === item.id)) return showBanner(`"${item.code}" already added.`);
    if (item.reservedFor && !customerName.trim()) setCustomerName(item.reservedFor);
    if (item.reservedMobile && !customerMobile.trim()) setCustomerMobile(item.reservedMobile);
    const rate = getRate(item);
    const wt = Number(item.netWeight) || Number(item.grossWeight) || 0;
    const metalVal = wt * rate;
    const making = item.makingMode === 'percent' ? metalVal * ((Number(item.makingValue) || 0) / 100) : wt * (Number(item.makingValue) || 0);
    setCartItems([...cartItems, {
      id: item.id, code: item.code, material: item.material, type: item.type, imageUrl: item.imageUrl,
      grossWeight: Number(item.grossWeight) || wt, netWeight: wt, purity: getPurity(item),
      lockedRate: rate, metalValue: Math.round(metalVal * 100) / 100,
      makingMode: item.makingMode, makingValue: Number(item.makingValue) || 0,
      originalMaking: Math.round(making * 100) / 100, finalMaking: Math.round(making * 100) / 100,
      alterationNote: item.alterationNote || ''
    }]);
    setCodeSearch('');
  };

  const handleChangePurity = (id, purity) => {
    const rate = purity === '24K' ? Number(liveRates.gold24) : purity === '18K' ? Number(liveRates.gold18) : purity === 'Silver' ? Number(liveRates.silver) : Number(liveRates.gold22);
    setCartItems(cartItems.map(l => {
      if (l.id !== id) return l;
      const mVal = l.netWeight * rate;
      const mk = l.makingMode === 'percent' ? mVal * (l.makingValue / 100) : l.netWeight * l.makingValue;
      return { ...l, purity, lockedRate: rate, metalValue: Math.round(mVal * 100) / 100, originalMaking: Math.round(mk * 100) / 100, finalMaking: Math.round(mk * 100) / 100 };
    }));
  };

  const calcTotals = (items) => {
    const metalTotal = items.reduce((s, i) => s + Number(i.metalValue || 0), 0);
    const origMakingTotal = items.reduce((s, i) => s + Number(i.originalMaking || 0), 0);
    const finalMakingTotal = items.reduce((s, i) => s + Number(i.finalMaking || 0), 0);
    const subTotal = metalTotal + finalMakingTotal;
    const gstAmount = Math.round(subTotal * 0.03 * 100) / 100;
    return {
      metalTotal: Math.round(metalTotal * 100) / 100,
      origMakingTotal: Math.round(origMakingTotal * 100) / 100,
      finalMakingTotal: Math.round(finalMakingTotal * 100) / 100,
      subTotal: Math.round(subTotal * 100) / 100,
      gstAmount, grandTotal: Math.round((subTotal + gstAmount) * 100) / 100,
      discountGiven: Math.max(0, Math.round((origMakingTotal - finalMakingTotal) * 100) / 100)
    };
  };

  const handleCreateEstimate = (status) => {
    if (!cartItems.length) return showBanner('Add at least 1 item.');
    const estNo = `EST-${estimates.length + 101}`;
    setEstimates([{
      id: Date.now(), estNo, date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      salesmanName: currentUser.name, customerName: customerName.trim() || 'Walk-in Customer',
      customerMobile: customerMobile.trim(), items: cartItems, ...calcTotals(cartItems),
      status, approvedBy: status === 'ready_for_billing' ? 'Direct (No Discount)' : ''
    }, ...estimates]);
    setCartItems([]); setCustomerName(''); setCustomerMobile('');
    showBanner(status === 'pending_discount' ? `${estNo} sent to Manager!` : `${estNo} sent to Billing!`);
    if (status === 'pending_discount' && canDiscount) setTab('manager');
    if (status === 'ready_for_billing' && canPrintBill) setTab('billing');
  };

  const applyReverseDiscount = (est) => {
    const target = parseFloat(targetFinalInput);
    if (isNaN(target) || target <= 0) return showBanner('Enter valid Final Amount.');
    const metalTotal = est.items.reduce((s, i) => s + Number(i.metalValue || 0), 0);
    const reqMaking = (target / 1.03) - metalTotal;
    if (reqMaking < 0) return showBanner(`Min allowed (Metal + 3% GST): ₹${Math.ceil(metalTotal * 1.03)}`);
    const origMkSum = est.items.reduce((s, i) => s + Number(i.originalMaking || 0), 0);
    let allocated = 0;
    const updatedItems = est.items.map((it, idx) => {
      if (idx === est.items.length - 1) return { ...it, finalMaking: Math.max(0, Math.round((reqMaking - allocated) * 100) / 100) };
      const mk = Math.round(reqMaking * (origMkSum > 0 ? it.originalMaking / origMkSum : 1 / est.items.length) * 100) / 100;
      allocated += mk;
      return { ...it, finalMaking: mk };
    });
    const exactPre = Math.round((target / 1.03) * 100) / 100;
    setEstimates(estimates.map(e => e.id === est.id ? {
      ...e, items: updatedItems, ...calcTotals(updatedItems),
      subTotal: exactPre, gstAmount: Math.round((target - exactPre) * 100) / 100, grandTotal: target,
      status: 'ready_for_billing', approvedBy: currentUser.name
    } : e));
    setActiveDiscountEstId(null); setTargetFinalInput('');
    showBanner(`${est.estNo} approved at ₹${target.toLocaleString('en-IN')}!`);
  };

  const handleGenerateBill = (est) => {
    if (!canPrintBill) return;
    const invNo = `INV-${new Date().getFullYear()}-${invoices.length + 1001}`;
    const today = new Date().toISOString().slice(0, 10);
    const inv = {
      id: Date.now(), invoiceNo: invNo, estNo: est.estNo, date: today,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: est.customerName, customerMobile: est.customerMobile,
      paymentMode, items: est.items, subTotal: est.subTotal, gstAmount: est.gstAmount, grandTotal: est.grandTotal
    };
    setInvoices([inv, ...invoices]);
    setEstimates(estimates.map(e => e.id === est.id ? { ...e, status: 'billed', invoiceNo: invNo } : e));
    const soldSet = new Set(est.items.map(i => i.id));
    setInventoryItems(inventoryItems.map(i => soldSet.has(i.id) ? { ...i, status: 'sold', reservedFor: '', soldDate: today, invoiceNo: invNo } : i));
    setViewingInvoice(inv);
    showBanner(`Invoice ${invNo} generated!`);
  };

  const sendWhatsApp = (inv) => {
    const lines = inv.items.map((it, idx) => `${idx + 1}. ${it.code} (${it.type} ${it.netWeight}g): ₹${(it.metalValue + it.finalMaking).toLocaleString('en-IN')}`).join('%0A');
    const msg = `*SWARNASETU JEWELLERS*%0AInv: *${inv.invoiceNo}* | ${inv.date}%0ACustomer: ${inv.customerName}%0A${lines}%0ASubtotal: ₹${inv.subTotal}%0AGST (3%): ₹${inv.gstAmount}%0A*Total: ₹${inv.grandTotal}*`;
    const ph = (inv.customerMobile || '').replace(/\D/g, '');
    window.open(ph.length >= 10 ? `https://wa.me/91${ph.slice(-10)}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  const matches = codeSearch.trim()
    ? liveStock.filter(i => i.code.toLowerCase().includes(codeSearch.toLowerCase()) || i.type.toLowerCase().includes(codeSearch.toLowerCase()) || (i.reservedFor && i.reservedFor.toLowerCase().includes(codeSearch.toLowerCase())))
    : liveStock.slice(0, 8);
  const lockedMatches = codeSearch.trim()
    ? inAmendmentStock.filter(i => i.code.toLowerCase().includes(codeSearch.toLowerCase()) || (i.alteration?.customerName && i.alteration.customerName.toLowerCase().includes(codeSearch.toLowerCase())))
    : [];

  const totals = calcTotals(cartItems);
  const pendingDiscount = estimates.filter(e => e.status === 'pending_discount');
  const readyBilling = estimates.filter(e => e.status === 'ready_for_billing');
  const soldPhotos = soldStock.filter(i => i.imageUrl && !i.photoClearedByAdmin).length;

  return (
    <div className="space-y-4">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex justify-between">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      <div className="bg-white p-2 rounded-xl border flex flex-wrap gap-1.5">
        {[
          { id: 'estimate', label: '1. Estimate', icon: ShoppingBag },
          { id: 'manager', label: `2. Discount (${pendingDiscount.length})`, icon: Percent },
          { id: 'billing', label: `3. Billing (${readyBilling.length})`, icon: Printer },
          { id: 'sold', label: `4. Sold Folder (${soldStock.length})`, icon: Archive }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'estimate' && (
        <div className="grid lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <h3 className="text-sm font-bold">Select Jewelry</h3>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-slate-50">
              <Search size={14} className="text-slate-400" />
              <input type="text" value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} placeholder="Code, type, customer..." className="w-full bg-transparent outline-none font-semibold" />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {matches.map(item => (
                <div key={item.id} onClick={() => handleAddItem(item)} className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 ${item.reservedFor ? 'border-emerald-300 bg-emerald-50/40' : 'hover:border-amber-400'}`}>
                  <img src={item.imageUrl} alt={item.code} className="w-11 h-11 rounded object-cover border shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{item.code} {item.reservedFor && <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded ml-1">Ready: {item.reservedFor}</span>}</div>
                    <div className="text-[11px] text-slate-500">{item.type} • {item.netWeight || item.grossWeight}g</div>
                  </div>
                  <span className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold">+ Add</span>
                </div>
              ))}
              {lockedMatches.map(l => (
                <div key={l.id} className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center gap-2 text-[11px]">
                  <Wrench size={14} className="text-amber-700 shrink-0" />
                  <div><strong>{l.code}</strong> in Amendment for {l.alteration?.customerName}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border space-y-4">
            <h3 className="text-sm font-bold border-b pb-2">Customer Estimate</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" className="px-3 py-1.5 border rounded-lg font-semibold" />
              <input type="tel" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="Customer Mobile" className="px-3 py-1.5 border rounded-lg" />
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr><th className="p-2.5">Item & Note</th><th className="p-2.5">Wt</th><th className="p-2.5">Purity</th><th className="p-2.5">Metal</th><th className="p-2.5">Making</th><th className="p-2.5"></th></tr>
                </thead>
                <tbody className="divide-y">
                  {cartItems.map(line => (
                    <tr key={line.id}>
                      <td className="p-2.5">
                        <div className="font-bold">{line.code} • {line.type}</div>
                        <input type="text" value={line.alterationNote} onChange={(e) => setCartItems(cartItems.map(c => c.id === line.id ? { ...c, alterationNote: e.target.value } : c))} placeholder="Amendment note..." className="mt-1 w-full px-2 py-0.5 text-[10px] border rounded bg-slate-50" />
                      </td>
                      <td className="p-2.5 font-bold">{line.netWeight}g</td>
                      <td className="p-2.5">
                        {line.material !== 'Silver' ? (
                          <select value={line.purity} onChange={(e) => handleChangePurity(line.id, e.target
