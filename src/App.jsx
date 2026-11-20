import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  Shield, Users, Package, ShoppingCart, Hammer, BookOpen,
  Wallet, Printer, Gift, FileSpreadsheet, ClipboardList,
  Truck, Coins, TrendingUp, LogOut, ArrowLeft, Cloud
} from 'lucide-react';
import PayrollModule from './modules/PayrollModule';
import InventoryModule from './modules/InventoryModule';
import SalesBillingModule from './modules/SalesBillingModule';
import KarigarMelterModule from './modules/KarigarMelterModule';
import CrmUdhaariModule from './modules/CrmUdhaariModule';
import AccountsRojmelModule from './modules/AccountsRojmelModule';
import BarcodeTagsModule from './modules/BarcodeTagsModule';
import KittyModule from './modules/KittyModule';
import CustomOrdersModule from './modules/CustomOrdersModule';
import TallyExcelModule from './modules/TallyExcelModule';
import B2bHuidPurchaseModule from './modules/B2bHuidPurchaseModule';

const DEFAULT_ADMIN = {
  id: 'sonu', pass: '@4266@', name: 'Sonu (Master Admin)', role: 'Admin',
  isFirstLogin: false, baseSalary: 0, commissionRate: 0, weeklyOff: 'Tuesday',
  privileges: {
    payroll_admin: true, rates_edit: true, inv_create: true, inv_modify: true, inv_delete: true,
    sales_estimate: true, sales_discount: true, billing_print: true, karigar_melter: true,
    crm_ledger: true, accounts_rojmel: true, kitty_admin: true, orders_b2b_urd: true
  },
  profile: { fullName: 'Abhishek Rathi', mobile: '' }
};

const MODULES = [
  { id: 'payroll', title: 'Payroll & HR', desc: 'Staff, Privileges, GPS & Salary', icon: Users, color: 'text-indigo-600 bg-indigo-50', ready: true },
  { id: 'inventory', title: 'Inventory & Vault', desc: 'AI Stock, Amendments & Audit', icon: Package, color: 'text-teal-600 bg-teal-50', ready: true },
  { id: 'billing', title: 'Sales & Billing', desc: 'Estimates, Discounts & GST Bill', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50', ready: true },
  { id: 'karigar', title: 'Karigar & Melter', desc: 'Melting, Repairs & Amendments', icon: Hammer, color: 'text-amber-600 bg-amber-50', ready: true },
  { id: 'crm', title: 'CRM & Udhaari', desc: 'Customer Khata & Advances', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50', ready: true },
  { id: 'accounts', title: 'Accounts & Rojmel', desc: 'Daily Cash Drawer & Expenses', icon: Wallet, color: 'text-purple-600 bg-purple-50', ready: true },
  { id: 'barcode', title: 'Barcode & Tags', desc: 'Batch Thermal Tag Printing', icon: Printer, color: 'text-slate-700 bg-slate-100', ready: true },
  { id: 'kitty', title: 'Kitty Schemes', desc: 'Admin Rules & Monthly Installments', icon: Gift, color: 'text-pink-600 bg-pink-50', ready: true },
  { id: 'exports', title: 'Tally & Excel', desc: 'Bulk Import, CSV & Tally XML', icon: FileSpreadsheet, color: 'text-green-700 bg-green-50', ready: true },
  { id: 'orders', title: 'Custom Orders', desc: 'Order Book & WhatsApp Alerts', icon: ClipboardList, color: 'text-orange-600 bg-orange-50', ready: true },
  { id: 'purchase', title: 'B2B & HUID Stock', desc: 'Wholesaler Bills & HUID Tracking', icon: Truck, color: 'text-cyan-600 bg-cyan-50', ready: true },
  { id: 'urd', title: 'Old Gold (URD)', desc: 'Cash Payouts & PAN Compliance', icon: Coins, color: 'text-yellow-700 bg-yellow-50', ready: false }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);

  const [staffList, setStaffList] = useState([DEFAULT_ADMIN]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [officeGps, setOfficeGps] = useState({ lat: 26.4499, lng: 74.6399, radius: 150 });
  const [liveRates, setLiveRates] = useState({
    gold24: 7850, gold22: 7250, gold18: 5950, silver: 92, goldCoin: 7900, silverCoin: 95
  });

  const [inventoryItems, setInventoryItems] = useState([]);
  const [customJewelTypes, setCustomJewelTypes] = useState({ Gold: [], Silver: [], 'Gold-Diamond': [] });
  const [nightAudits, setNightAudits] = useState([]);

  const [estimates, setEstimates] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [melterJobs, setMelterJobs] = useState([]);
  const [karigarList, setKarigarList] = useState([]);
  const [karigarLedger, setKarigarLedger] = useState([]);
  const [repairJobs, setRepairJobs] = useState([]);

  const [customerLedger, setCustomerLedger] = useState([]);

  const [rojmelEntries, setRojmelEntries] = useState([]);
  const [openingCashMap, setOpeningCashMap] = useState({});
  const [dayLocks, setDayLocks] = useState({});

  const [kittyPlans, setKittyPlans] = useState([]);
  const [kittyMembers, setKittyMembers] = useState([]);

  const [customOrders, setCustomOrders] = useState([]);

  const [suppliers, setSuppliers] = useState([]);
  const [b2bPurchases, setB2bPurchases] = useState([]);

  useEffect(() => {
    const docRef = doc(db, 'swarnasetu_cloud', 'erp_master_v2');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.staffList?.length) setStaffList(d.staffList);
        if (d.attendanceLogs) setAttendanceLogs(d.attendanceLogs);
        if (d.leaveRequests) setLeaveRequests(d.leaveRequests);
        if (d.officeGps) setOfficeGps(d.officeGps);
        if (d.liveRates) setLiveRates(d.liveRates);
        if (d.inventoryItems) setInventoryItems(d.inventoryItems);
        if (d.customJewelTypes) setCustomJewelTypes(d.customJewelTypes);
        if (d.nightAudits) setNightAudits(d.nightAudits);
        if (d.estimates) setEstimates(d.estimates);
        if (d.invoices) setInvoices(d.invoices);
        if (d.melterJobs) setMelterJobs(d.melterJobs);
        if (d.karigarList) setKarigarList(d.karigarList);
        if (d.karigarLedger) setKarigarLedger(d.karigarLedger);
        if (d.repairJobs) setRepairJobs(d.repairJobs);
        if (d.customerLedger) setCustomerLedger(d.customerLedger);
        if (d.rojmelEntries) setRojmelEntries(d.rojmelEntries);
        if (d.openingCashMap) setOpeningCashMap(d.openingCashMap);
        if (d.dayLocks) setDayLocks(d.dayLocks);
        if (d.kittyPlans) setKittyPlans(d.kittyPlans);
        if (d.kittyMembers) setKittyMembers(d.kittyMembers);
        if (d.customOrders) setCustomOrders(d.customOrders);
        if (d.suppliers) setSuppliers(d.suppliers);
        if (d.b2bPurchases) setB2bPurchases(d.b2bPurchases);
      }
      setIsLoaded(true);
    });
    return () => unsub();
  }, []);

  const syncToCloud = async (fields) => {
    try {
      await setDoc(doc(db, 'swarnasetu_cloud', 'erp_master_v2'), fields, { merge: true });
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      const fresh = staffList.find(u => u.id === currentUser.id);
      if (fresh) setCurrentUser(fresh);
    }
  }, [staffList]);

  const handleLogin = (e) => {
    e.preventDefault();
    const uid = e.target.userid.value.trim();
    const pwd = e.target.password.value.trim();
    const found = staffList.find(u => u.id === uid && u.pass === pwd);
    if (found) {
      setCurrentUser(found);
      setActiveModule(found.isFirstLogin ? 'payroll' : 'dashboard');
    } else {
      alert('Invalid User ID or Password');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 shadow-sm p-7">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Shield size={22} />
            </div>
            <h1 className="text-lg font-bold text-slate-900">SwarnaSetu Pro</h1>
            <p className="text-xs text-slate-500 mt-0.5">Enterprise Jewelry ERP</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">User ID</label>
              <input name="userid" type="text" required placeholder="Enter ID" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Password</label>
              <input name="password" type="password" required placeholder="••••••••" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg" />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg">
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200/80 px-5 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => !currentUser.isFirstLogin && setActiveModule('dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Shield size={18} />
          </div>
          <span className="text-sm font-bold text-slate-900">SwarnaSetu <span className="text-amber-600">Pro</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
            <Cloud size={12} /> {isLoaded ? 'Synced' : 'Syncing...'}
          </span>
          <span className="text-xs text-slate-600 font-medium">{currentUser.name}</span>
          <button onClick={() => { setCurrentUser(null); setActiveModule('dashboard'); }} className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 bg-slate-100 rounded-lg flex items-center gap-1">
            <LogOut size={13} /> Exit
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200/80 px-5 py-2 flex items-center justify-between gap-4 overflow-x-auto text-xs">
        <div className="flex items-center gap-5 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 text-[11px] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Rates (1g)
          </span>
          <span className="text-slate-600">24K: <strong className="text-slate-900">₹{liveRates.gold24}</strong></span>
          <span className="text-slate-600">22K: <strong className="text-slate-900">₹{liveRates.gold22}</strong></span>
          <span className="text-slate-600">18K: <strong className="text-slate-900">₹{liveRates.gold18}</strong></span>
          <span className="text-slate-600">Silver: <strong className="text-slate-900">₹{liveRates.silver}</strong></span>
          <span className="text-slate-600">Gold Coin: <strong className="text-slate-900">₹{liveRates.goldCoin}</strong></span>
          <span className="text-slate-600">Silver Coin: <strong className="text-slate-900">₹{liveRates.silverCoin}</strong></span>
        </div>
        {currentUser.privileges?.rates_edit && (
          <button onClick={() => setActiveModule('rates')} className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md whitespace-nowrap">
            Update Rates
          </button>
        )}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-5">
        {activeModule !== 'dashboard' && !currentUser.isFirstLogin && (
          <div className="mb-4">
            <button onClick={() => setActiveModule('dashboard')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs">
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
          </div>
        )}

        {activeModule === 'dashboard' && (
          <div>
            <div className="mb-5">
              <h2 className="text-base font-bold text-slate-900">Showroom Control Center</h2>
              <p className="text-xs text-slate-500">Select a module tile to manage operations</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button key={mod.id} onClick={() => setActiveModule(mod.id)} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all text-left flex flex-col justify-between group">
                    <div className="flex items-start justify-between w-full mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mod.color}`}><Icon size={18} /></div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mod.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {mod.ready ? 'Active' : 'Next'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{mod.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{mod.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeModule === 'rates' && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <TrendingUp size={18} className="text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Broadcast Daily Metal Rates</h3>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const updated = {
                  gold24: Number(e.target.gold24.value), gold22: Number(e.target.gold22.value),
                  gold18: Number(e.target.gold18.value), silver: Number(e.target.silver.value),
                  goldCoin: Number(e.target.goldCoin.value), silverCoin: Number(e.target.silverCoin.value)
                };
                setLiveRates(updated);
                syncToCloud({ liveRates: updated });
                setActiveModule('dashboard');
              }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { key: 'gold24', label: '24K Gold (999)' }, { key: 'gold22', label: '22K Gold (916)' },
                { key: 'gold18', label: '18K Gold (750)' }, { key: 'silver', label: 'Fine Silver' },
                { key: 'goldCoin', label: 'Gold Coin' }, { key: 'silverCoin', label: 'Silver Coin' }
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{f.label}</label>
                  <input name={f.key} type="number" step="0.01" defaultValue={liveRates[f.key]} required className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold" />
                </div>
              ))}
              <div className="col-span-2 pt-2">
                <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg">Publish Live Rates</button>
              </div>
            </form>
          </div>
        )}

        {activeModule === 'payroll' && (
          <PayrollModule
            currentUser={currentUser}
            staffList={staffList}
            setStaffList={(v) => { setStaffList(v); syncToCloud({ staffList: v }); }}
            attendanceLogs={attendanceLogs}
            setAttendanceLogs={(v) => { setAttendanceLogs(v); syncToCloud({ attendanceLogs: v }); }}
            leaveRequests={leaveRequests}
            setLeaveRequests={(v) => { setLeaveRequests(v); syncToCloud({ leaveRequests: v }); }}
            officeGps={officeGps}
            setOfficeGps={(v) => { setOfficeGps(v); syncToCloud({ officeGps: v }); }}
            onCompleteOnboarding={() => setActiveModule('dashboard')}
          />
        )}

        {activeModule === 'inventory' && (
          <InventoryModule
            currentUser={currentUser}
            staffList={staffList}
            karigarList={karigarList}
            inventoryItems={inventoryItems}
            setInventoryItems={(v) => { setInventoryItems(v); syncToCloud({ inventoryItems: v }); }}
            customJewelTypes={customJewelTypes}
            setCustomJewelTypes={(v) => { setCustomJewelTypes(v); syncToCloud({ customJewelTypes: v }); }}
            nightAudits={nightAudits}
            setNightAudits={(v) => { setNightAudits(v); syncToCloud({ nightAudits: v }); }}
          />
        )}

        {activeModule === 'billing' && (
          <SalesBillingModule
            currentUser={currentUser}
            liveRates={liveRates}
            inventoryItems={inventoryItems}
            setInventoryItems={(v) => { setInventoryItems(v); syncToCloud({ inventoryItems: v }); }}
            estimates={estimates}
            setEstimates={(v) => { setEstimates(v); syncToCloud({ estimates: v }); }}
            invoices={invoices}
            setInvoices={(v) => { setInvoices(v); syncToCloud({ invoices: v }); }}
          />
        )}

        {activeModule === 'karigar' && (
          <KarigarMelterModule
            currentUser={currentUser}
            inventoryItems={inventoryItems}
            setInventoryItems={(v) => { setInventoryItems(v); syncToCloud({ inventoryItems: v }); }}
            melterJobs={melterJobs}
            setMelterJobs={(v) => { setMelterJobs(v); syncToCloud({ melterJobs: v }); }}
            karigarList={karigarList}
            setKarigarList={(v) => { setKarigarList(v); syncToCloud({ karigarList: v }); }}
            karigarLedger={karigarLedger}
            setKarigarLedger={(v) => { setKarigarLedger(v); syncToCloud({ karigarLedger: v }); }}
            repairJobs={repairJobs}
            setRepairJobs={(v) => { setRepairJobs(v); syncToCloud({ repairJobs: v }); }}
          />
        )}

        {activeModule === 'crm' && (
          <CrmUdhaariModule
            currentUser={currentUser}
            customerLedger={customerLedger}
            setCustomerLedger={(v) => { setCustomerLedger(v); syncToCloud({ customerLedger: v }); }}
            invoices={invoices}
          />
        )}

        {activeModule === 'accounts' && (
          <AccountsRojmelModule
            currentUser={currentUser}
            rojmelEntries={rojmelEntries}
            setRojmelEntries={(v) => { setRojmelEntries(v); syncToCloud({ rojmelEntries: v }); }}
            openingCashMap={openingCashMap}
            setOpeningCashMap={(v) => { setOpeningCashMap(v); syncToCloud({ openingCashMap: v }); }}
            dayLocks={dayLocks}
            setDayLocks={(v) => { setDayLocks(v); syncToCloud({ dayLocks: v }); }}
            invoices={invoices}
            customerLedger={customerLedger}
          />
        )}

        {activeModule === 'barcode' && (
          <BarcodeTagsModule inventoryItems={inventoryItems} />
        )}

        {activeModule === 'kitty' && (
          <KittyModule
            currentUser={currentUser}
            liveRates={liveRates}
            kittyPlans={kittyPlans}
            setKittyPlans={(v) => { setKittyPlans(v); syncToCloud({ kittyPlans: v }); }}
            kittyMembers={kittyMembers}
            setKittyMembers={(v) => { setKittyMembers(v); syncToCloud({ kittyMembers: v }); }}
          />
        )}

        {activeModule === 'orders' && (
          <CustomOrdersModule
            currentUser={currentUser}
            liveRates={liveRates}
            inventoryItems={inventoryItems}
            setInventoryItems={(v) => { setInventoryItems(v); syncToCloud({ inventoryItems: v }); }}
            karigarList={karigarList}
            customOrders={customOrders}
            setCustomOrders={(v) => { setCustomOrders(v); syncToCloud({ customOrders: v }); }}
          />
        )}

        {activeModule === 'exports' && (
          <TallyExcelModule
            currentUser={currentUser}
            inventoryItems={inventoryItems}
            setInventoryItems={(v) => { setInventoryItems(v); syncToCloud({ inventoryItems: v }); }}
            invoices={invoices}
            customerLedger={customerLedger}
            setCustomerLedger={(v) => { setCustomerLedger(v); syncToCloud({ customerLedger: v }); }}
            rojmelEntries={rojmelEntries}
            customOrders={customOrders}
          />
        )}

        {activeModule === 'purchase' && (
          <B2bHuidPurchaseModule
            currentUser={currentUser}
            suppliers={suppliers}
            setSuppliers={(v) => { setSuppliers(v); syncToCloud({ suppliers: v }); }}
            b2bPurchases={b2bPurchases}
            setB2bPurchases={(v) => { setB2bPurchases(v); syncToCloud({ b2bPurchases: v }); }}
            inventoryItems={inventoryItems}
            setInventoryItems={(v) => { setInventoryItems(v); syncToCloud({ inventoryItems: v }); }}
          />
        )}

        {!['dashboard', 'payroll', 'inventory', 'billing', 'karigar', 'crm', 'accounts', 'barcode', 'kitty', 'orders', 'exports', 'purchase', 'rates'].includes(activeModule) && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900 capitalize">{activeModule} Module</h3>
            <p className="text-xs text-slate-500 mt-1">Module slot ready. Say "Build {activeModule}" when you want to activate this file.</p>
          </div>
        )}
      </main>
    </div>
  );
}
// END OF FILE
