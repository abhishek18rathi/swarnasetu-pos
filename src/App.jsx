import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Users, FileText, Settings, LogOut, Package, 
  Clock, Shield, Calendar, Store, UserX, PenTool, Banknote, 
  Download, ArrowRight, CheckCircle, AlertTriangle, Search, Plus
} from 'lucide-react';

export default function App() {
  // 1. Initial Data & Authentication States
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');

  const users = [
    { id: 'sonu', pass: '@4266@', name: 'Sonu (Master Admin)', role: 'Admin', auth: 'Full' },
    { id: 'owner', pass: 'Owner@4266', name: 'Seth Ji (Owner)', role: 'Admin', auth: 'Full' },
    { id: 'mgr01', pass: '1234', name: 'Vikram Singh (Manager)', role: 'Manager', auth: 'Floor' },
    { id: 'cash01', pass: '1234', name: 'Deepak Soni (Cashier)', role: 'Cashier', auth: 'Billing' },
    { id: 'sales01', pass: '1234', name: 'Rajesh Verma (Gold Sales)', role: 'Sales', auth: 'Counter' },
    { id: 'sales02', pass: '1234', name: 'Jyoti Bhatnagar (Diamond)', role: 'Sales', auth: 'Counter' },
    { id: 'tag01', pass: '1234', name: 'Mahesh Jangid (Tagging)', role: 'Staff', auth: 'Backoffice' },
    { id: 'store01', pass: '1234', name: 'Neha Sharma (Store)', role: 'Store', auth: 'Backoffice' },
    { id: 'acc01', pass: '1234', name: 'Harish Agarwal (Accounts)', role: 'Accounts', auth: 'Backoffice' }
  ];

  // 2. Application States (Persisted in localStorage)
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

  // Load data from localStorage on start
  useEffect(() => {
    const savedData = localStorage.getItem('swarnasetu_pro_db_v1');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setWalkins(parsed.walkins || []);
      setCustomers(parsed.customers || []);
      setLeaves(parsed.leaves || []);
      setStoreItems(parsed.storeItems || storeItems);
      setRepairs(parsed.repairs || []);
      setCashSlots(parsed.cashSlots || cashSlots);
    }
  }, []);

  // Save data to localStorage on change
  useEffect(() => {
    const dataToSave = { walkins, customers, leaves, storeItems, repairs, cashSlots };
    localStorage.setItem('swarnasetu_pro_db_v1', JSON.stringify(dataToSave));
  }, [walkins, customers, leaves, storeItems, repairs, cashSlots]);

  // 3. Login Handler
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

  // 4. UI Rendering Functions for Modules

  const renderLogin = () => (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border-t-8 border-orange-600">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-800">SwarnaSetu Pro</h1>
          <p className="text-gray-500 font-medium">Jewellery POS & ERP</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">User ID</label>
            <input type="text" name="userid" required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 bg-gray-50" placeholder="e.g. sonu or cash01" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input type="password" name="password" required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 bg-gray-50" placeholder="Enter password" />
          </div>
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors">
            Secure Login
          </button>
        </form>
        <div className="mt-6 p-4 bg-orange-100 rounded-lg text-sm text-orange-800">
          <p className="font-bold mb-1">Quick Demo Login:</p>
          <p>Admin: <b>sonu</b> / @4266@</p>
          <p>Cashier: <b>cash01</b> / 1234</p>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Welcome, {currentUser.name}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <DashboardCard icon={<ShoppingCart />} title="Billing & POS" color="bg-blue-500" onClick={() => setCurrentView('billing')} />
        <DashboardCard icon={<Users />} title="CRM & Customers" color="bg-green-500" onClick={() => setCurrentView('crm')} />
        <DashboardCard icon={<UserX />} title="Walk-In Tracker" color="bg-red-500" onClick={() => setCurrentView('walkin')} />
        <DashboardCard icon={<Calendar />} title="Leave Requests" color="bg-purple-500" onClick={() => setCurrentView('leave')} />
        <DashboardCard icon={<Store />} title="Store & Supplies" color="bg-teal-500" onClick={() => setCurrentView('store')} />
        <DashboardCard icon={<PenTool />} title="Repairs & Karigar" color="bg-amber-500" onClick={() => setCurrentView('repairs')} />
        <DashboardCard icon={<Banknote />} title="Cash Drawer" color="bg-emerald-600" onClick={() => setCurrentView('cash')} />
        <DashboardCard icon={<Download />} title="Tally & Excel Export" color="bg-indigo-500" onClick={() => setCurrentView('export')} />
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Billing & POS Counter</h2>
      <div className="bg-white p-6 rounded-xl shadow border">
        <p className="text-gray-500 mb-4">Scan tags, calculate making charges, and generate GST invoices.</p>
        <div className="p-12 border-2 border-dashed border-gray-300 rounded-xl text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Cart is Empty</h3>
          <p className="text-gray-500">Scan a barcode or enter Tag ID to start billing.</p>
          <button className="mt-4 bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700">
            + Add Dummy Tag (JWL-101)
          </button>
        </div>
      </div>
    </div>
  );

  const renderWalkin = () => {
    const handleAddWalkin = (e) => {
      e.preventDefault();
      const newWalkin = {
        id: Date.now(),
        phone: e.target.phone.value,
        item: e.target.item.value,
        reason: e.target.reason.value,
        date: new Date().toLocaleDateString()
      };
      setWalkins([...walkins, newWalkin]);
      // Sync to CRM
      setCustomers([...customers, { ...newWalkin, type: 'Walk-In Prospect' }]);
      e.target.reset();
      alert("Walk-In Saved & Synced to CRM!");
    };

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Walk-In & Loss Reason Tracker</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="font-bold text-lg mb-4">Log New Visitor</h3>
            <form onSubmit={handleAddWalkin} className="space-y-4">
              <input type="text" name="phone" placeholder="Customer Mobile No." required className="w-full p-2 border rounded" />
              <input type="text" name="item" placeholder="Item Looked At (e.g. 22K Bangle)" required className="w-full p-2 border rounded" />
              <select name="reason" className="w-full p-2 border rounded" required>
                <option value="">-- Select Reason for Leaving --</option>
                <option value="High Making Charges">Making Charges Too High</option>
                <option value="Design Not Available">Desired Design Not Available</option>
                <option value="Window Shopping">Just Window Shopping</option>
                <option value="Budget Mismatch">Budget Mismatch</option>
                <option value="Will Come With Family">Will Come With Family</option>
              </select>
              <button type="submit" className="w-full bg-red-600 text-white py-2 rounded-lg font-bold">Save Walk-In</button>
            </form>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border overflow-y-auto max-h-96">
            <h3 className="font-bold text-lg mb-4">Recent Walk-Ins</h3>
            {walkins.map(w => (
              <div key={w.id} className="p-3 border-b last:border-0 hover:bg-gray-50">
                <div className="font-bold text-gray-800">{w.phone}</div>
                <div className="text-sm text-gray-600">Looked at: {w.item} | Reason: <span className="text-red-600 font-medium">{w.reason}</span></div>
              </div>
            ))}
            {walkins.length === 0 && <p className="text-gray-500">No walk-ins recorded yet.</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderStore = () => {
    const handleRequest = (name) => {
      alert(`Request sent to Store Incharge for: ${name}`);
    };

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Store & Consumables Requisition</h2>
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-bold text-gray-700">Item Name</th>
                <th className="p-4 font-bold text-gray-700">Category</th>
                <th className="p-4 font-bold text-gray-700">Current Stock</th>
                <th className="p-4 font-bold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {storeItems.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{item.name}</td>
                  <td className="p-4 text-gray-600">{item.category}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.qty < 20 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {item.qty} units
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleRequest(item.name)} className="text-teal-600 font-bold hover:underline">
                      Call Store Incharge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCRM = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Unified CRM Database</h2>
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex gap-2">
          <span className="px-4 py-1 bg-green-200 text-green-800 rounded-full text-sm font-bold">Total Profiles: {customers.length}</span>
        </div>
        <div className="p-6">
          {customers.length === 0 ? (
            <p className="text-gray-500 text-center">No customers found. Billing a customer or adding a walk-in will populate this list.</p>
          ) : (
            <ul className="space-y-3">
              {customers.map((c, i) => (
                <li key={i} className="p-4 border rounded-lg flex justify-between items-center hover:shadow-md transition">
                  <div>
                    <div className="font-bold text-lg">{c.phone}</div>
                    <div className="text-sm text-gray-500">Interest: {c.item || 'General'}</div>
                  </div>
                  <div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">{c.type || 'Buyer'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const renderLeave = () => {
    const applyLeave = (e) => {
      e.preventDefault();
      const newLeave = {
        id: Date.now(),
        user: currentUser.name,
        date: e.target.date.value,
        type: e.target.type.value,
        status: 'Pending Review'
      };
      setLeaves([...leaves, newLeave]);
      e.target.reset();
      alert("Leave Request Submitted to Manager!");
    };

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Leave & Hierarchy</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="font-bold text-lg mb-4">Apply for Leave</h3>
            <form onSubmit={applyLeave} className="space-y-4">
              <input type="date" name="date" required className="w-full p-2 border rounded" />
              <select name="type" required className="w-full p-2 border rounded">
                <option value="Casual (Full Day)">Casual (Full Day)</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Half Day (First Half)">Half Day (First Half)</option>
              </select>
              <button
