import React, { useState } from 'react';
import {
  Users, MapPin, Calendar, FileSpreadsheet, UserPlus,
  CheckCircle2, XCircle, Clock, Shield, KeyRound, Download
} from 'lucide-react';

const PRIVILEGE_OPTIONS = [
  { key: 'payroll_admin', label: 'Payroll & Staff Admin' },
  { key: 'rates_edit', label: 'Update Live Rates' },
  { key: 'inv_create', label: 'Inventory: Create Stock' },
  { key: 'inv_modify', label: 'Inventory: Modify Stock' },
  { key: 'inv_delete', label: 'Inventory: Delete Stock' },
  { key: 'sales_estimate', label: 'Sales: Make Estimate' },
  { key: 'sales_discount', label: 'Manager: Approve Discount' },
  { key: 'billing_print', label: 'Cashier: Print GST Bill' },
  { key: 'karigar_melter', label: 'Karigar & Melter Access' },
  { key: 'crm_ledger', label: 'CRM & Udhaari Ledger' },
  { key: 'accounts_rojmel', label: 'Accounts & Cash Drawer' },
  { key: 'kitty_admin', label: 'Kitty Scheme Manager' },
  { key: 'orders_b2b_urd', label: 'Orders, B2B & URD' }
];

export default function PayrollModule({
  currentUser, staffList, setStaffList,
  attendanceLogs, setAttendanceLogs,
  leaveRequests, setLeaveRequests,
  officeGps, setOfficeGps, onCompleteOnboarding
}) {
  const isAdmin = currentUser?.privileges?.payroll_admin || currentUser?.role === 'Admin';
  const [tab, setTab] = useState(isAdmin ? 'attendance' : 'attendance');
  const [gpsStatus, setGpsStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [commissions, setCommissions] = useState({});

  // New Staff Form States
  const [newPrivileges, setNewPrivileges] = useState({
    sales_estimate: true
  });

  // 1. MANDATORY FIRST LOGIN RESET + KYC PROFILE FORM
  if (currentUser?.isFirstLogin) {
    const handleOnboardingSubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      const newPass = f.newPass.value.trim();
      if (newPass.length < 4) return alert('Password must be at least 4 characters');

      const updatedStaff = staffList.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            pass: newPass,
            name: f.fullName.value.trim(),
            isFirstLogin: false,
            profile: {
              fullName: f.fullName.value.trim(),
              fatherName: f.fatherName.value.trim(),
              spouseName: f.spouseName.value.trim(),
              panNumber: f.panNumber.value.trim().toUpperCase(),
              idNumber: f.idNumber.value.trim(),
              mobile: f.mobile.value.trim(),
              bankName: f.bankName.value.trim(),
              accountNo: f.accountNo.value.trim(),
              ifsc: f.ifsc.value.trim().toUpperCase()
            }
          };
        }
        return u;
      });
      setStaffList(updatedStaff);
      alert('Password Updated & Profile Saved!');
      onCompleteOnboarding();
    };

    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">First-Time Account Setup</h2>
            <p className="text-xs text-slate-500">Reset your temporary password and complete your KYC profile to continue</p>
          </div>
        </div>

        <form onSubmit={handleOnboardingSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <label className="block font-bold text-slate-700 mb-1">Set New Permanent Password *</label>
            <input name="newPass" type="password" required placeholder="Enter new password" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg" />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Full Name *</label>
            <input name="fullName" type="text" required defaultValue={currentUser.name} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Father's Name *</label>
            <input name="fatherName" type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Spouse Name (if married)</label>
            <input name="spouseName" type="text" placeholder="Optional" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Mobile Number *</label>
            <input name="mobile" type="tel" required className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">PAN Card Number *</label>
            <input name="panNumber" type="text" required placeholder="ABCDE1234F" className="w-full px-3 py-2 border border-slate-200 rounded-lg uppercase" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Aadhaar Card Number *</label>
            <input name="idNumber" type="text" required placeholder="12-digit ID Number" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Bank Name *</label>
            <input name="bankName" type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Bank Account Number *</label>
            <input name="accountNo" type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-600 mb-1">IFSC Code *</label>
            <input name="ifsc" type="text" required placeholder="SBIN0001234" className="w-full px-3 py-2 border border-slate-200 rounded-lg uppercase" />
          </div>

          <div className="sm:col-span-2 pt-2">
            <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">
              Save Profile & Enter Showroom
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Distance calculator (Haversine formula in meters)
  const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // GPS Check-In Handler
  const handleMarkAttendance = (dayType = 'Full Day') => {
    if (!navigator.geolocation) return alert('GPS not supported on this device');
    setGpsStatus('Fetching GPS location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, officeGps.lat, officeGps.lng);
        const todayStr = new Date().toISOString().slice(0, 10);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (dist > officeGps.radius && !isAdmin) {
          setGpsStatus(`Outside showroom range (${dist}m away). Allowed: ${officeGps.radius}m`);
          return;
        }

        const alreadyMarked = attendanceLogs.find(a => a.userId === currentUser.id && a.date === todayStr);
        if (alreadyMarked) {
          setGpsStatus(`Already marked today at ${alreadyMarked.inTime}`);
          return;
        }

        const newLog = {
          id: Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          date: todayStr,
          inTime: timeStr,
          outTime: '-',
          status: dayType,
          distanceMeters: dist,
          coords: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
        };
        setAttendanceLogs([newLog, ...attendanceLogs]);
        setGpsStatus(`Checked In (${dayType}) at ${timeStr} • Distance: ${dist}m`);
      },
      () => setGpsStatus('Location permission denied. Please enable GPS.'),
      { enableHighAccuracy: true }
    );
  };

  const handleMarkOut = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = attendanceLogs.map(a =>
      a.userId === currentUser.id && a.date === todayStr ? { ...a, outTime: timeStr } : a
    );
    setAttendanceLogs(updated);
    setGpsStatus(`Checked Out at ${timeStr}`);
  };

  const handleSetOfficeLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const updated = { lat: pos.coords.latitude, lng: pos.coords.longitude, radius: officeGps.radius || 150 };
      setOfficeGps(updated);
      alert(`Showroom GPS Saved! (${updated.lat.toFixed(4)}, ${updated.lng.toFixed(4)})`);
    });
  };

  // Create Staff Account (Admin)
  const handleCreateUser = (e) => {
    e.preventDefault();
    const f = e.target;
    const id = f.userId.value.trim();
    if (staffList.some(u => u.id === id)) return alert('User ID already exists!');

    const newStaff = {
      id,
      pass: f.tempPass.value.trim(),
      name: f.staffName.value.trim(),
      role: f.role.value,
      isFirstLogin: true,
      baseSalary: Number(f.baseSalary.value) || 0,
      commissionRate: Number(f.commissionRate.value) || 0,
      weeklyOff: f.weeklyOff.value,
      privileges: { ...newPrivileges },
      profile: {}
    };
    setStaffList([...staffList, newStaff]);
    f.reset();
    alert(`Account created for ${newStaff.name}. They will reset password & fill KYC on first login.`);
  };

  // Submit Leave Request
  const handleLeaveSubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    const req = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      date: f.leaveDate.value,
      leaveType: f.leaveType.value,
      reason: f.reason.value,
      designatedToId: f.designatedTo.value,
      designatedToName: staffList.find(s => s.id === f.designatedTo.value)?.name || '',
      colleagueApproved: false,
      managerStatus: 'Pending Colleague'
    };
    setLeaveRequests([req, ...leaveRequests]);
    f.reset();
    alert('Leave submitted! Waiting for your designated colleague to confirm handover.');
  };

  // Export Payroll to Excel (UTF-8 CSV opens cleanly in MS Excel)
  const exportPayrollExcel = () => {
    const headers = ['User ID', 'Staff Name', 'Role', 'Weekly Off', 'Base Salary', 'Full Days', 'Half Days', 'Commission', 'Net Payable', 'Bank Account', 'IFSC', 'PAN'];
    const rows = staffList.map(staff => {
      const monthLogs = attendanceLogs.filter(a => a.userId === staff.id && a.date.startsWith(selectedMonth));
      const fullDays = monthLogs.filter(a => a.status === 'Full Day').length;
      const halfDays = monthLogs.filter(a => a.status === 'Half Day').length;
      const perDay = staff.baseSalary / 30;
      const earnedBase = Math.round((fullDays + halfDays * 0.5) * perDay);
      const comm = Number(commissions[staff.id] || 0);
      const net = earnedBase + comm;
      return [
        staff.id, staff.name, staff.role, staff.weeklyOff,
        staff.baseSalary, fullDays, halfDays, comm, net,
        staff.profile?.accountNo || '-', staff.profile?.ifsc || '-', staff.profile?.panNumber || '-'
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SwarnaSetu_Payroll_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation White Pills */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap gap-1.5">
        {[
          { id: 'attendance', label: 'GPS Attendance', icon: MapPin },
          { id: 'leaves', label: 'Leave & Handover', icon: Calendar },
          ...(isAdmin ? [
            { id: 'accounts', label: 'Staff & Privileges', icon: UserPlus },
            { id: 'salary', label: 'Salary & Excel', icon: FileSpreadsheet }
          ] : [])
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GPS ATTENDANCE */}
      {tab === 'attendance' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Mobile GPS Check-In</h3>
            <p className="text-xs text-slate-500">Weekly Off: <strong className="text-slate-800">{currentUser.weeklyOff || 'Tuesday'}</strong></p>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleMarkAttendance('Full Day')} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg">
                Mark In-Time (Full)
              </button>
              <button onClick={() => handleMarkAttendance('Half Day')} className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg">
                Mark Half Day
              </button>
              <button onClick={handleMarkOut} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg">
                Mark Out-Time
              </button>
            </div>

            {gpsStatus && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium">
                {gpsStatus}
              </div>
            )}

            {isAdmin && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500">Showroom Perimeter: {officeGps.radius}m</p>
                <button onClick={handleSetOfficeLocation} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-lg">
                  Set Current Location as Showroom
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800">Attendance Logs</h3>
              <span className="text-[11px] text-slate-500">{attendanceLogs.length} Records</span>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-3">Staff</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">In / Out</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">GPS Dist</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs
                    .filter(a => isAdmin || a.userId === currentUser.id)
                    .map(log => (
                      <tr key={log.id} className="border-b border-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{log.userName}</td>
                        <td className="p-3 text-slate-600">{log.date}</td>
                        <td className="p-3 text-slate-700">{log.inTime} / {log.outTime}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${log.status === 'Full Day' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{log.distanceMeters}m</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 2-STEP LEAVE & DUTY HANDOVER */}
      {tab === 'leaves' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Apply for Leave</h3>
            <form onSubmit={handleLeaveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Leave Date</label>
                <input name="leaveDate" type="date" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Leave Type</label>
                <select name="leaveType" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                  <option value="Full Day">Full Day Leave</option>
                  <option value="Half Day">Half Day Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Designated Colleague (Duty Handover) *</label>
                <select name="designatedTo" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                  <option value="">-- Select Colleague --</option>
                  {staffList.filter(s => s.id !== currentUser.id).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Reason</label>
                <input name="reason" type="text" required placeholder="Brief reason" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
              </div>
              <button type="submit" className="w-full py-2 bg-slate-900 text-white font-semibold rounded-lg">
                Send for Handover Approval
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Handover & Manager Approvals</h3>
            {leaveRequests.length === 0 && <p className="text-xs text-slate-400">No leave requests yet.</p>}
            {leaveRequests.map(req => (
              <div key={req.id} className="p-3.5 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900">{req.userName} • {req.date} ({req.leaveType})</div>
                  <div className="text-slate-500 mt-0.5">Handover to: <strong>{req.designatedToName}</strong> • Reason: {req.reason}</div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Step 1: Colleague must say YES */}
                  {!req.colleagueApproved && req.designatedToId === currentUser.id && (
                    <button
                      onClick={() => {
                        setLeaveRequests(leaveRequests.map(r => r.id === req.id ? { ...r, colleagueApproved: true, managerStatus: 'Pending Manager' } : r));
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg"
                    >
                      Say Yes (Accept Duty)
                    </button>
                  )}

                  {/* Step 2: Manager Approves after Colleague says YES */}
                  {req.colleagueApproved && req.managerStatus === 'Pending Manager' && isAdmin && (
                    <>
                      <button
                        onClick={() => setLeaveRequests(leaveRequests.map(r => r.id === req.id ? { ...r, managerStatus: 'Approved' } : r))}
                        className="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-lg"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setLeaveRequests(leaveRequests.map(r => r.id === req.id ? { ...r, managerStatus: 'Rejected' } : r))}
                        className="px-2.5 py-1 bg-red-600 text-white font-semibold rounded-lg"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    req.managerStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                    req.managerStatus === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {req.managerStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN CREATE STAFF & PRIVILEGE TICK MARKS */}
      {tab === 'accounts' && isAdmin && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Create Staff Account & Assign Privileges</h3>
            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Staff Name *</label>
                  <input name="staffName" type="text" required placeholder="e.g. Deepak Soni" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Login ID *</label>
                  <input name="userId" type="text" required placeholder="e.g. deepak01" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Temp Password *</label>
                  <input name="tempPass" type="text" required placeholder="Temp@123" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Role</label>
                  <select name="role" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                    <option value="Salesman">Salesman</option>
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Monthly Salary (₹)</label>
                  <input name="baseSalary" type="number" required placeholder="25000" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Weekly Off Day</label>
                  <select name="weeklyOff" defaultValue="Tuesday" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Commission (%)</label>
                  <input name="commissionRate" type="number" step="0.1" defaultValue="0.5" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">Module Privileges (Tick to Allow)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRIVILEGE_OPTIONS.map(p => (
                    <label key={p.key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!newPrivileges[p.key]}
                        onChange={(e) => setNewPrivileges({ ...newPrivileges, [p.key]: e.target.checked })}
                        className="rounded text-slate-900"
                      />
                      <span className="text-[11px] font-medium text-slate-700">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">
                Create Account
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Registered Staff ({staffList.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {staffList.map(s => (
                <div key={s.id} className="p-3 rounded-xl border border-slate-200/80 text-xs">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{s.name}</span>
                    <span className="text-amber-700">₹{s.baseSalary}/mo</span>
                  </div>
                  <div className="text-slate-500 mt-0.5">ID: {s.id} • Role: {s.role} • Off: {s.weeklyOff}</div>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.isFirstLogin ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {s.isFirstLogin ? 'Pending KYC & Reset' : `KYC Done • PAN: ${s.profile?.panNumber || 'N/A'}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MONTHLY SALARY, COMMISSION & EXCEL EXPORT */}
      {tab === 'salary' && isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-900">Monthly Payroll Sheet</h3>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg" />
            </div>
            <button onClick={exportPayrollExcel} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5">
              <Download size={14} /> Export to Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Base Pay</th>
                  <th className="p-3">Full / Half Days</th>
                  <th className="p-3">Earned Base</th>
                  <th className="p-3">Commission (₹)</th>
                  <th className="p-3">Net Payable</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(staff => {
                  const mLogs = attendanceLogs.filter(a => a.userId === staff.id && a.date.startsWith(selectedMonth));
                  const full = mLogs.filter(a => a.status === 'Full Day').length;
                  const half = mLogs.filter(a => a.status === 'Half Day').length;
                  const earned = Math.round((full + half * 0.5) * (staff.baseSalary / 30));
                  const comm = Number(commissions[staff.id] || 0);
                  return (
                    <tr key={staff.id} className="border-b border-slate-50">
                      <td className="p-3 font-bold text-slate-900">{staff.name} <span className="text-slate-400 font-normal">({staff.weeklyOff} Off)</span></td>
                      <td className="p-3">₹{staff.baseSalary.toLocaleString('en-IN')}</td>
                      <td className="p-3">{full} Full / {half} Half</td>
                      <td className="p-3 font-semibold">₹{earned.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          placeholder="0"
                          value={commissions[staff.id] || ''}
                          onChange={(e) => setCommissions({ ...commissions, [staff.id]: e.target.value })}
                          className="w-24 px-2 py-1 border border-slate-200 rounded-md"
                        />
                      </td>
                      <td className="p-3 font-bold text-emerald-700">₹{(earned + comm).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
