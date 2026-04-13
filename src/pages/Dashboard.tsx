import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingUp, Users, ShoppingBag, Calendar, Star, Banknote, Wallet } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { activeOrders, staff, shifts, shiftExpenses } = useAppStore();
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [dailyOrders, setDailyOrders] = useState(0);
  const [topItems, setTopItems] = useState<any[]>([]);

  const getLocalDayRange = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchRevenueForDate = async (dateStr: string) => {
    try {
      const { start, end } = getLocalDayRange(dateStr);
      const params = new URLSearchParams({ start, end });
      const res = await fetch(`/api/reports/revenue?${params.toString()}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('fetchRevenueForDate error:', err);
      return [];
    }
  };

  const getExpensesForDate = (dateStr: string) => {
    return shiftExpenses.filter(e => {
      const eDate = e.expense_date || format(new Date(e.created_at), 'yyyy-MM-dd');
      return eDate === dateStr;
    }).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  };

  useEffect(() => {
    const fetchStats = async () => {
      const data = await fetchRevenueForDate(selectedDate);
      setDailyRevenue(data.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0));
      setDailyOrders(data.length);
      setDailyExpenses(getExpensesForDate(selectedDate));
    };
    const fetchTopItems = async () => {
      try {
        const res = await fetch('/api/reports/top-items');
        const data = await res.json();
        if (Array.isArray(data)) setTopItems(data);
      } catch (err) {
        console.error('fetchTopItems error:', err);
      }
    };
    fetchStats();
    fetchTopItems();
  }, [selectedDate, activeOrders, shiftExpenses]); // Re-fetch when active orders or expenses change

  useEffect(() => {
    const generateChartData = async () => {
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const date = format(day, 'yyyy-MM-dd');
        const orders = await fetchRevenueForDate(date);
        data.push({
          name: format(day, 'EEE'),
          revenue: orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0),
          orders: orders.length
        });
      }
      setRevenueData(data);
    };
    generateChartData();
  }, [activeOrders]);

  const activeStaff = shifts.filter(s => !s.end_time).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Overview of your coffee shop's performance</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-zinc-200 w-full md:w-auto">
          <Calendar size={20} className="text-zinc-400" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none outline-none text-zinc-700 font-medium flex-1 md:flex-none"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-zinc-500">Gross Revenue</p>
            <h3 className="text-xl md:text-2xl font-bold text-zinc-900">DH{(dailyRevenue).toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <Banknote size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-zinc-500">Expenses</p>
            <h3 className="text-xl md:text-2xl font-bold text-red-600">DH{(dailyExpenses).toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-zinc-900 p-5 md:p-6 rounded-2xl shadow-xl border border-zinc-800 flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <Wallet size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-zinc-400">Net Revenue</p>
            <h3 className="text-xl md:text-2xl font-bold text-white">DH{(dailyRevenue - dailyExpenses).toFixed(2)}</h3>
          </div>
        </div>
        
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <ShoppingBag size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-zinc-500">Total Orders</p>
            <h3 className="text-xl md:text-2xl font-bold text-zinc-900">{dailyOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-zinc-500">Active Staff</p>
            <h3 className="text-xl md:text-2xl font-bold text-zinc-900">{activeStaff} / {staff.length}</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100 min-w-0">
          <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-6">Revenue (Last 7 Days)</h3>
          <div className="h-64 md:h-72 min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dx={-10} tickFormatter={(value) => `DH${value}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`DH${value.toFixed(2)}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100 min-w-0">
          <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-6">Orders Volume (Last 7 Days)</h3>
          <div className="h-64 md:h-72 min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f4f4f5' }}
                  formatter={(value: number) => [value, 'Orders']}
                />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Items */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <Star size={20} className="text-amber-500" />
          Top Selling Items (All Time)
        </h3>
        <div className="space-y-3 md:space-y-4">
          {topItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 md:p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center font-bold text-xs md:text-sm shrink-0">
                  #{index + 1}
                </div>
                <span className="font-medium text-zinc-900 text-sm md:text-base">{item.name}</span>
              </div>
              <div className="text-zinc-500 font-medium text-sm md:text-base">
                {item.total_sold} sold
              </div>
            </div>
          ))}
          {topItems.length === 0 && (
            <div className="text-center text-zinc-500 py-4">No sales data available yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
