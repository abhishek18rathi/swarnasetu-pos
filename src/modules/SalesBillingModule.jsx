import React, { useState } from 'react';
import {
  Search, Trash2, Send, Percent, Printer, CheckCircle2,
  FileText, MessageCircle, Archive, X, Lock, AlertCircle, ShoppingBag, Wrench
} from 'lucide-react';

export default function SalesBillingModule({
  currentUser,
  liveRates,
  inventoryItems = [],
  setInventoryItems,
  estimates = [],
  setEstimates,
  invoices = [],
  setInvoices
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

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4500);
  };

  const liveStock = inventoryItems.filter(i => i.status === 'live');
  const inAmendmentStock = inventoryItems.filter(i => i.status === 'alteration');
  const soldStock = inventoryItems.filter(i => i.status === 'sold');

  const getDefaultRateForItem = (item) => {
    if (item.material === 'Silver') return Number(liveRates.silver) || 0;
    if (item.material === 'Gold-Diamond') return Number(liveRates.gold18) || 0;
    return Number(liveRates.gold22) || 0;
  };

  const getDefaultPurityLabel = (item) => {
    if (item.material === 'Silver') return 'Silver';
    if (item.material === 'Gold-Diamond') return '18K';
    return '22K';
  };

  const handleAddItemToEstimate = (item) => {
    if (cartItems.some(c => c.id === item.id)) {
      showBanner(`"${item.code}" is already in this estimate.`);
      return;
    }

    if (item.reservedFor && !customerName.trim()) {
      setCustomerName(item.reservedFor);
    }
    if (item.reservedMobile && !customerMobile.trim()) {
      setCustomerMobile(item.reservedMobile);
    }

    const rate = getDefaultRateForItem(item);
    const purity = getDefaultPurityLabel(item);
    const wt = Number(item.netWeight) || Number(item.grossWeight) || 0;
    const metalVal = wt * rate;
    const origMaking = item.makingMode === 'percent'
      ? metalVal * ((Number(item.makingValue) || 0) / 100)
      : wt * (Number(item.makingValue) || 0);

    const line = {
      id: item.id,
      code: item.code,
      material: item.material,
      type: item.type,
      imageUrl: item.imageUrl,
      grossWeight: Number(item.grossWeight) || wt,
      netWeight: wt,
      diamondCarat: Number(item.diamondCarat) || 0,
      purity,
      lockedRate: rate,
      metalValue: Math.round(metalVal * 100) / 100,
      makingMode: item.makingMode,
      makingValue: Number(item.makingValue) || 0,
      originalMaking: Math.round(origMaking * 100) / 100,
      finalMaking: Math.round(origMaking * 100) / 100,
      alterationNote: item.alterationNote || '',
      reservedFor: item.reservedFor || ''
    };

    setCartItems([...cartItems, line]);
    setCodeSearch('');
  };

  const handleChangeLinePurity = (lineId, newPurity) => {
    const rateMap = {
      '24K': Number(liveRates.gold24) || 0,
      '22K': Number(liveRates.gold22) || 0,
      '18K': Number(liveRates.gold18) || 0,
      'Silver': Number(liveRates.silver) || 0
    };
    const newRate = rateMap[newPurity] || 0;

    setCartItems(cartItems.map(line => {
      if (line.id !== lineId) return line;
      const metalVal = line.netWeight * newRate;
      const origMaking = line.makingMode === 'percent'
        ? metalVal * (line.makingValue / 100)
        : line.netWeight * line.makingValue;
      return {
        ...line,
        purity: newPurity,
        lockedRate: newRate,
        metalValue: Math.round(metalVal * 100) / 100,
        originalMaking: Math.round(origMaking * 100) / 100,
        finalMaking: Math.round(origMaking * 100) / 100
      };
    }));
  };

  const handleUpdateLineNote = (lineId, noteVal) => {
    setCartItems(cartItems.map(line =>
      line.id === lineId ? { ...line, alterationNote: noteVal } : line
    ));
  };

  const calcTotals = (items) => {
    const metalTotal = items.reduce((s, i) => s + Number(i.metalValue || 0), 0);
    const origMakingTotal = items.reduce((s, i) => s + Number(i.originalMaking || 0), 0);
    const finalMakingTotal = items.reduce((s, i) => s + Number(i.finalMaking || 0), 0);
    const subTotal = metalTotal + finalMakingTotal;
    const gstAmount = Math.round(subTotal * 0.03 * 100) / 100;
    const grandTotal = Math.round((subTotal + gstAmount) * 100) / 100;
    const discountGiven = Math.max(0, Math.round((origMakingTotal - finalMakingTotal) * 100) / 100);
    return {
      metalTotal: Math.round(metalTotal * 100) / 100,
      origMakingTotal: Math.round(origMakingTotal * 100) / 100,
      finalMakingTotal: Math.round(finalMakingTotal * 100) / 100,
      subTotal: Math.round(subTotal * 100) / 100,
      gstAmount,
      grandTotal,
      discountGiven
    };
  };

  const handleCreateEstimate = (targetStatus) => {
    if (cartItems.length === 0) {
      showBanner('Please add at least 1 jewelry item to the estimate.');
      return;
    }
    const totals = calcTotals(cartItems);
    const estNo = `EST-${String(estimates.length + 101)}`;

    const newEstimate = {
      id: Date.now(),
      estNo,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      salesmanId: currentUser.id,
      salesmanName: currentUser.name,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerMobile: customerMobile.trim(),
      items: cartItems,
      ...totals,
      status: targetStatus,
      approvedBy: targetStatus === 'ready_for_billing' ? 'No Discount (Direct)' : ''
    };

    setEstimates([newEstimate, ...estimates]);
    setCartItems([]);
    setCustomerName('');
    setCustomerMobile('');

    if (targetStatus === 'pending_discount') {
      showBanner(`Estimate ${estNo} sent to Manager for Discount Approval!`);
      if (canDiscount) setTab('manager');
    } else {
      showBanner(`Estimate ${estNo} pushed directly to Billing Counter!`);
      if (canPrintBill) setTab('billing');
    }
  };

  const applySmartReverseDiscount = (est) => {
    const desiredFinal = parseFloat(targetFinalInput);
    if (isNaN(desiredFinal) || desiredFinal <= 0) {
      showBanner('Enter a valid Target Final Amount.');
      return;
    }

    const metalTotal = est.items.reduce((s, i) => s + Number(i.metalValue || 0), 0);
    const requiredPreGst = desiredFinal / 1.03;
    const requiredMakingTotal = requiredPreGst - metalTotal;

    if (requiredMakingTotal < 0) {
      showBanner(`Cannot go below locked Metal Value + 3% GST (Min: ₹${Math.ceil(metalTotal * 1.03).toLocaleString('en-IN')}).`);
      return;
    }

    const totalOrigMaking = est.items.reduce((s, i) => s + Number(i.originalMaking || 0), 0);
    const totalWt = est.items.reduce((s, i) => s + Number(i.netWeight || 0), 0);

    let allocatedMaking = 0;
    const updatedItems = est.items.map((item, idx) => {
      if (idx === est.items.length - 1) {
        const rem = Math.max(0, Math.round((requiredMakingTotal - allocatedMaking) * 100) / 100);
        return { ...item, finalMaking: rem };
      }
      const share = totalOrigMaking > 0
        ? (item.originalMaking / totalOrigMaking)
        : (totalWt > 0 ? (item.netWeight / totalWt) : (1 / est.items.length));
      const itemMaking = Math.round(requiredMakingTotal * share * 100) / 100;
      allocatedMaking += itemMaking;
      return { ...item, finalMaking: itemMaking };
    });

    const newTotals = calcTotals(updatedItems);
    const exactPreGst = Math.round((desiredFinal / 1.03) * 100) / 100;
    const exactGst = Math.round((desiredFinal - exactPreGst) * 100) / 100;

    setEstimates(estimates.map(e =>
      e.id === est.id
        ? {
            ...e,
            items: updatedItems,
            ...newTotals,
            subTotal: exactPreGst,
            gstAmount: exactGst,
            grandTotal: desiredFinal,
            status: 'ready_for_billing',
            approvedBy: currentUser.name
          }
        : e
    ));

    setActiveDiscountEstId(null);
    setTargetFinalInput('');
    showBanner(`Discount approved for ${est.estNo}! Final Bill locked at ₹${desiredFinal.toLocaleString('en-IN')} and sent to Billing Counter.`);
  };

  const handleGenerateFinalBill = (est) => {
    if (!canPrintBill) return;
    const invNo = `INV-${new Date().getFullYear()}-${String(invoices.length + 1001)}`;
    const todayStr = new Date().toISOString().slice(0, 10);

    const newInvoice = {
      id: Date.now(),
      invoiceNo: invNo,
      estNo: est.estNo,
      date: todayStr,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: est.customerName,
      customerMobile: est.customerMobile,
      salesmanName: est.salesmanName,
      approvedBy: est.approvedBy,
      cashierName: currentUser.name,
      paymentMode,
      items: est.items,
      metalTotal: est.metalTotal,
      finalMakingTotal: est.finalMakingTotal,
      discountGiven: est.discountGiven,
      subTotal: est.subTotal,
      gstAmount: est.gstAmount,
      grandTotal: est.grandTotal
    };

    setInvoices([newInvoice, ...invoices]);
    setEstimates(estimates.map(e => (e.id === est.id ? { ...e, status: 'billed', invoiceNo: invNo } : e)));

    const soldIds = new Set(est.items.map(i => i.id));
    setInventoryItems(inventoryItems.map(invItem =>
      soldIds.has(invItem.id)
        ? {
            ...invItem,
            status: 'sold',
            reservedFor: '',
            soldDate: todayStr,
            invoiceNo: invNo,
            soldToCustomer: est.customerName
          }
        : invItem
    ));

    setViewingInvoice(newInvoice);
    showBanner(`GST Invoice ${invNo} generated! Items moved to Sold Folder.`);
  };

  const handleSendWhatsApp = (inv) => {
    const itemLines = inv.items
      .map((it, idx) => `${idx + 1}. ${it.code} (${it.type} - ${it.netWeight}g)${it.alterationNote ? ` [${it.alterationNote}]` : ''} : ₹${(it.metalValue + it.finalMaking).toLocaleString('en-IN')}`)
      .join('%0A');
    const text =
      `*SWARNASETU JEWELLERS - TAX INVOICE*%0A` +
      `Invoice No: *${inv.invoiceNo}*%0A` +
      `Date: ${inv.date}%0A` +
      `Customer: ${inv.customerName}%0A` +
      `----------------------------%0A` +
      `${itemLines}%0A` +
      `----------------------------%0A` +
      `Taxable Value: ₹${inv.subTotal.toLocaleString('en-IN')}%0A` +
      `GST (3%): ₹${inv.gstAmount.toLocaleString('en-IN')}%0A` +
      `*Grand Total: ₹${inv.grandTotal.toLocaleString('en-IN')}*%0A` +
      `Payment: ${inv.paymentMode}%0A` +
      `Thank you for shopping with us!`;

    const phone = (inv.customerMobile || '').replace(/\D/g, '');
    const waUrl = phone.length >= 10
      ? `https://wa.me/91${phone.slice(-10)}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleClearSoldPhoto = (itemId) => {
    if (!isAdmin) return;
    setInventoryItems(inventoryItems.map(item =>
      item.id === itemId ? { ...item, imageUrl: '', photoClearedByAdmin: true } : item
    ));
    setConfirmClearId(null);
    showBanner('Sold item photo deleted from cloud storage.');
  };

  const matchingLiveStock = codeSearch.trim()
    ? liveStock.filter(i =>
        i.code.toLowerCase().includes(codeSearch.toLowerCase()) ||
        i.type.toLowerCase().includes(codeSearch.toLowerCase()) ||
        (i.reservedFor && i.reservedFor.toLowerCase().includes(codeSearch.toLowerCase()))
      )
    : liveStock.slice(0, 8);

  const lockedWorkshopMatches = codeSearch.trim()
    ? inAmendmentStock.filter(i =>
        i.code.toLowerCase().includes(codeSearch.toLowerCase()) ||
        (i.alteration?.customerName && i.alteration.customerName.toLowerCase().includes(codeSearch.toLowerCase()))
      )
    : [];

  const currentTotals = calcTotals(cartItems);
  const pendingDiscountList = estimates.filter(e => e.status === 'pending_discount');
  const readyBillingList = estimates.filter(e => e.status === 'ready_for_billing');
  const soldWithPhotosCount = soldStock.filter(i => i.imageUrl && !i.photoClearedByAdmin).length;

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
          { id: 'estimate', label: '1. Salesman Estimate', icon: ShoppingBag },
          { id: 'manager', label: `2. Manager Discount (${pendingDiscountList.length})`, icon: Percent },
          { id: 'billing', label: `3. Billing Counter (${readyBillingList.length})`, icon: Printer },
          { id: 'sold', label: `4. Invoices & Sold Folder (${soldStock.length})`, icon: Archive }
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

      {tab === 'estimate' && (
        <div className="grid lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Search Jewelry by Code / Customer</h3>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
              <Search size={15} className="text-slate-400" />
              <input
                type="text"
                value={codeSearch}
                onChange={(e) => setCodeSearch(e.target.value)}
                placeholder="Tag code, item type, or customer..."
                className="w-full bg-transparent outline-none font-semibold"
              />
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pt-1">
              {matchingLiveStock.map(item => {
                const rate = getDefaultRateForItem(item);
                const wt = Number(item.netWeight) || Number(item.grossWeight) || 0;
                const estMetal = wt * rate;
                const estMaking = item.makingMode === 'percent' ? estMetal * (item.makingValue / 100) : wt * item.makingValue;
                const approxTotal = Math.round((estMetal + estMaking) * 1.03);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAddItemToEstimate(item)}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                      item.reservedFor
                        ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50'
                        : 'border-slate-200/80 hover:border-amber-400 hover:bg-amber-50/30'
                    }`}
                  >
                    <img src={item.imageUrl} alt={item.code} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{item.code}</span>
                        {item.reservedFor && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold shrink-0">
                            Ready: {item.reservedFor}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.material} • {item.type} • <strong>{wt}g</strong></div>
                      {item.alterationNote && (
                        <div className="text-[10px] text-emerald-800 font-medium truncate">Amended: {item.alterationNote}</div>
                      )}
                      <div className="text-[11px] font-bold text-amber-700">Est. ₹{approxTotal.toLocaleString('en-IN')} (incl. GST)</div>
                    </div>
                    <span className="px-2 py-1 bg-slate-900 text-white rounded-md text-[10px] font-bold shrink-0">+ Add</span>
                  </div>
                );
              })}

              {lockedWorkshopMatches.map(locked => (
                <div key={locked.id} className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center gap-2.5 opacity-85">
                  <Wrench size={15} className="text-amber-700 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{locked.code} — Locked in Amendment</div>
                    <div className="text-[10px] text-amber-800">For: {locked.alteration?.customerName} • Complete return in Karigar Desk first</div>
                  </div>
                </div>
              ))}

              {matchingLiveStock.length === 0 && lockedWorkshopMatches.length === 0 && (
                <p className="text-center text-slate-400 py-6">No matching Live Stock found.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Customer Estimate Sheet</h3>
              <span className="text-[11px] text-slate-500">Auto-calculated with Live Metal Rates & 3% GST</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Customer Mobile (for WhatsApp Bill)</label>
                <input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Item & Amendment Note</th>
                    <th className="p-2.5">Net Wt</th>
                    <th className="p-2.5">Purity & Rate</th>
                    <th className="p-2.5">Metal Val</th>
                    <th className="p-2.5">Making</th>
                    <th className="p-2.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItems.map(line => (
                    <tr key={line.id}>
                      <td className="p-2.5">
                        <div className="flex items-start gap-2">
                          <img src={line.imageUrl} alt={line.code} className="w-9 h-9 rounded object-cover border shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900">{line.code} • {line.type}</div>
                            <input
                              type="text"
                              value={line.alterationNote}
                              onChange={(e) => handleUpdateLineNote(line.id, e.target.value)}
                              placeholder="Optional bill note / amendment detail..."
                              className="mt-1 w-full px-2 py-0.5 text-[10px] border border-slate-200 rounded bg-slate-50/70 text-slate-700"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">{line.netWeight}g</td>
                      <td className="p-2.5">
                        {line.material !== 'Silver' ? (
                          <select
                            value={line.purity}
                            onChange={(e) => handleChangeLinePurity(line.id, e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded text-[11px] font-bold bg-amber-50/50"
                          >
                            <option value="22K">22K (₹{liveRates.gold22})</option>
                            <option value="24K">24K (₹{liveRates.gold24})</option>
                            <option value="18K">18K (₹{liveRates.gold18})</option>
                          </select>
                        ) : (
                          <span className="font-semibold">Silver (₹{line.lockedRate}/g)</span>
                        )}
                      </td>
                      <td className="p-2.5 font-semibold">₹{line.metalValue.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 font-semibold text-slate-700">₹{line.finalMaking.toLocaleString('en-IN')}</td>
                      <td className="p-2.5">
                        <button onClick={() => setCartItems(cartItems.filter(c => c.id !== line.id))} className="text-red-500 hover:bg-red-50 p-1 rounded">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cartItems.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400">Select items from the left to build an instant customer estimate.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {cartItems.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="text-slate-600">Metal Value: <strong>₹{currentTotals.metalTotal.toLocaleString('en-IN')}</strong> • Making: <strong>₹{currentTotals.finalMakingTotal.toLocaleString('en-IN')}</strong></div>
                  <div className="text-slate-600">GST (3%): <strong>₹{currentTotals.gstAmount.toLocaleString('en-IN')}</strong></div>
                  <div className="text-base font-bold text-slate-900">Grand Total: ₹{currentTotals.grandTotal.toLocaleString('en-IN')}</div>
                </div>

                {canEstimate && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreateEstimate('pending_discount')}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
                    >
                      <Percent size={14} /> Send to Manager for Discount
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateEstimate('ready_for_billing')}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
                    >
                      <Send size={14} /> Confirm & Send Direct to Billing
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'manager' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Manager Discount Approval Desk ({pendingDiscountList.length})</h3>
                <p className="text-[11px] text-slate-500">Enter the desired Final Amount; Gold Rate & 3% GST remain strictly locked while Making Charges adjust automatically.</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold text-[11px]">
                <Lock size={12} /> Gold Rate & 3% GST Locked
              </span>
            </div>

            {pendingDiscountList.length === 0 && (
              <p className="text-center text-slate-400 py-8">No estimates waiting for discount approval.</p>
            )}

            <div className="space-y-3">
              {pendingDiscountList.map(est => {
                const isEditing = activeDiscountEstId === est.id;
                const previewDesired = isEditing ? parseFloat(targetFinalInput) : NaN;
                const previewPreGst = !isNaN(previewDesired) ? previewDesired / 1.03 : 0;
                const previewNewMaking = !isNaN(previewDesired) ? Math.round((previewPreGst - est.metalTotal) * 100) / 100 : 0;
                const previewNewGst = !isNaN(previewDesired) ? Math.round((previewDesired - previewPreGst) * 100) / 100 : 0;

                return (
                  <div key={est.id} className="p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{est.estNo}</span> • <strong>{est.customerName}</strong> ({est.customerMobile || 'No Mobile'})
                        <div className="text-[11px] text-slate-500">Salesman: {est.salesmanName} • Items: {est.items.map(i => `${i.code} (${i.netWeight}g)`).join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-slate-500">Original Estimate Total</div>
                        <div className="text-sm font-bold text-slate-900">₹{est.grandTotal.toLocaleString('en-IN')}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px]">
                      <div>Locked Metal Value: <strong className="text-slate-900">₹{est.metalTotal.toLocaleString('en-IN')}</strong></div>
                      <div>Original Making: <strong className="text-slate-900">₹{est.origMakingTotal.toLocaleString('en-IN')}</strong></div>
                      <div>Locked GST (3%): <strong className="text-slate-900">₹{est.gstAmount.toLocaleString('en-IN')}</strong></div>
                    </div>

                    {canDiscount ? (
                      isEditing ? (
                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <div>
                              <label className="block font-bold text-slate-800 mb-1">Enter Target Final Amount (Incl. 3% GST) ₹</label>
                              <input
                                type="number"
                                step="1"
                                value={targetFinalInput}
                                onChange={(e) => setTargetFinalInput(e.target.value)}
                                placeholder={`e.g. ${Math.floor(est.grandTotal - 500)}`}
                                className="px-3 py-1.5 bg-white border border-amber-400 rounded-lg font-bold text-sm w-48"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => applySmartReverseDiscount(est)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                            >
                              Approve & Push to Billing
                            </button>
                            <button
                              type="button"
                              onClick={() => { setActiveDiscountEstId(null); setTargetFinalInput(''); }}
                              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>

                          {!isNaN(previewDesired) && previewDesired > 0 && (
                            <div className="text-[11px] text-slate-700 flex flex-wrap gap-4 pt-1 border-t border-amber-200/70">
                              <span>Locked Metal: <strong>₹{est.metalTotal.toLocaleString('en-IN')}</strong></span>
                              <span>Reverse-Adjusted Making: <strong className={previewNewMaking < 0 ? 'text-red-600' : 'text-emerald-700'}>₹{previewNewMaking.toLocaleString('en-IN')}</strong></span>
                              <span>Recalculated 3% GST: <strong>₹{previewNewGst.toLocaleString('en-IN')}</strong></span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => { setActiveDiscountEstId(est.id); setTargetFinalInput(String(Math.floor(est.grandTotal))); }}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
                          >
                            Set Final Amount / Give Discount
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEstimates(estimates.map(e => e.id === est.id ? { ...e, status: 'ready_for_billing', approvedBy: `${currentUser.name} (Full Rate)` } : e));
                              showBanner(`${est.estNo} approved without discount and sent to Billing Counter.`);
                            }}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg"
                          >
                            Approve Without Discount
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="text-amber-700 font-semibold">Waiting for Manager privilege to approve discount.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Billing Counter Queue ({readyBillingList.length})</h3>
                <p className="text-[11px] text-slate-500">Verify approved figures, select payment mode, and issue 2-copy GST Tax Invoice.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Payment Mode:</span>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-semibold">
                  <option value="UPI / Bank">UPI / Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Old Gold Exchange + Cash">Old Gold Exchange + Cash</option>
                </select>
              </div>
            </div>

            {readyBillingList.length === 0 && (
              <p className="text-center text-slate-400 py-8">No approved estimates ready for billing right now.</p>
            )}

            <div className="space-y-3">
              {readyBillingList.map(est => (
                <div key={est.id} className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{est.estNo} • {est.customerName}</div>
                    <div className="text-[11px] text-slate-500">
                      Items: <strong>{est.items.map(i => `${i.code} (${i.netWeight}g)`).join(', ')}</strong>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold">
                      Approved by: {est.approvedBy} {est.discountGiven > 0 ? `• Making Discount: ₹${est.discountGiven.toLocaleString('en-IN')}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500">Taxable: ₹{est.subTotal.toLocaleString('en-IN')} + GST: ₹{est.gstAmount.toLocaleString('en-IN')}</div>
                      <div className="text-base font-bold text-slate-900">₹{est.grandTotal.toLocaleString('en-IN')}</div>
                    </div>
                    {canPrintBill && (
                      <button
                        type="button"
                        onClick={() => handleGenerateFinalBill(est)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
                      >
                        <FileText size={14} /> Generate Final GST Bill
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sold' && (
        <div className="space-y-5 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Generated GST Invoices ({invoices.length})</h3>
              <span className="text-[11px] text-slate-500">Click any invoice to view 2-Copy Print / PDF / WhatsApp</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Grand Total</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="p-3 font-bold text-slate-900">{inv.invoiceNo}</td>
                      <td className="p-3 text-slate-600">{inv.date}</td>
                      <td className="p-3 font-semibold">{inv.customerName}</td>
                      <td className="p-3">{inv.items.map(i => i.code).join(', ')}</td>
                      <td className="p-3 font-bold text-emerald-700">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingInvoice(inv)}
                          className="px-2.5 py-1 bg-slate-900 text-white font-semibold rounded-md inline-flex items-center gap-1"
                        >
                          <Printer size={12} /> 2-Copy Bill / PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(inv)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-md inline-flex items-center gap-1"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan="6" className="p-6 text-center text-slate-400">No final bills generated yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sold Items Archive Folder ({soldStock.length})</h3>
                <p className="text-[11px] text-slate-500">Sold jewelry automatically moves here from Live Vault. System never auto-deletes photos.</p>
              </div>
              {soldWithPhotosCount > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1.5">
                  <AlertCircle size={14} /> Storage Notice: {soldWithPhotosCount} sold item photo(s) occupy cloud space. Admin may delete old photos manually.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {soldStock.map(item => (
                <div key={item.id} className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.code} className="w-full h-28 object-cover rounded-lg border border-slate-200 mb-2" />
                    ) : (
                      <div className="w-full h-28 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 mb-2">
                        Photo Cleared
                      </div>
                    )}
                    <div className="font-bold text-slate-900">{item.code}</div>
                    <div className="text-[11px] text-slate-500">{item.type} • {item.netWeight}g</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Bill: <strong>{item.invoiceNo}</strong> ({item.soldDate})</div>
                  </div>

                  {isAdmin && item.imageUrl && (
                    <div className="mt-2 pt-2 border-t border-slate-200/70">
                      {confirmClearId === item.id ? (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => handleClearSoldPhoto(item.id)} className="flex-