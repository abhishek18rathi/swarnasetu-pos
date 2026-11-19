import React, { useState } from 'react';
import {
  MapPin, Calendar, FileSpreadsheet, Users, UserPlus,
  KeyRound, Download, Trash2, Save, X, UserCheck, CheckCircle2, ArrowLeft, ChevronRight
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
  const [tab, setTab] = useState('attendance');
  const [gpsStatus, setGpsStatus] = useState('');
  const [bannerMsg, setBannerMsg] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [commissions, setCommissions] = useState({});

  // Separate sub-views inside Staff Management: 'list' | 'add' | 'detail'
  const [staffView, setStaffView] = useState('list');
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newPrivileges, setNewPrivileges] = useState({ sales_estimate: true });
  const [resetPwdInput, setResetPwdInput] = useState('');

  const selectedStaff = staffList.find(s => s.id === selectedStaffId) || null;

  const showBanner = (msg) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(''), 4000);
  };

  // 1. MANDATORY FIRST LOGIN RESET + KYC PROFILE FORM
  if (currentUser?.isFirstLogin) {
    const handleOnboardingSubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      const newPass = f.newPass.value.trim();
      if (newPass.length < 4) {
        showBanner('Password must be at least 4 characters.');
        return;
      }

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
            <label className="block font-semibold text-slate-600 mb-1">Govt ID Number *</label>
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

  const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const handleMarkAttendance = (dayType = 'Full Day') => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported on this device');
      return;
    }
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
    setAttendanceLogs(attendanceLogs.map(a =>
      a.userId === currentUser.id && a.date === todayStr ? { ...a, outTime: timeStr } : a
    ));
    setGpsStatus(`Checked Out at ${timeStr}`);
  };

  const handleSetOfficeLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const updated = { lat: pos.coords.latitude, lng: pos.coords.longitude, radius: officeGps.radius || 150 };
      setOfficeGps(updated);
      showBanner(`Showroom GPS Saved (${updated.lat.toFixed(4)}, ${updated.lng.toFixed(4)})`);
    });
  };

  // Create New Staff -> Return to List View
  const handleCreateUser = (e) => {
    e.preventDefault();
    const f = e.target;
    const id = f.userId.value.trim();
    if (staffList.some(u => u.id === id)) {
      showBanner(`Error: User ID "${id}" already exists.`);
      return;
    }

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
    setNewPrivileges({ sales_estimate: true });
    setStaffView('list');
    showBanner(`Employee "${newStaff.name}" added to list.`);
  };

  // Modify Selected Staff
  const handleUpdateStaff = (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    const f = e.target;

    setStaffList(staffList.map(u => {
      if (u.id === selectedStaff.id) {
        return {
          ...u,
          name: f.editName.value.trim(),
          role: f.editRole.value,
          baseSalary: Number(f.editSalary.value) || 0,
          weeklyOff: f.editWeeklyOff.value,
          commissionRate: Number(f.editCommission.value) || 0,
          privileges: { ...selectedStaff.privileges }
        };
      }
      return u;
    }));
    showBanner(`Saved updates for ${f.editName.value.trim()}.`);
  };

  const toggleSelectedUserPrivilege = (privKey) => {
    if (!selectedStaff) return;
    setStaffList(staffList.map(u =>
      u.id === selectedStaff.id
        ? { ...u, privileges: { ...(u.privileges || {}), [privKey]: !u.privileges?.[privKey] } }
        : u
    ));
  };

  const handleAdminResetPassword = () => {
    if (!selectedStaff) return;
    const temp = resetPwdInput.trim();
    if (temp.length < 4) {
      showBanner('Enter at least 4 characters for the new password.');
      return;
    }

    setStaffList(staffList.map(u =>
      u.id === selectedStaff.id ? { ...u, pass: temp, isFirstLogin: true } : u
    ));
    setResetPwdInput('');
    showBanner(`Password reset to "${temp}" for ${selectedStaff.name}.`);
  };

  const executeDeleteUser = () => {
    if (!selectedStaff || selectedStaff.id === 'sonu' || selectedStaff.id === currentUser.id) return;
    const deletedName = selectedStaff.name;
    setStaffList(staffList.filter(u => u.id !== selectedStaff.id));
    setSelectedStaffId(null);
    setConfirmDelete(false);
    setStaffView('list');
    showBanner(`Deleted employee "${deletedName}".`);
  };

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
    showBanner('Leave request sent to designated colleague.');
  };

  const exportPayrollExcel = () => {
    const headers = ['User ID', 'Staff Name', 'Role', 'Weekly Off', 'Base Salary', 'Full Days', 'Half Days', 'Commission', 'Net Payable', 'Bank Account', 'IFSC', 'PAN'];
    const rows = staffList.map(staff => {
      const monthLogs = attendanceLogs.filter(a => a.userId === staff.id && a.date.startsWith(selectedMonth));
      const fullDays = monthLogs.filter(a => a.status === 'Full Day').length;
      const halfDays = monthLogs.filter(a => a.status === 'Half Day').length;
      const earnedBase = Math.round((fullDays + halfDays * 0.5) * (staff.baseSalary / 30));
      const comm = Number(commissions[staff.id] || 0);
      return [
        staff.id, staff.name, staff.role, staff.weeklyOff,
        staff.baseSalary, fullDays, halfDays, comm, earnedBase + comm,
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
    <div className="space-y-4">
      {bannerMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {bannerMsg}</span>
          <button onClick={() => setBannerMsg('')} className="text-emerald-600 hover:text-emerald-900"><X size={14} /></button>
        </div>
      )}

      {/* Main Module Navigation Pills */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap gap-1.5">
        {[
          { id: 'attendance', label: 'GPS Attendance', icon: MapPin },
          { id: 'leaves', label: 'Leave & Handover', icon: Calendar },
          ...(isAdmin ? [
            { id: 'accounts', label: 'Regular Staff & New User', icon: Users },
            { id: 'salary', label: 'Salary & Excel', icon: FileSpreadsheet }
          ] : [])
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'accounts') setStaffView('list'); }}
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
                <label className="block font-semibold text-slate-600 mb-1">Designated Colleague *</label>
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
                  {!req.colleagueApproved && req.designatedToId === currentUser.id && (
                    <button
                      onClick={() => setLeaveRequests(leaveRequests.map(r => r.id === req.id ? { ...r, colleagueApproved: true, managerStatus: 'Pending Manager' } : r))}
                      className="px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg"
                    >
                      Say Yes (Accept Duty)
                    </button>
                  )}
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

      {/* TAB 3: SEPARATED STAFF DIRECTORY LIST, ADD NEW USER & CLICK-INSIDE EDITOR */}
      {tab === 'accounts' && isAdmin && (
        <div>
          {/* VIEW A: REGULAR EMPLOYEE LIST FORMAT */}
          {staffView === 'list' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Regular Employee List ({staffList.length})</h3>
                  <p className="text-[11px] text-slate-500">Tap any employee row to open, modify privileges, reset password, or delete</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setNewPrivileges({ sales_estimate: true }); setStaffView('add'); }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  <UserPlus size={14} /> + Add New User
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="p-3.5">Employee Name</th>
                      <th className="p-3.5">Login ID</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Weekly Off</th>
                      <th className="p-3.5">Salary</th>
                      <th className="p-3.5">KYC Status</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map(emp => (
                      <tr
                        key={emp.id}
                        onClick={() => {
                          setSelectedStaffId(emp.id);
                          setResetPwdInput('');
                          setConfirmDelete(false);
                          setStaffView('detail');
                        }}
                        className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 font-bold text-slate-900">{emp.name}</td>
                        <td className="p-3.5 text-slate-600 font-medium">{emp.id}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {emp.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">{emp.weeklyOff}</td>
                        <td className="p-3.5 font-semibold text-slate-800">₹{emp.baseSalary.toLocaleString('en-IN')}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            emp.isFirstLogin ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {emp.isFirstLogin ? 'Pending Setup' : `Verified (${emp.profile?.panNumber || 'KYC'})`}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                            Open <ChevronRight size={14} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW B: SEPARATE NEW USER ADDITION SCREEN */}
          {staffView === 'add' && (
            <div className="max-w-3xl mx-auto bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-slate-800" />
                  <h3 className="text-sm font-bold text-slate-900">Add New Staff Account</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setStaffView('list')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Back to Employee List
                </button>
              </div>

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
                  <label className="block font-bold text-slate-700 mb-2">Assign Module Privileges (Tick to Allow)</label>
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

                <div className="flex items-center gap-2 pt-2">
                  <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">
                    Save & Add Employee
                  </button>
                  <button type="button" onClick={() => setStaffView('list')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW C: INSIDE SELECTED EMPLOYEE (MODIFY / PRIVILEGES / PASSWORD / DELETE) */}
          {staffView === 'detail' && selectedStaff && (
            <div className="max-w-4xl mx-auto bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setStaffView('list'); setSelectedStaffId(null); }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg inline-flex items-center gap-1"
                  >
                    <ArrowLeft size={13} /> List
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <UserCheck size={16} className="text-amber-600" /> {selectedStaff.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">Login ID: <strong>{selectedStaff.id}</strong> • Current Password: <strong>{selectedStaff.pass}</strong></p>
                  </div>
                </div>

                {selectedStaff.id !== 'sonu' && selectedStaff.id !== currentUser.id && (
                  confirmDelete ? (
                    <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                      <span className="text-[11px] font-bold text-red-700">Delete permanently?</span>
                      <button type="button" onClick={executeDeleteUser} className="px-2.5 py-0.5 bg-red-600 text-white rounded text-[11px] font-bold">Yes, Delete</button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-0.5 bg-white text-slate-700 border rounded text-[11px]">Cancel</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg inline-flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Delete Employee
                    </button>
                  )
                )}
              </div>

              {/* Password Reset Box */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800">Reset Employee Password</div>
                  <div className="text-[11px] text-slate-500">Sets a temporary password; employee will set a new password on next login.</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={resetPwdInput}
                    onChange={(e) => setResetPwdInput(e.target.value)}
                    placeholder="New Temp Password"
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg w-40"
                  />
                  <button
                    type="button"
                    onClick={handleAdminResetPassword}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg inline-flex items-center gap-1"
                  >
                    <KeyRound size={13} /> Reset Password
                  </button>
                </div>
              </div>

              {/* Modify Details & Privileges */}
              <form key={selectedStaff.id} onSubmit={handleUpdateStaff} className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Staff Name</label>
                    <input name="editName" type="text" defaultValue={selectedStaff.name} required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Role</label>
                    <select name="editRole" defaultValue={selectedStaff.role} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                      <option value="Salesman">Salesman</option>
                      <option value="Manager">Manager</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Monthly Salary (₹)</label>
                    <input name="editSalary" type="number" defaultValue={selectedStaff.baseSalary} required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Weekly Off</label>
                    <select name="editWeeklyOff" defaultValue={selectedStaff.weeklyOff} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Commission (%)</label>
                    <input name="editCommission" type="number" step="0.1" defaultValue={selectedStaff.commissionRate} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-2">Modify Privileges (Tick / Untick)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRIVILEGE_OPTIONS.map(p => (
                      <label key={p.key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selectedStaff.privileges?.[p.key]}
                          onChange={() => toggleSelectedUserPrivilege(p.key)}
                          className="rounded text-slate-900"
                        />
                        <span className="text-[11px] font-medium text-slate-700">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Employee KYC & Bank Record */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="font-bold text-slate-800 mb-2">Employee KYC & Bank Details</div>
                  {selectedStaff.isFirstLogin ? (
                    <p className="text-amber-700">Employee has not completed first-login KYC setup yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                      <div>Father: <strong className="text-slate-900">{selectedStaff.profile?.fatherName || '-'}</strong></div>
                      <div>Spouse: <strong className="text-slate-900">{selectedStaff.profile?.spouseName || '-'}</strong></div>
                      <div>Mobile: <strong className="text-slate-900">{selectedStaff.profile?.mobile || '-'}</strong></div>
                      <div>PAN: <strong className="text-slate-900">{selectedStaff.profile?.panNumber || '-'}</strong></div>
                      <div>Govt ID: <strong className="text-slate-900">{selectedStaff.profile?.idNumber || '-'}</strong></div>
                      <div>Bank: <strong className="text-slate-900">{selectedStaff.profile?.bankName || '-'}</strong></div>
                      <div className="sm:col-span-2">A/C No: <strong className="text-slate-900">{selectedStaff.profile?.accountNo || '-'}</strong></div>
                      <div>IFSC: <strong className="text-slate-900">{selectedStaff.profile?.ifsc || '-'}</strong></div>
                    </div>
                  )}
                </div>

                <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg inline-flex items-center gap-1.5">
                  <Save size={14} /> Save Modifications
                </button>
              </form>
            </div>
          )}
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
// END OF FILE
