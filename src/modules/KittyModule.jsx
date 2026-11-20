import React, { useState } from 'react';
import {
  Gift, Plus, Users, CheckCircle2, X, MessageCircle,
  Calendar, Coins, Award, Sparkles
} from 'lucide-react';

const DEFAULT_PLANS = [
  {
    id: 'PLAN-11PLUS1',
    name: 'Swarna Kalash (11 + 1 Month Bonus)',
    mode: 'amount', // 'amount' | 'weight'
    metal: 'Gold',
    durationMonths: 11,
    minMonthly: 2000,
    bonusInstallments: 1, // 1 extra month installment paid by showroom
    active: true
  },
  {
    id: 'PLAN-GOLD-GRAM',
    name: '22K Gold Gram Accumulation (12 Months)',
    mode: 'weight',
    metal: 'Gold',
    durationMonths: 12,
    minMonthly: 5000,
    bonusInstallments: 0.5,
    active: true
  }
];

export default function KittyModule({
  currentUser,
  liveRates,
  kittyPlans = [],
  setKittyPlans,
  kittyMembers = [],
  setKittyMembers
}) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.privileges?.payroll_admin || !!currentUser?.privileges?.kitty_admin;

  const [tab, setTab] = useState('members'); // 'members' | 'enroll' | 'plans'
  const [banner, setBanner] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  // Plan Creation State
  const [planName, setPlanName] = useState('');
  const [planMode, setPlanMode] = useState('amount');
  const [planMetal, setPlanMetal] = useState('Gold');
  const [planMonths, setPlanMonths] = useState('11');
  const [planMinAmt, setPlanMinAmt] = useState('2000');
  const [planBonusMonths, setPlanBonusMonths] = useState('1');

  // Member Enrollment State
  const [memberName, setMemberName] = useState('');
  const [memberMobile, setMemberMobile] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [monthlyCommitment, setMonthlyCommitment] = useState('2000');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  // Installment Payment State
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI / Bank');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  const showBanner = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4500);
  };

  const activePlans = (kittyPlans && kittyPlans.length > 0) ? kittyPlans : DEFAULT_PLANS;

  const handleCreatePlan = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!planName.trim()) return;

    const newPlan = {
      id: `PLAN-${Date.now()}`,
      name: planName.trim(),
      mode: planMode,
      metal: planMetal,
      durationMonths: parseInt(planMonths, 10) || 11,
      minMonthly: parseFloat(planMinAmt) || 1000,
      bonusInstallments: parseFloat(planBonusMonths) || 0,
      active: true
    };

    const baseList = (kittyPlans && kittyPlans.length > 0) ? kittyPlans : DEFAULT_PLANS;
    setKittyPlans([newPlan, ...baseList]);
    setPlanName('');
    showBanner(`Kitty scheme "${newPlan.name}" created.`);
  };

  const handleEnrollMember = (e) => {
    e.preventDefault();
    const plan = activePlans.find(p => p.id === (selectedPlanId || activePlans[0]?.id));
    if (!plan || !memberName.trim()) return;

    const monthly = parseFloat(monthlyCommitment) || plan.minMonthly;
    const cardNo = `KTY-${String((kittyMembers || []).length + 1001)}`;

    const newMember = {
      id: Date.now(),
      cardNo,
      customerName: memberName.trim(),
      customerMobile: memberMobile.trim(),
      planId: plan.id,
      planName: plan.name,
      planMode: plan.mode,
      metal: plan.metal,
      durationMonths: plan.durationMonths,
      bonusInstallments: plan.bonusInstallments,
      monthlyAmount: monthly,
      startDate,
      status: 'Active', // 'Active' | 'Matured' | 'Redeemed'
      installments: [],
      redeemedBillNo: ''
    };

    setKittyMembers([newMember, ...(kittyMembers || [])]);
    setSelectedMemberId(newMember.id);
    setMemberName('');
    setMemberMobile('');
    setTab('members');
    showBanner(`Enrolled ${newMember.customerName} under ${plan.name} (Card: ${cardNo}).`);
  };

  const handleRecordInstallment = (member) => {
    const amt = parseFloat(payAmount) || member.monthlyAmount;
    if (amt <= 0) return;

    const rateUsed = member.metal === 'Silver'
      ? (Number(liveRates?.silver) || 92)
      : (Number(liveRates?.gold22) || 7250);

    const gramsBooked = member.planMode === 'weight'
      ? Math.round((amt / rateUsed) * 1000) / 1000
      : 0;

    const nextInstNo = (member.installments?.length || 0) + 1;
    const newInst = {
      id: Date.now(),
      instNo: nextInstNo,
      date: payDate,
      amount: amt,
      payMode,
      rateUsed,
      gramsBooked,
      collectedBy: currentUser?.name || 'Staff'
    };

    const updatedInstallments = [...(member.installments || []), newInst];
    const isCompleted = updatedInstallments.length >= member.durationMonths;

    setKittyMembers((kittyMembers || []).map(m =>
      m.id === member.id
        ? {
            ...m,
            installments: updatedInstallments,
            status: isCompleted && m.status === 'Active' ? 'Matured' : m.status
          }
        : m
    ));

    setPayAmount('');
    showBanner(
      `Installment #${nextInstNo} (₹${amt.toLocaleString('en-IN')}) recorded for ${member.customerName}` +
      (gramsBooked > 0 ? ` • Locked ${gramsBooked}g @ ₹${rateUsed}/g` : '')
    );
  };

  const handleRedeemKitty = (member) => {
    const billRef = window.prompt(`Enter GST Invoice No. against which ${member.customerName}'s Kitty is redeemed:`) || 'Counter Bill';
    setKittyMembers((kittyMembers || []).map(m =>
      m.id === member.id ? { ...m, status: 'Redeemed', redeemedBillNo: billRef } : m
    ));
    showBanner(`Kitty Card ${member.cardNo} marked as Redeemed (${billRef}).`);
  };

  const handleSendWhatsApp = (member, summary) => {
    const msg =
      `*SWARNASETU JEWELLERS - KITTY PASSBOOK*%0A` +
      `Card No: *${member.cardNo}*%0A` +
      `Member: *${member.customerName}*%0A` +
      `Plan: ${member.planName}%0A` +
      `Installments Paid: *${member.installments.length} / ${member.durationMonths}*%0A` +
      `Total Deposited: *₹${summary.totalPaid.toLocaleString('en-IN')}*%0A` +
      (member.planMode === 'weight'
        ? `Accumulated ${member.metal}: *${summary.totalGrams}g*%0A`
        : `Est. Maturity Value (incl. Bonus): *₹${summary.maturityValue.toLocaleString('en-IN')}*%0A`) +
      `Thank you for saving with us!`;

    const digits = (member.customerMobile || '').replace(/\D/g, '');
    const url = digits.length >= 10
      ? `https://wa.me/91${digits.slice(-10)}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const getMemberSummary = (member) => {
    const list = member.installments || [];
    const totalPaid = list.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalGrams = Math.round(list.reduce((s, i) => s + Number(i.gramsBooked || 0), 0) * 1000) / 1000;
    const bonusAmount = Math.round((member.monthlyAmount || 0) * (member.bonusInstallments || 0));
    const maturityValue = totalPaid + bonusAmount;
    return { totalPaid, totalGrams, bonusAmount, maturityValue };
  };

  const totalKittyPool = (kittyMembers || [])
    .filter(m => m.status !== 'Redeemed')
    .reduce((s, m) => s + getMemberSummary(m).totalPaid, 0);

  const activeMember = (kittyMembers || []).find(m => m.id === selectedMemberId) || (kittyMembers || [])[0] || null;

  return (
    <div className="space-y-4 text-xs">
      {banner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex justify-between items-center">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} /> {banner}</span>
          <button onClick={() => setBanner('')}><X size={14} /></button>
        </div>
      )}

      {/* Top Navigation & Summary */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTab('members')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              tab === 'members' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={14} /> Kitty Members & Installments ({(kittyMembers || []).length})
          </button>
          <button
            onClick={() => setTab('enroll')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              tab === 'enroll' ? 'bg-pink-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Plus size={14} /> Enroll New Member
          </button>
          {isAdmin && (
            <button
              onClick={() => setTab('plans')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
                tab === 'plans' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Gift size={14} /> Scheme Rules ({activePlans.length})
            </button>
          )}
        </div>

        <div className="px-3 py-1 rounded-lg bg-pink-50 text-pink-800 font-bold">
          Active Kitty Deposits: ₹{totalKittyPool.toLocaleString('en-IN')}
        </div>
      </div>

      {/* TAB 1: MEMBERS & INSTALLMENTS */}
      {tab === 'members' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Enrolled Members ({(kittyMembers || []).length})
            </h3>

            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {(kittyMembers || []).map(m => {
                const sum = getMemberSummary(m);
                const isSelected = activeMember?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMemberId(m.id);
                      setPayAmount(String(m.monthlyAmount));
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'border-pink-400 bg-pink-50/40' : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-bold text-slate-900">{m.customerName}</span>
                        <div className="text-[10px] text-slate-500">{m.cardNo} • {m.customerMobile || 'No Mobile'}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'Redeemed' ? 'bg-slate-100 text-slate-600' :
                        m.status === 'Matured' ? 'bg-emerald-50 text-emerald-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 truncate">{m.planName}</div>
                    <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-100 text-[11px]">
                      <span>Paid: <strong>{m.installments.length}/{m.durationMonths}</strong></span>
                      <strong className="text-slate-900">
                        {m.planMode === 'weight' ? `${sum.totalGrams}g` : `₹${sum.totalPaid.toLocaleString('en-IN')}`}
                      </strong>
                    </div>
                  </div>
                );
              })}

              {(!kittyMembers || kittyMembers.length === 0) && (
                <div className="py-8 text-center text-slate-400">
                  No Kitty members enrolled yet. Click <strong>"+ Enroll New Member"</strong> to start.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {activeMember ? (() => {
              const summary = getMemberSummary(activeMember);
              return (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{activeMember.customerName}</h3>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                          {activeMember.cardNo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {activeMember.planName} • Monthly: <strong>₹{activeMember.monthlyAmount.toLocaleString('en-IN')}</strong> • Started: {activeMember.startDate}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(activeMember, summary)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg inline-flex items-center gap-1"
                      >
                        <MessageCircle size={13} /> WhatsApp Passbook
                      </button>
                      {activeMember.status !== 'Redeemed' && (
                        <button
                          type="button"
                          onClick={() => handleRedeemKitty(activeMember)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg inline-flex items-center gap-1"
                        >
                          <Award size={13} /> Redeem Against Bill
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Passbook Summary Boxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <div className="text-[10px] text-slate-500">Installments</div>
                      <div className="text-sm font-bold text-slate-900">{activeMember.installments.length} / {activeMember.durationMonths}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <div className="text-[10px] text-slate-500">Total Cash Paid</div>
                      <div className="text-sm font-bold text-slate-900">₹{summary.totalPaid.toLocaleString('en-IN')}</div>
                    </div>
                    {activeMember.planMode === 'weight' ? (
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                        <div className="text-[10px] text-amber-800">Accumulated {activeMember.metal}</div>
                        <div className="text-sm font-bold text-amber-900">{summary.totalGrams} g</div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-pink-50/70 border border-pink-200">
                        <div className="text-[10px] text-pink-800">Showroom Bonus</div>
                        <div className="text-sm font-bold text-pink-900">+ ₹{summary.bonusAmount.toLocaleString('en-IN')}</div>
                      </div>
                    )}
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="text-[10px] text-emerald-800">Maturity Benefit</div>
                      <div className="text-sm font-bold text-emerald-900">
                        {activeMember.planMode === 'weight'
                          ? `${summary.totalGrams}g + Bonus`
                          : `₹${summary.maturityValue.toLocaleString('en-IN')}`}
                      </div>
                    </div>
                  </div>

                  {/* Collect Next Installment Bar */}
                  {activeMember.status !== 'Redeemed' && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Installment #{activeMember.installments.length + 1} Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={payAmount || activeMember.monthlyAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-36 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Mode</label>
                        <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold">
                          <option value="UPI / Bank">UPI / Bank</option>
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Date</label>
                        <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRecordInstallment(activeMember)}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                      >
                        + Collect Installment
                      </button>
                    </div>
                  )}

                  {/* Installment History Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Inst #</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Amount</th>
                          <th className="p-2.5">Mode</th>
                          {activeMember.planMode === 'weight' && <th className="p-2.5">Locked Rate & Weight</th>}
                          <th className="p-2.5 text-right">Received By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(activeMember.installments || []).map(inst => (
                          <tr key={inst.id}>
                            <td className="p-2.5 font-bold">#{inst.instNo}</td>
                            <td className="p-2.5">{inst.date}</td>
                            <td className="p-2.5 font-bold text-emerald-700">₹{Number(inst.amount).toLocaleString('en-IN')}</td>
                            <td className="p-2.5">{inst.payMode}</td>
                            {activeMember.planMode === 'weight' && (
                              <td className="p-2.5 font-semibold text-amber-800">
                                {inst.gramsBooked}g (@ ₹{inst.rateUsed}/g)
                              </td>
                            )}
                            <td className="p-2.5 text-right text-slate-500">{inst.collectedBy}</td>
                          </tr>
                        ))}
                        {(!activeMember.installments || activeMember.installments.length === 0) && (
                          <tr>
                            <td colSpan="6" className="p-6 text-center text-slate-400">
                              No installments paid yet. Collect Installment #1 above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })() : (
              <div className="bg-white p-10 rounded-2xl border border-slate-200/80 text-center text-slate-400">
                Select a Kitty member on the left or enroll a new customer.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ENROLL NEW MEMBER */}
      {tab === 'enroll' && (
        <div className="max-w-lg mx-auto bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Sparkles size={15} className="text-pink-600" /> Enroll Customer in Kitty Savings Plan
          </h3>
          <form onSubmit={handleEnrollMember} className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Select Kitty Scheme *</label>
              <select
                value={selectedPlanId || activePlans[0]?.id}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  const found = activePlans.find(p => p.id === e.target.value);
                  if (found) setMonthlyCommitment(String(found.minMonthly));
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold"
              >
                {activePlans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.durationMonths} Mos (Min ₹{p.minMonthly}/mo)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Customer Full Name *</label>
                <input type="text" required value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Customer Name" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold" />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Mobile Number *</label>
                <input type="tel" required value={memberMobile} onChange={(e) => setMemberMobile(e.target.value)} placeholder="10-digit mobile" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Monthly Installment (₹) *</label>
                <input type="number" required value={monthlyCommitment} onChange={(e) => setMonthlyCommitment(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold" />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg" />
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg">
              Create Kitty Membership Card
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: ADMIN SCHEME RULES */}
      {tab === 'plans' && isAdmin && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Create New Kitty Plan</h3>
            <form onSubmit={handleCreatePlan} className="space-y-2.5">
              <input type="text" required value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Plan Name (e.g. Dhanvarsha 11+1)" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Accumulation Mode</label>
                  <select value={planMode} onChange={(e) => setPlanMode(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg">
                    <option value="amount">Cash Amount (₹)</option>
                    <option value="weight">Gold/Silver Grams</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Metal</label>
                  <select value={planMetal} onChange={(e) => setPlanMetal(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg">
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Months</label>
                  <input type="number" value={planMonths} onChange={(e) => setPlanMonths(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Min ₹/Mo</label>
                  <input type="number" value={planMinAmt} onChange={(e) => setPlanMinAmt(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Bonus Mos</label>
                  <input type="number" step="0.25" value={planBonusMonths} onChange={(e) => setPlanBonusMonths(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-slate-900 text-white font-semibold rounded-lg">
                Save Scheme Rule
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-sm">Active Showroom Kitty Schemes</div>
            <div className="divide-y divide-slate-100">
              {activePlans.map(p => (
                <div key={p.id} className="p-4 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Duration: <strong>{p.durationMonths} Months</strong> • Min Monthly: <strong>₹{p.minMonthly}</strong> • Showroom Bonus: <strong>{p.bonusInstallments} Month(s)</strong>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-pink-50 text-pink-800 font-bold text-[10px]">
                    {p.mode === 'weight' ? `${p.metal} Weight Lock` : 'Cash + Bonus'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// END OF FILE
