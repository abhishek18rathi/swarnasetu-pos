// ... existing code ...
  // ==========================================================================
  // 1. MASTER BRANDING, RATES & RBAC STAFF ACCOUNTS (SONU + 10 DEMO ROLES)
  // ==========================================================================
  const FULL_ADMIN_PERMISSIONS = {
    sales: true,
    manager: true,
    billing: true,
    tagCodeEntry: true,
    tagPhotoUpload: true,
    tagLabelPrint: true,
    stock: true,
    melting: true,
    repair: true,
    customers: true,
    payroll: true,
    leavePortal: true,
    storeConsumables: true,
    walkinFootfall: true,
    exchangeCalc: true,
    schemes: true,
    karigarLedger: true,
    ownerLive: true,
    gstExcel: true,
    admin: true
  };

  const DEFAULT_STAFF_ACCOUNTS = [
    {
      id: 'sonu',
      loginId: 'sonu',
      name: 'Sonu',
      role: 'ADMIN',
      roleLabel: 'Owner / Master Admin (Full Authority)',
      password: '@4266@',
      counter: 'Master Owner Cabin',
      baseSalary: 0,
      shiftStart: '10:00',
      clBalance: 12,
      slBalance: 12,
      elBalance: 15,
      permissions: { ...FULL_ADMIN_PERMISSIONS }
    },
    {
      id: 'mgr01',
      loginId: 'mgr01',
      name: 'Vikram Singh Rathore',
      role: 'MANAGER',
      roleLabel: 'Floor Manager (Approvals & Stock)',
      password: '1234',
      counter: 'Showroom Floor Desk',
      baseSalary: 42000,
      shiftStart: '10:15',
      clBalance: 8,
      slBalance: 6,
      elBalance: 12,
      permissions: {
        sales: false,
        manager: true,
        billing: false,
        tagCodeEntry: false,
        tagPhotoUpload: false,
        tagLabelPrint: false,
        stock: true,
        melting: false,
        repair: true,
        customers: true,
        payroll: false,
        leavePortal: true,
        storeConsumables: false,
        walkinFootfall: true,
        exchangeCalc: true,
        schemes: true,
        karigarLedger: false,
        ownerLive: false,
        gstExcel: true,
        admin: false
      }
    },
    {
      id: 'cash01',
      loginId: 'cash01',
      name: 'Deepak Soni',
      role: 'CASHIER',
      roleLabel: 'Head Cashier & GST Billing',
      password: '1234',
      counter: 'Main Billing & Cash Slot Counter',
      baseSalary: 34000,
      shiftStart: '10:30',
      clBalance: 7,
      slBalance: 6,
      elBalance: 10,
      permissions: {
        sales: false,
        manager: false,
        billing: true,
        tagCodeEntry: false,
        tagPhotoUpload: false,
        tagLabelPrint: false,
        stock: false,
        melting: false,
        repair: true,
        customers: true,
        payroll: false,
        leavePortal: true,
        storeConsumables: false,
        walkinFootfall: false,
        exchangeCalc: true,
        schemes: true,
        karigarLedger: false,
        ownerLive: false,
        gstExcel: true,
        admin: false
      }
    },
    {
      id: 'sales01',
      loginId: 'sales01',
      name: 'Rajesh Verma',
      role: 'SALESMAN',
      roleLabel: 'Senior Gold Salesman',
      password: '1234',
      counter: '22K Gold Counter A',
      baseSalary: 28000,
      shiftStart: '10:30',
      clBalance: 6,
      slBalance: 5,
      elBalance: 9,
      permissions: {
        sales: true,
        manager: false,
        billing: false,
        tagCodeEntry: false,
        tagPhotoUpload: false,
        tagLabelPrint: false,
        stock: true,
        melting: false,
        repair: true,
        customers: true,
        payroll: false,
        leavePortal: true,
        storeConsumables: false,
        walkinFootfall: true,
        exchangeCalc: true,
        schemes: true,
        karigarLedger: false,
        ownerLive: false,
        gstExcel: false,
        admin: false
      }
    },
    {
      id: 'sales02',
      loginId: 'sales02',
      name: 'Jyoti Bhatnagar',
      role: 'SALESMAN',
      roleLabel: 'Diamond & Bridal Sales',
      password: '1234',
      counter: 'Diamond & Bridal Lounge',
      baseSalary: 29000,
      shiftStart: '10:30',
      clBalance: 7,
      slBalance: 6,
      elBalance: 10,
      permissions: {
        sales: true,
        manager: false,
        billing: false,
        tagCodeEntry: false,
        tagPhotoUpload: false,
        tagLabelPrint: false,
        stock: false,
        melting: false,
        repair: false,
        customers: true,
        payroll: false,
        leavePortal: true,
        storeConsumables: false,
        walkinFootfall: true,
        exchangeCalc: true,
        schemes: true,
        karigarLedger: false,
        ownerLive: false,
        gstExcel: false,
        admin: false
      }
    },
    {
      id: 'sales03',
      loginId: 'sales03',
      name: 'Ankit Maheshwari',
      role: 'SALESMAN',
      roleLabel: 'Silver & Gift Counter Sales',
      password: '1234',
      counter: '925 Silver & Gift Gallery',
      baseSalary: 22000,
      shiftStart: '10:30',
      clBalance: 6,
      slBalance: 5,
      elBalance: 8,
      permissions: {
        sales: true,
        manager: false,
        billing: false,
        tagCodeEntry: false,
        tagPhotoUpload: false,
        tagLabelPrint: false,
        stock: false,
        melting: false,
        repair: false,
        customers: false,
        payroll: false,
        leavePortal: true,
        storeConsumables: false,
        walkinFootfall: true,
        exchangeCalc: true,
        schemes: false,
        karigarLedger: false,
        ownerLive: false,
        gstExcel: false,
        admin: false
      }
    },
    {
      id: 'tag01',
      loginId: 'tag01',
      name: 'Mahesh Jangid',
      role: 'TAG_OPERATOR',
      roleLabel: 'Tag Entry Operator (Stage 1)',
      password: '1234',
      counter: 'Tagging Desk 1 (Code & Weight)',
      baseSalary: 21000,
      shiftStart: '10:30',
      clBalance: 6,
      slBalance: 5,
      elBalance: 8,
      permissions: {
        sales: false,
        manager: false,
        billing: false,
        tagCodeEntry: true,
        tagPhotoUpload: false,
        tagLabelPrint: false,
        stock: false,
        melting: false,
        repair: false,
        customers: false,
        payroll: false,
        leavePortal: true,
        storeConsumables: false,
        walkinFootfall: false,
        exchangeCalc: false,
        schemes: false,
        karigarLedger: false,
        ownerLive: false,
        gstExcel: false,
        admin: false
      }
    },
    {
      id: 'photo01',
      loginId: 'photo01',
      name: 'Pooja Kanwar',
      role: 'PHOTO_STUDIO',
      roleLabel: 'Photo Studio Operator (Stage 2)',
      password: '1234',
      counter: 'Photo Cutout & Lightbox Studio',
      baseSalary: 20000,
      shiftStart: '10:30',
      clBalance: 7,
      slBalance: 6,
      elBalance: 9,
      permissions: {
        sales: false,
        manager: false,
        billing: false,
        tagCodeEntry: false,
        tagPhotoUpload: true,
        tagLabelPrint: false,
        stock: false,
        melting: false,
        repair: false,
        customers: false,
        payroll: false,
        leavePortal: true,
        storeConsumables: false,
        walkinFootfall: false,
        exchangeCalc: false,
        schemes: false,
        karigarLedger: false,
        ownerLive: false,
        gstExcel: false,
        admin: false
      }
    },
    {
      id: 'print01',
      loginId: 'print01',
      name: 'Suresh Khandelwal',
      role: 'TAG_PRINTER',
      roleLabel: 'Tag Printer & Vault Custodian (Stage 3)',
      password: '1234',
      counter: 'Thermal Printer & Strongroom',
      baseSalary: 24000,
      shiftStart: '10:15',
      clBalance: 6,
      slBalance: 6,
      elBalance: 10,
      permissions: {
        sales: false,
        manager: false,
        billing: false,
        tagCodeEntry: false,
        tagPhotoUpload: false,
        tagLabelPrint: true,
        stock: true,
        melting: false,
        repair: false,
        customers: false,
        payroll: false,
        leavePortal: true,
        storeConsumables: false,
        walkinFootfall: false,
        exchangeCalc: false,
        schemes: false,
        karigarLedger: false,
        ownerLive: false,
        gstExcel: false,
        admin: false
      }
    },
    {
      id: 'store01',
      loginId: 'store01',
      name: 'Neha Sharma',
      role: 'STORE_INCHARGE',
      roleLabel: 'Store Incharge & Supplies',
      password: '1234',
      counter: 'Showroom Consumables Store',
      baseSalary: 23000,
      shiftStart: '10:15',
      clBalance: 7,
      slBalance: 5,
      elBalance: 9,
      permissions: {
        sales: false,
        manager: false,
        billing: false,
        tagCodeEntry: false,
        tagPhotoUpload: false,
        tagLabelPrint: false,
        stock: true,
        melting: false,
        repair: false,
        customers: false,
        payroll: false,
        leavePortal: true,
        storeConsumables: true,
        walkinFootfall: false,
        exchangeCalc: false,
        schemes: false,
        karigarLedger: false,
        ownerLive: false,
        gstExcel: false,
        admin: false
      }
    },
    {
      id: 'acc01',
      loginId: 'acc01',
      name: 'Harish Agarwal',
      role: 'ACCOUNTANT',
      roleLabel: 'Accounts, Karigar & Melting Head',
      password: '1234',
      counter: 'Back-Office Accounts & Tunch Lab',
      baseSalary: 36000,
      shiftStart: '10:30',
      clBalance: 8,
      slBalance: 6,
      elBalance: 12,
      permissions: {
        sales: false,
        manager: false,
        billing: false,
        tagCodeEntry: false,
        tagPhotoUpload: false,
        tagLabelPrint: false,
        stock: false,
        melting: true,
        repair: true,
        customers: false,
        payroll: true,
        leavePortal: true,
        storeConsumables: false,
        walkinFootfall: false,
        exchangeCalc: false,
        schemes: false,
        karigarLedger: true,
        ownerLive: false,
        gstExcel: true,
        admin: false
      }
    }
  ];

  const [staffUsers, setStaffUsers] = useState(DEFAULT_STAFF_ACCOUNTS);
  const [loginIdInput, setLoginIdInput] = useState('sonu');
  const [loginPassInput, setLoginPassInput] = useState('@4266@');
  const [loginErrorMsg, setLoginErrorMsg] = useState('');
// ... existing code ...
  // ==========================================================================
  // 2K. UNIFIED CUSTOMER CRM TWO-WAY SYNC & PERSISTENT DATABASE ENGINE
  // ==========================================================================
  const DB_STORAGE_KEY = 'swarnasetu_pro_db_v2';
  const [crmFilterType, setCrmFilterType] = useState('ALL');
// ... existing code ...
  // Hydrate persisted database from localStorage on load (preserving Sonu + 10 Demo Roles)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.staffUsers) && parsed.staffUsers.length > 0) {
        setStaffUsers(parsed.staffUsers);
      }
      if (Array.isArray(parsed.customers) && parsed.customers.length > 0) {
        setCustomers(parsed.customers);
      }
// ... existing code ...
  // Auto-save unified database changes into localStorage so data persists across refreshes
  useEffect(() => {
    try {
      const payload = {
        savedAt: new Date().toISOString(),
        staffUsers,
        customers,
        walkInLogs,
        kittyAccounts,
        bridalOrders,
        udhaarLedger,
        hierarchicalLeaves,
        storeInventory,
        storeCallRequests
      };
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota exceeded on large base64 images
    }
  }, [
    staffUsers,
    customers,
    walkInLogs,
    kittyAccounts,
    bridalOrders,
    udhaarLedger,
    hierarchicalLeaves,
    storeInventory,
    storeCallRequests
  ]);
// ... existing code ...
  // Authenticate Login Form
  const handleStaffLoginSubmit = (e) => {
    e.preventDefault();
    const cleanId = loginIdInput.trim().toLowerCase();
    const cleanPass = loginPassInput.trim();
    const matched = staffUsers.find(
      (u) =>
        (String(u.loginId || u.id).toLowerCase() === cleanId ||
          String(u.name || '').toLowerCase() === cleanId) &&
        u.password === cleanPass
    );
    if (!matched) {
      setLoginErrorMsg(
        'Invalid User ID or Password. Use Sonu (sonu / @4266@) or any of the 10 Demo Role IDs below.'
      );
      return;
    }
    setLoginErrorMsg('');
    setCurrentUserId(matched.id);
    setActiveTab('hub');
    showToast(`Welcome ${matched.name}! Logged in as ${matched.roleLabel}`);
  };
// ... existing code ...
            {/* Right Panel: Branded Login Form + Sonu Master Admin + 10 Role Demo Accounts */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-amber-200 flex flex-col justify-between space-y-5">
              <form onSubmit={handleStaffLoginSubmit} className="space-y-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 font-black text-[10px] uppercase tracking-wider mb-1.5">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>Showroom Staff &amp; Owner Sign In</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                    Enter Login ID &amp; Password
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your workspace modules automatically unlock according to your assigned
                    showroom authority.
                  </p>
                </div>

                {loginErrorMsg && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold">
                    {loginErrorMsg}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      User ID (Login ID)
                    </label>
                    <input
                      type="text"
                      value={loginIdInput}
                      onChange={(e) => setLoginIdInput(e.target.value)}
                      placeholder="e.g., sonu, mgr01, cash01, sales01"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 outline-none text-sm font-bold text-slate-950 bg-slate-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={loginPassInput}
                      onChange={(e) => setLoginPassInput(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 outline-none text-sm font-bold text-slate-950 bg-slate-50"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-sm shadow-lg flex items-center justify-center gap-2 transition"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Sign In to {branding.showroomName}</span>
                </button>
              </form>

              {/* Personal Master Admin + 10 Role-Diverse Demo Accounts Quick Login */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Master Admin &amp; 10 Role-Based Demo Accounts (1-Tap Fill)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    11 Total Profiles
                  </span>
                </div>

                {/* Highlighted Personal Full-Authority Master Admin Card for Sonu */}
                {staffUsers
                  .filter((u) => u.id === 'sonu')
                  .map((ownerAcc) => (
                    <button
                      key={ownerAcc.id}
                      type="button"
                      onClick={() => {
                        setLoginIdInput(ownerAcc.loginId || ownerAcc.id);
                        setLoginPassInput(ownerAcc.password);
                        setLoginErrorMsg('');
                      }}
                      className="w-full p-3 rounded-2xl border-2 border-amber-500 bg-gradient-to-r from-slate-950 to-amber-950 text-left hover:opacity-95 transition flex items-center justify-between gap-2 shadow-md"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase">
                            ALL AUTHORITY • OWNER
                          </span>
                          <span className="text-sm font-black text-white">
                            {ownerAcc.name}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-amber-200 mt-0.5">
                          {ownerAcc.roleLabel} — Unlocks Every Module &amp; Setting
                        </div>
                      </div>
                      <div className="text-right font-mono text-[10px] bg-black/40 border border-amber-400/40 px-2.5 py-1.5 rounded-xl text-amber-300">
                        <div>
                          ID: <strong>{ownerAcc.loginId || ownerAcc.id}</strong>
                        </div>
                        <div>
                          Pass: <strong>{ownerAcc.password}</strong>
                        </div>
                      </div>
                    </button>
                  ))}

                {/* 10 Role-Diverse Staff Demo Accounts Grid */}
                <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {staffUsers
                    .filter((u) => u.id !== 'sonu')
                    .map((acc, index) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setLoginIdInput(acc.loginId || acc.id);
                          setLoginPassInput(acc.password);
                          setLoginErrorMsg('');
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-400 text-left transition"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-black text-slate-950 truncate">
                            {index + 1}. {acc.name}
                          </span>
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-bold">
                            {acc.loginId || acc.id}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-amber-800 truncate mt-0.5">
                          {acc.roleLabel}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                          ID: {acc.loginId || acc.id} • Pass: {acc.password}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
// ... existing code ...
