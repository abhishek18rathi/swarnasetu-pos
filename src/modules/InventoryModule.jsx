import React, { useState, useEffect } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Package, Plus, Printer, CheckCircle2, Trash2, Edit3,
  UserCheck, ClipboardCheck, Sparkles, Search, X, Layers, Wrench
} from 'lucide-react';

const DEFAULT_TYPES = {
  Gold: ['Ring', 'Bangle', 'Chain', 'Necklace', 'Earrings', 'Mangalsutra', 'Bracelet', 'Pendant', 'Nose Pin', 'Tikka'],
  Silver: ['Payal (Anklet)', 'Bichiya (Toe Ring)', 'Ring', 'Chain', 'Bracelet', 'Murti / Idol', 'Bartaan / Utensil', 'Coin'],
  'Gold-Diamond': ['Solitaire Ring', 'Diamond Necklace', 'Diamond Earrings', 'Diamond Bangle', 'Diamond Pendant', 'Diamond Bracelet', 'Nose Pin']
};

const QUICK_AMEND_TAGS = [
  'Size Increase/Decrease', 'Length Adjust (+/-)', 'Lock / Kunda Change',
  'Rhodium / Matte Polish', 'Moti / Drops / Stone Work', 'Name Engraving'
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
  currentUser, staffList = [], karigarList = [],
  inventoryItems = [], setInventoryItems,
  customJewelTypes = { Gold: [], Silver: [], 'Gold-Diamond': [] }, setCustomJewelTypes,
  nightAudits = [], setNightAudits
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
  const [isSaving, setIsSaving] = useState(false);

  const [batchRows, setBatchRows] = useState([1, 2, 3, 4].map(k => ({ key: k, grossWeight: '', netWeight: '', makingValue: '12', preview: '' })));
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

  const showBanner = (msg) => { setBanner(msg); setTimeout(() => setBanner(''), 4000); };
  const availableTypes = [...(DEFAULT_TYPES[material] || []), ...((customJewelTypes && customJewelTypes[material]) || [])];

  useEffect(() => {
    if (!material || !jewelType) return;
    const mCode = material === 'Gold' ? 'GLD' : material === 'Silver' ? 'SLV' : 'DMD';
    const tCode = jewelType.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'ITM';
    const prefix = `${mCode}-${tCode}-`;
    const existing = inventoryItems.filter(i => i.code && i.code.startsWith(prefix));
    const maxNum = existing.length ? Math.max(...existing.map(i => parseInt(i.code.replace(prefix, ''), 10) || 1000)) : 1000;
    setTagCode(`${prefix}${maxNum + 1}`);
  }, [material, jewelType, inventoryItems.length]);

  const getBatchRowCode = (baseCode, idx) => {
    const clean = (baseCode || '').trim().toUpperCase();
    const match = clean.match(/^(.*?)(\d+)$/);
    if (!match) return `${clean}-${idx + 1}`;
    return `${match[1]}${String(parseInt(match[2], 10) + indexOr(idx)).padStart(match[2].length, '0')}`;
  };
  const indexOr = (n) => n;

  const optimizeImage = (file, mat, useFrame) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 360; canvas.height = 360;
        const ctx = canvas.getContext('2d');
        const bg = mat === 'Silver' ? '#0f172a' : mat === 'Gold-Diamond' ? '#f8fafc' : '#4a0e17';
        const br = mat === 'Silver' ? '#cbd5e1' : mat === 'Gold-Diamond' ? '#94a3b8' : '#d4af37';
        ctx.fillStyle = useFrame ? bg : '#ffffff';
        ctx.fillRect(0, 0, 360, 360);
        if (useFrame) { ctx.strokeStyle = br; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 340, 340); }
        const sc = Math.min((useFrame ? 308 : 360) / img.width, (useFrame ? 308 : 360) / img.height);
        ctx.drawImage(img, (360 - img.width * sc) / 2, (360 - img.height * sc) / 2, img.width * sc, img.height * sc);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  const makeCard = (code, mat, typeName) => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = mat === 'Silver' ? '#0f172a' : mat === 'Gold-Diamond' ? '#f8fafc' : '#4a0e17';
    ctx.fillRect(0, 0, 320, 320);
    ctx.fillStyle = mat === 'Gold-Diamond' ? '#0f172a' : '#ffffff';
    ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(code, 160, 150);
    ctx.font = '13px sans-serif'; ctx.fillText(`${mat} • ${typeName}`, 160, 178);
    return canvas.toDataURL('image/jpeg', 0.75);
  };

  const uploadToCloud = async (dataUrl, code) => {
    try {
      const sRef = ref(storage, `swarnasetu_inventory/${code}_${Date.now()}.jpg`);
      await uploadBytes(sRef, dataUrlToBlob(dataUrl));
      return await getDownloadURL(sRef);
    } catch { return dataUrl; }
  };

  const handleSaveSingle = async (e) => {
    e.preventDefault();
    if (!canCreate || !processedPreview) return showBanner('Please select/capture a photo first.');
    const cleanCode = tagCode.trim().toUpperCase();
    if (inventoryItems.some(i => i.code.toUpperCase() === cleanCode)) return showBanner(`Tag "${cleanCode}" already exists!`);

    setIsSaving(true);
    const url = await uploadToCloud(processedPreview, cleanCode);
    setInventoryItems([{
      id: Date.now(), code: cleanCode, material, type: jewelType,
      grossWeight: parseFloat(grossWeight) || 0, netWeight: parseFloat(netWeight) || parseFloat(grossWeight) || 0,
      diamondCarat: material === 'Gold-Diamond' ? (parseFloat(diamondCarat) || 0) : 0,
      makingMode, makingValue: parseFloat(makingValue) || 0, imageUrl: url, status: 'draft',
      assignedTo: null, assignedToName: '', createdBy: currentUser.name, createdAt: new Date().toISOString().slice(0, 10)
    }, ...inventoryItems]);
    setGrossWeight(''); setNetWeight(''); setDiamondCarat(''); setRawImageFile(null); setProcessedPreview(''); setIsSaving(false);
    showBanner(`Saved "${cleanCode}" to Drafts!`);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    const valid = batchRows.map((r, idx) => ({ ...r, code: getBatchRowCode(tagCode, idx) })).filter(r => parseFloat(r.grossWeight) > 0);
    if (!valid.length) return showBanner('Enter Gross Weight in at least 1 row.');
    const setCodes = new Set(inventoryItems.map(i => i.code.toUpperCase()));
    if (valid.some(v => setCodes.has(v.code))) return showBanner('Duplicate tag code in batch! Change Starting Tag.');

    setIsSaving(true);
    const created = [];
    const t0 = Date.now();
    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      const url = await uploadToCloud(r.preview || makeCard(r.code, material, jewelType), r.code);
      created.push({
        id: t0 + i, code: r.code, material, type: jewelType,
        grossWeight: parseFloat(r.grossWeight) || 0, netWeight: parseFloat(r.netWeight) || parseFloat(r.grossWeight) || 0,
        diamondCarat: 0, makingMode, makingValue: parseFloat(r.makingValue) || parseFloat(makingValue) || 0,
        imageUrl: url, status: 'draft', assignedTo: null, assignedToName: '',
        createdBy: currentUser.name, createdAt: new Date().toISOString().slice(0, 10)
      });
    }
    setInventoryItems([...created.reverse(), ...inventoryItems]);
    setBatchRows([1, 2, 3, 4].map(k => ({ key: Date.now() + k, grossWeight: '', netWeight: '', makingValue, preview: '' })));
    setIsSaving(false);
    showBanner(`Saved ${created.length} items to Drafts!`);
  };

  const handleSaveAmendment = (e) => {
    e.preventDefault();
    if (!alteringItem || !amendInstruction.trim()) return showBanner('Write what customer wants.');
    const f = e.target;
    const karigar = karigarList.find(k => k.id === f.karigarId.value);
    const updated = {
      ...alteringItem,
      status: 'alteration',
      alteration: {
        slipNo: `AMD-${String(Date.now()).slice(-4)}`,
        customerName: f.custName.value.trim(),
        customerMobile: f.custMobile.value.trim(),
        instruction: amendInstruction.trim(),
        deliveryDate: f.deliveryDate.value || '',
        karigarId: karigar ? karigar.id : '',
        karigarName: karigar ? karigar.name : 'In-House Workshop',
        advancePaid: parseFloat(f.advancePaid.value) || 0,
        sentDate: new Date().toISOString().slice(0, 10)
      }
    };
    setInventoryItems(inventoryItems.map(i => (i.id === alteringItem.id ? updated : i)));
    setPrintAmendSlip(updated);
    setAlteringItem(null); setAmendInstruction('');
    showBanner(`${updated.code} locked for ${updated.alteration.customerName}!`);
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
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex justify-between">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      <div className="bg-white p-2 rounded-xl border border-slate-200/80 flex flex-wrap gap-1.5">
        {[
          ...(canCreate ? [{ id: 'entry', label: '+ Stock Entry', icon: Plus }] : []),
          { id: 'drafts', label: `Drafts (${draftItems.length})`, icon: Printer },
          { id: 'vault', label: `Live Vault (${liveItems.length})`, icon: Package },
          { id: 'alteration', label: `Amendments (${alterationItems.length})`, icon: Wrench },
          { id: 'handover', label: 'Handover', icon: UserCheck },
          { id: 'audit', label: 'Night Audit', icon: ClipboardCheck }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'entry' && canCreate && (
        <div className="space-y-4 text-xs">
          <div className="bg-white p-3 rounded-2xl border flex gap-2">
            <button type="button" onClick={() => setEntryMode('single')} className={`px-3.5 py-1.5 rounded-lg font-semibold ${entryMode === 'single' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Single Item</button>
            <button type="button" onClick={() => setEntryMode('batch')} className={`px-3.5 py-1.5 rounded-lg font-semibold ${entryMode === 'batch' ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-800'}`}>Batch Entry (One Go)</button>
          </div>

          {entryMode === 'single' ? (
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border">
                <form onSubmit={handleSaveSingle} className="space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Metal *</label>
                      <select value={material} onChange={async (e) => { setMaterial(e.target.value); setJewelType(DEFAULT_TYPES[e.target.value][0]); if (rawImageFile) setProcessedPreview(await optimizeImage(rawImageFile, e.target.value, aiBackdropOn)); }} className="w-full px-3 py-1.5 border rounded-lg font-semibold">
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold-Diamond">Gold-Diamond</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex justify-between mb-1">
                        <label className="font-semibold">Jewelry Type *</label>
                        <button type="button" onClick={() => setShowAddType(!showAddType)} className="text-[11px] font-bold text-teal-700">{showAddType ? 'Close' : '+ New Type'}</button>
                      </div>
                      {showAddType ? (
                        <div className="flex gap-1.5">
                          <input type="text" value={newTypeInput} onChange={(e) => setNewTypeInput(e.target.value)} placeholder="New type" className="flex-1 px-3 py-1.5 border rounded-lg" />
                          <button type="button" onClick={() => { if (newTypeInput.trim()) { setCustomJewelTypes({ ...customJewelTypes, [material]: [...(customJewelTypes[material] || []), newTypeInput.trim()] }); setJewelType(newTypeInput.trim()); setNewTypeInput(''); setShowAddType(false); } }} className="px-3 py-1.5 bg-teal-600 text-white font-semibold rounded-lg">Add</button>
                        </div>
                      ) : (
                        <select value={jewelType} onChange={(e) => setJewelType(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg">
                          {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Tag Code *</label>
                      <input type="text" value={tagCode} onChange={(e) => setTagCode(e.target.value.toUpperCase())} required className="w-full px-3 py-1.5 border rounded-lg font-bold text-teal-700 bg-teal-50/40" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Gross Wt (g) *</label>
                      <input type="number" step="0.001" required value={grossWeight} onChange={(e) => { setGrossWeight(e.target.value); if (!netWeight) setNetWeight(e.target.value); }} className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Net Wt (g)</label>
                      <input type="number" step="0.001" value={netWeight} onChange={(e) => setNetWeight(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    {material === 'Gold-Diamond' && (
                      <div>
                        <label className="block font-semibold mb-1">Diamond (Ct)</label>
                        <input type="number" step="0.01" value={diamondCarat} onChange={(e) => setDiamondCarat(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
                      </div>
                    )}
                    <div>
                      <label className="block font-semibold mb-1">Making Type</label>
                      <select value={makingMode} onChange={(e) => setMakingMode(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg">
                        <option value="percent">Making (%)</option>
                        <option value="rate">Rate (₹/g)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">{makingMode === 'percent' ? 'Making %' : '₹/g'}</label>
                      <input type="number" step="0.01" required value={makingValue} onChange={(e) => setMakingValue(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border space-y-2">
                    <div className="flex justify-between">
                      <span className="font-bold flex items-center gap-1"><Sparkles size={13} className="text-amber-600" /> AI Photo *</span>
                      <label className="inline-flex items-center gap-1 text-[11px]">
                        <input type="checkbox" checked={aiBackdropOn} onChange={async (e) => { setAiBackdropOn(e.target.checked); if (rawImageFile) setProcessedPreview(await optimizeImage(rawImageFile, material, e.target.checked)); }} /> Studio Frame
                      </label>
                    </div>
                    <input type="file" accept="image/*" capture="environment" onChange={async (e) => { const f = e.target.files[0]; if (f) { setRawImageFile(f); setProcessedPreview(await optimizeImage(f, material, aiBackdropOn)); } }} className="w-full bg-white p-1.5 border rounded-lg" />
                  </div>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 bg-slate-900 text-white font-semibold rounded-lg">{isSaving ? 'Saving...' : 'Save to Drafts'}</button>
                </form>
              </div>
              <div className="bg-white p-5 rounded-2xl border flex items-center justify-center">
                {processedPreview ? <img src={processedPreview} alt="Preview" className="w-48 h-48 object-cover rounded-xl border" /> : <div className="w-48 h-48 rounded-xl border-2 border-dashed flex items-center justify-center text-slate-400">Photo Preview</div>}
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl bg-slate-50 border">
                <select value={material} onChange={(e) => { setMaterial(e.target.value); setJewelType(DEFAULT_TYPES[e.target.value][0]); }} className="px-2 py-1.5 bg-white border rounded-lg font-semibold">
                  <option value="Gold">Gold</option><option value="Silver">Silver</option><option value="Gold-Diamond">Gold-Diamond</option>
                </select>
                <select value={jewelType} onChange={(e) => setJewelType(e.target.value)} className="px-2 py-1.5 bg-white border rounded-lg">
                  {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" value={tagCode} onChange={(e) => setTagCode(e.target.value.toUpperCase())} className="px-2 py-1.5 bg-teal-50 border border-teal-300 rounded-lg font-bold text-teal-800" />
                <select value={makingMode} onChange={(e) => setMakingMode(e.target.value)} className="px-2 py-1.5 bg-white border rounded-lg">
                  <option value="percent">Making (%)</option><option value="rate">Rate (₹/g)</option>
                </select>
                <input type="number" step="0.01" value={makingValue} onChange={(e) => { setMakingValue(e.target.value); setBatchRows(batchRows.map(r => ({ ...r, makingValue: e.target.value }))); }} className="px-2 py-1.5 bg-white border rounded-lg font-semibold" />
              </div>

              <form onSubmit={handleSaveBatch} className="space-y-3">
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr><th className="p-2">Tag</th><th className="p-2">Gross Wt *</th><th className="p-2">Net Wt</th><th className="p-2">Making</th><th className="p-2">Photo</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {batchRows.map((row, idx) => (
                        <tr key={row.key}>
                          <td className="p-2 font-bold text-teal-700">{getBatchRowCode(tagCode, idx)}</td>
                          <td className="p-2"><input type="number" step="0.001" value={row.grossWeight} onChange={(e) => setBatchRows(batchRows.map((r, i) => i === idx ? { ...r, grossWeight: e.target.value, netWeight: e.target.value } : r))} className="w-20 px-2 py-1 border rounded" /></td>
                          <td className="p-2"><input type="number" step="0.001" value={row.netWeight} onChange={(e) => setBatchRows(batchRows.map((r, i) => i === idx ? { ...r, netWeight: e.target.value } : r))} className="w-20 px-2 py-1 border rounded" /></td>
                          <td className="p-2"><input type="number" step="0.01" value={row.makingValue} onChange={(e) => setBatchRows(batchRows.map((r, i) => i === idx ? { ...r, makingValue: e.target.value } : r))} className="w-16 px-2 py-1 border rounded" /></td>
                          <td className="p-2"><input type="file" accept="image/*" capture="environment" onChange={async (e) => { const f = e.target.files[0]; if (f) { const d = await optimizeImage(f, material, aiBackdropOn); setBatchRows(batchRows.map((r, i) => i === idx ? { ...r, preview: d } : r)); } }} className="text-[11px] max-w-[140px]" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setBatchRows([...batchRows, { key: Date.now(), grossWeight: '', netWeight: '', makingValue, preview: '' }])} className="px-3 py-1.5 bg-slate-100 font-semibold rounded-lg">+ Add Row</button>
                  <button type="submit" disabled={isSaving} className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg">{isSaving ? 'Saving...' : 'Save Batch to Draft'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {tab === 'drafts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b flex flex-wrap justify-between gap-2">
              <h3 className="text-sm font-bold">Drafts ({draftItems.length})</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedDraftIds(selectedDraftIds.length === draftItems.length ? [] : draftItems.map(d => d.id))} className="px-3 py-1 bg-slate-100 text-xs font-semibold rounded-lg">Select All</button>
                <button type="button" disabled={!selectedDraftIds.length} onClick={() => setPrintBatchItems(draftItems.filter(d => selectedDraftIds.includes(d.id)))} className="px-3 py-1 bg-indigo-600 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg">Print Tags ({selectedDraftIds.length})</button>
                <button type="button" disabled={!selectedDraftIds.length} onClick={() => { setInventoryItems(inventoryItems.map(i => selectedDraftIds.includes(i.id) ? { ...i, status: 'live' } : i)); setSelectedDraftIds([]); showBanner('Moved to Live Vault!'); }} className="px-3 py-1 bg-emerald-600 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg">Approve Live ({selectedDraftIds.length})</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b">
                  <tr><th className="p-3">Pick</th><th className="p-3">Photo</th><th className="p-3">Code</th><th className="p-3">Type</th><th className="p-3">Weight</th><th className="p-3 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y">
                  {draftItems.map(item => {
                    const checked = selectedDraftIds.includes(item.id);
                    return (
                      <tr key={item.id}>
                        <td className="p-3"><input type="checkbox" checked={checked} onChange={() => setSelectedDraftIds(checked ? selectedDraftIds.filter(id => id !== item.id) : [...selectedDraftIds, item.id])} /></td>
                        <td className="p-3"><img src={item.imageUrl} alt={item.code} className="w-9 h-9 rounded object-cover border" /></td>
                        <td className="p-3 font-bold">{item.code}</td>
                        <td className="p-3">{item.material} • {item.type}</td>
                        <td className="p-3">{item.grossWeight}g</td>
                        <td className="p-3 text-right space-x-1">
                          <button type="button" onClick={() => { setInventoryItems(inventoryItems.map(i => i.id === item.id ? { ...i, status: 'live' } : i)); showBanner(`${item.code} Live!`); }} className="px-2 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded">Move Live</button>
                          {canDelete && <button type="button" onClick={() => setInventoryItems(inventoryItems.filter(i => i.id !== item.id))} className="p-1 text-red-500"><Trash2 size={14} /></button>}
                        </td>
                      </tr>
                    );
                  })}
                  {!draftItems.length && <tr><td colSpan="6" className="p-6 text-center text-slate-400">No pending drafts.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {printBatchItems.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border space-y-3">
              <div className="flex justify-between">
                <span className="text-xs font-bold">Thermal Tags ({printBatchItems.length})</span>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="px-3 py-1 bg-slate-900 text-white text-xs rounded">Print</button>
                  <button onClick={() => setPrintBatchItems([])} className="px-3 py-1 bg-slate-100 text-xs rounded">Close</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {printBatchItems.map(t => (
                  <div key={t.id} className="p-2 border-2 border-dashed text-center text-[10px] font-mono">
                    <div className="font-bold">SWARNASETU</div>
                    <div className="bg-slate-900 text-white font-bold my-0.5">{t.code}</div>
                    <div>{t.type} • {t.grossWeight}g</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'vault' && (
        <div className="space-y-4">
          {alteringItem && (
            <div className="bg-white p-5 rounded-2xl border-2 border-amber-400 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b">
                <h4 className="font-bold flex items-center gap-1.5"><Wrench size={15} className="text-amber-600" /> Customer Amendment: {alteringItem.code} ({alteringItem.type} • {alteringItem.grossWeight}g)</h4>
                <button onClick={() => { setAlteringItem(null); setAmendInstruction(''); }}><X size={15} /></button>
              </div>
              <form onSubmit={handleSaveAmendment} className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  <input name="custName" type="text" required placeholder="Customer Name *" className="px-3 py-1.5 border rounded-lg" />
                  <input name="custMobile" type="tel" placeholder="Customer Mobile" className="px-3 py-1.5 border rounded-lg" />
                  <input name="deliveryDate" type="date" className="px-3 py-1.5 border rounded-lg" />
                </div>
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                  <label className="block font-bold">What Customer Wants (Write Full Amendment Details) *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_AMEND_TAGS.map(tag => (
                      <button key={tag} type="button" onClick={() => setAmendInstruction(p => p ? `${p}, ${tag}` : tag)} className="px-2 py-0.5 bg-white border border-amber-200 rounded text-[10px] font-semibold">+ {tag}</button>
                    ))}
                  </div>
                  <textarea rows="2" required value={amendInstruction} onChange={(e) => setAmendInstruction(e.target.value)} placeholder="Write exact customer demand: length adjust, lock/kunda change, polish, moti/drops, resizing..." className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-medium" />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <select name="karigarId" className="px-3 py-1.5 border rounded-lg">
                    <option value="">In-House Workshop</option>
                    {karigarList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                  <input name="advancePaid" type="number" defaultValue="0" placeholder="Advance Paid ₹" className="px-3 py-1.5 border rounded-lg font-semibold" />
                  <button type="submit" className="py-2 bg-amber-600 text-white font-semibold rounded-lg">Lock & Print Slip</button>
                </div>
              </form>
            </div>
          )}

          {editingItem && canModify && (
            <div className="bg-white p-4 rounded-2xl border border-slate-300 space-y-2 text-xs">
              <div className="flex justify-between"><span className="font-bold">Edit {editingItem.code}</span><button onClick={() => setEditingItem(null)}><X size={14} /></button></div>
              <form onSubmit={(e) => { e.preventDefault(); setInventoryItems(inventoryItems.map(i => i.id === editingItem.id ? editingItem : i)); setEditingItem(null); showBanner('Updated.'); }} className="grid sm:grid-cols-4 gap-2">
                <input type="text" value={editingItem.type} onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })} className="px-2.5 py-1.5 border rounded" />
                <input type="number" step="0.001" value={editingItem.grossWeight} onChange={(e) => setEditingItem({ ...editingItem, grossWeight: parseFloat(e.target.value) || 0, netWeight: parseFloat(e.target.value) || 0 })} className="px-2.5 py-1.5 border rounded" />
                <input type="number" step="0.01" value={editingItem.makingValue} onChange={(e) => setEditingItem({ ...editingItem, makingValue: parseFloat(e.target.value) || 0 })} className="px-2.5 py-1.5 border rounded" />
                <button type="submit" className="py-1.5 bg-slate-900 text-white font-semibold rounded">Save</button>
              </form>
            </div>
          )}

          <div className="bg-white p-3 rounded-2xl border flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-1 min-w-[160px] border rounded-lg px-2.5 py-1.5">
              <Search size={14} className="text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search code or type..." className="w-full outline-none" />
            </div>
            <select value={filterMaterial} onChange={(e) => { setFilterMaterial(e.target.value); setFilterType('All'); }} className="px-3 py-1.5 border rounded-lg font-semibold">
              <option value="All">All Metals</option><option value="Gold">Gold</option><option value="Silver">Silver</option><option value="Gold-Diamond">Gold-Diamond</option>
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 border rounded-lg">
              <option value="All">All Types</option>
              {[...new Set(liveItems.map(i => i.type))].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredVault.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border shadow-2xs overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="h-36 bg-slate-100 relative">
                    <img src={item.imageUrl} alt={item.code} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90">{item.material}</span>
                    {item.reservedFor && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">Ready: {item.reservedFor}</span>}
                  </div>
                  <div className="p-3 text-xs">
                    <div className="font-bold text-slate-900">{item.code}</div>
                    <div className="text-slate-500">{item.type} • <strong>{item.grossWeight}g</strong></div>
                    <div className="text-[11px] text-amber-700 font-semibold">Making: {item.makingMode === 'percent' ? `${item.makingValue}%` : `₹${item.makingValue}/g`}</div>
                  </div>
                </div>
                <div className="px-3 py-2 border-t flex flex-wrap justify-between gap-1 text-[11px]">
                  <button type="button" onClick={() => { setAlteringItem(item); setAmendInstruction(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-2 py-1 bg-amber-50 text-amber-800 font-semibold rounded inline-flex items-center gap-1">
                    <Wrench size={11} /> Amend / Alter
                  </button>
                  {canModify && <button type="button" onClick={() => setEditingItem({ ...item })} className="px-2 py-1 bg-slate-100 rounded"><Edit3 size={11} /></button>}
                  {canDelete && (confirmDeleteId === item.id ? (
                    <button type="button" onClick={() => { setInventoryItems(inventoryItems.filter(i => i.id !== item.id)); setConfirmDeleteId(null); }} className="px-2 py-1 bg-red-600 text-white rounded font-bold">Yes</button>
                  ) : (
                    <button type="button" onClick={() => setConfirmDeleteId(item.id)} className="px-2 py-1 bg-red-50 text-red-700 rounded"><Trash2 size={11} /></button>
                  ))}
                </div>
              </div>
            ))}
            {!filteredVault.length && <div className="col-span-full bg-white p-8 rounded-2xl border text-center text-xs text-slate-400">No Live Vault items found.</div>}
          </div>
        </div>
      )}

      {tab === 'alteration' && (
        <div className="bg-white rounded-2xl border overflow-hidden text-xs">
          <div className="p-4 border-b font-bold text-sm">Jewelry in Customer Amendment ({alterationItems.length})</div>
          <div className="divide-y">
            {alterationItems.map(item => (
              <div key={item.id} className="p-4 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div className="font-bold">{item.code} • {item.material} {item.type} ({item.grossWeight}g)</div>
                  <div className="text-amber-800 font-semibold">Demand: {item.alteration?.instruction}</div>
                  <div className="text-[11px] text-slate-500">Customer: <strong>{item.alteration?.customerName}</strong> • Karigar: <strong>{item.alteration?.karigarName}</strong></div>
                </div>
                <button type="button" onClick={() => setPrintAmendSlip(item)} className="px-2.5 py-1 bg-slate-100 font-semibold rounded inline-flex items-center gap-1"><Printer size={12} /> Slip</button>
              </div>
            ))}
            {!alterationItems.length && <div className="p-8 text-center text-slate-400">No items currently in amendment.</div>}
          </div>
        </div>
      )}

      {tab === 'handover' && (
        <div className="bg-white rounded-2xl border p-5 space-y-3 text-xs">
          <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b">
            <h3 className="text-sm font-bold">Daily Tray Handover</h3>
            {isAdmin && (
              <select value={selectedHandoverStaff} onChange={(e) => setSelectedHandoverStaff(e.target.value)} className="px-3 py-1.5 border rounded-lg font-semibold">
                <option value="">-- Select Staff --</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          <div className="divide-y">
            {liveItems.filter(i => isAdmin || i.assignedTo === currentUser.id).map(item => {
              const target = staffList.find(s => s.id === selectedHandoverStaff);
              return (
                <div key={item.id} className="py-2.5 flex justify-between items-center">
                  <div><strong>{item.code}</strong> • {item.type} ({item.grossWeight}g) — <span className="text-slate-500">{item.assignedToName ? `With ${item.assignedToName}` : 'In Vault'}</span></div>
                  {item.assignedTo ? (
                    <button type="button" onClick={() => setInventoryItems(inventoryItems.map(x => x.id === item.id ? { ...x, assignedTo: null, assignedToName: '' } : x))} className="px-2.5 py-1 bg-amber-50 text-amber-800 font-semibold rounded">Return</button>
                  ) : isAdmin && target && (
                    <button type="button" onClick={() => setInventoryItems(inventoryItems.map(x => x.id === item.id ? { ...x, assignedTo: target.id, assignedToName: target.name } : x))} className="px-2.5 py-1 bg-slate-900 text-white font-semibold rounded">Assign</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="grid lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <h3 className="text-sm font-bold">Nightly Physical Count</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const sys = liveItems.filter(i => i.material === auditMaterial && (isAdmin || i.assignedTo === currentUser.id)).length;
              const phys = parseInt(physicalCountInput, 10);
              if (isNaN(phys)) return;
              setNightAudits([{ id: Date.now(), date: new Date().toISOString().slice(0, 10), staffName: currentUser.name, material: auditMaterial, physicalCount: phys, systemCount: sys, difference: phys - sys, managerVerified: false }, ...(nightAudits || [])]);
              setPhysicalCountInput(''); showBanner('Count submitted.');
            }} className="space-y-3">
              <select value={auditMaterial} onChange={(e) => setAuditMaterial(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg">
                <option value="Gold">Gold</option><option value="Silver">Silver</option><option value="Gold-Diamond">Gold-Diamond</option>
              </select>
              <input type="number" required value={physicalCountInput} onChange={(e) => setPhysicalCountInput(e.target.value)} placeholder="Physical Count" className="w-full px-3 py-1.5 border rounded-lg font-bold" />
              <input type="text" value={auditRemarks} onChange={(e) => setAuditRemarks(e.target.value)} placeholder="Remarks" className="w-full px-3 py-1.5 border rounded-lg" />
              <button type="submit" className="w-full py-2 bg-slate-900 text-white font-semibold rounded-lg">Submit</button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b font-bold text-sm">Manager Reconciliation</div>
            <div className="divide-y">
              {(nightAudits || []).map(a => (
                <div key={a.id} className="p-3.5 flex justify-between items-center">
                  <div><strong>{a.staffName}</strong> ({a.date}) • {a.material}: Phys <strong>{a.physicalCount}</strong> vs Sys <strong>{a.systemCount}</strong></div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${a.difference === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{a.difference === 0 ? 'Matched' : `Diff: ${a.difference}`}</span>
                    {!a.managerVerified && isAdmin && <button onClick={() => setNightAudits(nightAudits.map(x => x.id === a.id ? { ...x, managerVerified: true } : x))} className="px-2 py-1 bg-slate-900 text-white rounded">Verify</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {printAmendSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b print:hidden">
              <span className="font-bold">Customer Amendment Slip</span>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-3 py-1 bg-slate-900 text-white rounded font-semibold">Print</button>
                <button onClick={() => setPrintAmendSlip(null)} className="px-3 py-1 bg-slate-100 rounded font-semibold">Close</button>
              </div>
            </div>
            <div className="p-4 border-2 border-dashed border-slate-400 rounded-xl space-y-1.5">
              <div className="text-center font-bold text-sm border-b pb-1.5">SWARNASETU JEWELLERS</div>
              <div>Slip: <strong>{printAmendSlip.alteration?.slipNo}</strong> • Date: <strong>{printAmendSlip.alteration?.sentDate}</strong></div>
              <div>Customer: <strong>{printAmendSlip.alteration?.customerName}</strong> ({printAmendSlip.alteration?.customerMobile || 'N/A'})</div>
              <div>Item: <strong>{printAmendSlip.code} — {printAmendSlip.material} {printAmendSlip.type} ({printAmendSlip.grossWeight}g)</strong></div>
              <div className="p-2 bg-slate-50 border rounded"><strong>Demand:</strong> {printAmendSlip.alteration?.instruction}</div>
              <div>Advance: <strong>₹{printAmendSlip.alteration?.advancePaid || 0}</strong> • Due: <strong>{printAmendSlip.alteration?.deliveryDate || 'As Discussed'}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// END OF FILE
