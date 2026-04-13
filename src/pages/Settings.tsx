import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { History, Search, Calendar, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Trash2, Filter, DollarSign, Printer, User, Key, ShieldCheck, Settings as SettingsIcon, Save } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

export const Settings: React.FC = () => {
  const { tables, shifts, staff, currentUser, settings, updateSettings } = useAppStore();
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [expandedShift, setExpandedShift] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'order' | 'item', orderId: number, itemId?: number } | null>(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [clearHistoryText, setClearHistoryText] = useState('');
  const [clearHistoryPin, setClearHistoryPin] = useState('');
  const [clearHistoryAcknowledge, setClearHistoryAcknowledge] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Receipt Settings State
  const [receiptSettings, setReceiptSettings] = useState<Record<string, string>>({
    receipt_name: '',
    receipt_address: '',
    receipt_phone: '',
    receipt_wifi_network: '',
    receipt_wifi_password: '',
    receipt_footer: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // PIN Management State
  const [editingPinStaffId, setEditingPinStaffId] = useState<number | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // New Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');

  const fetchOrderHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders/history');
      const data = await response.json();
      if (Array.isArray(data)) {
        setOrderHistory(data);
      } else {
        setOrderHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch order history:', error);
      setOrderHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setReceiptSettings({
        receipt_name: settings.receipt_name || '',
        receipt_address: settings.receipt_address || '',
        receipt_phone: settings.receipt_phone || '',
        receipt_wifi_network: settings.receipt_wifi_network || '',
        receipt_wifi_password: settings.receipt_wifi_password || '',
        receipt_footer: settings.receipt_footer || ''
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateSettings(receiptSettings);
      setSettingsMessage({ text: 'Receipt settings saved successfully', type: 'success' });
      setTimeout(() => setSettingsMessage(null), 3000);
    } catch (error) {
      setSettingsMessage({ text: 'Failed to save settings', type: 'error' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleClearHistory = async () => {
    if (clearHistoryText !== 'CLEAR HISTORY') {
      setSettingsMessage({ text: 'Type CLEAR HISTORY exactly to continue', type: 'error' });
      return;
    }
    if (!clearHistoryAcknowledge) {
      setSettingsMessage({ text: 'Please acknowledge the safety checkbox', type: 'error' });
      return;
    }
    if (currentUser?.pin && clearHistoryPin !== currentUser.pin) {
      setSettingsMessage({ text: 'Invalid PIN confirmation', type: 'error' });
      return;
    }

    setIsClearingHistory(true);
    try {
      const res = await fetch('/api/orders/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmText: clearHistoryText,
          acknowledged: clearHistoryAcknowledge
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsMessage({ text: data.error || 'Failed to clear history', type: 'error' });
        return;
      }
      setSettingsMessage({ text: `History cleared (${data.deleted_orders || 0} orders)`, type: 'success' });
      setShowClearHistoryModal(false);
      setClearHistoryText('');
      setClearHistoryPin('');
      setClearHistoryAcknowledge(false);
      fetchOrderHistory();
    } catch (error) {
      setSettingsMessage({ text: 'Network error while clearing history', type: 'error' });
    } finally {
      setIsClearingHistory(false);
      setTimeout(() => setSettingsMessage(null), 3000);
    }
  };

  const filteredOrders = orderHistory.filter(order => {
    const matchesSearch = order.id.toString().includes(searchQuery) ||
      (order.table_id ? tables.find(t => t.id === order.table_id)?.name.toLowerCase().includes(searchQuery.toLowerCase()) : 'takeaway'.includes(searchQuery.toLowerCase()));
    
    const orderDate = parseISO(order.created_at);
    const matchesDate = (!startDate || orderDate >= startOfDay(parseISO(startDate))) &&
                        (!endDate || orderDate <= endOfDay(parseISO(endDate)));
    
    const matchesTotal = (!minTotal || order.total >= parseFloat(minTotal)) &&
                         (!maxTotal || order.total <= parseFloat(maxTotal));
    
    return matchesSearch && matchesDate && matchesTotal;
  });

  const groupedShifts = useMemo(() => {
    const groups: Record<number | string, { shift: any, orders: any[], total: number }> = {};
    
    filteredOrders.forEach(order => {
      const shiftId = order.shift_id || 'no-shift';
      if (!groups[shiftId]) {
        const shift = shifts.find(s => s.id === shiftId);
        groups[shiftId] = { 
          shift: shift || { id: shiftId, staff_name: order.staff_name, start_time: order.created_at }, 
          orders: [], 
          total: 0 
        };
      }
      groups[shiftId].orders.push(order);
      groups[shiftId].total += order.total;
    });

    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.shift.start_time).getTime();
      const dateB = new Date(b.shift.start_time).getTime();
      return dateB - dateA;
    });
  }, [filteredOrders, shifts]);

  const printShiftReport = async (shift: any) => {
    const serverName = staff.find(s => s.id === shift.staff_id)?.name || shift.staff_name || 'Unknown';
    const startTime = format(new Date(shift.start_time), 'MMM dd, yyyy HH:mm:ss');
    const endTime = shift.end_time ? format(new Date(shift.end_time), 'MMM dd, yyyy HH:mm:ss') : 'Ongoing';

    let totalSales = 0;
    let totalOrders = 0;
    try {
      const response = await fetch(`/api/shifts/${shift.id}/orders`);
      if (!response.ok) throw new Error('Failed to fetch shift orders');
      const shiftOrders = await response.json();
      totalSales = shiftOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
      totalOrders = shiftOrders.length;
    } catch (error) {
      console.error('Failed to build shift report:', error);
      return;
    }

    const html = `
      <html>
        <head>
          <title>Shift Report - ${serverName}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: monospace; padding: 10px; width: 80mm; margin: 0; font-size: 12px; zoom: 1.6; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .mb-2 { margin-bottom: 4px; }
            .mb-4 { margin-bottom: 8px; }
            .flex { display: flex; justify-content: space-between; }
            .border-b { border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="text-center mb-4">
            <h2 style="margin: 0;">Shift Report</h2>
            <div class="bold">${serverName}</div>
            <div style="font-size: 10px;">${startTime} - ${endTime}</div>
          </div>
          
          <div class="border-b">
            <div class="flex mb-2">
              <div>Total Orders</div>
              <div>${totalOrders}</div>
            </div>
            <div class="flex mb-2">
              <div>Total Sales</div>
              <div class="bold">DH${totalSales.toFixed(2)}</div>
            </div>
          </div>
          
          <div class="text-center" style="margin-top: 16px;">
            Report Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-100';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-100';
    }
  };

  const handleUpdatePin = async (staffId: number, pin: string) => {
    if (!/^\d{4}$/.test(pin)) {
      setPinMessage({ text: 'PIN must be exactly 4 digits', type: 'error' });
      return;
    }

    try {
      const res = await fetch(`/api/staff/${staffId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (res.ok) {
        setPinMessage({ text: 'PIN updated successfully', type: 'success' });
        setEditingPinStaffId(null);
        setNewPin('');
        setTimeout(() => setPinMessage(null), 3000);
      } else {
        const data = await res.json();
        setPinMessage({ text: data.error || 'Failed to update PIN', type: 'error' });
      }
    } catch (error) {
      setPinMessage({ text: 'Network error', type: 'error' });
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">Settings</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage application settings and view order history</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-zinc-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg md:text-xl font-bold text-zinc-900 flex items-center gap-2">
              <History size={24} className="text-emerald-500" />
              Order History
            </h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Search ID or table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm md:text-base"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium ${
                  showFilters ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <Filter size={18} />
                <span>Filters</span>
              </button>
              <button
                onClick={() => setShowClearHistoryModal(true)}
                className="p-2 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Trash2 size={18} />
                <span>Clear History</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} /> End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={12} /> Min Total
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={minTotal}
                  onChange={(e) => setMinTotal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={12} /> Max Total
                </label>
                <input
                  type="number"
                  placeholder="999.99"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setMinTotal('');
                    setMaxTotal('');
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-2 space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500">Loading order history...</div>
          ) : groupedShifts.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">No orders found.</div>
          ) : (
            <div className="space-y-4">
              {groupedShifts.map(({ shift, orders, total }) => (
                <div key={shift.id} className="bg-zinc-50/50 rounded-2xl border border-zinc-100 overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedShift(expandedShift === shift.id ? null : shift.id)}
                    className="w-full flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-zinc-100/50 transition-colors text-left gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-zinc-100">
                        <Clock size={24} />
                      </div>
                      <div>
                        <div className="font-black text-zinc-900 text-lg">
                          {shift.staff_name || 'System'}
                        </div>
                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                          {format(new Date(shift.start_time), 'PPP p')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-8">
                      <div className="text-right">
                        <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Sales</div>
                        <div className="font-black text-emerald-600 text-xl">DH{total.toFixed(2)}</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Orders</div>
                        <div className="font-black text-zinc-900 text-xl">{orders.length}</div>
                      </div>
                      <div className={`p-2 rounded-xl transition-transform duration-300 ${expandedShift === shift.id ? 'rotate-180 bg-emerald-500 text-white' : 'bg-white text-zinc-400'}`}>
                        <ChevronDown size={20} />
                      </div>
                    </div>
                  </button>

                  {expandedShift === shift.id && (
                    <div className="p-4 bg-white border-t border-zinc-100">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-50">
                              <th className="px-4 py-3">Order</th>
                              <th className="px-4 py-3">Time</th>
                              <th className="px-4 py-3">Table</th>
                              <th className="px-4 py-3">Total</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50">
                            {orders.map(order => (
                              <React.Fragment key={order.id}>
                                <tr className="hover:bg-zinc-50/50 transition-colors">
                                  <td className="px-4 py-4 font-bold text-zinc-900">#{order.id}</td>
                                  <td className="px-4 py-4 text-zinc-500 text-sm">
                                    {format(new Date(order.created_at), 'p')}
                                  </td>
                                  <td className="px-4 py-4 text-zinc-600 font-medium">
                                    {order.table_id ? tables.find(t => t.id === order.table_id)?.name : 'Takeaway'}
                                  </td>
                                  <td className="px-4 py-4 font-black text-zinc-900">DH{order.total.toFixed(2)}</td>
                                  <td className="px-4 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                                      {getStatusIcon(order.status)}
                                      {order.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <button
                                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                      className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                                    >
                                      {expandedOrder === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                  </td>
                                </tr>
                                {expandedOrder === order.id && (
                                  <tr>
                                    <td colSpan={6} className="px-4 pb-4">
                                      <div className="bg-zinc-50/50 rounded-xl border border-zinc-100 p-4 space-y-3">
                                        <div className="flex justify-between items-center mb-2">
                                          <h4 className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest">Order Details</h4>
                                          <button
                                            onClick={() => setConfirmDelete({ type: 'order', orderId: order.id })}
                                            className="text-red-500 hover:text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
                                          >
                                            <Trash2 size={12} /> Delete Order
                                          </button>
                                        </div>
                                        <div className="space-y-2">
                                          {order.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm group">
                                              <span className="text-zinc-600 font-medium">{item.quantity}x {item.name}</span>
                                              <div className="flex items-center gap-3">
                                                <span className="font-bold text-zinc-900">DH{(item.price * item.quantity).toFixed(2)}</span>
                                                <button
                                                  onClick={() => setConfirmDelete({ type: 'item', orderId: order.id, itemId: item.id })}
                                                  className="p-1 text-red-400 hover:text-red-600 transition-all"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shift Printing History */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-zinc-100">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Printer size={24} className="text-emerald-500" />
            Shift Printing History
          </h2>
          <p className="text-zinc-500 text-sm mt-1">View and print reports for past staff shifts</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Server Name</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Shift Start</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Shift End</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shifts.filter(s => s.end_time).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).map(shift => {
                const server = staff.find(s => s.id === shift.staff_id);
                return (
                  <tr key={shift.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                          <User size={16} />
                        </div>
                        <span className="font-bold text-zinc-900">{server?.name || shift.staff_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 text-sm">
                      {format(new Date(shift.start_time), 'MMM dd, HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 text-sm">
                      {shift.end_time ? format(new Date(shift.end_time), 'MMM dd, HH:mm') : 'Ongoing'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => printShiftReport(shift)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all active:scale-95"
                      >
                        <Printer size={16} />
                        Print Report
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shifts.filter(s => s.end_time).length === 0 && (
            <div className="p-12 text-center text-zinc-500">No completed shifts found.</div>
          )}
        </div>
      </div>

      {/* PIN Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-zinc-100">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 flex items-center gap-2">
            <ShieldCheck size={24} className="text-emerald-500" />
            PIN Management
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Manage staff security PINs and access codes</p>
        </div>

        <div className="p-6">
          {pinMessage && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
              pinMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {pinMessage.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
              <span className="font-medium">{pinMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(member => (
              <div key={member.id} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-zinc-900">{member.name}</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{member.role}</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-zinc-200">
                    <Key size={16} className="text-zinc-400" />
                  </div>
                </div>

                {editingPinStaffId === member.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Enter 4-digit PIN"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg outline-none focus:border-emerald-500 text-center font-mono tracking-[0.5em] text-lg"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPinStaffId(null);
                          setNewPin('');
                        }}
                        className="flex-1 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdatePin(member.id, newPin)}
                        className="flex-1 py-2 text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors"
                      >
                        Save PIN
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingPinStaffId(member.id);
                      setNewPin('');
                    }}
                    className="w-full py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-sm font-bold hover:bg-zinc-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Key size={14} />
                    Reset PIN
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Receipt Customization */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-zinc-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-zinc-900 flex items-center gap-2">
              <SettingsIcon size={24} className="text-emerald-500" />
              Receipt Customization
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Customize the information printed on customer receipts</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-emerald-500/20"
          >
            <Save size={18} />
            {isSavingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="p-6">
          {settingsMessage && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
              settingsMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {settingsMessage.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
              <span className="font-medium">{settingsMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Business Name</label>
                <input
                  type="text"
                  value={receiptSettings.receipt_name}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, receipt_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
                  placeholder="e.g. POS RUN"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Address</label>
                <input
                  type="text"
                  value={receiptSettings.receipt_address}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, receipt_address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
                  placeholder="e.g. 123 Coffee Street"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Phone Number</label>
                <input
                  type="text"
                  value={receiptSettings.receipt_phone}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, receipt_phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
                  placeholder="e.g. +123 456 789"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">WiFi Network</label>
                  <input
                    type="text"
                    value={receiptSettings.receipt_wifi_network}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, receipt_wifi_network: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g. POSRun_Guest"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">WiFi Password</label>
                  <input
                    type="text"
                    value={receiptSettings.receipt_wifi_password}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, receipt_wifi_password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g. coffee2024"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Footer Message</label>
                <textarea
                  value={receiptSettings.receipt_footer}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, receipt_footer: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 transition-all min-h-[100px]"
                  placeholder="Thank you message and social media..."
                />
              </div>
            </div>

              <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Live Preview</h3>
              <div className="bg-white shadow-lg rounded-sm p-5 mx-auto max-w-[280px] text-[10px] text-zinc-900 border border-zinc-100">
                <div className="text-center space-y-1 mb-3">
                  <div className="font-sans font-bold text-xs leading-tight">{receiptSettings.receipt_name || 'Business name'}</div>
                  <div className="font-mono text-[9px]">Order #1</div>
                  <div className="font-mono text-[9px] text-zinc-600">08/04/2026 12:52:41</div>
                  <div className="font-sans font-bold text-[10px] pt-1">Takeaway</div>
                </div>
                <div className="font-mono text-[9px] space-y-1 mb-2">
                  <div className="flex justify-between gap-2">
                    <span className="min-w-0">2x Espresso</span>
                    <span className="shrink-0">5.00 DH</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="min-w-0">1x Croissant</span>
                    <span className="shrink-0">3.00 DH</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-zinc-900 my-2" />
                <div className="flex justify-between font-sans font-bold text-[10px]">
                  <span>TOTAL</span>
                  <span>8.00 DH</span>
                </div>
                <div className="border-t border-dashed border-zinc-900 my-2" />
                {(receiptSettings.receipt_wifi_network?.trim() || receiptSettings.receipt_wifi_password?.trim()) ? (
                  <div className="text-[8px] font-mono text-left space-y-0.5 mb-2 pt-1">
                    <div className="font-sans font-bold text-center text-[9px] mb-1 tracking-wide">WIFI</div>
                    <div>Network: {receiptSettings.receipt_wifi_network?.trim() || '—'}</div>
                    <div>Password: {receiptSettings.receipt_wifi_password?.trim() || '—'}</div>
                  </div>
                ) : null}
                <div className="text-center font-sans text-[9px] pt-1">
                  {(receiptSettings.receipt_footer || 'Thank you for your visit!').split('\n')[0]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Confirm Deletion</h3>
            <p className="text-zinc-500 mb-6">
              {confirmDelete.type === 'order' 
                ? 'Are you sure you want to delete this entire order? This action cannot be undone.' 
                : 'Are you sure you want to remove this item from the order?'}
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
                  if (confirmDelete.type === 'order') {
                    await fetch(`/api/orders/${confirmDelete.orderId}`, { method: 'DELETE' });
                    setExpandedOrder(null);
                  } else if (confirmDelete.itemId) {
                    await fetch(`/api/orders/${confirmDelete.orderId}/items/${confirmDelete.itemId}`, { method: 'DELETE' });
                  }
                  setConfirmDelete(null);
                  fetchOrderHistory();
                }}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear History Safety Modal */}
      {showClearHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Clear Order History</h3>
            <p className="text-zinc-500 mb-4">
              This clears historical orders only (`completed` and `cancelled`) and keeps active orders safe.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={clearHistoryText}
                onChange={(e) => setClearHistoryText(e.target.value)}
                placeholder='Type "CLEAR HISTORY"'
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-red-400"
              />
              <input
                type="password"
                value={clearHistoryPin}
                onChange={(e) => setClearHistoryPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter your 4-digit PIN"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-red-400"
              />
              <label className="flex items-start gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={clearHistoryAcknowledge}
                  onChange={(e) => setClearHistoryAcknowledge(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I understand this operation cannot be undone.</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowClearHistoryModal(false);
                  setClearHistoryText('');
                  setClearHistoryPin('');
                  setClearHistoryAcknowledge(false);
                }}
                className="flex-1 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={isClearingHistory}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all disabled:opacity-60"
              >
                {isClearingHistory ? 'Clearing...' : 'Clear History'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
