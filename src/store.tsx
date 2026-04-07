import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Category, MenuItem, Table, Order, Staff, Shift, StaffPayment, ShiftExpense } from './types';

interface AppState {
  categories: Category[];
  menuItems: MenuItem[];
  tables: Table[];
  activeOrders: Order[];
  staff: Staff[];
  shifts: Shift[];
  shiftExpenses: ShiftExpense[];
  staffPayments: StaffPayment[];
  settings: Record<string, string>;
  currentUser: Staff | null;
  setCurrentUser: (user: Staff | null) => void;
  startShift: (staffId: number) => Promise<void>;
  endShift: (staffId: number) => Promise<void>;
  updateSettings: (settings: Record<string, string>) => Promise<void>;
  refreshData: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftExpenses, setShiftExpenses] = useState<ShiftExpense[]>([]);
  const [staffPayments, setStaffPayments] = useState<StaffPayment[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);

  const wsShuttingDown = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    setCategories(await res.json());
  };

  const fetchMenuItems = async () => {
    const res = await fetch('/api/menu-items');
    setMenuItems(await res.json());
  };

  const fetchTables = async () => {
    const res = await fetch('/api/tables');
    setTables(await res.json());
  };

  const fetchActiveOrders = async () => {
    const res = await fetch('/api/orders/active');
    setActiveOrders(await res.json());
  };

  const fetchStaff = async () => {
    const res = await fetch('/api/staff');
    setStaff(await res.json());
  };

  const fetchShifts = async () => {
    const res = await fetch('/api/shifts');
    setShifts(await res.json());
  };

  const fetchShiftExpenses = async () => {
    const res = await fetch('/api/shift-expenses');
    setShiftExpenses(await res.json());
  };

  const fetchStaffPayments = async () => {
    const res = await fetch('/api/staff/payments');
    setStaffPayments(await res.json());
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    setSettings(await res.json());
  };

  const updateSettings = async (newSettings: Record<string, string>) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
  };

  const startShift = async (staffId: number) => {
    try {
      const activeRes = await fetch(`/api/shifts/active/${staffId}`);
      const contentType = activeRes.headers.get("content-type");
      if (!activeRes.ok || !contentType || !contentType.includes("application/json")) {
        const text = await activeRes.text();
        console.error(`Active shift fetch failed (startShift): ${activeRes.status} ${activeRes.statusText}`, text);
        throw new Error(`Failed to check active shift: ${activeRes.status}`);
      }
      const activeShift = await activeRes.json();
      
      if (!activeShift) {
        const openRes = await fetch('/api/shifts/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: staffId })
        });
        if (!openRes.ok) {
          const text = await openRes.text();
          console.error(`Open shift fetch failed: ${openRes.status} ${openRes.statusText}`, text);
          throw new Error(`Failed to open shift: ${openRes.status}`);
        }
      }
    } catch (err) {
      console.error('startShift error:', err);
      throw err;
    }
  };

  const endShift = async (staffId: number) => {
    try {
      const activeRes = await fetch(`/api/shifts/active/${staffId}`);
      const contentType = activeRes.headers.get("content-type");
      if (!activeRes.ok || !contentType || !contentType.includes("application/json")) {
        const text = await activeRes.text();
        console.error(`Active shift fetch failed (endShift): ${activeRes.status} ${activeRes.statusText}`, text);
        throw new Error(`Failed to check active shift: ${activeRes.status}`);
      }
      const activeShift = await activeRes.json();
      
      if (activeShift) {
        const closeRes = await fetch(`/api/shifts/${activeShift.id}/close`, {
          method: 'PUT'
        });
        if (!closeRes.ok) {
          const text = await closeRes.text();
          console.error(`Close shift fetch failed: ${closeRes.status} ${closeRes.statusText}`, text);
          throw new Error(`Failed to close shift: ${closeRes.status}`);
        }
      }
    } catch (err) {
      console.error('endShift error:', err);
      throw err;
    }
  };

  const refreshData = () => {
    fetchCategories();
    fetchMenuItems();
    fetchTables();
    fetchActiveOrders();
    fetchStaff();
    fetchShifts();
    fetchShiftExpenses();
    fetchStaffPayments();
    fetchSettings();
  };

  useEffect(() => {
    refreshData();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (wsShuttingDown.current) return;
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to App WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'categories_updated':
              fetchCategories();
              break;
            case 'menu_updated':
              fetchMenuItems();
              break;
            case 'tables_updated':
              fetchTables();
              break;
            case 'orders_updated':
              fetchActiveOrders();
              break;
            case 'staff_updated':
              fetchStaff();
              break;
            case 'shifts_updated':
              fetchShifts();
              break;
            case 'shift_expenses_updated':
              fetchShiftExpenses();
              break;
            case 'staff_payments_updated':
              fetchStaffPayments();
              break;
            case 'settings_updated':
              fetchSettings();
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        if (!wsShuttingDown.current) {
          console.error('App WebSocket error:', error);
        }
      };

      ws.onclose = () => {
        if (wsShuttingDown.current) return;
        console.log('App WebSocket disconnected, reconnecting in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    wsShuttingDown.current = false;
    connect();

    return () => {
      wsShuttingDown.current = true;
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  return (
    <AppContext.Provider value={{ 
      categories, 
      menuItems, 
      tables, 
      activeOrders, 
      staff, 
      shifts, 
      shiftExpenses,
      staffPayments, 
      settings,
      currentUser, 
      setCurrentUser, 
      startShift,
      endShift,
      updateSettings,
      refreshData 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
