import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  ShoppingCart, Users, FileText, Settings, LogOut, Package, 
  Clock, Shield, Calendar, Store, UserX, PenTool, Banknote, 
  Download, ArrowRight, CheckCircle, AlertTriangle, Search, Plus, Cloud, ArrowLeft, Tag, Image as ImageIcon, Trash2, Printer
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // States for Stock
  const [metalType, setMetalType] = useState('');
  const [jewelCategory, setJewelCategory] = useState('');
  const [tagCode, setTagCode] = useState('');

  // States for Billing
  const [cart, setCart] = useState([]);
  const [goldRate, setGoldRate] = useState(7500); // Per Gram
  const [silverRate, setSilverRate] = useState(90); // Per Gram
  const [billingSearch, setBillingSearch] = useState('');

  const users = [
    { id: 'sonu', pass: '@4266@', name: 'Sonu (Master Admin)', role: 'Admin', auth: 'Full' },
    { id: 'cash01', pass: '1234', name: 'Deepak Soni (Cashier)', role: 'Cashier', auth: 'Billing' }
  ];

  const [jewelryStock, setJewelryStock] = useState([]); 

  // 1. FIREBASE SYNC
  useEffect(() => {
    const docRef = doc(db, 'swarnasetu_cloud', 'main_store_data');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if(data.jewelryStock) setJewelryStock(data.jewelryStock);
      }
      setIsDataLoaded(true); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return; 
    const saveTimer = setTimeout(async () => {
      const dataToSave = { jewelryStock };
      try {
        // We use merge: true so we don't overwrite Walkins/CRM if not included here
        await setDoc(doc(db, 'swarnasetu_cloud', 'main_store_data'), dataToSave, { merge: true });
      } catch (error) {
        console.error("Error saving: ", error);
      }
    }, 1500); 
    return () => clearTimeout(saveTimer);
  }, [jewelryStock, isDataLoaded]);

  // 2. AUTO TAG GENERATION LOGIC
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
      } else {
        setTagCode(`${prefix}1001`);
      }
    } else {
      setTagCode(''); 
    }
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
        <DashboardCard icon={<ShoppingCart size={20} />} title="Billing & POS" desc="Create GST Invoices" colorClass="bg-blue-50 text-blue-600" onClick={() => setCurrentView('billing')} />
        <DashboardCard icon={<Tag size={20} />} title="Jewelry Stock" desc="Upload Photos & Tags" colorClass="bg-teal-50 text-teal-600" onClick={() => setCurrentView('stock')} />
      </div>
    </div>
  );

  // MODULE: JEWELRY STOCK 
  const renderJewelryStock = () => {
    const handleAddStock = async (e) => {
      e.preventDefault();
      const code = tagCode; 
      const weight = e.target.weight.value;
      const file = e.target.photo.files[0];

      if (!file) return alert("Please select a photo!");
      setIsUploading(true);
      try {
        const imageRef = ref(storage, `jewelry_pics/${code}_${Date.now()}`);
        await uploadBytes(imageRef, file);
        const imageUrl = await getDownloadURL(imageRef);
        const newItem = { id: Date.now(), code, metal: metalType, category: jewelCategory, weight: parseFloat(weight), imageUrl };
        
        setJewelryStock([...jewelryStock, newItem]);
        e.target.reset(); setMetalType(''); setJewelCategory(''); setTagCode('');
        alert("Jewelry Saved to Cloud!");
      } catch (error) { alert("Upload Failed."); }
      setIsUploading(false);
    };

    const deleteItem = (id) => {
      if(window.confirm("Are you sure you want to delete this item?")) {
        setJewelryStock(jewelryStock.filter(item => item.id !== id));
      }
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
                  <label className="text-xs font-semibold text-gray-600">Metal Type</label>
                  <select value={metalType} onChange={(e) => setMetalType(e.target.value)} required className="w-full p-2 mt-1 text-sm border rounded-md outline-none">
                    <option value="">-- Select --</option><option value="Gold">Gold</option><option value="Silver">Silver</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Category</label>
                  <select value={jewelCategory} onChange={(e) => setJewelCategory(e.target.value)} required disabled={!metalType} className="w-full p-2 mt-1 text-sm border rounded-md disabled:bg-gray-100">
                    <option value="">-- Select --</option><option value="Ring">Ring</option><option value="Bangle">Bangle</option><option value="Chain">Chain</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Auto Tag / Code</label>
                <input type="text" value={tagCode} onChange={(e) => setTagCode(e.target.value)} required className="w-full p-2 text-sm border rounded-md font-bold text-teal-700 bg-teal-50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Gross Weight (grams)</label>
                <input type="number" step="0.001" name="weight" placeholder="e.g. 12.500" required className="w-full p-2 mt-1 text-sm border rounded-md" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Upload Photo</label>
                <input type="file" name="photo" accept="image/*" capture="environment" required className="w-full p-2 mt-1 text-sm border bg-gray-50 rounded-md" />
              </div>
              <button type="submit" disabled={isUploading} className="w-full text-white text-sm font-bold py-2.5 rounded-md bg-teal-600 hover:bg-teal-700">
                {isUploading ? 'Saving...' : 'Save Item'}
              </button>
            </form>
          </div>
          
          <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <span className="font-semibold text-sm text-gray-700">Click Item to Delete</span>
                <span className="text-xs font-bold bg-teal-100 text-teal-800 px-3 py-1.5 rounded-full">Total Items: {jewelryStock.length}</span>
             </div>
             <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[500px]">
              {jewelryStock.slice().reverse().map(item => (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition relative group">
                  <button onClick={() => deleteItem(item.id)} className="absolute top-2 right-2 p-1.5 bg-white rounded-full text-red-500 shadow hover:bg-red-50 opacity-90 z-10">
                    <Trash2 size={14} />
                  </button>
                  <div className="h-32 bg-gray-100">
                    <img src={item.imageUrl} alt={item.code} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 bg-white text-center border-t border-gray-100">
                    <div className="font-bold text-sm text-gray-900">{item.code}</div>
                    <div className="text-xs font-medium text-orange-600">{item.metal} {item.category}</div>
                    <div className="text-xs text-gray-500">{item.weight} g</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // NEW MODULE: BILLING & POS
  const renderBilling = () => {
    const handleAddToCart = (e) => {
      e.preventDefault();
      const item = jewelryStock.find(i => i.code.toUpperCase() === billingSearch.toUpperCase());
      if (!item) return alert("Tag Code Not Found in Stock!");
      if (cart.find(c => c.code === item.code)) return alert("Item already added to bill!");

      const rate = item.metal === 'Gold' ? goldRate : item.metal === 'Silver' ? silverRate : 0;
      const baseValue = item.weight * rate;
      // Default Making charge (Can be edited later, e.g. 500 per gram for gold)
      const makingCharge = item.metal === 'Gold' ? item.weight * 500 : 500; 

      setCart([...cart, { ...item, rate, baseValue, makingCharge }]);
      setBillingSearch('');
    };

    const updateMakingCharge = (code, newCharge) => {
      setCart(cart.map(c => c.code === code ? { ...c, makingCharge: parseFloat(newCharge) || 0 } : c));
    };

    const removeCartItem = (code) => {
      setCart(cart.filter(c => c.code !== code));
    };

    const totalItemValue = cart.reduce((sum, item) => sum + item.baseValue, 0);
    const totalMaking = cart.reduce((sum, item) => sum + item.makingCharge, 0);
    const taxableValue = totalItemValue + totalMaking;
    const gst = taxableValue * 0.03; // 3% GST
    const grandTotal = taxableValue + gst;

    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ModuleHeader title="Billing & POS Terminal" icon={<ShoppingCart size={20} />} />
        
        {/* Live Rates Bar */}
        <div className="flex gap-6 mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-orange-800">Today Gold Rate (1g):</span>
            <input type="number" value={goldRate} onChange={(e)=>setGoldRate(e.target.value)} className="w-24 p-1 text-sm border rounded font-bold text-gray-800 outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-600">Today Silver Rate (1g):</span>
            <input type="number" value={silverRate} onChange={(e)=>setSilverRate(e.target.value)} className="w-24 p-1 text-sm border rounded font-bold text-gray-800 outline-none" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart & Search Section */}
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleAddToCart} className="flex gap-2">
              <input type="text" value={billingSearch} onChange={(e)=>setBillingSearch(e.target.value)} placeholder="Scan Barcode or Enter Tag Code (e.g. GLD-RNG-1001)" className="flex-1 p-3 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
              <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700">Add to Bill</button>
            </form>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600">
                  <tr>
                    <th className="p-3">Item Details</th>
                    <th className="p-3">Weight</th>
                    <th className="p-3">Metal Value</th>
                    <th className="p-3">Making (₹)</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {cart.map(item => (
                    <tr key={item.code} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-3 flex items-center gap-3">
                        <img src={item.imageUrl} alt="img" className="w-10 h-10 rounded object-cover border" />
                        <div><div className="font-bold text-gray-800">{item.code}</div><div className="text-xs text-gray-500">{item.category}</div></div>
                      </td>
                      <td className="p-3 font-medium">{item.weight} g</td>
                      <td className="p-3 text-green-700 font-semibold">₹{item.baseValue.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <input type="number" value={item.makingCharge} onChange={(e)=>updateMakingCharge(item.code, e.target.value)} className="w-20 p-1 border rounded text-sm text-center outline-none focus:border-blue-500" />
                      </td>
                      <td className="p-3">
                        <button onClick={() => removeCartItem(item.code)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">Cart is empty. Scan an item to start billing.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Summary Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
            <h3 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">Invoice Summary</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between"><span>Metal Value:</span> <span className="font-medium text-gray-900">₹{totalItemValue.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Making Charges:</span> <span className="font-medium text-gray-900">₹{totalMaking.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between border-b pb-3"><span>GST (3%):</span> <span className="font-medium text-gray-900">₹{gst.toLocaleString('en-IN')}</span></div>
              
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
                <span>Grand Total:</span> 
                <span className="text-blue-700">₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              <input type="text" placeholder="Customer Name" className="w-full p-2 border rounded-md text-sm outline-none" />
              <input type="text" placeholder="Mobile Number" className="w-full p-2 border rounded-md text-sm outline-none" />
              <button className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 ${cart.length > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300'}`} disabled={cart.length === 0}>
                <Printer size={18} /> Generate Bill (Print)
              </button>
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

  if (currentView === 'login') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 border">
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
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
          <Shield className="h-6 w-6 text-orange-600" />
          <h1 className="text-base font-bold text-gray-900">SwarnaSetu <span className="text-orange-600">Pro</span></h1>
        </div>
        <button onClick={() => { setCurrentUser(null); setCurrentView('login'); }} className="text-gray-500 hover:text-red-600 text-sm font-medium">Logout</button>
      </header>
      <main className="flex-1 overflow-auto">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'stock' && renderJewelryStock()}
        {currentView === 'billing' && renderBilling()}
      </main>
    </div>
  );
}
