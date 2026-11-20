import React, { useState } from 'react';
import {
  FileSpreadsheet, Upload, Download, FileCode,
  CheckCircle2, X, AlertCircle, Table
} from 'lucide-react';

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvText(rawText) {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const rows = lines.slice(1).map((line, idx) => {
    const cols = splitCsvLine(line);
    const obj = { _rowNum: idx + 2 };
    headers.forEach((h, i) => {
      obj[h] = cols[i] !== undefined ? cols[i] : '';
    });
    return obj;
  });
  return { headers, rows };
}

function downloadFile(filename, content, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function xmlEscape(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default function TallyExcelModule({
  currentUser,
  inventoryItems = [],
  setInventoryItems,
  invoices = [],
  customerLedger = [],
  setCustomerLedger,
  rojmelEntries = [],
  customOrders = []
}) {
  const [tab, setTab] = useState('import'); // 'import' | 'export' | 'tally'
  const [importTarget, setImportTarget] = useState('inventory'); // 'inventory' | 'customers'
  const [csvText, setCsvText] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [banner, setBanner] = useState('');

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4500);
  };

  const handleLoadSampleTemplate = (target) => {
    setImportTarget(target);
    if (target === 'inventory') {
      const sample = [
        'code,material,type,grossWeight,netWeight,diamondCarat,makingMode,makingValue,status',
        'GLD-RIN-201,Gold,Ring,4.520,4.380,0,percent,14,live',
        'GLD-BAN-202,Gold,Bangle,22.150,22.000,0,rate,450,live',
        'GDM-EAR-203,Gold-Diamond,Earrings,6.100,5.850,0.45,percent,18,live',
        'SLV-ANK-204,Silver,Payal,48.000,48.000,0,rate,85,draft'
      ].join('\n');
      setCsvText(sample);
      runParsePreview(sample, 'inventory');
    } else {
      const sample = [
        'name,mobile,city,openingBalance,note',
        'Ramesh Agarwal,9829011122,Ajmer,12500,Opening Udhaari from old software',
        'Sunita Devi,9829033344,Kotra,0,Regular customer',
        'Mohan Sharma,9829055566,Naya Bazar,-5000,Advance held for custom ring'
      ].join('\n');
      setCsvText(sample);
      runParsePreview(sample, 'customers');
    }
  };

  const runParsePreview = (text, target = importTarget) => {
    const { rows } = parseCsvText(text);
    const errs = [];
    const valid = [];

    if (target === 'inventory') {
      rows.forEach((r) => {
        const code = (r.code || r.tag_code || r.item_code || '').trim();
        const gross = parseFloat(r.grossweight || r.gross_weight || r.weight || '0');
        const net = parseFloat(r.netweight || r.net_weight || gross || '0');
        if (!code || isNaN(gross) || gross <= 0) {
          errs.push(`Row ${r._rowNum}: Missing tag code or valid grossWeight.`);
          return;
        }
        const matRaw = (r.material || r.metal || 'Gold').trim();
        const material =
          matRaw.toLowerCase().includes('silver')
            ? 'Silver'
            : matRaw.toLowerCase().includes('diamond')
            ? 'Gold-Diamond'
            : 'Gold';

        const makingModeRaw = (r.makingmode || r.making_mode || 'percent').toLowerCase();
        const makingMode = makingModeRaw.includes('rate') || makingModeRaw.includes('flat') ? 'rate' : 'percent';
        const makingValue = parseFloat(r.makingvalue || r.making_value || r.making || '12') || 12;
        const statusRaw = (r.status || 'live').toLowerCase();
        const status = statusRaw === 'draft' ? 'draft' : 'live';

        valid.push({
          id: Date.now() + Math.random(),
          code,
          material,
          type: (r.type || r.item_type || r.ornament || 'Ornament').trim(),
          grossWeight: gross,
          netWeight: isNaN(net) || net <= 0 ? gross : net,
          diamondCarat: parseFloat(r.diamondcarat || r.diamond_carat || r.carat || '0') || 0,
          makingMode,
          makingValue,
          status,
          imageUrl: '',
          importedFrom: 'Bulk CSV Import',
          importedAt: new Date().toISOString().slice(0, 10)
        });
      });
    } else {
      rows.forEach((r) => {
        const name = (r.name || r.customer_name || r.customer || '').trim();
        if (!name) {
          errs.push(`Row ${r._rowNum}: Missing customer name.`);
          return;
        }
        const opBal = parseFloat(r.openingbalance || r.opening_balance || r.balance || '0') || 0;
        const note = (r.note || r.remarks || 'Opening balance import').trim();
        valid.push({
          id: `IMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name,
          mobile: (r.mobile || r.phone || r.contact || '').trim(),
          city: (r.city || r.area || 'Ajmer').trim(),
          occasion: (r.occasion || '').trim(),
          balance: opBal,
          transactions:
            opBal !== 0
              ? [
                  {
                    id: Date.now() + Math.random(),
                    date: new Date().toISOString().slice(0, 10),
                    type: opBal > 0 ? 'udhaari_add' : 'advance_add',
                    label: opBal > 0 ? 'Opening Udhaari Import' : 'Opening Advance Import',
                    amount: Math.abs(opBal),
                    payMode: 'Opening Balance',
                    note,
                    recordedBy: currentUser?.name || 'Admin'
                  }
                ]
              : []
        });
      });
    }

    setPreviewRows(valid);
    setImportErrors(errs);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target.result || '');
      setCsvText(content);
      runParsePreview(content, importTarget);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = () => {
    if (previewRows.length === 0) return;

    if (importTarget === 'inventory') {
      if (!setInventoryItems) return;
      setInventoryItems([...previewRows, ...(inventoryItems || [])]);
      showBanner(`Imported ${previewRows.length} stock item(s) into Inventory!`);
    } else {
      if (!setCustomerLedger) return;
      setCustomerLedger([...previewRows, ...(customerLedger || [])]);
      showBanner(`Imported ${previewRows.length} customer ledger account(s) into CRM & Udhaari!`);
    }

    setPreviewRows([]);
    setCsvText('');
    setImportErrors([]);
  };

  // CSV Exports
  const exportInventoryCsv = () => {
    const headers = ['Code', 'Material', 'Type', 'GrossWeight_g', 'NetWeight_g', 'DiamondCarat', 'MakingMode', 'MakingValue', 'Status', 'InvoiceNo'];
    const lines = [headers.join(',')];
    (inventoryItems || []).forEach((i) => {
      lines.push(
        [
          i.code, i.material, i.type, i.grossWeight, i.netWeight,
          i.diamondCarat || 0, i.makingMode, i.makingValue, i.status, i.invoiceNo || ''
        ]
          .map(csvEscape)
          .join(',')
      );
    });
    downloadFile(`swarnasetu_inventory_${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'));
    showBanner('Inventory CSV exported.');
  };

  const exportInvoicesCsv = () => {
    const headers = ['InvoiceNo', 'Date', 'CustomerName', 'Mobile', 'PaymentMode', 'MetalTotal', 'MakingTotal', 'GST_3Pct', 'GrandTotal'];
    const lines = [headers.join(',')];
    (invoices || []).forEach((inv) => {
      lines.push(
        [
          inv.invoiceNo, inv.date, inv.customerName, inv.customerMobile || '',
          inv.paymentMode || '', inv.metalTotal || 0, inv.finalMakingTotal || 0,
          inv.gstAmount || 0, inv.grandTotal || 0
        ]
          .map(csvEscape)
          .join(',')
      );
    });
    downloadFile(`swarnasetu_gst_invoices_${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'));
    showBanner('GST Invoices CSV exported.');
  };

  const exportCustomersCsv = () => {
    const headers = ['CustomerName', 'Mobile', 'City', 'NetBalance_PositiveDue_NegativeAdvance', 'TransactionsCount'];
    const lines = [headers.join(',')];
    (customerLedger || []).forEach((c) => {
      lines.push(
        [c.name, c.mobile || '', c.city || '', c.balance || 0, (c.transactions || []).length]
          .map(csvEscape)
          .join(',')
      );
    });
    downloadFile(`swarnasetu_customer_khata_${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'));
    showBanner('Customer Khata CSV exported.');
  };

  const exportRojmelCsv = () => {
    const headers = ['Date', 'Time', 'Type', 'Mode', 'Category', 'Particulars', 'Amount', 'By'];
    const lines = [headers.join(',')];
    (rojmelEntries || []).forEach((r) => {
      lines.push(
        [r.date, r.time || '', r.type === 'in' ? 'Jama/In' : 'Naam/Out', r.mode, r.category, r.particulars, r.amount, r.by || '']
          .map(csvEscape)
          .join(',')
      );
    });
    downloadFile(`swarnasetu_rojmel_${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'));
    showBanner('Rojmel CSV exported.');
  };

  // Tally XML Export (Masters + Sales Vouchers)
  const exportTallyXml = () => {
    const ledgerXml = (customerLedger || [])
      .map((c) => {
        const bal = Number(c.balance) || 0;
        // In Tally, positive opening balance is Dr (Sundry Debtors), negative is Cr
        const tallyOpening = bal !== 0 ? `<OPENINGBALANCE>${-bal}</OPENINGBALANCE>` : '';
        return `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${xmlEscape(c.name)}" ACTION="Create">
            <NAME.LIST><NAME>${xmlEscape(c.name)}</NAME></NAME.LIST>
            <PARENT>Sundry Debtors</PARENT>
            <LEDGERMOBILE>${xmlEscape(c.mobile || '')}</LEDGERMOBILE>
            ${tallyOpening}
          </LEDGER>
        </TALLYMESSAGE>`;
      })
      .join('');

    const voucherXml = (invoices || [])
      .map((inv) => {
        const ymd = (inv.date || '').replace(/-/g, '');
        const totalAmt = Number(inv.grandTotal) || 0;
        const subAmt = Number(inv.subTotal) || 0;
        const gstAmt = Number(inv.gstAmount) || 0;
        return `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${xmlEscape(ymd)}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${xmlEscape(inv.invoiceNo)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${xmlEscape(inv.customerName || 'Cash')}</PARTYLEDGERNAME>
            <NARRATION>${xmlEscape(`SwarnaSetu Bill ${inv.invoiceNo} (${inv.paymentMode || ''})`)}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${xmlEscape(inv.customerName || 'Cash')}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${totalAmt}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Jewelry Sales (GST)</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${subAmt}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output GST 3%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${gstAmt}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>`;
      })
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>${ledgerXml}${voucherXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    downloadFile(`swarnasetu_tally_import_${new Date().toISOString().slice(0, 10)}.xml`, xml, 'application/xml;charset=utf-8;');
    showBanner('Tally XML file generated for Ledgers & Sales Vouchers.');
  };

  return (
    <div className="space-y-4 text-xs">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex justify-between items-center">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setTab('import')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
            tab === 'import' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload size={14} /> 1. Bulk CSV / Excel Import (Migration)
        </button>
        <button
          onClick={() => setTab('export')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
            tab === 'export' ? 'bg-green-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet size={14} /> 2. Excel / CSV Export
        </button>
        <button
          onClick={() => setTab('tally')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
            tab === 'tally' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCode size={14} /> 3. Tally XML Export
        </button>
      </div>

      {/* TAB 1: BULK CSV / EXCEL IMPORT */}
      {tab === 'import' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bulk Data Import from Old Software / Excel (.CSV)</h3>
              <p className="text-[11px] text-slate-500">
                Export your opening stock or customer balances as CSV from your previous software, preview below, and push into SwarnaSetu Pro.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleLoadSampleTemplate('inventory')}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold rounded-lg"
              >
                Load Sample Stock CSV
              </button>
              <button
                type="button"
                onClick={() => handleLoadSampleTemplate('customers')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg"
              >
                Load Sample Customer CSV
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Import Destination</label>
              <select
                value={importTarget}
                onChange={(e) => {
                  const nextTarget = e.target.value;
                  setImportTarget(nextTarget);
                  if (csvText.trim()) runParsePreview(csvText, nextTarget);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
              >
                <option value="inventory">Inventory Stock (Vault / Drafts)</option>
                <option value="customers">Customer Profiles & Opening Udhaari/Advance</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Upload .CSV File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="w-full text-[11px] bg-slate-50 p-1.5 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Or Paste CSV Rows Directly (First row = column headers)
            </label>
            <textarea
              rows="5"
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                runParsePreview(e.target.value, importTarget);
              }}
              placeholder={
                importTarget === 'inventory'
                  ? 'code,material,type,grossWeight,netWeight,makingMode,makingValue,status\nGLD-RIN-101,Gold,Ring,5.200,5.050,percent,12,live'
                  : 'name,mobile,city,openingBalance,note\nRamesh Ji,9829000000,Ajmer,10000,Opening due'
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px]"
            />
          </div>

          {importErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-1">
              <div className="font-bold flex items-center gap-1"><AlertCircle size={14} /> Skipped Rows Notice:</div>
              {importErrors.map((err, i) => <div key={i} className="text-[11px]">{err}</div>)}
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Table size={14} /> Ready to Import: {previewRows.length} Valid Row(s)
                </span>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                >
                  Confirm & Push {previewRows.length} Record(s) to {importTarget === 'inventory' ? 'Inventory' : 'CRM'}
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-60">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    {importTarget === 'inventory' ? (
                      <tr>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Material</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Gross / Net</th>
                        <th className="p-2.5">Making</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="p-2.5">Customer Name</th>
                        <th className="p-2.5">Mobile</th>
                        <th className="p-2.5">City</th>
                        <th className="p-2.5 text-right">Opening Balance</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, idx) =>
                      importTarget === 'inventory' ? (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-slate-900">{row.code}</td>
                          <td className="p-2.5">{row.material}</td>
                          <td className="p-2.5">{row.type}</td>
                          <td className="p-2.5 font-semibold">{row.grossWeight}g / {row.netWeight}g</td>
                          <td className="p-2.5">{row.makingMode === 'percent' ? `${row.makingValue}%` : `₹${row.makingValue}/g`}</td>
                          <td className="p-2.5 uppercase font-bold text-[10px]">{row.status}</td>
                        </tr>
                      ) : (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                          <td className="p-2.5">{row.mobile || '-'}</td>
                          <td className="p-2.5">{row.city}</td>
                          <td className="p-2.5 text-right font-bold">₹{Number(row.balance || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXCEL / CSV EXPORT */}
      {tab === 'export' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-slate-900 text-sm">Inventory Stock Sheet</div>
              <p className="text-[11px] text-slate-500 mt-1">{(inventoryItems || []).length} total items with weights & making rules</p>
            </div>
            <button onClick={exportInventoryCsv} className="w-full py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg inline-flex items-center justify-center gap-1.5">
              <Download size={13} /> Download CSV
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-slate-900 text-sm">GST Invoices Register</div>
              <p className="text-[11px] text-slate-500 mt-1">{(invoices || []).length} bills with taxable value & 3% GST</p>
            </div>
            <button onClick={exportInvoicesCsv} className="w-full py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg inline-flex items-center justify-center gap-1.5">
              <Download size={13} /> Download CSV
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-slate-900 text-sm">Customer Khata & Udhaari</div>
              <p className="text-[11px] text-slate-500 mt-1">{(customerLedger || []).length} customer accounts & net balances</p>
            </div>
            <button onClick={exportCustomersCsv} className="w-full py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg inline-flex items-center justify-center gap-1.5">
              <Download size={13} /> Download CSV
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-slate-900 text-sm">Daily Rojmel Vouchers</div>
              <p className="text-[11px] text-slate-500 mt-1">{(rojmelEntries || []).length} manual cash/bank vouchers • {(customOrders || []).length} orders</p>
            </div>
            <button onClick={exportRojmelCsv} className="w-full py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg inline-flex items-center justify-center gap-1.5">
              <Download size={13} /> Download CSV
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: TALLY XML EXPORT */}
      {tab === 'tally' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <FileCode size={16} className="text-amber-600" /> TallyPrime / Tally ERP XML Package
          </h3>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Generates a ready-to-import <strong>.XML</strong> file containing <strong>Sundry Debtors Ledgers</strong> (from CRM Khata) and <strong>Sales Vouchers</strong> (from generated GST Invoices). In Tally, go to <strong>Import → Vouchers / Masters</strong> and select the downloaded XML file.
          </p>
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
            <div>Customer Ledgers Included: <strong>{(customerLedger || []).length}</strong></div>
            <div>Sales Invoices Included: <strong>{(invoices || []).length}</strong></div>
          </div>
          <button
            type="button"
            onClick={exportTallyXml}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
          >
            <Download size={14} /> Generate & Download Tally XML
          </button>
        </div>
      )}
    </div>
  );
}
// END OF FILE
