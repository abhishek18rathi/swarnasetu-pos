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
    { key: 4, grossWeight: '', netWeight: '', diamondCarat: '', makingValue: '12', preview: '' },
    { key: 5, grossWeight: '', netWeight: '', diamondCarat: '', makingValue: '12', preview: '' }
  ]);

  const [selectedDraftIds, setSelectedDraftIds] = useState([]);
  const [printBatchItems, setPrintBatchItems] = useState([]);

  const [filterMaterial, setFilterMaterial] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Customer Custom Amendment / Modification States (Applies to ALL Jewelry Types)
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
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = String(parseInt(numStr, 10) + index).padStart(numStr.length, '0');
    return `${prefix}${nextNum}`;
  };

  const optimizeImageToDataUrl = (file, selectedMat, useBackdrop) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 420;
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

            const pad = 28;
            const target = size - pad * 2;
            const scale = Math.min(target / img.width, target / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          } else {
            const scale = Math.min(size / img.width, size / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
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
    const size = 360;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const theme = STUDIO_BACKDROPS[selectedMat] || STUDIO_BACKDROPS.Gold;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, size - 24, size - 24);

    ctx.fillStyle = selectedMat === 'Gold-Diamond' ? '#0f172a' : '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(code, size / 2, size / 2 - 10);

    ctx.font = '15px sans-serif';
    ctx.fillText(`${selectedMat} • ${typeName}`, size / 2, size / 2 + 20);
    return canvas.toDataURL('image/jpeg', 0.75);
  };

  const processSinglePhoto = async (file, selectedMat, useBackdrop) => {
    if (!file) return;
    setIsProcessingImg(true);
    const dataUrl = await optimizeImageToDataUrl(file, selectedMat, useBackdrop);
    setProcessedPreview(dataUrl);
    setIsProcessingImg(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRawImageFile(file);
    processSinglePhoto(file, material, aiBackdropOn);
  };

  const handleAddCustomType = () => {
    const clean = newTypeInput.trim();
    if (!clean) return;
    const currentList = (customJewelTypes && customJewelTypes[material]) || [];
    if (!availableTypes.includes(clean)) {
      setCustomJewelTypes({
        ...(customJewelTypes || {}),
        [material]: [...currentList, clean]
      });
    }
    setJewelType(clean);
    setNewTypeInput('');
    setShowAddType(false);
    showBanner(`Added new ${material} category: "${clean}"`);
  };

  const uploadDataUrlToCloud = async (dataUrl, code) => {
    try {
      const blob = dataUrlToBlob(dataUrl);
      const storageRef = ref(storage, `swarnasetu_inventory/${code}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (err) {
      return dataUrl;
    }
  };

  const handleSaveToDraft = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    if (!processedPreview) {
      showBanner('Please capture or select a jewelry photo first.');
      return;
    }
    if (inventoryItems.some(i => i.code.toUpperCase() === tagCode.trim().toUpperCase())) {
      showBanner(`Tag Code "${tagCode}" already exists! Change the tag number.`);
      return;
    }

    setIsSaving(true);
    const cleanCode = tagCode.trim().toUpperCase();
    const finalImageUrl = await uploadDataUrlToCloud(processedPreview, cleanCode);

    const newItem = {
      id: Date.now(),
      code: cleanCode,
      material,
      type: jewelType,
      grossWeight: parseFloat(grossWeight) || 0,
      netWeight: parseFloat(netWeight) || parseFloat(grossWeight) || 0,
      diamondCarat: material === 'Gold-Diamond' ? (parseFloat(diamondCarat) || 0) : 0,
      makingMode,
      makingValue: parseFloat(makingValue) || 0,
      imageUrl: finalImageUrl,
      status: 'draft',
      assignedTo: null,
      assignedToName: '',
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setInventoryItems([newItem, ...inventoryItems]);
    setGrossWeight('');
    setNetWeight('');
    setDiamondCarat('');
    setRawImageFile(null);
    setProcessedPreview('');
    setIsSaving(false);
    showBanner(`Saved "${newItem.code}" to Draft List!`);
  };

  const updateBatchRow = (index, field, val) => {
    setBatchRows(batchRows.map((r, idx) => {
      if (idx !== index) return r;
      const updated = { ...r, [field]: val };
      if (field === 'grossWeight' && (!r.netWeight || r.netWeight === r.grossWeight)) {
        updated.netWeight = val;
      }
      return updated;
    }));
  };

  const handleBatchRowPhoto = async (index, file) => {
    if (!file) return;
    const dataUrl = await optimizeImageToDataUrl(file, material, aiBackdropOn);
    setBatchRows(batchRows.map((r, idx) => (idx === index ? { ...r, preview: dataUrl } : r)));
  };

  const addBatchRows = (count = 1) => {
    const baseKey = Date.now();
    const extra = Array.from({ length: count }, (_, i) => ({
      key: baseKey + i,
      grossWeight: '',
      netWeight: '',
      diamondCarat: '',
      makingValue,
      preview: ''
    }));
    setBatchRows([...batchRows, ...extra]);
  };

  const handleSaveBatchToDraft = async (e) => {
    e.preventDefault();
    if (!canCreate) return;

    const validEntries = batchRows
      .map((row, idx) => ({
        ...row,
        computedCode: getBatchRowCode(tagCode, idx)
      }))
      .filter(row => parseFloat(row.grossWeight) > 0);

    if (validEntries.length === 0) {
      showBanner('Enter Gross Weight for at least 1 item in the batch table.');
      return;
    }

    const existingCodes = new Set(inventoryItems.map(i => i.code.toUpperCase()));
    const duplicate = validEntries.find(v => existingCodes.has(v.computedCode));
    if (duplicate) {
      showBanner(`Duplicate Tag Code "${duplicate.computedCode}" already exists! Adjust Starting Tag Code.`);
      return;
    }

    setIsSaving(true);
    const createdBatch = [];
    const baseTime = Date.now();

    for (let i = 0; i < validEntries.length; i++) {
      const row = validEntries[i];
      const sourceImg = row.preview || createStudioPlaceholderCard(row.computedCode, material, jewelType);
      const uploadedUrl = await uploadDataUrlToCloud(sourceImg, row.computedCode);

      createdBatch.push({
        id: baseTime + i,
        code: row.computedCode,
        material,
        type: jewelType,
        grossWeight: parseFloat(row.grossWeight) || 0,
        netWeight: parseFloat(row.netWeight) || parseFloat(row.grossWeight) || 0,
        diamondCarat: material === 'Gold-Diamond' ? (parseFloat(row.diamondCarat) || 0) : 0,
        makingMode,
        makingValue: parseFloat(row.makingValue) || parseFloat(makingValue) || 0,
        imageUrl: uploadedUrl,
        status: 'draft',
        assignedTo: null,
        assignedToName: '',
        createdBy: currentUser.name,
        createdAt: new Date().toISOString().slice(0, 10)
      });
    }

    setInventoryItems([...createdBatch.reverse(), ...inventoryItems]);
    setBatchRows(
      Array.from({ length: 5 }, (_, i) => ({
        key: Date.now() + 100 + i,
        grossWeight: '',
        netWeight: '',
        diamondCarat: '',
        makingValue,
        preview: ''
      }))
    );
    setIsSaving(false);
    showBanner(`Batch Saved! ${createdBatch.length} ${material} ${jewelType} items added to Drafts & Tags.`);
  };

  const handleApproveDraftsToLive = (idsToApprove) => {
    if (idsToApprove.length === 0) return;
    setInventoryItems(inventoryItems.map(item =>
      idsToApprove.includes(item.id) ? { ...item, status: 'live' } : item
    ));
    setSelectedDraftIds([]);
    showBanner(`${idsToApprove.length} item(s) moved to Live Vault Inventory!`);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem || !canModify) return;
    setInventoryItems(inventoryItems.map(item =>
      item.id === editingItem.id ? editingItem : item
    ));
    showBanner(`Updated "${editingItem.code}".`);
    setEditingItem(null);
  };

  // SEND ANY JEWELRY ITEM FOR CUSTOM CUSTOMER AMENDMENT / MODIFICATION
  const handleSendToAlteration = (e) => {
    e.preventDefault();
    if (!alteringItem) return;
    if (!amendInstruction.trim()) {
      showBanner('Please write what amendment / change the customer wants.');
      return;
    }
    const f = e.target;
    const kId = f.karigarId.value;
    const karigar = karigarList.find(k => k.id === kId);

    const alterationData = {
      slipNo: `AMD-${String(Date.now()).slice(-4)}`,
      customerName: f.custName.value.trim(),
      customerMobile: f.custMobile.value.trim(),
      instruction: amendInstruction.trim(),
      deliveryDate: f.deliveryDate.value || '',
      karigarId: karigar ? karigar.id : '',
      karigarName: karigar ? karigar.name : 'In-House Workshop',
      advancePaid: parseFloat(f.advancePaid.value) || 0,
      sentDate: new Date().toISOString().slice(0, 10),
      oldGrossWeight: alteringItem.grossWeight,
      oldNetWeight: alteringItem.netWeight
    };

    const updatedItem = { ...alteringItem, status: 'alteration', alteration: alterationData };

    setInventoryItems(inventoryItems.map(item =>
      item.id === alteringItem.id ? updatedItem : item
    ));

    setPrintAmendSlip(updatedItem);
    showBanner(`${alteringItem.code} (${alteringItem.type}) locked for ${alterationData.customerName} & sent for amendment!`);
    setAlteringItem(null);
    setAmendInstruction('');
  };

  const handleAppendQuickTag = (tagText) => {
    setAmendInstruction(prev => {
      const clean = prev.trim();
      if (!clean) return tagText;
      if (clean.toLowerCase().includes(tagText.toLowerCase())) return clean;
      return `${clean}, ${tagText}`;
    });
  };

  const handleDeleteItem = (id) => {
    if (!canDelete) return;
    setInventoryItems(inventoryItems.filter(item => item.id !== id));
    setConfirmDeleteId(null);
    showBanner('Item removed from records.');
  };

  const toggleStaffHandover = (itemId, staffObj) => {
    setInventoryItems(inventoryItems.map(item => {
      if (item.id === itemId) {
        const isAlreadyAssigned = item.assignedTo === staffObj.id;
        return {
          ...item,
          assignedTo: isAlreadyAssigned ? null : staffObj.id,
          assignedToName: isAlreadyAssigned ? '' : staffObj.name
        };
      }
      return item;
    }));
  };

  const handleNightAuditSubmit = (e) => {
    e.preventDefault();
    const myAssigned = inventoryItems.filter(i => i.status === 'live' && i.material === auditMaterial && (isAdmin || i.assignedTo === currentUser.id));
    const systemCount = myAssigned.length;
    const physicalCount = parseInt(physicalCountInput, 10);

    if (isNaN(physicalCount)) return;

    const record = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      staffId: currentUser.id,
      staffName: currentUser.name,
      material: auditMaterial,
      physicalCount,
      systemCount,
      difference: physicalCount - systemCount,
      remarks: auditRemarks.trim() || '-',
      managerVerified: false
    };

    setNightAudits([record, ...(nightAudits || [])]);
    setPhysicalCountInput('');
    setAuditRemarks('');
    showBanner('Nightly physical count submitted to Manager for verification.');
  };

  const draftItems = inventoryItems.filter(i => i.status === 'draft');
  const liveItems = inventoryItems.filter(i => i.status === 'live');
  const alterationItems = inventoryItems.filter(i => i.status === 'alteration');

  const filteredVault = liveItems.filter(item => {
    const matchMat = filterMaterial === 'All' || item.material === filterMaterial;
    const matchType = filterType === 'All' || item.type === filterType;
    const matchSearch = !searchQuery || item.code.toLowerCase().includes(searchQuery.toLowerCase()) || item.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMat && matchType && matchSearch;
  });

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

      {/* TAB 1: SINGLE & BATCH ENTRY */}
      {tab === 'entry' && canCreate && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEntryMode('single')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  entryMode === 'single' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Plus size={14} /> Single Item Entry
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('batch')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  entryMode === 'batch' ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                }`}
              >
                <Layers size={14} /> Batch Entry (Same Type in One Go)
              </button>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
              All entries save to Drafts first for tag printing
            </span>
          </div>

          {entryMode === 'single' && (
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2.5 border-b border-slate-100">Single Jewelry Stock Entry</h3>

                <form onSubmit={handleSaveToDraft} className="space-y-4 text-xs">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">1. Category (Metal) *</label>
                      <select
                        value={material}
                        onChange={(e) => {
                          const nextMat = e.target.value;
                          setMaterial(nextMat);
                          setJewelType(DEFAULT_TYPES[nextMat][0]);
                          if (rawImageFile) processSinglePhoto(rawImageFile, nextMat, aiBackdropOn);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold"
                      >
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold-Diamond">Gold-Diamond</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-600">2. Jewelry Type *</label>
                        <button type="button" onClick={() => setShowAddType(!showAddType)} className="text-[11px] font-bold text-teal-700 hover:underline">
                          {showAddType ? 'Close' : '+ Make New Type'}
                        </button>
                      </div>

                      {showAddType ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={newTypeInput}
                            onChange={(e) => setNewTypeInput(e.target.value)}
                            placeholder={`New ${material} type`}
                            className="flex-1 px-3 py-1.5 border border-teal-300 rounded-lg"
                          />
                          <button type="button" onClick={handleAddCustomType} className="px-3 py-1.5 bg-teal-600 text-white font-semibold rounded-lg">Add</button>
                        </div>
                      ) : (
                        <select value={jewelType} onChange={(e) => setJewelType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                          {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">3. Jewelry Code *</label>
                      <input type="text" value={tagCode} onChange={(e) => setTagCode(e.target.value.toUpperCase())} required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-teal-700 bg-teal-50/40" />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">4. Gross Weight (g) *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={grossWeight}
                        onChange={(e) => { setGrossWeight(e.target.value); if (!netWeight) setNetWeight(e.target.value); }}
                        placeholder="e.g. 12.450"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Net Weight (g)</label>
                      <input type="number" step="0.001" value={netWeight} onChange={(e) => setNetWeight(e.target.value)} placeholder="Same as Gross" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>

                    {material === 'Gold-Diamond' && (
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Diamond Carat (Ct)</label>
                        <input type="number" step="0.01" value={diamondCarat} onChange={(e) => setDiamondCarat(e.target.value)} placeholder="e.g. 0.45" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">5. Making Type</label>
                      <select value={makingMode} onChange={(e) => setMakingMode(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                        <option value="percent">Making Percentage (%)</option>
                        <option value="rate">Fixed Sale Rate (₹/g)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">{makingMode === 'percent' ? 'Making (%)' : 'Rate per Gram (₹)'}</label>
                      <input type="number" step="0.01" required value={makingValue} onChange={(e) => setMakingValue(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-600" /> 6. AI Jewelry Photo & Auto-Optimizer *
                      </span>
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiBackdropOn}
                          onChange={(e) => { setAiBackdropOn(e.target.checked); if (rawImageFile) processSinglePhoto(rawImageFile, material, e.target.checked); }}
                        />
                        AI Studio Backdrop ({STUDIO_BACKDROPS[material]?.label})
                      </label>
                    </div>
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="w-full text-xs bg-white p-2 border border-slate-200 rounded-lg" />
                  </div>

                  <button type="submit" disabled={isSaving || isProcessingImg} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg">
                    {isSaving ? 'Optimizing & Saving...' : 'Save to Draft List'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                <h4 className="text-xs font-bold text-slate-700 mb-3">AI Optimized Catalog Preview</h4>
                {processedPreview ? (
                  <div className="space-y-2">
                    <img src={processedPreview} alt="Preview" className="w-56 h-56 object-cover rounded-xl border border-slate-200 shadow-xs mx-auto" />
                    <p className="text-[11px] text-emerald-700 font-semibold">Compressed & Studio Framed (~40 KB)</p>
                  </div>
                ) : (
                  <div className="w-56 h-56 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 text-xs">
                    <Sparkles size={24} className="mb-2 text-slate-300" />
                    Capture or upload a photo to see AI Studio framing
                  </div>
                )}
              </div>
            </div>
          )}

          {entryMode === 'batch' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Batch Stock Entry — Same Jewelry Type in One Go</h3>
                  <p className="text-[11px] text-slate-500">Select Category, Type & Starting Tag once; enter weights below and save all at once.</p>
                </div>
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={aiBackdropOn} onChange={(e) => setAiBackdropOn(e.target.checked)} />
                  AI Studio Backdrop ({STUDIO_BACKDROPS[material]?.label})
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">1. Metal *</label>
                  <select
                    value={material}
                    onChange={(e) => { const nextMat = e.target.value; setMaterial(nextMat); setJewelType(DEFAULT_TYPES[nextMat][0]); }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold-Diamond">Gold-Diamond</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-600">2. Jewelry Type *</label>
                    <button type="button" onClick={() => setShowAddType(!showAddType)} className="text-[10px] font-bold text-teal-700 hover:underline">
                      {showAddType ? 'Close' : '+ New'}
                    </button>
                  </div>
                  {showAddType ? (
                    <div className="flex gap-1">
                      <input type="text" value={newTypeInput} onChange={(e) => setNewTypeInput(e.target.value)} placeholder="Type" className="w-full px-2 py-1 bg-white border border-teal-300 rounded-lg" />
                      <button type="button" onClick={handleAddCustomType} className="px-2 py-1 bg-teal-600 text-white rounded-lg font-bold">Add</button>
                    </div>
                  ) : (
                    <select value={jewelType} onChange={(e) => setJewelType(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg">
                      {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">3. Starting Tag Code *</label>
                  <input type="text" value={tagCode} onChange={(e) => setTagCode(e.target.value.toUpperCase())} className="w-full px-2.5 py-1.5 border border-teal-300 rounded-lg font-bold text-teal-800 bg-teal-50" />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">4. Making Type</label>
                  <select value={makingMode} onChange={(e) => setMakingMode(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg">
                    <option value="percent">Making (%)</option>
                    <option value="rate">Rate (₹/g)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Default {makingMode === 'percent' ? 'Making %' : '₹/g'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={makingValue}
                    onChange={(e) => { const val = e.target.value; setMakingValue(val); setBatchRows(batchRows.map(r => ({ ...r, makingValue: val }))); }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <form onSubmit={handleSaveBatchToDraft} className="space-y-4">
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-10">#</th>
                        <th className="p-2.5">Auto Tag Code</th>
                        <th className="p-2.5">Gross Wt (g) *</th>
                        <th className="p-2.5">Net Wt (g)</th>
                        {material === 'Gold-Diamond' && <th className="p-2.5">Diamond Ct</th>}
                        <th className="p-2.5">Making ({makingMode === 'percent' ? '%' : '₹/g'})</th>
                        <th className="p-2.5">AI Photo (Optional)</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batchRows.map((row, idx) => {
                        const rowCode = getBatchRowCode(tagCode, idx);
                        return (
                          <tr key={row.key} className="hover:bg-slate-50/60">
                            <td className="p-2.5 font-semibold text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-teal-700 whitespace-nowrap">{rowCode}</td>
                            <td className="p-2.5">
                              <input type="number" step="0.001" value={row.grossWeight} onChange={(e) => updateBatchRow(idx, 'grossWeight', e.target.value)} placeholder="0.000" className="w-24 px-2 py-1 border border-slate-200 rounded-md font-semibold" />
                            </td>
                            <td className="p-2.5">
                              <input type="number" step="0.001" value={row.netWeight} onChange={(e) => updateBatchRow(idx, 'netWeight', e.target.value)} placeholder="0.000" className="w-24 px-2 py-1 border border-slate-200 rounded-md" />
                            </td>
                            {material === 'Gold-Diamond' && (
                              <td className="p-2.5">
                                <input type="number" step="0.01" value={row.diamondCarat} onChange={(e) => updateBatchRow(idx, 'diamondCarat', e.target.value)} placeholder="0.00" className="w-20 px-2 py-1 border border-slate-200 rounded-md" />
                              </td>
                            )}
                            <td className="p-2.5">
                              <input type="number" step="0.01" value={row.makingValue} onChange={(e) => updateBatchRow(idx, 'makingValue', e.target.value)} className="w-20 px-2 py-1 border border-slate-200 rounded-md" />
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                {row.preview && <img src={row.preview} alt={rowCode} className="w-8 h-8 rounded object-cover border border-slate-200" />}
                                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleBatchRowPhoto(idx, e.target.files[0])} className="text-[11px] max-w-[170px]" />
                              </div>
                            </td>
                            <td className="p-2.5 text-right">
                              {batchRows.length > 1 && (
                                <button type="button" onClick={() => setBatchRows(batchRows.filter((_, rIdx) => rIdx !== idx))} className="p-1 text-slate-400 hover:text-red-600 rounded">
                                  <X size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => addBatchRows(1)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg">+ Add 1 Row</button>
                    <button type="button" onClick={() => addBatchRows(5)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg">+ Add 5 Rows</button>
                  </div>
                  <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg inline-flex items-center gap-1.5">
                    <Save size={14} />
                    {isSaving ? 'Saving Batch...' : `Save All Filled Rows (${batchRows.filter(r => parseFloat(r.grossWeight) > 0).length}) to Draft`}
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
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pending Drafts ({draftItems.length})</h3>
                <p className="text-[11px] text-slate-500">Select items to print thermal tags or approve into Live Vault.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedDraftIds(selectedDraftIds.length === draftItems.length ? [] : draftItems.map(d => d.id))} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
                  {selectedDraftIds.length === draftItems.length && draftItems.length > 0 ? 'Unselect All' : 'Select All'}
                </button>
                <button type="button" disabled={selectedDraftIds.length === 0} onClick={() => setPrintBatchItems(draftItems.filter(d => selectedDraftIds.includes(d.id)))} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1">
                  <Printer size={13} /> Print Tags ({selectedDraftIds.length})
                </button>
                <button type="button" disabled={selectedDraftIds.length === 0} onClick={() => handleApproveDraftsToLive(selectedDraftIds)} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1">
                  <CheckCircle2 size={13} /> Approve to Live Stock ({selectedDraftIds.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-3 w-10">Pick</th>
                    <th className="p-3">Photo
