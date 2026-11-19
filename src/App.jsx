import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  ShoppingCart, Users, FileText, Settings, LogOut, Package, 
  Clock, Shield, Calendar, Store, UserX, PenTool, Banknote, 
  Download, ArrowRight, CheckCircle, AlertTriangle, Search, Plus, Cloud, ArrowLeft, Tag, Image as ImageIcon
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const users = [
    { id: 'sonu', pass: '@4266@', name: 'Sonu (Master Admin)', role: 'Admin', auth: 'Full' },
    { id: 'owner', pass: 'Owner@4266', name: 'Seth Ji (Owner)', role: 'Admin', auth: 'Full' },
    { id: 'mgr01', pass: '1234', name: 'Vikram Singh (Manager)', role: 'Manager', auth: 'Floor' }
  ];

  const [walkins, setWalkins] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jewelryStock, setJewelryStock] = useState([]); // New Live Stock
  const [cashSlots, setCashSlots] = useState({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0
  });

  // FIREBASE SYNC
  useEffect(() => {
    const docRef = doc(db, 'swarnasetu_cloud', 'main_store_data');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWalkins(data.walkins || []);
        setCustomers(data.customers || []);
        if(data.jewelryStock) setJewelryStock(data.jewelryStock);
        if(data.cashSlots) setCashSlots(data.cashSlots);
      }
      setIsDataLoaded(true); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return; 
    const saveTimer = setTimeout(async () => {
      const dataToSave = { walkins, customers, jewelryStock, cashSlots };
      try {
        await setDoc(doc(db, 'swarnasetu_cloud', 'main_store_data'), dataToSave);
      } catch (error) {
        console.error("Error saving: ", error);
      }
    }, 1500); 
    return () => clearTimeout(saveTimer);
  }, [walkins, customers, jewelryStock, cashSlots, isDataLoaded]);

  const handleLogin = (e) => {
    e.preventDefault();
    const id = e.target.userid.value;
    const pass = e.target.password.value;
    const user = users.find(u => u.id === id && u.pass === pass);
    if (user) { setCurrentUser(user); setCurrentView('dashboard'); } 
    else { alert("Invalid User ID or Password!"); }
  };

  const ModuleHeader = ({ title, icon }) => (
    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200">
      <button onClick={() => setCurrentView('dashboard')} className="p-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 transition-colors shadow-sm flex items-center gap-1 text-sm font-medium">
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
          <div className="inline-block p-3 bg-orange-50 rounded-full mb-3"><Shield className="h-8 w-8 text-orange-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">SwarnaSetu Pro</h1>
          <p className="text-sm text-gray-500 mt-1">Live Cloud POS</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">USER ID</label><input type="text" name="userid" required className="w-full p-2.5 text-sm border rounded-md" /></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">PASSWORD</label><input type="password" name="password" required className="w-full p-2.5 text-sm border rounded-md" /></div>
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm py-2.5 rounded-md mt-2">Sign In</button>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={<ShoppingCart size={20} />} title="Billing & POS" desc="Create invoices" colorClass="bg-blue-50 text-blue-600" onClick={() => setCurrentView('billing')} />
        <DashboardCard icon={<Tag size={20} />} title="Jewelry Stock" desc="Upload Photos & Tags" colorClass="bg-teal-50 text-teal-600" onClick={() => setCurrentView('stock')} />
        <DashboardCard icon={<Users size={20} />} title="CRM Profiles" desc="Customer data" colorClass="bg-green-50 text-green-600" onClick={() => setCurrentView('crm')} />
        <DashboardCard icon={<UserX size={20} />} title="Walk-In Log" desc="Track visitors" colorClass="bg-red-50 text-red-600" onClick={() => setCurrentView('walkin')} />
      </div>
    </div>
  );

  // NEW MODULE: JEWELRY STOCK WITH PHOTO UPLOAD
  const renderJewelryStock = () => {
    const handleAddStock = async (e) => {
      e.preventDefault();
      const code = e.target.code.value;
      const category = e.target.category.value;
      const weight = e.target.weight.value;
      const file = e.target.photo.files[0];

      if (!file) return alert("Please select a photo!");
      
      setIsUploading(true);
      try {
        const imageRef = ref(storage, `jewelry_pics/${code}_${Date.now()}`);
        await uploadBytes(imageRef, file);
        const imageUrl = await getDownloadURL(imageRef);

        const newItem = { id: Date.now(), code, category, weight, imageUrl };
        setJewelryStock([...jewelryStock, newItem]);
        e.target.reset();
        alert("Jewelry Item Saved with Photo!");
      } catch (error) {
        alert("Upload Failed. Check internet connection.");
      }
      setIsUploading(false);
    };

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <ModuleHeader title="Jewelry Stock Master" icon={<Tag size={20} />} />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-4">Add New Item</h3>
            <form onSubmit={handleAddStock} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Item Tag / Code</label>
                <input type="text" name="code" placeholder="e.g. RNG-101" required className="w-full p-2 text-sm border rounded-md" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Category</label>
                <select name="category" required className="w-full p-2 text-sm border rounded-md">
                  <option value="">Select Category</option>
                  <option value="Ring">Ring (अंगूठी)</option>
                  <option value="Bangle">Bangle (चूड़ी/कंगन)</option>
                  <option value="Chain">Chain (चेन)</option>
                  <option value="Necklace">Necklace (हार)</option>
                  <option value="Earrings">Earrings (बाली)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Gross Weight (grams)</label>
                <input type="number" step="0.001" name="weight" placeholder="e.g. 12.500" required className="w-full p-2 text-sm border rounded-md" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Upload Photo (Click to open Camera)</label>
                <input type="file" name="photo" accept="image/*" capture="environment" required className="w-full p-2 text-sm border rounded-md bg-gray-50" />
              </div>
              <button type="submit" disabled={isUploading} className={`w-full text-white text-sm font-medium py-2 rounded-md transition-colors ${isUploading ? 'bg-gray-400' : 'bg-teal-600 hover:bg-teal-700'}`}>
                {isUploading ? 'Uploading Photo...' : 'Save Item & Photo'}
              </button>
            </form>
          </div>
          
          <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between">
                <span className="font-semibold text-sm text-gray-700">Live Gallery</span>
                <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-1 rounded">Total: {jewelryStock.length}</span>
             </div>
             <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[500px]">
              {jewelryStock.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                  <div className="h-32 bg-gray-100 relative">
                    <img src={item.imageUrl} alt={item.code} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 bg-white">
                    <div className="font-bold text-sm text-gray-900">{item.code}</div>
                    <div className="text-xs text-gray-500">{item.category} • {item.weight}g</div>
                  </div>
                </div>
              ))}
              {jewelryStock.length === 0 && <p className="col-span-3 p-6 text-sm text-center text-gray-400">No jewelry items added yet.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardCard = ({ icon, title, desc, colorClass, onClick }) => (
    <button onClick={onClick} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-3 group">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div>
      <div>
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </button>
  );

  if (currentView === 'login') return renderLogin();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
          <Shield className="h-6 w-6 text-orange-600" />
          <h1 className="text-base font-bold text-gray-900">SwarnaSetu <span className="text-orange-600">Pro</span></h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border">
            <Cloud size={14} /> <span className="text-xs font-semibold">Cloud Sync</span>
          </div>
          <button onClick={() => { setCurrentUser(null); setCurrentView('login'); }} className="text-gray-500 hover:text-red-600 text-sm font-medium">Logout</button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'stock' && renderJewelryStock()}
        {currentView === 'billing' && <div className="p-6 max-w-5xl mx-auto"><ModuleHeader title="Billing" icon={<ShoppingCart size={20}/>} /><div className="bg-white p-12 text-center border rounded-lg">Billing Module Coming Soon</div></div>}
        {currentView === 'crm' && <div className="p-6 max-w-5xl mx-auto"><ModuleHeader title="CRM" icon={<Users size={20}/>} /><div className="bg-white p-12 text-center border rounded-lg">CRM Currently Offline</div></div>}
        {currentView === 'walkin' && <div className="p-6 max-w-5xl mx-auto"><ModuleHeader title="Walk-In" icon={<UserX size={20}/>} /><div className="bg-white p-12 text-center border rounded-lg">Walk-In Currently Offline</div></div>}
      </main>
    </div>
  );
}
