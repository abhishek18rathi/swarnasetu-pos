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

const DEFAULT_ADMIN = {
  id: 'sonu',
  pass: '@4266@',
  name: 'Sonu (Master Admin)',
  role: 'Admin',
  isFirstLogin: false,
  baseSalary: 0,
  commissionRate: 0,
  weeklyOff: 'Tuesday',
  privileges: {
    payroll_admin: true, rates_edit: true,
    inv_create: true, inv_modify: true, inv_delete: true,
    sales_estimate: true, sales_discount: true, billing_print: true,
    karigar_melter: true, crm_ledger: true, accounts_rojmel: true,
    kitty_admin: true, orders_b2b_urd: true
  },
  profile: { fullName: 'Abhishek Rathi', mobile: '' }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);

  // Module 1 Cloud States
  const [staffList, setStaffList] = useState([DEFAULT_ADMIN]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [officeGps, setOfficeGps] = useState({ lat: 26.4499, lng: 74.6399, radius: 150 });
  const [liveRates, setLiveRates] = useState({
    gold24: 7850, gold22: 7250, gold18: 5950, silver: 92, goldCoin: 7900, silverCoin: 95
  });

  // Module 2 Cloud States
  const [inventoryItems, setInventoryItems] = useState([]);
  const [customJewelTypes, setCustomJewelTypes] = useState({ Gold: [], Silver: [], 'Gold-Diamond': [] });
  const [nightAudits, setNightAudits] = useState([]);

  // Sync with Firebase
  useEffect(() => {
    const docRef = doc(db, 'swarnasetu_cloud', 'erp_master_v2');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.staffList && d.staffList.length > 0) setStaffList(d.staffList);
        if (d.attendanceLogs) setAttendanceLogs(d.attendanceLogs);
        if (d.leaveRequests) setLeaveRequests(d.leaveRequests);
        if (d.officeGps) setOfficeGps(d.officeGps);
        if (d.liveRates) setLiveRates(d.liveRates);
        if (d.inventoryItems) setInventoryItems(d.inventoryItems);
        if (d.customJewelTypes) setCustomJewelTypes(d.customJewelTypes);
        if (d.nightAudits) setNightAudits(d.nightAudits);
      }
      setIsLoaded(true);
    });
    return () => unsub();
  }, []);

  const syncToCloud = async (updatedFields) => {
    try {
      await setDoc(doc(db, 'swarnasetu_cloud', 'erp_master_v2'), updatedFields, { merge: true });
    } catch (err) {
      console.error('Cloud Save Error:', err);
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

  const modules = [
    { id: 'payroll', title: 'Payroll & HR', desc: 'Staff, Privileges, GPS & Salary', icon: Users, color: 'text-indigo-600 bg-indigo-50', ready: true },
    { id: 'inventory', title: 'Inventory & Vault', desc: 'AI Stock, Drafts & Night Audit', icon: Package, color: 'text-teal-600 bg-teal-50', ready: true },
    { id: 'billing', title: 'Sales & Billing', desc: 'Estimates, Discounts & GST Bill', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50', ready: false },
    { id: 'karigar', title: 'Karigar & Melter', desc: 'Gold Melting, Wastage & Repairs', icon: Hammer, color: 'text-amber-600 bg-amber-50', ready: false },
    { id: 'crm', title: 'CRM & Udhaari', desc: 'Customer Khata & Advances', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50', ready: false },
    { id: 'accounts', title: 'Accounts & Rojmel', desc: 'Daily Cash Drawer & Expenses', icon: Wallet, color: 'text-purple-600 bg-purple-50', ready: false },
    { id: 'barcode', title: 'Barcode & Tags', desc: 'Batch Thermal Tag Printing', icon: Printer, color: 'text-slate-700 bg-slate-100', ready: false },
    { id: 'kitty', title: 'Kitty Schemes', desc: 'Admin Rules & Monthly Installments', icon: Gift, color: 'text-pink-600 bg-pink-50', ready: false },
    { id: 'exports', title: 'Tally & Excel', desc: 'CA Reports & Tally XML Export', icon: FileSpreadsheet, color: 'text-green-700 bg-green-50', ready: false },
    { id: 'orders', title: 'Custom Orders', desc: 'Order Book & WhatsApp Alerts', icon: ClipboardList, color: 'text-orange-600 bg-orange-50', ready: false },
    { id: 'purchase', title: 'B2B & HUID Stock', desc: 'Wholesaler Bills & HUID Tracking', icon: Truck, color: 'text-cyan-600 bg-cyan-50', ready: false },
    { id: 'urd', title: 'Old Gold (URD)', desc: 'Cash Payouts & PAN Compliance', icon: Coins, color: 'text-yellow-700 bg-yellow-50', ready: false }
  ];

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
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">User ID</label>
              <input name="userid" type="text" required placeholder="Enter ID" className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Password</label>
              <input name="password" type="password" required placeholder="••••••••" className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500" />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">
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
          <span className="text-sm font-bold text-slate-900 tracking-tight">SwarnaSetu <span className="text-amber-600">Pro</span></span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
            <Cloud size={12} /> {isLoaded ? 'Synced' : 'Connecting...'}
          </span>
          <span className="text-xs text-slate-600 font-medium">{currentUser.name}</span>
          <button
            onClick={() => { setCurrentUser(null); setActiveModule('dashboard'); }}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
          >
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
        {currentUser.privileges
