import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  ShoppingCart, Users, FileText, Settings, LogOut, Package, 
  Clock, Shield, Calendar, Store, UserX, PenTool, Banknote, 
  Download, ArrowRight, CheckCircle, AlertTriangle, Search, Plus, Cloud, ArrowLeft, Tag, Image as ImageIcon, Trash2, Printer, TrendingUp
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // States for Live Rates
  const [liveRates, setLiveRates] = useState({
    gold24: 0, gold22: 0, gold18: 0, silver: 0, goldCoin: 0, silverCoin: 0
  });

  const [metalType, setMetalType] = useState('');
  const [jewelCategory, setJewelCategory] = useState('');
  const [tagCode, setTagCode] = useState('');
  const [cart, setCart] = useState([]);
  const [billingSearch, setBillingSearch] = useState('');

  const users = [
    { id: 'sonu', pass: '@4266@', name: 'Sonu (Master Admin)', role: 'Admin', auth: 'Full' },
    { id: 'cash01', pass: '1234', name: 'Deepak Soni (Cashier)', role: 'Cashier', auth: 'Billing' },
    { id: 'sales01', pass: '1234', name: 'Rajesh Verma (Sales)', role: 'Sales', auth: 'Counter' }
  ];

  const [jewelryStock, setJewelryStock] = useState([]); 

  // 1. FIREBASE SYNC (LIVE CLOUD)
  useEffect(() => {
    const docRef = doc(db, 'swarnasetu_cloud', 'main_store_data');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if(data.jewelryStock) setJewelryStock(data.jewelryStock);
        if(data.liveRates) setLiveRates(data.liveRates);
      }
      setIsDataLoaded(true); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return; 
    const saveTimer = setTimeout(async () => {
      const dataToSave = { jewelryStock, liveRates };
      try {
        await setDoc(doc(db, 'swarnasetu_cloud', 'main_store_data'), dataToSave, { merge: true });
      } catch (error) { console.error("Error saving: ", error); }
    }, 1500); 
    return () => clearTimeout(saveTimer);
  }, [jewelryStock, liveRates, isDataLoaded]);

  // 2. AUTO TAG LOGIC
  useEffect(() => {
    if (metalType && jewelCategory) {
      const mPrefix = metalType === 'Gold' ? 'GLD' : metalType === 'Silver' ? 'SLV' : 'DMD';
      const cPrefix = jewelCategory === 'Ring' ? 'RNG' : jewelCategory === 'Bangle' ? 'BNG' : jewelCategory === 'Chain' ? 'CHN' : jewelCategory.substring(0,3).toUpperCase();
      const prefix = `${mPrefix}-${cPrefix}-`;
      const matchingItems = jewelryStock.filter(item => item.code && item.code.startsWith(prefix));
      
      if (matchingItems.length > 0) {
        const maxNum = Math.max(...matchingItems.map(item => {
          const num = parseInt(item.code.replace(prefix, ''));
          return isNaN(num) ? 0 : num;
        }));
        setTagCode(`${prefix}${maxNum + 1}`);
      } else { setTagCode(`${prefix}1001`); }
    } else { setTagCode(''); }
  }, [metalType, jewelCategory, jewelryStock.length]);

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
      <button onClick={() => setCurrentView('dashboard')} className="p-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 shadow-sm flex items-center gap-1 text-sm font-medium">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="flex items-center gap-2 text-lg font-bold text-gray-800 ml-2">
        <span className="text-orange-600">{icon}</span> {title}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={<TrendingUp size={20} />} title="Live Rates Master" desc="Update Gold/Silver Rates" colorClass="bg-yellow-50 text-yellow-600 border-yellow-200" onClick={() => setCurrentView('rates')} />
        <DashboardCard icon={<ShoppingCart size={20} />} title="Billing & POS" desc="Create GST Invoices" colorClass="bg-blue-50 text-blue-600" onClick={() => setCurrentView('billing')} />
        <DashboardCard icon={<Tag size={20} />} title="Jewelry Stock" desc="Upload Photos & Tags" colorClass="bg-teal-50 text-teal-600" onClick={() => setCurrentView('stock')} />
      </div>
    </div>
  );

  // NEW MODULE: LIVE RATES MASTER
  const renderLiveRates = () => {
    const handleSaveRates = (e) => {
      e.preventDefault();
      setLiveRates({
        gold24: Number(e.target.gold24.value),
        gold22: Number(e.target.gold22.value),
        gold18: Number(e.target.gold18.value),
        silver: Number(e.target.silver.value),
        goldCoin: Number(e.target.goldCoin.value),
        silverCoin: Number(e.target.silverCoin.value)
      });
      alert("Live Rates Broadcasted to all Screens!");
      setCurrentView('dashboard');
    };

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ModuleHeader title="Daily Live Rates Master" icon={<TrendingUp size={20} />} />
        
        {currentUser?.role === 'Admin' ? (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-yellow-200">
            <h3 className="font-bold text-gray-800 mb-4 text-center">Update Today's Metal Rates (per gram)</h3>
            <form onSubmit={handleSaveRates} className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                <h4 className="font-bold text-yellow-800 border-b border-yellow-200 pb-2">Gold Rates</h4>
                <div><label className="text-xs font-bold text-gray-600">24 KT Gold (999)</label><input type="number" name="gold24" defaultValue={liveRates.gold24} required className="w-full p-2 mt-1 border rounded font-bold" /></div>
                <div><label className="text-xs font-bold text-gray-600">22 KT Gold (916)</label><input type="number" name="gold22" defaultValue={liveRates.gold22} required className="w-full p-2 mt-1 border rounded font-bold" /></div>
                <div><label className="text-xs font-bold text-gray-600">18 KT Gold (750)</label><input type="number" name="gold18" defaultValue={liveRates.gold18} required className="w-full p-2 mt-1 border rounded font-bold" /></div>
              </div>
              <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-bold text-gray-700 border-b border-gray-200 pb-2">Silver & Coins</h4>
                <div><label className="text-xs font-bold text-gray-600">Fine Silver</label><input type="number" name="silver" defaultValue={liveRates.silver} required className="w-full p-2 mt-1 border rounded font-bold" /></div>
                <div><label className="text-xs font-bold text-gray-600">Gold Coin (24KT)</label><input type="number" name="goldCoin" defaultValue={liveRates.goldCoin} required className="w-full p-2 mt-1 border rounded font-bold" /></div>
                <div><label className="text-xs font-bold text-gray-600">Silver Coin</label><input type="number" name="silverCoin" defaultValue={liveRates.silverCoin} required className="w-full p-2 mt-1 border rounded font-bold" /></div>
              </div>
              <div className="md:col-span-2 mt-2">
                <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg text-lg shadow-md transition-all">
                  Broadcast Rates Live
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-red-50 p-12 text-center border border-red-200 rounded-lg">
            <Shield className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-red-800">Admin Access Required</h2>
            <p className="text-red-600 mt-2">Only the Master Admin can update daily live rates. You can view the current rates in the top yellow bar.</p>
          </div>
        )}
      </div>
    );
  };

  const renderJewelryStock = () => {
    const handleAddStock = async (e) => {
      e.preventDefault();
      const file = e.target.photo.files[0];
      if (!file) return alert("Photo needed!");
      setIsUploading(true);
      try {
        const imageRef = ref(storage, `jewelry_pics/${tagCode}_${Date.now()}`);
        await uploadBytes(imageRef, file);
        const imageUrl = await getDownloadURL(imageRef);
        setJewelryStock([...jewelryStock, { id: Date.now(), code: tagCode, metal: metalType, category: jewelCategory, weight: parseFloat(e.target.weight.value), imageUrl }]);
        e.target.reset(); setMetalType(''); setJewelCategory(''); setTagCode('');
      } catch (error) { alert("Upload Failed."); }
      setIsUploading(false);
    };

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <ModuleHeader title="Smart Jewelry Stock Master" icon={<Tag size={20} />} />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-sm mb-4">Add Item</h3>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <select value={metalType} onChange={(e)=>setMetalType(e.target.value)} required className="w-full p-2 text-sm border rounded"><option value="">Metal</option><option value="Gold">Gold</option><option value="Silver">Silver</option></select>
                <select value={jewelCategory} onChange={(e)=>setJewelCategory(e.target.value)} required disabled={!metalType} className="w-full p-2 text-sm border rounded"><option value="">Category</option><option value="Ring">Ring</option><option value="Bangle">Bangle</option><option value="Chain">Chain</option></select>
              </div>
              <input type="text" value={tagCode} onChange={(e)=>setTagCode(e.target.value)} required className="w-full p-2 text-sm border rounded font-bold text-teal-700 bg-teal-50" placeholder="Auto Tag" />
              <input type="number" step="0.001" name="weight" placeholder="Weight (g)" required className="w-full p-2 text-sm border rounded" />
              <input type="file" name="photo" accept="image/*" capture="environment" required className="w-full p-2 text-sm border bg-gray-50 rounded" />
              <button type="submit" disabled={isUploading} className="w-full bg-teal-600 text-white font-bold py-2 rounded">{isUploading ? 'Saving...' : 'Save Item'}</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-lg border overflow-hidden">
             <div className="p-3 bg-gray-50 border-b font-bold text-sm">Live Stock ({jewelryStock.length})</div>
             <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[500px]">
              {jewelryStock.slice().reverse().map(item => (
                <div key={item.id} className="border rounded-lg overflow-hidden shadow-sm relative">
                  <button onClick={() => setJewelryStock(jewelryStock.filter(i => i.id !== item.id))} className="absolute top-1 right-1 p-1 bg-white rounded-full text-red-500 shadow"><Trash2 size={14}/></button>
                  <img src={item.imageUrl} className="w-full h-24 object-cover" alt="pic"/>
                  <div className="p-2 text-center text-xs">
                    <div className="font-bold">{item.code}</div>
                    <div className="text-gray-500">{item.weight} g</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBilling = () => {
    const handleAddToCart = (e) => {
      e.preventDefault();
      const item = jewelryStock.find(i => i.code.toUpperCase() === billingSearch.toUpperCase());
      if (!item) return alert("Tag Not Found!");
      if (cart.find(c => c.code === item.code)) return alert("Already added!");

      // Smart Rate Picker based on live rates & metal
      let rate = 0;
      if (item.metal === 'Gold') rate = liveRates.gold22; // Billing usually done on 22k
      if (item.metal === 'Silver') rate = liveRates.silver;
      
      const baseValue = item.weight * rate;
      const makingCharge = item.metal === 'Gold' ? item.weight * 500 : 500; 

      setCart([...cart, { ...item, rate, baseValue, makingCharge }]);
      setBillingSearch('');
    };

    const updateMakingCharge = (code, val) => setCart(cart.map(c => c.code === code ? { ...c, makingCharge: parseFloat(val)||0 } : c));
    const totalItemValue = cart.reduce((sum, item) => sum + item.baseValue, 0);
    const totalMaking = cart.reduce((sum, item) => sum + item.makingCharge, 0);
    const gst = (totalItemValue + totalMaking) * 0.03;

    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ModuleHeader title="Billing Terminal" icon={<ShoppingCart size={20} />} />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleAddToCart} className="flex gap-2">
              <input type="text" value={billingSearch} onChange={(e)=>setBillingSearch(e.target.value)} placeholder="Enter Tag (e.g. GLD-RNG-1001)" className="flex-1 p-3 border rounded-lg uppercase font-bold" />
              <button type="submit" className="bg-blue-600 text-white px-6 rounded-lg font-bold">Add to Bill</button>
            </form>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b"><tr><th className="p-3">Item</th><th className="p-3">Wt</th><th className="p-3">Value</th><th className="p-3">Making (₹)</th><th className="p-3">Del</th></tr></thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.code} className="border-b">
                      <td className="p-3 font-bold text-gray-800">{item.code}</td>
                      <td className="p-3">{item.weight}g</td>
                      <td className="p-3 text-green-700 font-bold">₹{item.baseValue.toLocaleString('en-IN')}</td>
                      <td className="p-3"><input type="number" value={item.makingCharge} onChange={(e)=>updateMakingCharge(item.code, e.target.value)} className="w-20 p-1 border rounded text-center" /></td>
                      <td className="p-3"><button onClick={() => setCart(cart.filter(c => c.code !== item.code))} className="text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-bold text-lg border-b pb-2 mb-4">Invoice Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Items Value:</span> <span>₹{totalItemValue.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Making:</span> <span>₹{totalMaking.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between border-b pb-2"><span>GST (3%):</span> <span>₹{gst.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-xl font-bold pt-2"><span>Total:</span> <span className="text-blue-700">₹{Math.round(totalItemValue+totalMaking+gst).toLocaleString('en-IN')}</span></div>
            </div>
            <button className="w-full mt-6 bg-green-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2"><Printer size={18}/> Print Bill</button>
          </div>
        </div>
      </div>
    );
  };

  const DashboardCard = ({ icon, title, desc, colorClass, onClick }) => (
    <button onClick={onClick} className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div>
      <div><h3 className="font-bold text-sm">{title}</h3><p className="text-xs text-gray-500">{desc}</p></div>
    </button>
  );

  if (currentView === 'login') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 border">
        <h1 className="text-2xl font-bold text-center text-orange-600 mb-6">SwarnaSetu Pro</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" name="userid" required placeholder="User ID" className="w-full p-2 border rounded" />
          <input type="password" name="password" required placeholder="Password" className="w-full p-2 border rounded" />
          <button type="submit" className="w-full bg-orange-600 text-white p-2 rounded">Login</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
          <Shield className="h-6 w-6 text-orange-600" />
          <h1 className="text-base font-bold">SwarnaSetu <span className="text-orange-600">Pro</span></h1>
        </div>
        <button onClick={() => { setCurrentUser(null); setCurrentView('login'); }} className="text-gray-500 hover:text-red-600 text-sm font-bold">Logout</button>
      </header>
      
      {/* 🔴 LIVE RATES TICKER BAR - VISIBLE TO EVERYONE EVERYWHERE 🔴 */}
      <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-b border-yellow-300 px-4 py-2 flex items-center overflow-x-auto whitespace-nowrap shadow-sm">
        <span className="text-xs font-black text-red-600 uppercase tracking-widest mr-4 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> LIVE</span>
        <div className="flex gap-6 text-xs font-bold text-yellow-900">
          <span>24K: <span className="text-green-700">₹{liveRates.gold24}</span></span>
          <span>22K: <span className="text-green-700">₹{liveRates.gold22}</span></span>
          <span>18K: <span className="text-green-700">₹{liveRates.gold18}</span></span>
          <span>Silver: <span className="text-blue-700">₹{liveRates.silver}</span></span>
          <span>Gold Coin: <span className="text-gray-700">₹{liveRates.goldCoin}</span></span>
          <span>Silver Coin: <span className="text-gray-700">₹{liveRates.silverCoin}</span></span>
        </div>
      </div>

      <main className="flex-1 overflow-auto">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'rates' && renderLiveRates()}
        {currentView === 'stock' && renderJewelryStock()}
        {currentView === 'billing' && renderBilling()}
      </main>
    </div>
  );
}
