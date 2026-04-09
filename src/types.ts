export interface Category {
  id: number;
  name: string;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  price: number;
  image_url: string | null;
}

export interface Table {
  id: number;
  name: string;
  status: 'available' | 'occupied';
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  menu_item_id: number;
  quantity: number;
  price: number;
  name?: string; // For UI
}

export interface Order {
  id: number;
  table_id: number | null;
  staff_id: number | null;
  staff_name?: string;
  status: 'pending' | 'completed' | 'cancelled';
  total: number;
  created_at: string;
  items: OrderItem[];
}

export interface Staff {
  id: number;
  name: string;
  role: string;
  hourly_rate: number;
  pin: string;
}

export interface Shift {
  id: number;
  staff_id: number;
  start_time: string;
  end_time: string | null;
  staff_name?: string;
}

export interface StaffPayment {
  id: number;
  staff_id: number;
  amount: number;
  type: 'advance' | 'salary' | 'bonus';
  description: string;
  created_at: string;
  staff_name?: string;
}

/** Operating / daily expenses recorded against a shift */
export interface ShiftExpense {
  id: number;
  shift_id: number;
  amount: number;
  description: string;
  expense_date: string;
  created_at: string;
}
