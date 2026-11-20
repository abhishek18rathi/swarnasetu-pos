import React, { useState } from 'react';
import { Users, MapPin, Calendar, CheckCircle2, X, Shield } from 'lucide-react';

const DEFAULT_PRIVILEGES = {
  payroll_admin: false,
  rates_edit: false,
  inv_create: true,
  inv_modify: false,
  inv_delete: false,
  sales_estimate: true,
  sales_discount: false,
  billing_print: false,
  karigar_melter: false,
  crm_ledger: true,
  accounts_rojmel: false,
  kitty_admin: false,
  orders_b2b_urd: false
};

export default function PayrollModule({
  currentUser,
  staffList = [],
  setStaffList,
  attendanceLogs = [],
  setAttendanceLogs,
  leaveRequests = [],
  setLeaveRequests,
  officeGps = { lat: 26.4499, lng: 74.6399, radius: 150 },
  setOfficeGps,
  onCompleteOnboarding
}) {
  const isAdmin = currentUser?.role === 'Admin' || !!currentUser?.privileges?.payroll_admin;
  const [tab, setTab] = useState(isAdmin ? 'staff' : 'attendance');
  const [banner, setBanner] = useState('');

  const [newId, setNewId] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Salesman');
  const [newSalary, setNewSalary] = useState('15000');
  const [newWeeklyOff, setNewWeeklyOff] = useState('Tuesday');

  const [gpsStatus, setGpsStatus] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveDate, setLeaveDate] = useState('');

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4000);
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const cleanId = newId.trim().toLowerCase();
    if (!cleanId || !newPass.trim() || !newName.trim()) return;
    if (staffList.some(s => s.id.toLowerCase() === cleanId)) {
      return showBanner(`User ID "${cleanId}" already exists.`);
    }

    const member = {
      id: cleanId,
      pass: newPass.trim(),
      name: newName.trim(),
      role: newRole,
      isFirstLogin: false,
      baseSalary: parseFloat(newSalary) || 0,
      commissionRate: 0,
      weeklyOff: newWeeklyOff,
      privileges: { ...DEFAULT_PRIVILEGES }
    };

    setStaffList([...staffList, member]);
    setNewId('');
    setNewPass('');
    setNewName('');
    showBanner(`Added staff member "${member.name}" (${member.id}).`);
  };

  const togglePrivilege = (staffId, key) => {
    if (!isAdmin) return;
    setStaffList(staffList.map(s => {
      if (s.id !== staffId) return s;
      return {
        ...s,
        privileges: {
          ...(s.privileges || {}),
          [key]: !(s.privileges && s.privileges[key])
        }
      };
    }));
  };

  const handleMarkAttendance = () => {
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!navigator.geolocation) {
      setAttendanceLogs([{
        id: Date.now(),
        date: today,
        time: nowTime,
        staffId: currentUser.id,
        staffName: currentUser.name,
        locationNote: 'Manual Check-In (GPS unavailable)'
      }, ...attendanceLogs]);
      return showBanner('Attendance recorded.');
    }

    setGpsStatus('Checking location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        setGpsStatus('');
        setAttendanceLogs([{
          id: Date.now(),
          date: today,
          time: nowTime,
          staffId: currentUser.id,
          staffName: currentUser.name,
          locationNote: `GPS (${coords})`
        }, ...attendanceLogs]);
        showBanner(`Attendance marked at ${nowTime}.`);
      },
      () => {
        setGpsStatus('');
        setAttendanceLogs([{
          id: Date.now(),
          date: today,
          time: nowTime,
          staffId: currentUser.id,
          staffName: currentUser.name,
          locationNote: 'Checked In (Location permission skipped)'
        }, ...attendanceLogs]);
        showBanner(`Attendance marked at ${nowTime}.`);
      }
    );
  };

  const handleLeaveSubmit = (e) => {
    e.preventDefault();
    if (!leaveDate || !leaveReason.trim()) return;
    setLeaveRequests([{
      id: Date.now(),
      staffId: currentUser.id,
      staffName: currentUser.name,
      date: leaveDate,
      reason: leaveReason.trim(),
      status: 'Pending'
    }, ...leaveRequests]);
    setLeaveDate('');
    setLeaveReason('');
    showBanner('Leave request submitted.');
  };

  return (
    <div className="space-y-4 text-xs">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex justify-between items-center">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      <div className="bg-white p-2 rounded-xl border flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {isAdmin && (
            <button onClick={() => setTab('staff')} className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${tab === 'staff' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Users size={14} /> Staff & Privileges ({staffList.length})
            </button>
          )}
          <button onClick={() => setTab('attendance')} className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${tab === 'attendance' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <MapPin size={14} /> Attendance ({attendanceLogs.length})
          </button>
          <button onClick={() => setTab('leaves')} className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${tab === 'leaves' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Calendar size={14} /> Leaves ({leaveRequests.length})
          </button>
        </div>

        {onCompleteOnboarding && (
          <button onClick={onCompleteOnboarding} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg">
            Done
          </button>
        )}
      </div>

      {tab === 'staff' && isAdmin && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-1.5"><Shield size={15} className="text-indigo-600" /> Add Showroom Staff</h3>
            <form onSubmit={handleAddStaff} className="space-y-2.5">
              <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full Name *" className="w-full px-3 py-1.5 border rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="Login ID *" className="w-full px-3 py-1.5 border rounded-lg" />
                <input type="text" required value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Password *" className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="px-3 py-1.5 border rounded-lg">
                  <option value="Salesman">Salesman</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Manager">Manager</option>
                  <option value="Accountant">Accountant</option>
                </select>
                <input type="number" value={newSalary} onChange={(e) => setNewSalary(e.target.value)} placeholder="Monthly Salary ₹" className="px-3 py-1.5 border rounded-lg" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Weekly Off</label>
                <select value={newWeeklyOff} onChange={(e) => setNewWeeklyOff(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg">
                  <option value="Tuesday">Tuesday</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-slate-900 text-white font-semibold rounded-lg">Create Staff Account</button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b font-bold text-sm">Staff Directory & Module Access</div>
            <div className="divide-y">
              {staffList.map(member => (
                <div key={member.id} className="p-4 space-y-2.5">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <strong className="text-slate-900">{member.name}</strong> <span className="text-slate-500">(@{member.id} • {member.role})</span>
                      <div className="text-[11px] text-slate-500">Salary: ₹{(member.baseSalary || 0).toLocaleString('en-IN')} • Weekly Off: {member.weeklyOff || 'Tuesday'}</div>
                    </div>
                  </div>

                  {member.id !== 'sonu' && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { k: 'inv_create', label: 'Stock Entry' },
                        { k: 'inv_modify', label: 'Edit Stock' },
                        { k: 'sales_estimate', label: 'Estimates' },
                        { k: 'sales_discount', label: 'Approve Discount' },
                        { k: 'billing_print', label: 'Print GST Bill' },
                        { k: 'karigar_melter', label: 'Karigar & Melter' },
                        { k: 'crm_ledger', label: 'CRM & Udhaari' },
                        { k: 'rates_edit', label: 'Update Rates' }
                      ].map(p => {
                        const active = !!member.privileges?.[p.k];
                        return (
                          <button
                            key={p.k}
                            type="button"
                            onClick={() => togglePrivilege(member.id, p.k)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              active ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            {active ? '✓ ' : ''}{p.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <h3 className="text-sm font-bold">Daily Check-In</h3>
            <p className="text-[11px] text-slate-500">Record today's attendance for {currentUser?.name}.</p>
            <button type="button" onClick={handleMarkAttendance} className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-lg">
              Mark Attendance Now
            </button>
            {gpsStatus && <div className="text-[11px] text-amber-700 font-medium">{gpsStatus}</div>}
            {isAdmin && (
              <div className="pt-3 border-t space-y-2">
                <div className="font-semibold text-slate-700">Showroom GPS Coordinates</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.0001" value={officeGps.lat} onChange={(e) => setOfficeGps({ ...officeGps, lat: parseFloat(e.target.value) || 0 })} className="px-2.5 py-1 border rounded" />
                  <input type="number" step="0.0001" value={officeGps.lng} onChange={(e) => setOfficeGps({ ...officeGps, lng: parseFloat(e.target.value) || 0 })} className="px-2.5 py-1 border rounded" />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b font-bold text-sm">Attendance Log</div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {attendanceLogs.map(log => (
                <div key={log.id} className="p-3.5 flex justify-between items-center">
                  <div><strong>{log.staffName}</strong> • {log.date} at {log.time}</div>
                  <span className="text-[11px] text-slate-500">{log.locationNote}</span>
                </div>
              ))}
              {!attendanceLogs.length && <div className="p-6 text-center text-slate-400">No attendance entries yet.</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'leaves' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <h3 className="text-sm font-bold">Request Leave</h3>
            <form onSubmit={handleLeaveSubmit} className="space-y-2.5">
              <input type="date" required value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
              <input type="text" required value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Reason for leave" className="w-full px-3 py-1.5 border rounded-lg" />
              <button type="submit" className="w-full py-2 bg-slate-900 text-white font-semibold rounded-lg">Submit Request</button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b font-bold text-sm">Leave Requests</div>
            <div className="divide-y">
              {leaveRequests.map(lr => (
                <div key={lr.id} className="p-3.5 flex flex-wrap justify-between items-center gap-2">
                  <div><strong>{lr.staffName}</strong> • {lr.date} — {lr.reason}</div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-[10px]">{lr.status}</span>
                    {isAdmin && lr.status === 'Pending' && (
                      <>
                        <button onClick={() => setLeaveRequests(leaveRequests.map(x => x.id === lr.id ? { ...x, status: 'Approved' } : x))} className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">Approve</button>
                        <button onClick={() => setLeaveRequests(leaveRequests.map(x => x.id === lr.id ? { ...x, status: 'Rejected' } : x))} className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!leaveRequests.length && <div className="p-6 text-center text-slate-400">No leave requests yet.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// END OF FILE