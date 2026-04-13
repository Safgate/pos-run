import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { Clock, Banknote, Receipt, Printer, Plus, Trash2, Calendar, User as UserIcon, DollarSign, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Order, ShiftExpense } from '../types';

export const MyShift: React.FC = () => {
  const { currentUser, shifts, shiftExpenses, refreshData } = useAppStore();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shiftOrders, setShiftOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Find active shift for current user
  const activeShift = useMemo(() => {
    if (!currentUser) return null;
    return shifts.find(s => s.staff_id === currentUser.id && s.end_time === null);
  }, [shifts, currentUser]);

  // Fetch orders for active shift
  useEffect(() => {
    if (activeShift) {
      setLoadingOrders(true);
      fetch(`/api/shifts/${activeShift.id}/orders`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setShiftOrders(data);
          } else {
            setShiftOrders([]);
          }
          setLoadingOrders(false);
        })
        .catch(err => {
          console.error('Error fetching shift orders:', err);
          setLoadingOrders(false);
        });
    } else {
      setShiftOrders([]);
    }
  }, [activeShift]);

  const currentShiftExpenses = useMemo(() => {
    if (!activeShift) return [];
    return shiftExpenses.filter(e => e.shift_id === activeShift.id);
  }, [shiftExpenses, activeShift]);

  const stats = useMemo(() => {
    const totalSales = shiftOrders.reduce((sum, o) => sum + o.total, 0);
    const totalExpenses = currentShiftExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netCash = totalSales - totalExpenses;
    return { totalSales, totalExpenses, netCash };
  }, [shiftOrders, currentShiftExpenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || !expenseAmount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/shift-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: activeShift.id,
          amount: parseFloat(expenseAmount),
          description: expenseDescription,
          expense_date: format(new Date(), 'yyyy-MM-dd')
        })
      });

      if (res.ok) {
        setIsExpenseModalOpen(false);
        setExpenseAmount('');
        setExpenseDescription('');
        refreshData();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReport = () => {
    // Basic implementation - in a real app this would trigger a thermal print
    window.print();
  };

  if (!currentUser) return null;

  if (!activeShift) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mb-4">
          <Clock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">No Active Shift</h2>
        <p className="text-zinc-500 max-w-md">You don't have an active shift right now. Start a shift from the login or POS screen to track your sales and expenses.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">My Shift</h1>
          <p className="text-zinc-500 font-medium">Started at {format(new Date(activeShift.start_time), 'PPp')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-zinc-900/10"
          >
            <Plus size={20} />
            <span>Add Expense</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 bg-white border-2 border-zinc-100 text-zinc-900 px-6 py-3 rounded-2xl font-bold hover:bg-zinc-50 transition-all active:scale-95 shadow-sm"
          >
            <Printer size={20} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border-2 border-zinc-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Total Sales</span>
          </div>
          <div className="text-4xl font-black text-zinc-900">DH{stats.totalSales.toFixed(2)}</div>
          <div className="text-zinc-400 text-sm mt-2 font-medium">{shiftOrders.length} orders completed</div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border-2 border-zinc-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
              <Banknote size={24} />
            </div>
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Total Expenses</span>
          </div>
          <div className="text-4xl font-black text-zinc-900">DH{stats.totalExpenses.toFixed(2)}</div>
          <div className="text-zinc-400 text-sm mt-2 font-medium">{currentShiftExpenses.length} entries</div>
        </div>

        <div className="bg-zinc-900 p-8 rounded-[2rem] shadow-xl shadow-zinc-900/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-zinc-800 text-emerald-400 rounded-2xl flex items-center justify-center">
              <Receipt size={24} />
            </div>
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-xs">Net Cash</span>
          </div>
          <div className="text-4xl font-black text-white">DH{stats.netCash.toFixed(2)}</div>
          <div className="text-zinc-500 text-sm mt-2 font-medium">Expected in drawer</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Orders History */}
        <div className="bg-white rounded-[2rem] border-2 border-zinc-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <Receipt size={20} className="text-zinc-400" />
              Shift Orders
            </h3>
            <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold uppercase tracking-wider">
              {shiftOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px] p-2">
            {loadingOrders ? (
              <div className="p-12 text-center text-zinc-400 font-medium">Loading orders...</div>
            ) : shiftOrders.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-medium italic">No orders yet this shift</div>
            ) : (
              <div className="space-y-2">
                {shiftOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-zinc-50 rounded-2xl transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-zinc-900">Order #{order.id}</div>
                      <div className="font-black text-zinc-900">DH{order.total.toFixed(2)}</div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <div className="text-zinc-400 font-medium">{format(new Date(order.created_at), 'p')}</div>
                      <div className="text-zinc-500 font-bold uppercase tracking-widest">{order.items.length} items</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-[2rem] border-2 border-zinc-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <Banknote size={20} className="text-zinc-400" />
              Shift Expenses
            </h3>
            <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold uppercase tracking-wider">
              {currentShiftExpenses.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px] p-2">
            {currentShiftExpenses.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-medium italic">No expenses recorded</div>
            ) : (
              <div className="space-y-2">
                {currentShiftExpenses.map((expense) => (
                  <div key={expense.id} className="p-4 hover:bg-zinc-50 rounded-2xl transition-colors group flex items-center justify-between">
                    <div>
                      <div className="font-bold text-zinc-900">{expense.description || 'General Expense'}</div>
                      <div className="text-xs text-zinc-400 font-medium">{format(new Date(expense.created_at), 'p')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-red-600">-DH{expense.amount.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold text-zinc-900 mb-6">Add Shift Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Amount (DH)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">DH</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl outline-none focus:border-zinc-900 font-bold text-xl"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                <input
                  type="text"
                  required
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl outline-none focus:border-zinc-900 font-medium"
                  placeholder="e.g. Milk, Water, Supplies..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-zinc-900/20"
                >
                  {isSubmitting ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .max-w-5xl, .max-w-5xl * { visibility: visible; }
          .max-w-5xl { position: absolute; left: 0; top: 0; width: 100%; max-width: none; border: none; }
          button, .md\\:pb-8, .pb-24, .md\\:hidden { display: none !important; }
          .grid { display: block !important; }
          .bg-zinc-900 { background: white !important; border: 1px solid #eee; }
          .text-white { color: black !important; }
          .bg-emerald-50, .bg-red-50, .bg-zinc-800 { background: transparent !important; border: 1px solid #eee; }
          .rounded-[2rem], .rounded-3xl, .rounded-2xl { border-radius: 0 !important; border: 1px solid #eee !important; margin-bottom: 10px; }
          .shadow-sm, .shadow-xl, .shadow-2xl { shadow: none !important; box-shadow: none !important; }
        }
      `}} />
    </div>
  );
};
