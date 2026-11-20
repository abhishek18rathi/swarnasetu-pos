import React, { useState, useMemo } from 'react';
import {
  Printer, Search, CheckSquare, Square, Tag,
  Sliders, CheckCircle2, X, Plus, Minus
} from 'lucide-react';

// Deterministic visual barcode stripe pattern from tag code string
function CodeBars({ code = '' }) {
  const chars = code.toUpperCase().split('');
  const bars = [];
  chars.forEach((ch, idx) => {
    const val = ch.charCodeAt(0) + idx * 7;
    bars.push(val % 3 === 0 ? 3 : val % 2 === 0 ? 2 : 1);
    bars.push(1);
    bars.push((val >> 1) % 2 === 0 ? 2 : 1);
  });

  return (
    <div className="flex items-stretch justify-center gap-[1.5px] h-6 my-1 px-1" aria-hidden="true">
      {bars.slice(0, 34).map((w, i) => (
        <span
          key={i}
          className={i % 2 === 0 ? 'bg-slate-900' : 'bg-transparent'}
          style={{ width: `${w}px` }}
        />
      ))}
    </div>
  );
}

export default function BarcodeTagsModule({
  inventoryItems = []
}) {
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'live' | 'draft'
  const [metalFilter, setMetalFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [banner, setBanner] = useState('');

  // Map of itemId -> copy count (default 1 when selected)
  const [selectedCopies, setSelectedCopies] = useState({});

  // Tag Print Customization Options
  const [tagStyle, setTagStyle] = useState('tail'); // 'tail' | 'sticker'
  const [showStoreTitle, setShowStoreTitle] = useState(true);
  const [showMakingInfo, setShowMakingInfo] = useState(true);
  const [showBarcodeBars, setShowBarcodeBars] = useState(true);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 3500);
  };

  // Only taggable items (Live Vault + Pending Drafts)
  const taggableItems = useMemo(() => {
    return (inventoryItems || []).filter(
      (i) => i.status === 'live' || i.status === 'draft'
    );
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    return taggableItems.filter((item) => {
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchMetal = metalFilter === 'All' || item.material === metalFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q));
      return matchStatus && matchMetal && matchSearch;
    });
  }, [taggableItems, statusFilter, metalFilter, searchQuery]);

  const toggleItem = (id) => {
    setSelectedCopies((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  };

  const updateCopies = (id, delta) => {
    setSelectedCopies((prev) => {
      const current = prev[id] || 1;
      const updated = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [id]: updated };
    });
  };

  const handleSelectAllFiltered = () => {
    const allSelected =
      filteredItems.length > 0 && filteredItems.every((i) => !!selectedCopies[i.id]);
    if (allSelected) {
      const next = { ...selectedCopies };
      filteredItems.forEach((i) => delete next[i.id]);
      setSelectedCopies(next);
    } else {
      const next = { ...selectedCopies };
      filteredItems.forEach((i) => {
        if (!next[i.id]) next[i.id] = 1;
      });
      setSelectedCopies(next);
    }
  };

  const expandedTagsToPrint = useMemo(() => {
    const list = [];
    taggableItems.forEach((item) => {
      const count = selectedCopies[item.id] || 0;
      for (let c = 0; c < count; c++) {
        list.push({ ...item, copyIndex: c + 1 });
      }
    });
    return list;
  }, [taggableItems, selectedCopies]);

  const selectedUniqueCount = Object.keys(selectedCopies).length;

  return (
    <div className="space-y-4 text-xs">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex justify-between items-center">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      {/* Top Action & Print Settings Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tag size={17} className="text-slate-800" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Barcode & Thermal Jewelry Tag Studio</h3>
              <p className="text-[11px] text-slate-500">Print or reprint barcode labels for Live Vault and Pending Draft stock</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedUniqueCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCopies({})}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Clear ({selectedUniqueCount})
              </button>
            )}
            <button
              type="button"
              disabled={expandedTagsToPrint.length === 0}
              onClick={() => setPrintPreviewOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
            >
              <Printer size={14} /> Open Print Sheet ({expandedTagsToPrint.length} Tags)
            </button>
          </div>
        </div>

        {/* Tag Customization Toggles */}
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <span className="font-bold text-slate-700 inline-flex items-center gap-1">
            <Sliders size={13} /> Label Format:
          </span>
          <select
            value={tagStyle}
            onChange={(e) => setTagStyle(e.target.value)}
            className="px-2.5 py-1 border border-slate-200 rounded-lg font-semibold bg-slate-50"
          >
            <option value="tail">Jewelry Dumbbell / Tail Tag (Compact)</option>
            <option value="sticker">Box / Tray Barcode Sticker (Wide)</option>
          </select>

          <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={showStoreTitle} onChange={(e) => setShowStoreTitle(e.target.checked)} />
            Showroom Header
          </label>
          <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={showBarcodeBars} onChange={(e) => setShowBarcodeBars(e.target.checked)} />
            Barcode Stripes
          </label>
          <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={showMakingInfo} onChange={(e) => setShowMakingInfo(e.target.checked)} />
            Making Code / %
          </label>
        </div>
      </div>

      {/* Filters & Stock Selection Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 flex-1 max-w-xs">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tag code or item..."
                className="w-full bg-transparent outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
            >
              <option value="all">All Stock ({taggableItems.length})</option>
              <option value="live">Live Vault Only</option>
              <option value="draft">Pending Drafts Only</option>
            </select>

            <select
              value={metalFilter}
              onChange={(e) => setMetalFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
            >
              <option value="All">All Metals</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Gold-Diamond">Gold-Diamond</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
          >
            Toggle Select Filtered ({filteredItems.length})
          </button>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="p-3 w-10">Pick</th>
                <th className="p-3">Tag Code</th>
                <th className="p-3">Category & Type</th>
                <th className="p-3">Gross / Net Wt</th>
                <th className="p-3">Making</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Copies / Quick Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const copies = selectedCopies[item.id] || 0;
                const isPicked = copies > 0;
                return (
                  <tr key={item.id} className={isPicked ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className="text-slate-700 hover:text-slate-900"
                      >
                        {isPicked ? <CheckSquare size={16} className="text-amber-600" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{item.code}</td>
                    <td className="p-3">{item.material} • {item.type}</td>
                    <td className="p-3 font-semibold">{item.grossWeight}g / {item.netWeight}g</td>
                    <td className="p-3">
                      {item.makingMode === 'percent' ? `${item.makingValue}%` : `₹${item.makingValue}/g`}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {item.status === 'live' ? 'Live Vault' : 'Draft'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {isPicked && (
                          <div className="inline-flex items-center border border-slate-200 rounded-md bg-white">
                            <button type="button" onClick={() => updateCopies(item.id, -1)} className="px-1.5 py-1 hover:bg-slate-100">
                              <Minus size={11} />
                            </button>
                            <span className="px-2 font-bold">{copies}</span>
                            <button type="button" onClick={() => updateCopies(item.id, 1)} className="px-1.5 py-1 hover:bg-slate-100">
                              <Plus size={11} />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCopies({ [item.id]: 1 });
                            setPrintPreviewOpen(true);
                            showBanner(`Prepared single tag for ${item.code}`);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-md inline-flex items-center gap-1"
                        >
                          <Printer size={12} /> Print 1
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No jewelry items found for tag printing. Add items in Inventory & Vault first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thermal Tag Print Preview Modal */}
      {printPreviewOpen && expandedTagsToPrint.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 print:hidden">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Thermal Barcode Tag Sheet ({expandedTagsToPrint.length} Labels)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Use browser Print (`Ctrl + P`) with 100% scale and margins set to Minimum/None.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  <Printer size={13} /> Print Labels Now
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPreviewOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>

            <div className={
              tagStyle === 'tail'
                ? 'grid grid-cols-2 sm:grid-cols-4 gap-3'
                : 'grid grid-cols-2 sm:grid-cols-3 gap-3.5'
            }>
              {expandedTagsToPrint.map((tag, idx) => (
                <div
                  key={`${tag.id}-${idx}`}
                  className="p-2.5 border-2 border-dashed border-slate-400 rounded-lg text-center font-mono bg-white text-slate-900"
                >
                  {showStoreTitle && (
                    <div className="font-bold text-[10px] tracking-wider uppercase border-b border-slate-200 pb-0.5">
                      SWARNASETU
                    </div>
                  )}

                  <div className="mt-1 py-0.5 bg-slate-900 text-white font-bold tracking-widest text-[11px]">
                    {tag.code}
                  </div>

                  {showBarcodeBars && <CodeBars code={tag.code} />}

                  <div className="text-[10px] font-bold mt-0.5">
                    {tag.material} • {tag.type}
                  </div>

                  <div className="text-[10px] font-bold">
                    G: {tag.grossWeight}g | N: {tag.netWeight}g
                  </div>

                  {tag.material === 'Gold-Diamond' && Number(tag.diamondCarat) > 0 && (
                    <div className="text-[9px] font-semibold">Dia: {tag.diamondCarat} Ct</div>
                  )}

                  {showMakingInfo && (
                    <div className="text-[9px] text-slate-600 mt-0.5">
                      MC: {tag.makingMode === 'percent' ? `${tag.makingValue}%` : `₹${tag.makingValue}/g`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// END OF FILE
