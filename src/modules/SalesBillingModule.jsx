import React, { useState } from 'react';
import {
  Search, Trash2, Send, Percent, Printer, CheckCircle2,
  FileText, MessageCircle, Archive, X, Lock, AlertCircle, ShoppingBag, Wrench
} from 'lucide-react';

export default function SalesBillingModule({
  currentUser, liveRates,
  inventoryItems = [], setInventoryItems,
  estimates = [], setEstimates,
  invoices = [], setInvoices
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

  const showBanner = (msg) => { setBanner(msg); setTimeout(() => setBanner(''), 4000); };

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
    const grandTotal = Math.round((subTotal + gstAmount) * 100) / 100;
    return {
      metalTotal: Math.round(metalTotal * 100) / 100,
      origMakingTotal: Math.round(origMakingTotal * 100) / 100,
      finalMakingTotal: Math.round(finalMakingTotal * 100) / 100,
      subTotal: Math.round(subTotal * 100) / 100,
      gstAmount, grandTotal,
      discountGiven: Math.max(0, Math.round((origMakingTotal - finalMakingTotal) * 100) / 100)
    };
  };

  const handleCreateEstimate = (status) => {
    if (!cartItems.length) return showBanner('Add at least 1 jewelry item.');
    const estNo = `EST-${estimates.length + 101}`;
    setEstimates([{
      id: Date.now(), estNo, date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      salesmanName: currentUser.name, customerName: customerName.trim() || 'Walk-in Customer',
      customerMobile: customerMobile.trim(), items: cartItems, ...calcTotals(cartItems),
      status, approvedBy: status === 'ready_for_billing' ? 'Direct (No Discount)' : ''
    }, ...estimates]);
    setCartItems([]); setCustomerName(''); setCustomerMobile('');
    showBanner(status === 'pending_discount' ? `Estimate ${estNo} sent to Manager!` : `Estimate ${estNo} sent to Billing!`);
    if (status === 'pending_discount' && canDiscount) setTab('manager');
    if (status === 'ready_for_billing' && canPrintBill) setTab('billing');
  };

  const applyReverseDiscount = (est) => {
    const target = parseFloat(targetFinalInput);
    if (isNaN(target) || target <= 0) return showBanner('Enter valid Final Amount.');
    const metalTotal = est.items.reduce((s, i) => s + Number(i.metalValue || 0), 0);
    const reqPreGst = target / 1.03;
    const reqMaking = reqPreGst - metalTotal;
    if (reqMaking < 0) return showBanner(`Minimum allowed (Metal + 3% GST): ₹${Math.ceil(metalTotal * 1.03)}`);

    const origMkSum = est.items.reduce((s, i) => s + Number(i.originalMaking || 0), 0);
    let allocated = 0;
    const updatedItems = est.items.map((it, idx) => {
      if (idx === est.items.length - 1) return { ...it, finalMaking: Math.max(0, Math.round((reqMaking - allocated) * 100) / 100) };
      const share = origMkSum > 0 ? it.originalMaking / origMkSum : 1 / est.items.length;
      const mk = Math.round(reqMaking * share * 100) / 100;
      allocated += mk;
      return { ...it, finalMaking: mk };
    });

    const exactPre = Math.round((target / 1.03) * 100) / 100;
    const exactGst = Math.round((target - exactPre) * 100) / 100;
    setEstimates(estimates.map(e => e.id === est.id ? {
      ...e, items: updatedItems, ...calcTotals(updatedItems),
      subTotal: exactPre, gstAmount: exactGst, grandTotal: target,
      status: 'ready_for_billing', approvedBy: currentUser.name
    } : e));
    setActiveDiscountEstId(null); setTargetFinalInput('');
    showBanner(`${est.estNo} approved at ₹${target.toLocaleString('en-IN')} & sent to Billing!`);
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
    const msg = `*SWARNASETU JEWELLERS - TAX INVOICE*%0AInv: *${inv.invoiceNo}* | Date: ${inv.date}%0ACustomer: ${inv.customerName}%0A----------------%0A${lines}%0A----------------%0ASubtotal: ₹${inv.subTotal}%0AGST (3%): ₹${inv.gstAmount}%0A*Grand Total: ₹${inv.grandTotal}*%0APayment: ${inv.paymentMode}`;
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
          <span>{banner}</span><button onClick={() => setBanner('')}><X size={14} /></button>
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
              <input type="text" value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} placeholder="Search code, type, customer..." className="w-full bg-transparent outline-none font-semibold" />
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
              <input type="tel" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="Customer Mobile (WhatsApp)" className="px-3 py-1.5 border rounded-lg" />
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
                        <input type="text" value={line.alterationNote} onChange={(e) => setCartItems(cartItems.map(c => c.id === line.id ? { ...c, alterationNote: e.target.value } : c))} placeholder="Optional amendment note..." className="mt-1 w-full px-2 py-0.5 text-[10px] border rounded bg-slate-50" />
                      </td>
                      <td className="p-2.5 font-bold">{line.netWeight}g</td>
                      <td className="p-2.5">
                        {line.material !== 'Silver' ? (
                          <select value={line.purity} onChange={(e) => handleChangePurity(line.id, e.target.value)} className="px-1.5 py-1 border rounded font-bold bg-amber-50/50">
                            <option value="22K">22K (₹{liveRates.gold22})</option><option value="24K">24K (₹{liveRates.gold24})</option><option value="18K">18K (₹{liveRates.gold18})</option>
                          </select>
                        ) : <span>Silver (₹{line.lockedRate})</span>}
                      </td>
                      <td className="p-2.5">₹{line.metalValue.toLocaleString('en-IN')}</td>
                      <td className="p-2.5">₹{line.finalMaking.toLocaleString('en-IN')}</td>
                      <td className="p-2.5"><button onClick={() => setCartItems(cartItems.filter(c => c.id !== line.id))} className="text-red-500"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  {!cartItems.length && <tr><td colSpan="6" className="p-6 text-center text-slate-400">Add items from the left list.</td></tr>}
                </tbody>
              </table>
            </div>

            {cartItems.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div>Metal: <strong>₹{totals.metalTotal.toLocaleString('en-IN')}</strong> | Making: <strong>₹{totals.finalMakingTotal.toLocaleString('en-IN')}</strong> | GST (3%): <strong>₹{totals.gstAmount.toLocaleString('en-IN')}</strong></div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">Grand Total: ₹{totals.grandTotal.toLocaleString('en-IN')}</div>
                </div>
                {canEstimate && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleCreateEstimate('pending_discount')} className="px-3.5 py-2 bg-amber-600 text-white font-semibold rounded-lg inline-flex items-center gap-1"><Percent size={14} /> Manager Discount</button>
                    <button type="button" onClick={() => handleCreateEstimate('ready_for_billing')} className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg inline-flex items-center gap-1"><Send size={14} /> Direct to Billing</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'manager' && (
        <div className="bg-white p-5 rounded-2xl border space-y-4 text-xs">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-bold">Manager Discount Desk ({pendingDiscount.length})</h3>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold inline-flex items-center gap-1"><Lock size={12} /> Gold & 3% GST Locked</span>
          </div>
          {pendingDiscount.map(est => {
            const isEd = activeDiscountEstId === est.id;
            const target = isEd ? parseFloat(targetFinalInput) : NaN;
            const revMk = !isNaN(target) ? Math.round(((target / 1.03) - est.metalTotal) * 100) / 100 : 0;
            return (
              <div key={est.id} className="p-4 rounded-xl border space-y-2.5">
                <div className="flex justify-between">
                  <div><strong>{est.estNo}</strong> • {est.customerName} (Salesman: {est.salesmanName})</div>
                  <div className="font-bold text-sm">₹{est.grandTotal.toLocaleString('en-IN')}</div>
                </div>
                {canDiscount && (isEd ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <input type="number" value={targetFinalInput} onChange={(e) => setTargetFinalInput(e.target.value)} placeholder="Target Final ₹" className="px-3 py-1.5 bg-white border rounded-lg font-bold w-40" />
                      <button type="button" onClick={() => applyReverseDiscount(est)} className="px-3.5 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg">Approve & Send Billing</button>
                      <button type="button" onClick={() => setActiveDiscountEstId(null)} className="px-3 py-1.5 bg-white border rounded-lg">Cancel</button>
                    </div>
                    {!isNaN(target) && <div className="text-[11px]">Adjusted Making: <strong>₹{revMk}</strong> (Metal ₹{est.metalTotal} + 3% GST Locked)</div>}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setActiveDiscountEstId(est.id); setTargetFinalInput(String(Math.floor(est.grandTotal))); }} className="px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-lg">Set Final Amount</button>
                    <button type="button" onClick={() => setEstimates(estimates.map(e => e.id === est.id ? { ...e, status: 'ready_for_billing', approvedBy: currentUser.name } : e))} className="px-3 py-1.5 bg-slate-100 font-semibold rounded-lg">Approve Full Rate</button>
                  </div>
                ))}
              </div>
            );
          })}
          {!pendingDiscount.length && <p className="text-center text-slate-400 py-6">No pending discount requests.</p>}
        </div>
      )}

      {tab === 'billing' && (
        <div className="bg-white p-5 rounded-2xl border space-y-4 text-xs">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
            <h3 className="text-sm font-bold">Billing Counter ({readyBilling.length})</h3>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="px-3 py-1.5 border rounded-lg font-semibold">
              <option value="UPI / Bank">UPI / Bank</option><option value="Cash">Cash</option><option value="Card">Card</option><option value="Old Gold + Cash">Old Gold + Cash</option>
            </select>
          </div>
          {readyBilling.map(est => (
            <div key={est.id} className="p-4 rounded-xl border flex flex-wrap justify-between items-center gap-3">
              <div>
                <div className="font-bold text-sm">{est.estNo} • {est.customerName}</div>
                <div className="text-slate-500">Items: {est.items.map(i => `${i.code} (${i.netWeight}g)`).join(', ')}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right font-bold text-base">₹{est.grandTotal.toLocaleString('en-IN')}</div>
                {canPrintBill && <button type="button" onClick={() => handleGenerateBill(est)} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg inline-flex items-center gap-1"><FileText size={14} /> Issue GST Bill</button>}
              </div>
            </div>
          ))}
          {!readyBilling.length && <p className="text-center text-slate-400 py-6">No bills pending.</p>}
        </div>
      )}

      {tab === 'sold' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b font-bold text-sm">Generated Invoices ({invoices.length})</div>
            <div className="divide-y">
              {invoices.map(inv => (
                <div key={inv.id} className="p-3.5 flex flex-wrap justify-between items-center gap-2">
                  <div><strong>{inv.invoiceNo}</strong> • {inv.customerName} ({inv.date}) — <strong>₹{inv.grandTotal.toLocaleString('en-IN')}</strong></div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setViewingInvoice(inv)} className="px-2.5 py-1 bg-slate-900 text-white font-semibold rounded inline-flex items-center gap-1"><Printer size={12} /> 2-Copy Bill</button>
                    <button onClick={() => sendWhatsApp(inv)} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded inline-flex items-center gap-1"><MessageCircle size={12} /> WhatsApp</button>
                  </div>
                </div>
              ))}
              {!invoices.length && <div className="p-6 text-center text-slate-400">No invoices yet.</div>}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2">
              <h3 className="text-sm font-bold">Sold Items Folder ({soldStock.length})</h3>
              {soldPhotos > 0 && <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[11px] font-semibold inline-flex items-center gap-1"><AlertCircle size={13} /> {soldPhotos} sold photo(s) in cloud</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {soldStock.map(it => (
                <div key={it.id} className="p-2.5 border rounded-xl bg-slate-50/50 space-y-1.5">
                  {it.imageUrl ? <img src={it.imageUrl} alt={it.code} className="w-full h-24 object-cover rounded border" /> : <div className="w-full h-24 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">Photo Cleared</div>}
                  <div className="font-bold">{it.code} ({it.netWeight}g)</div>
                  <div className="text-[10px] text-slate-500">Bill: {it.invoiceNo}</div>
                  {isAdmin && it.imageUrl && (confirmClearId === it.id ? (
                    <button onClick={() => { setInventoryItems(inventoryItems.map(x => x.id === it.id ? { ...x, imageUrl: '', photoClearedByAdmin: true } : x)); setConfirmClearId(null); }} className="w-full py-1 bg-red-600 text-white rounded text-[10px] font-bold">Confirm Delete Photo</button>
                  ) : (
                    <button onClick={() => setConfirmClearId(it.id)} className="w-full py-1 bg-red-50 text-red-700 rounded text-[10px] font-semibold">Delete Sold Photo</button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-2 print:hidden">
              <span className="text-sm font-bold">2-Copy Tax Invoice</span>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded">Print 2 Copies / PDF</button>
                <button onClick={() => sendWhatsApp(viewingInvoice)} className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded">WhatsApp</button>
                <button onClick={() => setViewingInvoice(null)} className="px-3 py-1 bg-slate-100 text-xs font-semibold rounded">Close</button>
              </div>
            </div>
            {['ORIGINAL FOR CUSTOMER', 'DUPLICATE FOR SHOWROOM'].map((copy, idx) => (
              <div key={copy} className={`p-4 border border-slate-300 rounded-xl text-xs space-y-2 ${idx === 1 ? 'border-dashed mt-4' : ''}`}>
                <div className="flex justify-between border-b pb-2">
                  <div><div className="font-bold text-sm">SWARNASETU JEWELLERS</div><div className="text-[10px] text-slate-500">Tax Invoice (GST 3%)</div></div>
                  <div className="text-right"><span className="px-1.5 py-0.5 bg-slate-100 border text-[9px] font-bold">{copy}</span><div className="font-bold">{viewingInvoice.invoiceNo}</div><div className="text-[10px]">{viewingInvoice.date}</div></div>
                </div>
                <div className="flex justify-between text-[11px] bg-slate-50 p-2 rounded">
                  <span>Customer: <strong>{viewingInvoice.customerName}</strong></span>
                  <span>Mode: <strong>{viewingInvoice.paymentMode}</strong></span>
                </div>
                <table className="w-full text-left border border-slate-300">
                  <thead className="bg-slate-100 border-b text-[10px]">
                    <tr><th className="p-1.5 border-r">S.No</th><th className="p-1.5 border-r">Description & Photo</th><th className="p-1.5 border-r">Weight</th><th className="p-1.5 border-r">Rate</th><th className="p-1.5 text-right">Making</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewingInvoice.items.map((it, i) => (
                      <tr key={it.id}>
                        <td className="p-1.5 border-r align-top font-bold">{i + 1}</td>
                        <td className="
