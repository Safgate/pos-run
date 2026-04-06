import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Plus, Trash2, Clock, CheckCircle, XCircle, Users, Edit2, DollarSign, Wallet, Receipt } from 'lucide-react';
import { format, differenceInMinutes, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const Staff: React.FC = () => {
  const { staff, shifts, staffPayments } = useAppStore();
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [newStaff, setNewStaff] = useState({ name: '', role: '', hourly_rate: '', pin: '' });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Payment State
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ staff_id: '', amount: '', type: 'advance', description: '' });

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.role || !newStaff.hourly_rate || !newStaff.pin) return;
    
    if (editingStaffId) {
      await fetch(`/api/staff/${editingStaffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStaff,
          hourly_rate: parseFloat(newStaff.hourly_rate)
        })
      });
    } else {
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStaff,
          hourly_rate: parseFloat(newStaff.hourly_rate)
        })
      });
    }
    
    setNewStaff({ name: '', role: '', hourly_rate: '', pin: '' });
    setIsAddingStaff(false);
    setEditingStaffId(null);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.staff_id || !newPayment.amount || !newPayment.type) return;

    await fetch('/api/staff/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: parseInt(newPayment.staff_id),
        amount: parseFloat(newPayment.amount),
        type: newPayment.type,
        description: newPayment.description
      })
    });

    setNewPayment({ staff_id: '', amount: '', type: 'advance', description: '' });
    setIsAddingPayment(false);
  };

  const handleDeletePayment = async (id: number) => {
    await fetch(`/api/staff/payments/${id}`, { method: 'DELETE' });
  };

  const startEditingStaff = (member: any) => {
    setNewStaff({
      name: member.name,
      role: member.role,
      hourly_rate: member.hourly_rate.toString(),
      pin: member.pin || '0000'
    });
    setEditingStaffId(member.id);
    setIsAddingStaff(true);
  };

  const handleDeleteStaff = async (id: number) => {
    await fetch(`/api/staff/${id}`, { method: 'DELETE' });
  };

  const handleClockIn = async (staffId: number) => {
    await fetch('/api/shifts/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId })
    });
  };

  const handleClockOut = async (shiftId: number) => {
    await fetch(`/api/shifts/${shiftId}/close`, { method: 'PUT' });
  };

  const calculatePay = (shift: any) => {
    if (!shift.end_time) return 0;
    const mins = differenceInMinutes(new Date(shift.end_time), new Date(shift.start_time));
    return (mins / 60) * shift.hourly_rate;
  };

  const handlePrintShiftReport = async (shift: any) => {
    try {
      const res = await fetch(`/api/shifts/${shift.id}/orders`);
      const shiftOrders = await res.json();
      
      const totalSales = shiftOrders.reduce((sum: number, o: any) => sum + o.total, 0);
      const orderCount = shiftOrders.length;
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const html = `
        <html>
          <head>
            <title>Shift Report - ${shift.staff_name}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
              .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; }
              .order-list { font-size: 12px; margin-top: 10px; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">SHIFT REPORT</h2>
              <p style="margin: 5px 0;">${shift.staff_name}</p>
              <p style="font-size: 12px; margin: 0;">${format(new Date(shift.start_time), 'MMM d, yyyy')}</p>
            </div>
            
            <div class="row">
              <span>Clock In:</span>
              <span>${format(new Date(shift.start_time), 'h:mm a')}</span>
            </div>
            <div class="row">
              <span>Clock Out:</span>
              <span>${shift.end_time ? format(new Date(shift.end_time), 'h:mm a') : 'Active'}</span>
            </div>
            
            <div class="total">
              <div class="row">
                <span>Total Orders:</span>
                <span>${orderCount}</span>
              </div>
              <div class="row">
                <span>Total Sales:</span>
                <span>DH${totalSales.toFixed(2)}</span>
              </div>
            </div>

            <div class="order-list">
              <p style="font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 2px;">Order Summary:</p>
              ${shiftOrders.map((o: any) => `
                <div class="row">
                  <span>#${o.id.toString().slice(-4)}</span>
                  <span>DH${o.total.toFixed(2)}</span>
                </div>
              `).join('')}
            </div>

            <div class="footer">
              <p>Printed on ${format(new Date(), 'MMM d, h:mm a')}</p>
            </div>
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Failed to print shift report:', error);
    }
  };

  const getStaffSummary = (staffId: number) => {
    const staffShifts = shifts.filter(s => s.staff_id === staffId && s.end_time);
    const totalEarned = staffShifts.reduce((sum, s) => sum + calculatePay(s), 0);
    
    const payments = staffPayments.filter(p => p.staff_id === staffId);
    const totalAdvances = payments.filter(p => p.type === 'advance').reduce((sum, p) => sum + p.amount, 0);
    const totalSalaries = payments.filter(p => p.type === 'salary').reduce((sum, p) => sum + p.amount, 0);
    const totalBonuses = payments.filter(p => p.type === 'bonus').reduce((sum, p) => sum + p.amount, 0);

    return {
      totalEarned,
      totalAdvances,
      totalSalaries,
      totalBonuses,
      balance: totalEarned + totalBonuses - totalAdvances - totalSalaries
    };
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">Staff & Payroll</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage employees, shifts, and payments</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsAddingPayment(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-5 py-2.5 rounded-xl font-medium hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <DollarSign size={20} /> Add Payment
          </button>
          <button 
            onClick={() => {
              setEditingStaffId(null);
              setNewStaff({ name: '', role: '', hourly_rate: '', pin: '' });
              setIsAddingStaff(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20"
          >
            <Plus size={20} /> Add Staff
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Staff List */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100 h-fit">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <Users size={24} className="text-emerald-500" />
            Team Members
          </h2>

          {isAddingStaff && (
            <form onSubmit={handleAddStaff} className="mb-6 bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
              <input required type="text" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="Name" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <input required type="text" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} placeholder="Role (e.g., Barista)" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <input required type="number" step="0.5" value={newStaff.hourly_rate} onChange={e => setNewStaff({...newStaff, hourly_rate: e.target.value})} placeholder="Hourly Rate (DH)" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <input required type="text" maxLength={4} pattern="\d{4}" value={newStaff.pin} onChange={e => setNewStaff({...newStaff, pin: e.target.value.replace(/\D/g, '')})} placeholder="4-Digit PIN" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-medium hover:bg-emerald-600 text-sm md:text-base">
                  {editingStaffId ? 'Update' : 'Save'}
                </button>
                <button type="button" onClick={() => { setIsAddingStaff(false); setEditingStaffId(null); }} className="flex-1 bg-zinc-200 text-zinc-700 py-2 rounded-lg font-medium hover:bg-zinc-300 text-sm md:text-base">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {staff.map(member => {
              const activeShift = shifts.find(s => s.staff_id === member.id && !s.end_time);
              const summary = getStaffSummary(member.id);
              return (
                <div key={member.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 group space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-zinc-900">{member.name}</h4>
                      <p className="text-sm text-zinc-500">{member.role} • {(member.hourly_rate).toFixed(2)} DH/hr</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeShift ? (
                        <button 
                          onClick={() => handleClockOut(activeShift.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs md:text-sm font-bold hover:bg-red-200 transition-colors"
                        >
                          <Clock size={16} /> Clock Out
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleClockIn(member.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs md:text-sm font-bold hover:bg-emerald-200 transition-colors"
                        >
                          <Clock size={16} /> Clock In
                        </button>
                      )}
                      <div className="flex md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditingStaff(member)}
                          className="p-1.5 md:p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(member.id)}
                          className="p-1.5 md:p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Earned</p>
                      <p className="text-sm font-bold text-zinc-900">DH{summary.totalEarned.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Paid/Adv.</p>
                      <p className="text-sm font-bold text-zinc-900">DH{(summary.totalSalaries + summary.totalAdvances).toFixed(2)}</p>
                    </div>
                    <div className="col-span-2 pt-1">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Balance</p>
                        <p className={`text-sm font-black ${summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          DH{summary.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Advances & Salaries */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Wallet size={24} className="text-emerald-500" />
                Advances & Salaries
              </h2>
            </div>

            <div className="overflow-x-auto -mx-5 md:mx-0">
              <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="px-5 md:px-0 pb-3 font-semibold">Staff</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 font-semibold text-right pr-5 md:pr-0">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {staffPayments.map(payment => (
                    <tr key={payment.id} className="text-zinc-800 text-sm md:text-base group">
                      <td className="px-5 md:px-0 py-4 font-medium">{payment.staff_name}</td>
                      <td className="py-4 text-zinc-500">{format(new Date(payment.created_at), 'MMM d, yyyy')}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          payment.type === 'advance' ? 'bg-amber-100 text-amber-700' : 
                          payment.type === 'salary' ? 'bg-emerald-100 text-emerald-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {payment.type}
                        </span>
                      </td>
                      <td className="py-4 text-zinc-500 italic max-w-[200px] truncate">{payment.description || '-'}</td>
                      <td className="py-4 text-right font-bold pr-5 md:pr-0">
                        <div className="flex items-center justify-end gap-2">
                          <span>DH{payment.amount.toFixed(2)}</span>
                          <button 
                            onClick={() => handleDeletePayment(payment.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staffPayments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400 italic">No payments recorded yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shift History */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Clock size={24} className="text-emerald-500" />
              Shift History & Hourly Pay
            </h2>

            <div className="overflow-x-auto -mx-5 md:mx-0">
              <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="px-5 md:px-0 pb-3 font-semibold">Staff</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Clock In</th>
                    <th className="pb-3 font-semibold">Clock Out</th>
                    <th className="pb-3 font-semibold text-right pr-5 md:pr-0">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {shifts.map(shift => (
                    <tr key={shift.id} className="text-zinc-800 text-sm md:text-base group">
                      <td className="px-5 md:px-0 py-4 font-medium">{shift.staff_name}</td>
                      <td className="py-4 text-zinc-500">{format(new Date(shift.start_time), 'MMM d, yyyy')}</td>
                      <td className="py-4 text-emerald-600 font-medium">{format(new Date(shift.start_time), 'h:mm a')}</td>
                      <td className="py-4 text-red-600 font-medium">
                        {shift.end_time ? format(new Date(shift.end_time), 'h:mm a') : <span className="text-orange-500">Active</span>}
                      </td>
                      <td className="py-4 text-right font-bold pr-5 md:pr-0">
                        <div className="flex items-center justify-end gap-3">
                          {shift.end_time ? `DH${calculatePay(shift).toFixed(2)}` : '-'}
                          <button 
                            onClick={() => handlePrintShiftReport(shift)}
                            className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Print Shift Report"
                          >
                            <Receipt size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isAddingPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-zinc-900">Add Payment</h3>
              <button onClick={() => setIsAddingPayment(false)} className="p-2 text-zinc-400 hover:text-zinc-900">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Staff Member</label>
                <select 
                  required
                  value={newPayment.staff_id}
                  onChange={e => setNewPayment({...newPayment, staff_id: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                >
                  <option value="">Select Staff</option>
                  {staff.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Amount (DH)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={newPayment.amount}
                    onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Type</label>
                  <select 
                    required
                    value={newPayment.type}
                    onChange={e => setNewPayment({...newPayment, type: e.target.value as any})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  >
                    <option value="advance">Advance</option>
                    <option value="salary">Salary</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  value={newPayment.description}
                  onChange={e => setNewPayment({...newPayment, description: e.target.value})}
                  placeholder="Optional notes..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 h-24 resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Confirm Deletion</h3>
            <p className="text-zinc-500 mb-6">
              Are you sure you want to delete this staff member? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDeleteStaff(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
