import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  ShoppingCart, Users, FileText, Settings, LogOut, Package, 
  Clock, Shield, Calendar, Store, UserX, PenTool, Banknote, 
  Download, ArrowRight, CheckCircle, AlertTriangle, Search, Plus, Cloud, ArrowLeft
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const users = [
    { id: 'sonu', pass: '@4266@', name: 'Sonu (Master Admin)', role: 'Admin', auth: 'Full' },
    { id: 'owner', pass: 'Owner@4266', name: 'Seth Ji (Owner)', role: 'Admin', auth: 'Full' },
    { id: 'mgr01', pass: '1234', name: 'Vikram Singh (Manager)', role: 'Manager', auth: 'Floor' },
    { id: 'cash01', pass: '1234', name: 'Deepak Soni (Cashier)', role: 'Cashier', auth: 'Billing' },
    { id: 'sales01', pass: '1234', name: 'Rajesh Verma (Gold Sales)', role: 'Sales', auth: 'Counter' },
    { id: 'sales02', pass: '1234', name: 'Jyoti Bhatnagar (Diamond)', role: 'Sales', auth: 'Counter' }
  ];

  const [walkins, setWalkins] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [storeItems, setStoreItems] = useState([
    { id: 1, name: 'Velvet Ring Box', qty: 150, category: 'Packaging' },
    { id: 2, name: 'Thermal Tag Roll', qty: 12, category: 'Stationery' },
    { id: 3, name: 'Polishing Cloth', qty: 45, category: 'Cleaning' }
  ]);
  const [repairs, setRepairs] = useState([]);
  const [cashSlots, setCashSlots] = useState({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0
  });

  useEffect(() => {
    const docRef = doc(db, 'swarnasetu_cloud', 'main_store_data');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWalkins(data.walkins || []);
        setCustomers(data.customers || []);
        setLeaves(data.leaves || []);
        if(data.storeItems) setStoreItems(data.storeItems);
        setRepairs(data.repairs || []);
        if(data.cashSlots) setCashSlots(data.cashSlots);
      }
      setIsDataLoaded(true); 
    }, (error) => {
      console.error("Firebase Sync Error: ", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return; 
    const saveTimer = setTimeout(async () => {
      const dataToSave = { walkins, customers, leaves, storeItems, repairs, cashSlots };
      try {
        await setDoc(doc(db, 'swarnasetu_cloud', 'main_store_data'), dataToSave);
      } catch (error) {
        console.error("Error saving data: ", error);
      }
    }, 1500); 
    return () => clearTimeout(saveTimer);
  }, [walkins, customers, leaves, storeItems, repairs, cashSlots, isDataLoaded]);

  const handleLogin = (e) => {
    e.preventDefault();
    const id = e.target.userid.value;
    const pass = e.target.password.value;
    const user = users.find(u => u.id === id && u.pass === pass);
    if (user) {
      setCurrentUser(user);
      setCurrentView('dashboard');
    } else {
      alert("Invalid User ID or Password!");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
  };

  // Reusable Clean Module Header with Back Button
  const ModuleHeader = ({ title, icon }) => (
    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200">
      <button 
        onClick={() => setCurrentView('dashboard')}
        className="p-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 transition-colors shadow-sm flex items-center gap-1 text-sm font-medium"
      >
        <ArrowLeft size={16} /> Back
      </button>
      <div className="flex items-center gap-2 text-lg font-bold text-gray-800 ml-2">
        <span className="text-orange-600">{icon}</span> {title}
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-orange-50 rounded-full mb-3">
            <Shield className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SwarnaSetu Pro</h1>
          <p className="text-sm text-gray-500 mt-1">Store Management System</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">USER ID</label>
            <input type="text" name="userid" required className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none" placeholder="Enter ID" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">PASSWORD</label>
            <input type="password" name="password" required className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none" placeholder="Enter Password" />
          </div>
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm py-2.5 rounded-md shadow-sm transition-colors mt-2">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Overview</h2>
          <p className="text-sm text-gray-500">Select a module to continue</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={<ShoppingCart size={20} />} title="Billing & POS" desc="Create invoices" colorClass="bg-blue-50 text-blue-600" onClick={() => setCurrentView('billing')} />
        <DashboardCard icon={<Users size={20} />} title="CRM Profiles" desc="Customer data" colorClass="bg-green-50 text-green-600" onClick={() => setCurrentView('crm')} />
        <DashboardCard icon={<UserX size={20} />} title="Walk-In Log" desc="Track visitors" colorClass="bg-red-50 text-red-600" onClick={() => setCurrentView('walkin')} />
        <DashboardCard icon={<Calendar size={20} />} title="Leave Requests" desc="Staff attendance" colorClass="bg-purple-50 text-purple-600" onClick={() => setCurrentView('leave')} />
        <DashboardCard icon={<Store size={20} />} title="Store Inventory" desc="Boxes & supplies" colorClass="bg-teal-50 text-teal-600" onClick={() => setCurrentView('store')} />
        <DashboardCard icon={<PenTool size={20} />} title="Repairs" desc="Karigar tracking" colorClass="bg-amber-50 text-amber-600" onClick={() => setCurrentView('repairs')} />
        <DashboardCard icon={<Banknote size={20} />} title="Cash Drawer" desc="Physical cash" colorClass="bg-emerald-50 text-emerald-600" onClick={() => setCurrentView('cash')} />
        <DashboardCard icon={<Download size={20} />} title="Export Data" desc="Excel & Tally" colorClass="bg-indigo-50 text-indigo-600" onClick={() => setCurrentView('export')} />
      </div>
    </div>
  );

  const renderWalkin = () => {
    const handleAddWalkin = (e) => {
      e.preventDefault();
      const newWalkin = { id: Date.now(), phone: e.target.phone.value, item: e.target.item.value, reason: e.target.reason.value, date: new Date().toLocaleDateString() };
      setWalkins([...walkins, newWalkin]);
      setCustomers([...customers, { ...newWalkin, type: 'Walk-In Prospect' }]);
      e.target.reset();
    };

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <ModuleHeader title="Walk-In Tracker" icon={<UserX size={20} />} />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-4">New Entry</h3>
            <form onSubmit={handleAddWalkin} className="space-y-3">
              <input type="text" name="phone" placeholder="Mobile Number" required className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none" />
              <input type="text" name="item" placeholder="Looking for (e.g. Ring)" required className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none" />
              <select name="reason" className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none" required>
                <option value="">-- Reason for leaving --</option>
                <option value="High Making Charges">High Making Charges</option>
                <option value="Design Issue">Design Not Available</option>
                <option value="Window Shopping">Window Shopping</option>
              </select>
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 rounded-md transition-colors shadow-sm">Save Entry</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 font-semibold text-sm text-gray-700">Today's Log</div>
             <div className="overflow-y-auto max-h-96">
              {walkins.map(w => (
                <div key={w.id} className="p-4 border-b border-gray-100 flex justify-between items-center hover:bg-gray-50">
                  <div><div className="font-medium text-sm text-gray-900">{w.phone}</div><div className="text-xs text-gray-500">Item: {w.item}</div></div>
                  <span className="text-xs font-medium px-2 py-1 bg-red-50 text-red-600 rounded-md">{w.reason}</span>
                </div>
              ))}
              {walkins.length === 0 && <p className="p-6 text-sm text-center text-gray-400">No entries yet.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCRM = () => (
    <div className="p-6 max-w-5xl mx-auto">
      <ModuleHeader title="Customer Profiles" icon={<Users size={20} />} />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">Database</span>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">Total: {customers.length}</span>
        </div>
        <div className="p-4">
          <ul className="space-y-2">
            {customers.map((c, i) => (
              <li key={i} className="p-3 border border-gray-100 rounded-md flex justify-between items-center hover:shadow-sm bg-white">
                <div><div className="font-medium text-sm text-gray-800">{c.phone}</div><div className="text-xs text-gray-500">{c.item || 'General Enquiry'}</div></div>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">{c.type || 'Buyer'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderLeave = () => {
    const applyLeave = (e) => {
      e.preventDefault();
      setLeaves([...leaves, { id: Date.now(), user: currentUser.name, date: e.target.date.value, type: e.target.type.value, status: 'Pending' }]);
      e.target.reset();
    };

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <ModuleHeader title="Leave Management" icon={<Calendar size={20} />} />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-4">Request Leave</h3>
            <form onSubmit={applyLeave} className="space-y-3">
              <input type="date" name="date" required className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 outline-none" />
              <select name="type" required className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 outline-none">
                <option value="Casual (Full Day)">Casual (Full Day)</option>
                <option value="Sick Leave">Sick Leave</option>
              </select>
              <button type="submit" className="w-full bg-orange-600 text-white text-sm font-medium py-2 rounded-md hover:bg-orange-700 shadow-sm">Submit Request</button>
            </form>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 font-semibold text-sm text-gray-700">My Requests</div>
            <div>
              {leaves.filter(l => l.user === currentUser.name || currentUser.role === 'Admin').map(l => (
                <div key={l.id} className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <div><div className="font-medium text-sm">{l.user}</div><div className="text-xs text-gray-500">{l.date} • {l.type}</div></div>
                  <span className="text-xs font-medium bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-200">{l.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCashDrawer = () => (
    <div className="p-6 max-w-5xl mx-auto">
      <ModuleHeader title="Cash Drawer Manager" icon={<Banknote size={20} />} />
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(cashSlots).map(([note, count]) => (
            <div key={note} className="p-3 border border-gray-100 rounded-lg text-center flex flex-col items-center">
              <div className="text-gray-600 font-semibold text-sm mb-3">{note === 'coins' ? 'Coins' : `₹${note}`}</div>
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-md border border-gray-200">
                <button onClick={() => setCashSlots({...cashSlots, [note]: Math.max(0, count - 1)})} className="w-7 h-7 bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold text-sm shadow-sm">-</button>
                <span className="text-sm font-semibold w-8 text-center">{count}</span>
                <button onClick={() => setCashSlots({...cashSlots, [note]: count + 1})} className="w-7 h-7 bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold text-sm shadow-sm">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
          <div className="text-sm font-semibold text-gray-600">Total Cash in Drawer:</div>
          <div className="text-xl font-bold text-green-600">
            ₹{Object.entries(cashSlots).reduce((total, [note, count]) => total + (note === 'coins' ? count : parseInt(note) * count), 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlaceholder = (title, icon) => (
    <div className="p-6 max-w-5xl mx-auto">
      <ModuleHeader title={title} icon={icon} />
      <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
        <div className="inline-block p-4 bg-gray-50 rounded-full mb-3 text-gray-400">{icon}</div>
        <h3 className="text-base font-semibold text-gray-800">Module Available Soon</h3>
        <p className="text-sm text-gray-500 mt-1">This section is currently being configured.</p>
      </div>
    </div>
  );

  if (currentView === 'login') return renderLogin();

  const DashboardCard = ({ icon, title, desc, colorClass, onClick }) => (
    <button onClick={onClick} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all text-left flex flex-col gap-3 group">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
          <Shield className="h-6 w-6 text-orange-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">SwarnaSetu <span className="text-orange-600">Pro</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
            <Cloud size={14} /> <span className="text-xs font-semibold">Cloud Sync</span>
          </div>
          <div className="text-xs text-gray-600 border-r border-gray-200 pr-4">User: <span className="font-bold">{currentUser?.name.split(' ')[0]}</span></div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 transition-colors text-sm font-medium">
            <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'walkin' && renderWalkin()}
        {currentView === 'crm' && renderCRM()}
        {currentView === 'leave' && renderLeave()}
        {currentView === 'cash' && renderCashDrawer()}
        {currentView === 'billing' && renderPlaceholder('Billing & POS', <ShoppingCart size={24} />)}
        {currentView === 'store' && renderPlaceholder('Store Inventory', <Store size={24} />)}
        {currentView === 'repairs' && renderPlaceholder('Repairs & Karigar', <PenTool size={24} />)}
        {currentView === 'export' && renderPlaceholder('Data Export', <Download size={24} />)}
      </main>
    </div>
  );
}
