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

  // New States for Auto Tag Generation
  const [metalType, setMetalType] = useState('');
  const [jewelCategory, setJewelCategory] = useState('');
  const [tagCode, setTagCode] = useState('');

  const users = [
    { id: 'sonu', pass: '@4266@', name: 'Sonu (Master Admin)', role: 'Admin', auth: 'Full' },
    { id: 'owner', pass: 'Owner@4266', name: 'Seth Ji (Owner)', role: 'Admin', auth: 'Full' },
    { id: 'mgr01', pass: '1234', name: 'Vikram Singh (Manager)', role: 'Manager', auth: 'Floor' },
    { id: 'cash01', pass: '1234', name: 'Deepak Soni (Cashier)', role: 'Cashier', auth: 'Billing' }
  ];

  const [walkins, setWalkins] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jewelryStock, setJewelryStock] = useState([]); 
  const [cashSlots, setCashSlots] = useState({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0
  });

  // 1. FIREBASE DATA SYNC
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

  // 2. AUTO TAG GENERATION LOGIC
  useEffect(() => {
    if (metalType && jewelCategory) {
      // Create Prefix (e.g., GLD-RNG-)
      const mPrefix = metalType === 'Gold' ? 'GLD' : metalType === 'Silver' ? 'SLV' : metalType === 'Diamond' ? 'DMD' : '';
      const cPrefix = jewelCategory === 'Ring' ? 'RNG' : jewelCategory === 'Bangle' ? 'BNG' : jewelCategory === 'Chain' ? 'CHN' : jewelCategory === 'Necklace' ? 'NCK' : jewelCategory === 'Earrings' ? 'EAR' : jewelCategory.substring(0,3).toUpperCase();
      const prefix = `${mPrefix}-${cPrefix}-`;
      
      // Find all existing items with this prefix
      const matchingItems = jewelryStock.filter(item => item.code && item.code.startsWith(prefix));
      
      if (matchingItems.length > 0) {
        // Extract numbers and find the highest one
        const maxNum = Math.max(...matchingItems.map(item => {
          const num = parseInt(item.code.replace(prefix, ''));
          return isNaN(num) ? 0 : num;
        }));
        setTagCode(`${prefix}${maxNum + 1}`);
      } else {
        // If it's the very first item of this type, start at 1001
        setTagCode(`${prefix}1001`);
      }
    } else {
      setTagCode(''); // Clear code if selections are empty
    }
  }, [metalType, jewelCategory, jewelryStock.length]); 
  // Runs whenever metal/category changes OR a new item is saved

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

  const renderJewelryStock = () => {
    const handleAddStock = async (e) => {
      e.preventDefault();
      const code = tagCode; // Take the potentially user-edited code from state
      const weight = e.target.weight.value;
      const file = e.target.photo.files[0];

      if (!file) return alert("Please select a photo!");
      if (!code) return alert("Tag code cannot be empty!");
      
      setIsUploading(true);
      try {
        // Save to Firebase Storage
        const imageRef = ref(storage, `jewelry_pics/${code}_${Date.now()}`);
        await uploadBytes(imageRef, file);
        const imageUrl = await getDownloadURL(imageRef);

        // Save to Database
        const newItem = { id: Date.now(), code, metal: metalType, category: jewelCategory, weight, imageUrl };
        setJewelryStock([...jewelryStock, newItem]);
        
        // Reset form completely
        e.target.reset();
        setMetalType('');
        setJewelCategory('');
        setTagCode('');
        
        alert("Jewelry Item Saved with Photo!");
      } catch (error) {
        alert("Upload Failed. Check internet connection.");
      }
      setIsUploading(false);
    };

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <ModuleHeader title="Smart Jewelry Stock Master" icon={<Tag size={20} />} />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-4">Add New Item</h3>
            <form onSubmit={handleAddStock} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600">1. Metal Type</label>
                  <select value={metalType} onChange={(e) => setMetalType(e.target.value)} required className="w-full p-2 mt-1 text-sm border rounded-md outline-none focus:border-teal-500">
                    <option value="">-- Select --</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Diamond">Diamond</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">2. Jewelry Type</label>
                  <select value={jewelCategory} onChange={(e) => setJewelCategory(e.target.value)} required disabled={!metalType} className="w-full p-2 mt-1 text-sm border rounded-md outline-none focus:border-teal-500 disabled:bg-gray-100">
                    <option value="">-- Select --</option>
                    <option value="Ring">Ring</option>
                    <option value="Bangle">Bangle</option>
                    <option value="Chain">Chain</option>
                    <option value="Necklace">Necklace</option>
                    <option value="Earrings">Earrings</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">3. Auto Item Tag / Code</label>
                <div className="text-[10px] text-gray-400 mb-1">You can change the starting number manually if you want.</div>
                <input 
                  type="text" 
                  name="code" 
                  value={tagCode} 
                  onChange={(e) => setTagCode(e.target.value)} 
                  placeholder="Select Metal & Type first..." 
                  required 
                  className="w-full p-2 text-sm border rounded-md font-bold text-teal-700 bg-teal-50 outline-none focus:ring-2 focus:ring-teal-500" 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">4. Gross Weight (grams)</label>
                <input type="number" step="0.001" name="weight" placeholder="e.g. 12.500" required className="w-full p-2 mt-1 text-sm border rounded-md outline-none focus:border-teal-500" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">5. Upload Photo</label>
                <input type="file" name="photo" accept="image/*" capture="environment" required className="w-full p-2 mt-1 text-sm border rounded-md bg-gray-50" />
              </div>

              <button type="submit" disabled={isUploading} className={`w-full text-white text-sm font-bold py-2.5 rounded-md transition-colors shadow-sm ${isUploading ? 'bg-gray-400' : 'bg-teal-600 hover:bg-teal-700'}`}>
                {isUploading ? 'Uploading & Saving...' : 'Save Item & Photo'}
              </button>
            </form>
          </div>
          
          <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <span className="font-semibold text-sm text-gray-700">Live Inventory Gallery</span>
                <span className="text-xs font-bold bg-teal-100 text-teal-800 px-3 py-1.5 rounded-full shadow-inner">Total Items: {jewelryStock.length}</span>
             </div>
             <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[500px]">
              {jewelryStock.slice().reverse().map(item => (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                  <div className="h-32 bg-gray-100 relative group">
                    <img src={item.imageUrl} alt={item.code} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 bg-white text-center border-t border-gray-100">
                    <div className="font-bold text-sm text-gray-900">{item.code}</div>
                    <div className="text-xs font-medium text-orange-600">{item.metal} {item.category}</div>
                    <div className="text-xs text-gray-500">{item.weight} g</div>
                  </div>
                </div>
              ))}
              {jewelryStock.length === 0 && <p className="col-span-3 p-12 text-sm text-center text-gray-400">Your smart inventory is empty. Add items to see them here.</p>}
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
