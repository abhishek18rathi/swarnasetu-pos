import React, { useState, useEffect } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Package, Plus, Printer, CheckCircle2, Trash2, Edit3,
  UserCheck, ClipboardCheck, Sparkles, Search, Save, X, AlertTriangle, Layers, Wrench
} from 'lucide-react';

const DEFAULT_TYPES = {
  Gold: ['Ring', 'Bangle', 'Chain', 'Necklace', 'Earrings', 'Mangalsutra', 'Bracelet', 'Pendant', 'Nose Pin', 'Tikka'],
  Silver: ['Payal (Anklet)', 'Bichiya (Toe Ring)', 'Ring', 'Chain', 'Bracelet', 'Murti / Idol', 'Bartaan / Utensil', 'Coin'],
  'Gold-Diamond': ['Solitaire Ring', 'Diamond Necklace', 'Diamond Earrings', 'Diamond Bangle', 'Diamond Pendant', 'Diamond Bracelet', 'Nose Pin']
};

const STUDIO_BACKDROPS = {
  Gold: { label: 'Royal Maroon Velvet', bg: '#4a0e17', border: '#d4af37' },
  Silver: { label: 'Midnight Navy Velvet', bg: '#0f172a', border: '#cbd5e1' },
  'Gold-Diamond': { label: 'Pearl Ivory Studio', bg: '#f8fafc', border: '#94a3b8' }
};

const QUICK_AMEND_TAGS = [
  'Size Increase/Decrease',
  'Length Adjust (+/-)',
  'Lock / Kunda Change',
  'Rhodium / Matte Polish',
  'Moti / Drops / Stone Work',
  'Name Engraving'
];

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

export default function InventoryModule({
  currentUser,
  staffList = [],
  karigarList = [],
  inventoryItems = [],
  setInventoryItems,
  customJewelTypes = { Gold: [], Silver: [], 'Gold-Diamond': [] },
  setCustomJewelTypes,
  nightAudits = [],
  setNightAudits
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin;
  const canCreate = isAdmin || !!currentUser?.privileges?.inv_create;
  const canModify = isAdmin || !!currentUser?.privileges?.inv_modify;
  const canDelete = isAdmin || !!currentUser?.privileges?.inv_delete;

  const [tab, setTab] = useState(canCreate ? 'entry' : 'vault');
  const [entryMode, setEntryMode] = useState('single');
  const [banner, setBanner] = useState('');

  const [material, setMaterial] = useState('Gold');
  const [jewelType, setJewelType] = useState('Ring');
  const [newTypeInput, setNewTypeInput] = useState('');
  const [showAddType, setShowAddType] = useState(false);

  const [tagCode, setTagCode] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [diamondCarat, setDiamondCarat] = useState('');
  const [makingMode, setMakingMode] = useState('percent');
  const [makingValue, setMakingValue] = useState('12');

  const [rawImageFile, setRawImageFile] = useState(null);
  const [processedPreview, setProcessedPreview] = useState('');
  const [aiBackdropOn, setAiBackdropOn] = useState(true);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [batchRows, setBatchRows] = useState([
    { key: 1, grossWeight: '', netWeight: '', diamondCarat: '', makingValue: '12', preview: '' },
    { key: 2, grossWeight: '', netWeight: '', diamondCarat: '', makingValue: '12', preview: '' },
    { key: 3, grossWeight: '', netWeight: '', diamondCarat: '', makingValue: '12', preview: '' },
    { key: 4, grossWeight: '', netWeight: '', diamondCarat: '', makingValue: '12', preview: '' }
  ]);

  const [selectedDraftIds, setSelectedDraftIds] = useState([]);
  const [printBatchItems, setPrintBatchItems] = useState([]);

  const [filterMaterial, setFilterMaterial] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [alteringItem, setAlteringItem] = useState(null);
  const [amendInstruction, setAmendInstruction] = useState('');
  const [printAmendSlip, setPrintAmendSlip] = useState(null);

  const [selectedHandoverStaff, setSelectedHandoverStaff] = useState('');
  const [auditMaterial, setAuditMaterial] = useState('Gold');
  const [physicalCountInput, setPhysicalCountInput] = useState('');
  const [auditRemarks, setAuditRemarks] = useState('');

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4500);
  };

  const availableTypes = [
    ...(DEFAULT_TYPES[material] || []),
    ...((customJewelTypes && customJewelTypes[material]) || [])
  ];

  useEffect(() => {
    if (!material || !jewelType) return;
    const mCode = material === 'Gold' ? 'GLD' : material === 'Silver' ? 'SLV' : 'DMD';
    const tCode = jewelType.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'ITM';
    const prefix = `${mCode}-${tCode}-`;
    const existing = inventoryItems.filter(i => i.code && i.code.startsWith(prefix));
    if (existing.length > 0) {
      const maxNum = Math.max(...existing.map(i => {
        const n = parseInt(i.code.replace(prefix, ''), 10);
        return isNaN(n) ? 1000 : n;
      }));
      setTagCode(`${prefix}${maxNum + 1}`);
    } else {
      setTagCode(`${prefix}1001`);
    }
  }, [material, jewelType, inventoryItems.length]);

  const getBatchRowCode = (baseCode, index) => {
    const clean = (baseCode || '').trim().toUpperCase();
    const match = clean.match(/^(.*?)(\d+)$/);
    if (!match) return `${clean}-${index + 1}`;
    return `${match[1]}${String(parseInt(match[2], 10) + index).padStart(match[2].length, '0')}`;
  };

  const optimizeImageToDataUrl = (file, selectedMat, useBackdrop) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 400;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const theme = STUDIO_BACKDROPS[selectedMat] || STUDIO_BACKDROPS.Gold;

          if (useBackdrop) {
            ctx.fillStyle = theme.bg;
            ctx.fillRect(0, 0, size, size);
            ctx.strokeStyle = theme.border;
            ctx.lineWidth = 8;
            ctx.strokeRect(10, 10, size - 20, size - 20);
            const target = size - 56;
            const scale = Math.min(target / img.width, target / img.height);
            ctx.drawImage(img, (size - img.width * scale) / 2, (size - img.height * scale) / 2, img.width * scale, img.height * scale);
          } else {
            const scale = Math.min(size / img.width, size / img.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, (size - img.width * scale) / 2, (size - img.height * scale) / 2, img.width * scale, img.height * scale);
          }
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const createStudioPlaceholderCard = (code, selectedMat, typeName) => {
    const canvas = document.createElement('canvas');
    canvas.width = 340;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');
    const theme = STUDIO_BACKDROPS[selectedMat] || STUDIO_BACKDROPS.Gold;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, 340, 340);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, 316, 316);
    ctx.fillStyle = selectedMat === 'Gold-Diamond' ? '#0f172a' : '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(code, 170, 160);
    ctx.font = '14px sans-serif';
    ctx.fillText(`${selectedMat} • ${typeName}`, 170, 188);
    return canvas.toDataURL('image/jpeg', 0.75);
  };

  const processSinglePhoto = async (file, selectedMat, useBackdrop) => {
    if (!file) return;
    setIsProcessingImg(true);
    const dataUrl = await optimizeImageToDataUrl(file, selectedMat, useBackdrop);
    setProcessedPreview(dataUrl);
    setIsProcessingImg(false);
  };

  const handleAddCustomType = () => {
    const clean = newTypeInput.trim();
    if (!clean) return;
    const currentList = (customJewelTypes && customJewelTypes[material]) || [];
    if (!availableTypes.includes(clean)) {
      setCustomJewelTypes({ ...(customJewelTypes || {}), [material]: [...currentList, clean] });
    }
    setJewelType(clean);
    setNewTypeInput('');
    setShowAddType(false);
    showBanner(`Added new ${material} type: "${clean}"`);
  };

  const uploadDataUrlToCloud = async (dataUrl, code) => {
    try {
      const blob = dataUrlToBlob(dataUrl);
      const storageRef = ref(storage, `swarnasetu_inventory/${code}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch {
      return dataUrl;
    }
  };

  const handleSaveToDraft = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    if (!processedPreview) return showBanner('Please capture or select a jewelry photo first.');
    const cleanCode = tagCode.trim().toUpperCase();
    if (inventoryItems.some(i => i.code.toUpperCase() === cleanCode)) {
      return showBanner(`Tag Code "${cleanCode}" already exists!`);
    }

    setIsSaving(true);
    const finalImageUrl = await uploadDataUrlToCloud(processedPreview, cleanCode);
    const newItem = {
      id: Date.now(), code: cleanCode, material, type: jewelType,
      grossWeight: parseFloat(grossWeight) || 0,
      netWeight: parseFloat(netWeight) || parseFloat(grossWeight) || 0,
      diamondCarat: material === 'Gold-Diamond' ? (parseFloat(diamondCarat) || 0) : 0,
      makingMode, makingValue: parseFloat(makingValue) || 0,
      imageUrl: finalImageUrl, status: 'draft',
      assignedTo: null, assignedToName: '', createdBy: currentUser.name,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setInventoryItems([newItem, ...inventoryItems]);
    setGrossWeight(''); setNetWeight(''); setDiamondCarat('');
    setRawImageFile(null); setProcessedPreview(''); setIsSaving(false);
    showBanner(`Saved "${cleanCode}" to Drafts & Tags!`);
  };

  const updateBatchRow = (index, field, val) => {
    setBatchRows(batchRows.map((r, idx) => {
      if (idx !== index) return r;
      const updated = { ...r, [field]: val };
      if (field === 'grossWeight' && (!r.netWeight || r.netWeight === r.grossWeight)) updated.netWeight = val;
      return updated;
    }));
  };

  const handleBatchRowPhoto = async (index, file) => {
    if (!file) return;
    const dataUrl = await optimizeImageToDataUrl(file, material, aiBackdropOn);
    setBatchRows(batchRows.map((r, idx) => (idx === index ? { ...r, preview: dataUrl } : r)));
  };

  const handleSaveBatchToDraft = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    const validEntries = batchRows
      .map((row, idx) => ({ ...row, computedCode: getBatchRowCode(tagCode, idx) }))
      .filter(row => parseFloat(row.grossWeight) > 0);

    if (validEntries.length === 0) return showBanner('Enter Gross Weight for at least 1 row.');
    const existingCodes = new Set(inventoryItems.map(i => i.code.toUpperCase()));
    const dup = validEntries.find(v => existingCodes.has(v.computedCode));
    if (dup) return showBanner(`Duplicate code "${dup.computedCode}" exists! Change Starting Tag.`);

    setIsSaving(true);
    const createdBatch = [];
    const baseTime = Date.now();
    for (let i = 0; i < validEntries.length; i++) {
      const row = validEntries[i];
      const srcImg = row.preview || createStudioPlaceholderCard(row.computedCode, material, jewelType);
      const uploadedUrl = await uploadDataUrlToCloud(srcImg, row.computedCode);
      createdBatch.push({
        id: baseTime + i, code: row.computedCode, material, type: jewelType,
        grossWeight: parseFloat(row.grossWeight) || 0,
        netWeight: parseFloat(row.netWeight) || parseFloat(row.grossWeight) || 0,
        diamondCarat: material === 'Gold-Diamond' ? (parseFloat(row.diamondCarat) || 0) : 0,
        makingMode, makingValue: parseFloat(row.makingValue) || parseFloat(makingValue) || 0,
        imageUrl: uploadedUrl, status: 'draft',
        assignedTo: null, assignedToName: '', createdBy: currentUser.name,
        createdAt: new Date().toISOString().slice(0, 10)
      });
    }

    setInventoryItems([...createdBatch.reverse(), ...inventoryItems]);
    setBatchRows([1, 2, 3, 4].map(k => ({ key: Date.now() + k, grossWeight: '', netWeight: '', diamondCarat: '', makingValue, preview: '' })));
    setIsSaving(false);
    showBanner(`Saved ${createdBatch.length} ${material} ${jewelType} items to Drafts!`);
  };

  const handleSendToAlteration = (e) => {
    e.preventDefault();
    if (!alteringItem || !amendInstruction.trim()) return showBanner('Please write what customer wants.');
    const f = e.target;
    const karigar = karigarList.find(k => k.id === f.karigarId.value);
    const alterationData = {
      slipNo: `AMD-${String(Date.now()).slice(-4)}`,
      customerName: f.custName.value.trim(),
      customerMobile: f.custMobile.value.trim(),
      instruction: amendInstruction.trim(),
      deliveryDate: f.deliveryDate.value || '',
      karigarId: karigar ? karigar.id : '',
      karigarName: karigar ? karigar.name : 'In-House Workshop',
      advancePaid: parseFloat(f.advancePaid.value) || 0,
      sentDate: new Date().toISOString().slice(0, 10)
    };

    const updatedItem = { ...alteringItem, status: 'alteration', alteration: alterationData };
    setInventoryItems(inventoryItems.map(item => (item.id === alteringItem.id ? updatedItem : item)));
    setPrintAmendSlip(updatedItem);
    showBanner(`${alteringItem.code} locked for ${alterationData.customerName} & sent for amendment!`);
    setAlteringItem(null);
    setAmendInstruction('');
  };

  const handleNightAuditSubmit = (e) => {
    e.preventDefault();
    const sysCount = inventoryItems.filter(i => i.status === 'live' && i.material === auditMaterial && (isAdmin || i.assignedTo === currentUser.id)).length;
    const physCount = parseInt(physicalCountInput, 10);
    if (isNaN(physCount)) return;
    setNightAudits([{
      id: Date.now(), date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      staffId: currentUser.id, staffName: currentUser.name, material: auditMaterial,
      physicalCount: physCount, systemCount: sysCount, difference: physCount - sysCount,
      remarks: auditRemarks.trim() || '-', managerVerified: false
    }, ...(nightAudits || [])]);
    setPhysicalCountInput(''); setAuditRemarks('');
    showBanner('Closing physical count submitted.');
  };

  const draftItems = inventoryItems.filter(i => i.status === 'draft');
  const liveItems = inventoryItems.filter(i => i.status === 'live');
  const alterationItems = inventoryItems.filter(i => i.status === 'alteration');
  const filteredVault = liveItems.filter(item =>
    (filterMaterial === 'All' || item.material === filterMaterial) &&
    (filterType === 'All' || item.type === filterType) &&
    (!searchQuery || item.code.toLowerCase().includes(searchQuery.toLowerCase()) || item.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          ...(canCreate ? [{ id: 'entry', label: '+ Stock Entry', icon: Plus }] : []),
          { id: 'drafts', label: `Drafts & Tags (${draftItems.length})`, icon: Printer },
          { id: 'vault', label: `Live Vault (${liveItems.length})`, icon: Package },
          { id: 'alteration', label: `In Amendment (${alterationItems.length})`, icon: Wrench },
          { id: 'handover', label: 'Staff Handover', icon: UserCheck },
          { id: 'audit', label: 'Nightly Stock Check', icon: ClipboardCheck }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SINGLE & BATCH ENTRY */}
      {tab === 'entry' && canCreate && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => setEntryMode('single')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${entryMode === 'single' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Plus size={14} /> Single Item
              </button>
              <button type="button" onClick={() => setEntryMode('batch')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${entryMode === 'batch' ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-800'}`}>
                <Layers size={14} /> Batch Entry (One Go)
              </button>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Saves to Drafts first</span>
          </div>

          {entryMode === 'single' ? (
            <div className="grid lg:grid-cols-3 gap-4 text-xs">
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <form onSubmit={handleSaveToDraft} className="space-y-3.5">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">1. Metal *</label>
                      <select value={material} onChange={(e) => { setMaterial(e.target.value); setJewelType(DEFAULT_TYPES[e.target.value][0]); if (rawImageFile) processSinglePhoto(rawImageFile, e.target.value, aiBackdropOn); }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold">
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold-Diamond">Gold-Diamond</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex justify-between mb-1">
                        <label className="font-semibold text-slate-600">2. Jewelry Type *</label>
                        <button type="button" onClick={() => setShowAddType(!showAddType)} className="text-[11px] font-bold text-teal-700">{showAddType ? 'Close' : '+ New Type'}</button>
                      </div>
                      {showAddType ? (
                        <div className="flex gap-1.5">
                          <input type="text" value={newTypeInput} onChange={(e) => setNewTypeInput(e.target.value)} placeholder="Type name" className="flex-1 px-3 py-1.5 border border-teal-300 rounded-lg" />
                          <button type="button" onClick={handleAddCustomType} className="px-3 py-1.5 bg-teal-600 text-white font-semibold rounded-lg">Add</button>
                        </div>
                      ) : (
                        <select value={jewelType} onChange={(e) => setJewelType(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                          {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">3. Tag Code *</label>
                      <input type="text" value={tagCode} onChange={(e) => setTagCode(e.target.value.toUpperCase())} required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-teal-700 bg-teal-50/40" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">4. Gross Wt (g) *</label>
                      <input type="number" step="0.001" required value={grossWeight} onChange={(e) => { setGrossWeight(e.target.value); if (!netWeight) setNetWeight(e.target.value); }} placeholder="0.000" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Net Wt (g)</label>
                      <input type="number" step="0.001" value={netWeight} onChange={(e) => setNetWeight(e.target.value)} placeholder="Same" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>
                    {material === 'Gold-Diamond' && (
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Diamond (Ct)</label>
                        <input type="number" step="0.01" value={diamondCarat} onChange={(e) => setDiamondCarat(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                      </div>
                    )}
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">5. Making Type</label>
                      <select value={makingMode} onChange={(e) => setMakingMode(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                        <option value="percent">Making (%)</option>
                        <option value="rate">Rate (₹/g)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">{makingMode === 'percent' ? 'Making %' : '₹/g'}</label>
                      <input type="number" step="0.01" required value={makingValue} onChange={(e) => setMakingValue(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-bold text-slate-800 flex items-center gap-1"><Sparkles size={13} className="text-amber-600" /> AI Photo Studio *</span>
                      <label className="inline-flex items-center gap-1 text-[11px] font-semibold">
                        <input type="checkbox" checked={aiBackdropOn} onChange={(e) => { setAiBackdropOn(e.target.checked); if (rawImageFile) processSinglePhoto(rawImageFile, material, e.target.checked); }} />
                        Studio Frame
                      </label>
                    </div>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files[0]; if (f) { setRawImageFile(f); processSinglePhoto(f, material, aiBackdropOn); } }} className="w-full bg-white p-1.5 border border-slate-200 rounded-lg" />
                  </div>

                  <button type="submit" disabled={isSaving || isProcessingImg} className="px-5 py-2 bg-slate-900 text-white font-semibold rounded-lg">
                    {isSaving ? 'Saving...' : 'Save to Draft List'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                {processedPreview ? (
                  <img src={processedPreview} alt="Preview" className="w-48 h-48 object-cover rounded-xl border border-slate-200" />
                ) : (
                  <div className="w-48 h-48 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 p-4 text-xs">AI Photo Preview</div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Metal</label>
                  <select value={material} onChange={(e) => { setMaterial(e.target.value); setJewelType(DEFAULT_TYPES[e.target.value][0]); }} className="w-full px-2 py-1.5 bg-white border rounded-lg font-semibold">
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold-Diamond">Gold-Diamond</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Type</label>
                  <select value={jewelType} onChange={(e) => setJewelType(e.target.value)} className="w-full px-2 py-1.5 bg-white border rounded-lg">
                    {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Start Tag</label>
                  <input type="text" value={tagCode} onChange={(e) => setTagCode(e.target.value.toUpperCase())} className="w-full px-2 py-1.5 bg-teal-50 border border-teal-300 rounded-lg font-bold text-teal-800" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Making Type</label>
                  <select value={makingMode} onChange={(e) => setMakingMode(e.target.value)} className="w-full px-2 py-1.5 bg-white border rounded-lg">
                    <option value="percent">Making (%)</option>
                    <option value="rate">Rate (₹/g)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Default Val</label>
                  <input type="number" step="0.01" value={makingValue} onChange={(e) => { setMakingValue(e.target.value); setBatchRows(batchRows.map(r => ({ ...r, makingValue: e.target.value }))); }} className="w-full px-2 py-1.5 bg-white border rounded-lg font-semibold" />
                </div>
              </div>

              <form onSubmit={handleSaveBatchToDraft} className="space-y-3">
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b">
                      <tr>
                        <th className="p-2">Tag Code</th>
                        <th className="p-2">Gross Wt *</th>
                        <th className="p-2">Net Wt</th>
                        <th className="p-2">Making</th>
                        <th className="p-2">Photo (Opt)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batchRows.map((row, idx) => (
                        <tr key={row.key}>
                          <td className="p-2 font-bold text-teal-700">{getBatchRowCode(tagCode, idx)}</td>
                          <td className="p-2"><input type="number" step="0.001" value={row.grossWeight} onChange={(e) => updateBatchRow(idx, 'grossWeight', e.target.value)} placeholder="0.000" className="w-20 px-2 py-1 border rounded" /></td>
                          <td className="p-2"><input type="number" step="0.001" value={row.netWeight} onChange={(e) => updateBatchRow(idx, 'netWeight', e.target.value)} placeholder="0.000" className="w-20 px-2 py-1 border rounded" /></td>
                          <td className="p-2"><input type="number" step="0.01" value={row.makingValue} onChange={(e) => updateBatchRow(idx, 'makingValue', e.target.value)} className="w-16 px-2 py-1 border rounded" /></td>
                          <td className="p-2"><input type="file" accept="image/*" capture="environment" onChange={(e) => handleBatchRowPhoto(idx, e.target.files[0])} className="text-[11px] max-w-[150px]" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <button type="button" onClick={() => setBatchRows([...batchRows, { key: Date.now(), grossWeight: '', netWeight: '', diamondCarat: '', makingValue, preview: '' }])} className="px-3 py-1.5 bg-slate-100 font-semibold rounded-lg">+ Add Row</button>
                  <button type="submit" disabled={isSaving} className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg inline-flex items-center gap-1">
                    <Save size={14} /> {isSaving ? 'Saving...' : `Save Batch (${batchRows.filter(r => parseFloat(r.grossWeight) > 0).length}) to Draft`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DRAFTS & BATCH TAG PRINT */}
      {tab === 'drafts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Pending Drafts ({draftItems.length})</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedDraftIds(selectedDraftIds.length === draftItems.length ? [] : draftItems.map(d => d.id))} className="px-3 py-1.5 bg-slate-100 text-xs font-semibold rounded-lg">
                  {selectedDraftIds.length === draftItems.length && draftItems.length > 0 ? 'Unselect All' : 'Select All'}
                </button>
                <button type="button" disabled={selectedDraftIds.length === 0} onClick={() => setPrintBatchItems(draftItems.filter(d => selectedDraftIds.includes(d.id)))} className="px-3 py-1.5 bg-indigo-600 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1">
                  <Printer size={13} /> Print Tags ({selectedDraftIds.length})
                </button>
                <button type="button" disabled={selectedDraftIds.length === 0} onClick={() => { setInventoryItems(inventoryItems.map(i => selectedDraftIds.includes(i.id) ? { ...i, status: 'live' } : i)); setSelectedDraftIds([]); showBanner('Moved to Live Vault!'); }} className="px-3.5 py-1.5 bg-emerald-600 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1">
                  <CheckCircle2 size={13} /> Approve to Live ({selectedDraftIds.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b">
                  <tr>
                    <th className="p-3 w-10">Pick</th>
                    <th className="p-3">Photo</th>
                    <th className="p-3">Tag Code</th>
                    <th className="p-3">Category & Type</th>
                    <th className="p-3">Weight</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draftItems.map(item => {
                    const checked = selectedDraftIds.includes(item.id);
                    return (
                      <tr key={item.id} className={checked ? 'bg-amber-50/40' : ''}>
                        <td className="p-3"><input type="checkbox" checked={checked} onChange={() => setSelectedDraftIds(checked ? selectedDraftIds.filter(id => id !== item.id) : [...selectedDraftIds, item.id])} /></td>
                        <td className="p-3"><img src={item.imageUrl} alt={item.code} className="w-10 h-10 rounded-lg object-cover border" /></td>
                        <td className="p-3 font-bold text-slate-900">{item.code}</td>
                        <td className="p-3">{item.material} • {item.type}</td>
                        <td className="p-3">{item.grossWeight}g</td>
                        <td className="p-3 text-right space-x-1">
                          <button type="button" onClick={() => { setInventoryItems(inventoryItems.map(i => i.id === item.id ? { ...i, status: 'live' } : i)); showBanner(`${item.code} is now Live!`); }} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded">Move Live</button>
                          {canDelete && <button type="button" onClick={() => setInventoryItems(inventoryItems.filter(i => i.id !== item.id))} className="p-1 text-red-500"><Trash2 size={14} /></button>}
                        </td>
                      </tr>
                    );
                  })}
                  {draftItems.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400">No pending drafts.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {printBatchItems.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-indigo-200 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold">Thermal Tag Sheet ({printBatchItems.length})</h4>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg">Print Now</button>
                  <button onClick={() => setPrintBatchItems([])} className="px-3 py-1 bg-slate-100 text-xs font-semibold rounded-lg">Close</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {printBatchItems.map(tag => (
                  <div key={tag.id} className="p-2 border-2 border-dashed border-slate-400 rounded text-center text-[10px] font-mono">
                    <div className="font-bold">SWARNASETU</div>
                    <div className="my-1 bg-slate-900 text-white font-bold">{tag.code}</div>
                    <div>{tag.material} • {tag.type}</div>
                    <div className="font-bold">Wt: {tag.grossWeight}g</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE VAULT INVENTORY (CUSTOM AMENDMENT ON ANY JEWELRY) */}
      {tab === 'vault' && (
        <div className="space-y-4">
          {alteringItem && (
            <div className="bg-white p-5 rounded-2xl border-2 border-amber-400 shadow-sm space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Wrench size={15} className="text-amber-600" /> Customer Amendment: <span className="text-amber-700">{alteringItem.code} ({alteringItem.type} • {alteringItem.grossWeight}g)</span>
                </h4>
                <button onClick={() => { setAlteringItem(null); setAmendInstruction(''); }}><X size={15} /></button>
              </div>
              <form onSubmit={handleSendToAlteration} className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Customer Name *</label>
                    <input name="custName" type="text" required placeholder="Customer Name" className="w-full px-3 py-1.5 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Customer Mobile</label>
                    <input name="custMobile" type="tel" placeholder="10-digit mobile" className="w-full px-3 py-1.5 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Delivery Date</label>
                    <input name="deliveryDate" type="date" className="w-full px-3 py-1.5 border rounded-lg" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                  <label className="block font-bold text-slate-800">What Customer Wants (Write Any Amendment Details) *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_AMEND_TAGS.map(tag => (
                      <button key={tag} type="button" onClick={() => setAmendInstruction(prev => prev ? `${prev}, ${tag}` : tag)} className="px-2 py-0.5 bg-white border border-amber-200 text-
