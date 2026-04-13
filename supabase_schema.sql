-- Enable RLS
-- (Optional: You can enable RLS and set policies later)

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL
);

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT
);

-- Tables Table
CREATE TABLE IF NOT EXISTS tables (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' -- available, occupied
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  pin TEXT DEFAULT '0000'
);

-- Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  staff_id BIGINT REFERENCES staff(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  table_id BIGINT REFERENCES tables(id) ON DELETE SET NULL,
  staff_id BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  shift_id BIGINT REFERENCES shifts(id) ON DELETE SET NULL,
  shift_order_id INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, cancelled
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

-- Staff Payments Table
CREATE TABLE IF NOT EXISTS staff_payments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  staff_id BIGINT REFERENCES staff(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL, -- advance, salary, bonus
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shift Expenses Table
CREATE TABLE IF NOT EXISTS shift_expenses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  shift_id BIGINT REFERENCES shifts(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL DEFAULT '',
  expense_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Function to decrement order total
CREATE OR REPLACE FUNCTION decrement_order_total(order_id BIGINT, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE orders
  SET total = total - amount
  WHERE id = order_id;
END;
$$ LANGUAGE plpgsql;

-- Seed initial settings
INSERT INTO settings (key, value) VALUES 
('receipt_name', 'BILBAO COFFEE'),
('receipt_address', '123 Coffee Street, Bilbao'),
('receipt_phone', '+123 456 789'),
('receipt_wifi_network', 'Bilbao_Guest'),
('receipt_wifi_password', 'coffee2024'),
('receipt_footer', 'Thank you for choosing Bilbao Coffee!\nFollow us @bilbaocoffee')
ON CONFLICT (key) DO NOTHING;

-- Seed initial staff
INSERT INTO staff (name, role, hourly_rate, pin) VALUES 
('Admin', 'Manager', 0.00, '0000'),
('Alice', 'Manager', 25.00, '1234'),
('Bob', 'Barista', 18.00, '5678'),
('Charlie', 'Barista', 18.00, '9012')
ON CONFLICT DO NOTHING;

-- Seed initial categories
INSERT INTO categories (name) VALUES 
('Coffee'),
('Pastries')
ON CONFLICT DO NOTHING;

-- Seed initial tables
INSERT INTO tables (name, status) VALUES 
('Table 1', 'available'),
('Table 2', 'available'),
('Table 3', 'available'),
('Table 4', 'available'),
('Table 5', 'available'),
('Table 6', 'available')
ON CONFLICT DO NOTHING;

-- Create a view that automatically calculates popularity (total quantity sold)
CREATE OR REPLACE VIEW menu_items_with_popularity AS
SELECT 
    m.*,
    COALESCE((
        SELECT SUM(quantity)
        FROM order_items
        WHERE menu_item_id = m.id
    ), 0) as popularity
FROM menu_items m;

-- Ensure the view is accessible
ALTER VIEW menu_items_with_popularity OWNER TO postgres;
