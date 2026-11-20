import React, { useState } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  ClipboardList, Search, Upload, CheckCircle2, X, Printer,
  MessageCircle, Hammer, Sparkles, Scale, Image as ImageIcon
} from 'lucide-react';

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

export default function CustomOrdersModule({
  currentUser,
  liveRates,
  inventoryItems = [],
  setInventoryItems,
  karigarList = [],
  customOrders = [],
  setCustomOrders
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin;
  const hasAccess = isAdmin || !!currentUser?.privileges?.orders_b2b_urd;

  const [tab, setTab] = useState('new'); // 'new' | 'list'
  const [orderMode, setOrderMode] = useState('fresh'); // 'fresh' | 'stock_modify'
  const [banner, setBanner] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Existing Stock Search State
  const [stockSearch, setStockSearch] = useState('');
  const [linkedStockItem, setLinkedStockItem] = useState(null);

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Jewelry Specs, Size, Purity, Weight & Volume
  const [metal, setMetal] = useState('Gold');
  const [purity, setPurity] = useState('22K');
  const [itemType, setItemType] = useState('Ring');
  const [sizeSpec, setSizeSpec] = useState(''); // e.g., Ring Size 16 / Bangle 2.6 / Length 18"
  const [targetWeight, setTargetWeight] = useState('');
  const [volumeNotes, setVolumeNotes] = useState(''); // e.g., Broad band, hollow/solid, stone setting
  const [makingPercent, setMakingPercent] = useState('14');
  const [designInstructions, setDesignInstructions] = useState('');

  // Reference Photo Upload
  const [refPreview, setRefPreview] = useState('');
  const [refFileName, setRefFileName] = useState('');

  // Gold Give / Take & Advance Calculation
  const [oldGoldGivenWt, setOldGoldGivenWt] = useState('');
  const [oldGoldTouchPct, setOldGoldTouchPct] = useState('91.6');
  const [cashAdvance, setCashAdvance] = useState('');
  const [assignedKarigarId, setAssignedKarigarId] = useState('');

  // Receipt Print & Filter
  const [printSlipOrder, setPrintSlipOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

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

  const liveStock = (inventoryItems || []).filter((i) => i.status === 'live');
  const matchingStock = stockSearch.trim()
    ? liveStock.filter(
        (i) =>
          i.code.toLowerCase().includes(stockSearch.toLowerCase()) ||
          i.type.toLowerCase().includes(stockSearch.toLowerCase())
      )
    : liveStock.slice(0, 6);

  const handleSelectExistingStock = (item) => {
    setLinkedStockItem(item);
    setMetal(item.material || 'Gold');
    setPurity(item.material === 'Silver' ? 'Silver' : item.material === 'Gold-Diamond' ? '18K' : '22K');
    setItemType(item.type || 'Ring');
    setTargetWeight(String(item.netWeight || item.grossWeight || ''));
    setMakingPercent(item.makingMode === 'percent' ? String(item.makingValue || 12) : '12');
    if (item.imageUrl && !refPreview) {
      setRefPreview(item.imageUrl);
      setRefFileName(`${item.code} (Existing Stock Photo)`);
    }
    setStockSearch('');
  };

  const handleReferencePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRefFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 560;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setRefPreview(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const getRatePerGram = (selectedPurity) => {
    if (selectedPurity === '24K') return Number(liveRates?.gold24) || 7850;
    if (selectedPurity === '18K') return Number(liveRates?.gold18) || 5950;
    if (selectedPurity === 'Silver') return Number(liveRates?.silver) || 92;
    return Number(liveRates?.gold22) || 7250;
  };

  // Live Calculations for Order Preview
  const estWt = parseFloat(targetWeight) || 0;
  const activeRate = getRatePerGram(purity);
  const estMetalValue = Math.round(estWt * activeRate);
  const estMakingValue = Math.round(estMetalValue * ((parseFloat(makingPercent) || 0) / 100));
  const estGst = Math.round((estMetalValue + estMakingValue) * 0.03);
  const approxTotalBill = estMetalValue + estMakingValue + estGst;

  // Gold Give / Take Calculation
  const targetPurityPct = purity === '24K' ? 99.9 : purity === '18K' ? 75.0 : purity === 'Silver' ? 99.9 : 91.6;
  const targetFineRequired = Math.round(estWt * (targetPurityPct / 100) * 1000) / 1000;

  const custOldWt = parseFloat(oldGoldGivenWt) || 0;
  const custOldTouch = parseFloat(oldGoldTouchPct) || 91.6;
  const custFineGiven = Math.round(custOldWt * (custOldTouch / 100) * 1000) / 1000;
  const custEquivalentInTargetPurity =
    targetPurityPct > 0 ? Math.round((custFineGiven / (targetPurityPct / 100)) * 1000) / 1000 : 0;

  // Positive = Showroom needs extra gold from customer/stock; Negative = Customer gave excess gold
  const netTargetGoldDiff = Math.round((estWt - custEquivalentInTargetPurity) * 1000) / 1000;
  const oldGoldValueCredit = Math.round(custEquivalentInTargetPurity * activeRate);
  const advanceRs = parseFloat(cashAdvance) || 0;
  const approxBalanceDue = Math.max(0, approxTotalBill - oldGoldValueCredit - advanceRs);

  const handleSaveCustomOrder = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) return showBanner('Please enter Customer Name.');
    if (orderMode === 'stock_modify' && !linkedStockItem) {
      return showBanner('Please select an existing stock item by code first.');
    }

    setIsSaving(true);
    const orderNo = `ORD-${String((customOrders || []).length + 201)}`;
    let uploadedRefUrl = refPreview;

    if (refPreview && refPreview.startsWith('data:image')) {
      try {
        const blob = dataUrlToBlob(refPreview);
        const sRef = ref(storage, `swarnasetu_orders/${orderNo}_${Date.now()}.jpg`);
        await uploadBytes(sRef, blob);
        uploadedRefUrl = await getDownloadURL(sRef);
      } catch (err) {
        uploadedRefUrl = refPreview;
      }
    }

    const karigar = karigarList.find((k) => k.id === assignedKarigarId);

    const newOrder = {
      id: Date.now(),
      orderNo,
      date: new Date().toISOString().slice(0, 10),
      orderMode,
      linkedStockCode: linkedStockItem ? linkedStockItem.code : '',
      linkedStockId: linkedStockItem ? linkedStockItem.id : null,
      originalStockWt: linkedStockItem ? Number(linkedStockItem.grossWeight) || 0 : 0,
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      deliveryDate,
      metal,
      purity,
      itemType: itemType.trim(),
      sizeSpec: sizeSpec.trim(),
      targetWeight: estWt,
      volumeNotes: volumeNotes.trim(),
      makingPercent: parseFloat(makingPercent) || 0,
      designInstructions: designInstructions.trim(),
      referenceImageUrl: uploadedRefUrl,
      lockedRatePerGram: activeRate,
      approxTotalBill,
      oldGoldGivenWt: custOldWt,
      oldGoldTouchPct: custOldTouch,
      custEquivalentInTargetPurity,
      netTargetGoldDiff,
      oldGoldValueCredit,
      cashAdvance: advanceRs,
      approxBalanceDue,
      karigarId: karigar ? karigar.id : '',
      karigarName: karigar ? karigar.name : 'Unassigned',
      status: 'Order Booked',
      createdBy: currentUser?.name || 'Staff'
    };

    // If modifying existing stock, lock it in Inventory so nobody else sells it
    if (orderMode === 'stock_modify' && linkedStockItem && setInventoryItems) {
      setInventoryItems(
        (inventoryItems || []).map((inv) =>
          inv.id === linkedStockItem.id
            ? {
                ...inv,
                status: 'alteration',
                alteration: {
                  slipNo: orderNo,
                  customerName: newOrder.customerName,
                  customerMobile: newOrder.customerMobile,
                  instruction: `${newOrder.designInstructions} ${newOrder.sizeSpec ? `(Size: ${newOrder.sizeSpec})` : ''}`,
                  deliveryDate: newOrder.deliveryDate,
                  karigarId: newOrder.karigarId,
                  karigarName: newOrder.karigarName,
                  advancePaid: newOrder.cashAdvance,
                  sentDate: newOrder.date,
                  oldGrossWeight: inv.grossWeight,
                  oldNetWeight: inv.netWeight
                }
              }
            : inv
        )
      );
    }

    setCustomOrders([newOrder, ...(customOrders || [])]);
    setPrintSlipOrder(newOrder);

    // Reset form
    setLinkedStockItem(null);
    setCustomerName('');
    setCustomerMobile('');
    setDeliveryDate('');
    setSizeSpec('');
    setTargetWeight('');
    setVolumeNotes('');
    setDesignInstructions('');
    setRefPreview('');
    setRefFileName('');
    setOldGoldGivenWt('');
    setCashAdvance('');
    setIsSaving(false);
    setTab('list');
    showBanner(`Custom Order ${orderNo} booked successfully!`);
  };

  const handleStatusUpdate = (orderId, nextStatus) => {
    setCustomOrders(
      (customOrders || []).map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    showBanner(`Order status updated to "${nextStatus}".`);
  };

  const handleSendWhatsApp = (ord) => {
    const msg =
      `*SWARNASETU JEWELLERS - CUSTOM ORDER*%0A` +
      `Order No: *${ord.orderNo}*%0A` +
      `Customer: *${ord.customerName}*%0A` +
      `Item: *${ord.purity} ${ord.itemType}*${ord.linkedStockCode ? ` (Ref Stock: ${ord.linkedStockCode})` : ''}%0A` +
      (ord.sizeSpec ? `Size: *${ord.sizeSpec}*%0A` : '') +
      `Est. Weight: *${ord.targetWeight}g* @ ₹${ord.lockedRatePerGram}/g%0A` +
      (ord.oldGoldGivenWt > 0
        ? `Old Gold Given: ${ord.oldGoldGivenWt}g (${ord.custEquivalentInTargetPurity}g ${ord.purity} eq.)%0A`
        : '') +
      `Approx. Total: *₹${ord.approxTotalBill.toLocaleString('en-IN')}*%0A` +
      `Cash Advance: ₹${ord.cashAdvance.toLocaleString('en-IN')}%0A` +
      `Status: *${ord.status}*%0A` +
      (ord.deliveryDate ? `Expected Delivery: *${ord.deliveryDate}*%0A` : '') +
      `Thank you!`;

    const digits = (ord.customerMobile || '').replace(/\D/g, '');
    const url =
      digits.length >= 10
        ? `https://wa.me/91${digits.slice(-10)}?text=${msg}`
        : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const filteredOrders = (customOrders || []).filter(
    (o) => statusFilter === 'All' || o.status === statusFilter
  );

  return (
    <div className="space-y-4 text-xs">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex justify-between items-center">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      {/* Top Navigation */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTab('new')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              tab === 'new' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles size={14} /> + Book Custom / Stock Modification Order
          </button>
          <button
            onClick={() => setTab('list')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              tab === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList size={14} /> Order Book & Tracking ({(customOrders || []).length})
          </button>
        </div>
      </div>

      {/* TAB 1: NEW CUSTOM ORDER OR EXISTING STOCK MODIFICATION */}
      {tab === 'new' && (
        <form onSubmit={handleSaveCustomOrder} className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Mode Switcher */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">1. Choose Order Type</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderMode('fresh');
                      setLinkedStockItem(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      orderMode === 'fresh' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    New Made-to-Order Design
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderMode('stock_modify')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      orderMode === 'stock_modify' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Modify Existing Stock (Search Code)
                  </button>
                </div>
              </div>

              {/* Existing Stock Search Box when modifying showroom stock */}
              {orderMode === 'stock_modify' && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                  <label className="block font-bold text-amber-950">
                    Search Existing Live Vault Item by Tag Code or Type *
                  </label>
                  <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-1.5">
                    <Search size={14} className="text-amber-700" />
                    <input
                      type="text"
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="Type tag code (e.g. GLD-RIN-1001)..."
                      className="w-full outline-none font-semibold"
                    />
                  </div>

                  {linkedStockItem ? (
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-300 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img src={linkedStockItem.imageUrl} alt={linkedStockItem.code} className="w-11 h-11 rounded object-cover border" />
                        <div>
                          <div className="font-bold text-slate-900">
                            Selected Stock: {linkedStockItem.code} ({linkedStockItem.material} {linkedStockItem.type})
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Current Gross: <strong>{linkedStockItem.grossWeight}g</strong> • Net: <strong>{linkedStockItem.netWeight}g</strong>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkedStockItem(null)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded font-semibold"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pt-1">
                      {matchingStock.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectExistingStock(item)}
                          className="p-2 bg-white hover:bg-amber-100/50 border border-slate-200 rounded-lg cursor-pointer flex items-center gap-2"
                        >
                          <img src={item.imageUrl} alt={item.code} className="w-9 h-9 rounded object-cover border shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{item.code}</div>
                            <div className="text-[10px] text-slate-500">{item.type} • {item.grossWeight}g</div>
                          </div>
                        </div>
                      ))}
                      {matchingStock.length === 0 && (
                        <div className="col-span-full text-center text-slate-500 py-2">No matching Live Vault stock found.</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Info */}
              <div className="grid sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Customer Name *</label>
                  <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Mobile (WhatsApp Alerts) *</label>
                  <input type="tel" required value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="10-digit mobile" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Promised Delivery Date *</label>
                  <input type="date" required value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold" />
                </div>
              </div>
            </div>

            {/* Jewelry Specs: Ring Size, Purity, Weight, Volume & Reference Image */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                2. Specifications: Size, Gold Purity, Weight, Volume & Reference Pic
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Metal Category</label>
                  <select
                    value={metal}
                    onChange={(e) => {
                      const m = e.target.value;
                      setMetal(m);
                      setPurity(m === 'Silver' ? 'Silver' : m === 'Gold-Diamond' ? '18K' : '22K');
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold-Diamond">Gold-Diamond</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Gold / Metal Purity *</label>
                  <select value={purity} onChange={(e) => setPurity(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold bg-amber-50/40">
                    <option value="22K">22K (916 Hallmark)</option>
                    <option value="24K">24K (999 Pure)</option>
                    <option value="18K">18K (750 Diamond)</option>
                    <option value="Silver">Fine Silver</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Jewelry Type *</label>
                  <input type="text" required value={itemType} onChange={(e) => setItemType(e.target.value)} placeholder="Ring, Bangle, Necklace..." className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg" />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Ring / Bangle / Length Size</label>
                  <input type="text" value={sizeSpec} onChange={(e) => setSizeSpec(e.target.value)} placeholder="e.g. Ring #16 / 2.6 Anna / 18 in" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold" />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Est. Target Weight (g) *</label>
                  <input type="number" step="0.001" required value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="e.g. 14.500" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-teal-800" />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Volume / Width / Build</label>
                  <input type="text" value={volumeNotes} onChange={(e) => setVolumeNotes(e.target.value)} placeholder="e.g. Heavy solid / 8mm broad" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg" />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Making Charges (%)</label>
                  <input type="number" step="0.1" value={makingPercent} onChange={(e) => setMakingPercent(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg" />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Assign Karigar</label>
                  <select value={assignedKarigarId} onChange={(e) => setAssignedKarigarId(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg">
                    <option value="">Decide Later</option>
                    {karigarList.map((k) => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Custom Design / Modification Instructions *</label>
                <textarea
                  rows="2"
                  required
                  value={designInstructions}
                  onChange={(e) => setDesignInstructions(e.target.value)}
                  placeholder="Write full details: stone color, engraving text, kunda/lock style, rhodium polish, or exact modification on existing piece..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Upload Any Reference Image */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload size={14} className="text-orange-600" /> Upload Reference Pic (Any Design / Screenshot / Sketch)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReferencePhotoUpload}
                    className="w-full text-[11px] bg-white p-1.5 border border-slate-200 rounded-lg"
                  />
                  {refFileName && <div className="text-[10px] text-emerald-700 font-semibold">Attached: {refFileName}</div>}
                </div>

                {refPreview ? (
                  <img src={refPreview} alt="Reference" className="w-20 h-20 object-cover rounded-xl border border-slate-300 shadow-2xs" />
                ) : (
                  <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-[10px] text-slate-400">
                    <ImageIcon size={18} className="mb-1" />
                    No Pic
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Gold Give/Take & Approx Estimate Summary */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Scale size={15} className="text-amber-600" /> 3. Gold Give/Take & Approx Rate
            </h3>

            {/* Customer Old Gold Give Input */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
              <div className="font-bold text-amber-950">Customer Old Gold Given (Optional)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Old Gold Wt (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={oldGoldGivenWt}
                    onChange={(e) => setOldGoldGivenWt(e.target.value)}
                    placeholder="0.000"
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Old Gold Touch (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={oldGoldTouchPct}
                    onChange={(e) => setOldGoldTouchPct(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-semibold"
                  />
                </div>
              </div>
              {custOldWt > 0 && (
                <div className="text-[11px] text-amber-900 pt-1 border-t border-amber-200/70">
                  Equivalent {purity} Gold Given: <strong>{custEquivalentInTargetPurity} g</strong> (Credit: ₹{oldGoldValueCredit.toLocaleString('en-IN')})
                </div>
              )}
            </div>

            {/* Cash Advance Input */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Cash / UPI Advance Paid (₹)</label>
              <input
                type="number"
                step="1"
                value={cashAdvance}
                onChange={(e) => setCashAdvance(e.target.value)}
                placeholder="e.g. 10000"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-emerald-700"
              />
            </div>

            {/* Complete Financial & Metal Summary Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Today's {purity} Rate:</span>
                <strong>₹{activeRate.toLocaleString('en-IN')} / g</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Est. Metal ({estWt}g):</span>
                <strong>₹{estMetalValue.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Est. Making ({makingPercent}%):</span>
                <strong>₹{estMakingValue.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Est. GST (3%):</span>
                <strong>₹{estGst.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Approx. Total Value:</span>
                <span>₹{approxTotalBill.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Net {purity} Gold Take / (Give):</span>
                  <strong className={netTargetGoldDiff > 0 ? 'text-amber-800' : 'text-emerald-700'}>
                    {netTargetGoldDiff > 0
                      ? `Take ${netTargetGoldDiff}g extra`
                      : netTargetGoldDiff < 0
                      ? `Return ${Math.abs(netTargetGoldDiff)}g excess`
                      : '0.000g (Exact Match)'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Approx. Cash Balance Due:</span>
                  <strong className="text-slate-900">₹{approxBalanceDue.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg"
            >
              {isSaving ? 'Uploading & Booking Order...' : 'Book Custom Order & Print Slip'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: ORDER BOOK & TRACKING */}
      {tab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Custom & Stock Modification Orders ({filteredOrders.length})</h3>
              <p className="text-[11px] text-slate-500">Track sizes, reference photos, Karigar assignment, gold give/take & delivery</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Order Booked', 'With Karigar', 'Ready for Delivery', 'Delivered'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredOrders.map((ord) => (
              <div key={ord.id} className="p-4 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 max-w-2xl">
                  {ord.referenceImageUrl ? (
                    <img
                      src={ord.referenceImageUrl}
                      alt={ord.orderNo}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                      No Pic
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{ord.orderNo}</span>
                      <span className="font-bold text-slate-800">• {ord.customerName}</span>
                      <span className="text-slate-500">({ord.customerMobile || 'No Mobile'})</span>
                      {ord.linkedStockCode && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                          Stock Mod: {ord.linkedStockCode}
                        </span>
                      )}
                    </div>

                    <div className="text-slate-700">
                      <strong>{ord.purity} {ord.itemType}</strong> • Target Wt: <strong>{ord.targetWeight}g</strong>
                      {ord.sizeSpec ? ` • Size: ${ord.sizeSpec}` : ''}
                      {ord.volumeNotes ? ` • Build: ${ord.volumeNotes}` : ''}
                    </div>

                    <div className="text-[11px] text-slate-600">
                      Instructions: <strong>{ord.designInstructions}</strong>
                    </div>

                    <div className="flex flex-wrap gap-3 text-[11px] pt-0.5">
                      <span>Approx Total: <strong>₹{ord.approxTotalBill.toLocaleString('en-IN')}</strong></span>
                      <span>Advance: <strong className="text-emerald-700">₹{ord.cashAdvance.toLocaleString('en-IN')}</strong></span>
                      {ord.oldGoldGivenWt > 0 && (
                        <span>
                          Old Gold Given: <strong>{ord.oldGoldGivenWt}g</strong> ({ord.custEquivalentInTargetPurity}g {ord.purity} eq.)
                        </span>
                      )}
                      <span>Karigar: <strong>{ord.karigarName}</strong></span>
                      {ord.deliveryDate && <span>Due: <strong>{ord.deliveryDate}</strong></span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <select
                    value={ord.status}
                    onChange={(e) => handleStatusUpdate(ord.id, e.target.value)}
                    className={`px-2.5 py-1 rounded-lg font-bold border ${
                      ord.status === 'Delivered'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : ord.status === 'Ready for Delivery'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <option value="Order Booked">Order Booked</option>
                    <option value="With Karigar">With Karigar</option>
                    <option value="Ready for Delivery">Ready for Delivery</option>
                    <option value="Delivered">Delivered</option>
                  </select>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPrintSlipOrder(ord)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md inline-flex items-center gap-1"
                    >
                      <Printer size={12} /> Order Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(ord)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-md inline-flex items-center gap-1"
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                No custom orders in this view yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Custom Order Slip Modal */}
      {printSlipOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b print:hidden">
              <span className="font-bold text-slate-900">Custom Jewelry Order Voucher</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-slate-900 text-white rounded-lg font-semibold inline-flex items-center gap-1"
                >
                  <Printer size={12} /> Print Slip
                </button>
                <button
                  onClick={() => setPrintSlipOrder(null)}
                  className="px-3 py-1 bg-slate-100 rounded-lg font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-slate-400 rounded-xl space-y-2.5">
              <div className="text-center border-b pb-2">
                <div className="font-bold text-sm text-slate-900">SWARNASETU JEWELLERS</div>
                <div className="text-[11px] text-slate-500">Custom Order & Stock Modification Receipt</div>
              </div>

              <div className="flex justify-between">
                <span>Order No: <strong>{printSlipOrder.orderNo}</strong></span>
                <span>Date: <strong>{printSlipOrder.date}</strong></span>
              </div>
              <div>
                Customer: <strong>{printSlipOrder.customerName}</strong> ({printSlipOrder.customerMobile || 'N/A'})
              </div>
              <div>
                Ornament: <strong>{printSlipOrder.purity} {printSlipOrder.itemType}</strong>
                {printSlipOrder.linkedStockCode ? ` (Ref Stock: ${printSlipOrder.linkedStockCode})` : ''}
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                <div>Size: <strong>{printSlipOrder.sizeSpec || 'Standard'}</strong></div>
                <div>Est. Weight: <strong>{printSlipOrder.targetWeight} g</strong></div>
                <div>Volume/Build: <strong>{printSlipOrder.volumeNotes || '-'}</strong></div>
                <div>Locked Rate: <strong>₹{printSlipOrder.lockedRatePerGram}/g</strong></div>
              </div>

              {printSlipOrder.referenceImageUrl && (
                <div className="flex items-center gap-3 p-2 border rounded-lg">
                  <img src={printSlipOrder.referenceImageUrl} alt="Design Ref" className="w-16 h-16 object-cover rounded border" />
                  <div className="text-[11px]">
                    <div className="font-bold">Design / Modification Details:</div>
                    <div>{printSlipOrder.designInstructions}</div>
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-2 border-t text-[11px]">
                <div className="flex justify-between">
                  <span>Approx. Total Estimate (incl. GST):</span>
                  <strong>₹{printSlipOrder.approxTotalBill.toLocaleString('en-IN')}</strong>
                </div>
                {printSlipOrder.oldGoldGivenWt > 0 && (
                  <div className="flex justify-between">
                    <span>Old Gold Given ({printSlipOrder.oldGoldGivenWt}g @ {printSlipOrder.oldGoldTouchPct}%):</span>
                    <strong>{printSlipOrder.custEquivalentInTargetPurity}g {printSlipOrder.purity} (₹{printSlipOrder.oldGoldValueCredit.toLocaleString('en-IN')})</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Cash / UPI Advance Received:</span>
                  <strong>₹{printSlipOrder.cashAdvance.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t">
                  <span>Approx. Balance Due at Delivery ({printSlipOrder.deliveryDate || 'TBD'}):</span>
                  <span>₹{printSlipOrder.approxBalanceDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// END OF FILE
