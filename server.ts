import express from 'express';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { supabase } from './src/lib/supabase';

const MENU_IMAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'menu-images';

const menuImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed'));
      return;
    }
    cb(null, true);
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json());

  // WebSocket connections
  const clients = new Set<WebSocket>();
  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    clients.add(ws);
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    ws.on('error', (err) => console.error('WebSocket error:', err));
  });

  const broadcastUpdate = (type: string, payload?: any) => {
    const message = JSON.stringify({ type, payload });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  };

  // --- API Routes ---

  // Categories
  app.get('/api/categories', async (req, res) => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/categories', async (req, res) => {
    const { name } = req.body;
    const { data, error } = await supabase.from('categories').insert([{ name }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('categories_updated');
    res.json(data);
  });

  app.put('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('categories_updated');
    res.json({ success: true });
  });

  app.delete('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('categories_updated');
    res.json({ success: true });
  });

  // Menu Items
  app.get('/api/menu-items', async (req, res) => {
    const { data, error } = await supabase.from('menu_items').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  const menuImageUploadMulter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    menuImageUpload.single('image')(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        return res.status(400).json({ error: msg });
      }
      next();
    });
  };

  const handleMenuImageUpload = async (req: express.Request, res: express.Response) => {
    try {
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      if (!file?.buffer) {
        return res.status(400).json({ error: 'No image file' });
      }
      const ext =
        file.mimetype === 'image/png'
          ? 'png'
          : file.mimetype === 'image/gif'
            ? 'gif'
            : file.mimetype === 'image/webp'
              ? 'webp'
              : 'jpg';
      const objectPath = `menu/${crypto.randomUUID()}.${ext}`;
      const { data, error } = await supabase.storage.from(MENU_IMAGE_BUCKET).upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
      if (error) {
        console.error('Supabase storage upload:', error.message);
        return res.status(500).json({
          error: error.message,
          hint: `Create a public Storage bucket named "${MENU_IMAGE_BUCKET}" in the Supabase dashboard (Storage → New bucket → Public).`,
        });
      }
      const { data: pub } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(data.path);
      res.json({ url: pub.publicUrl });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      res.status(500).json({ error: msg });
    }
  };

  /** Short path for uploads; keep legacy path for older clients */
  app.post('/api/upload', menuImageUploadMulter, handleMenuImageUpload);
  app.post('/api/menu-items/upload', menuImageUploadMulter, handleMenuImageUpload);

  app.post('/api/menu-items', async (req, res) => {
    const { category_id, name, price, image_url } = req.body;
    const image =
      image_url === '' || image_url === undefined ? null : image_url;
    const { data, error } = await supabase.from('menu_items').insert([{ category_id, name, price, image_url: image }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('menu_updated');
    res.json({ id: data.id });
  });

  app.put('/api/menu-items/:id', async (req, res) => {
    const { id } = req.params;
    const { category_id, name, price, image_url } = req.body;
    const image =
      image_url === '' || image_url === undefined ? null : image_url;
    const { error } = await supabase.from('menu_items').update({ category_id, name, price, image_url: image }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('menu_updated');
    res.json({ success: true });
  });

  app.delete('/api/menu-items/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('menu_updated');
    res.json({ success: true });
  });

  // Tables
  app.get('/api/tables', async (req, res) => {
    const { data, error } = await supabase.from('tables').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/tables', async (req, res) => {
    const { name } = req.body;
    const { data, error } = await supabase.from('tables').insert([{ name, status: 'available' }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('tables_updated');
    res.json(data);
  });

  app.put('/api/tables/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const { error } = await supabase.from('tables').update({ name }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('tables_updated');
    res.json({ success: true });
  });

  app.put('/api/tables/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { error } = await supabase.from('tables').update({ status }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('tables_updated');
    res.json({ success: true });
  });

  app.delete('/api/tables/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('tables_updated');
    res.json({ success: true });
  });

  // Orders
  app.get('/api/orders/active', async (req, res) => {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, staff(name)')
      .not('status', 'in', '("completed","cancelled")');
    
    if (ordersError) return res.status(500).json({ error: ordersError.message });

    const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*');
    if (itemsError) return res.status(500).json({ error: itemsError.message });
    
    const ordersWithItems = orders.map((o: any) => ({
      ...o,
      staff_name: o.staff?.name,
      items: orderItems.filter((i: any) => i.order_id === o.id)
    }));
    res.json(ordersWithItems);
  });

  app.get('/api/orders/history', async (req, res) => {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, staff(name)')
      .order('created_at', { ascending: false });
    
    if (ordersError) return res.status(500).json({ error: ordersError.message });

    const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*');
    if (itemsError) return res.status(500).json({ error: itemsError.message });
    
    const ordersWithItems = orders.map((o: any) => ({
      ...o,
      staff_name: o.staff?.name,
      items: orderItems.filter((i: any) => i.order_id === o.id)
    }));
    res.json(ordersWithItems);
  });

  app.post('/api/orders', async (req, res) => {
    const { table_id, staff_id, items, total } = req.body;
    
    try {
      // Find active shift for this staff
      const { data: activeShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('staff_id', staff_id)
        .is('end_time', null)
        .single();
      
      const shift_id = activeShift ? activeShift.id : null;
      
      // Calculate next shift_order_id
      let shift_order_id = 1;
      if (shift_id) {
        const { data: lastOrder } = await supabase
          .from('orders')
          .select('shift_order_id')
          .eq('shift_id', shift_id)
          .order('shift_order_id', { ascending: false })
          .limit(1)
          .single();
        
        shift_order_id = (lastOrder?.shift_order_id || 0) + 1;
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ table_id, staff_id, shift_id, shift_order_id, status: 'completed', total, created_at: new Date().toISOString() }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsToInsert = items.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsError) throw itemsError;

      if (table_id) {
        await supabase.from('tables').update({ status: 'occupied' }).eq('id', table_id);
      }
      
      broadcastUpdate('orders_updated');
      broadcastUpdate('tables_updated');
      res.json({ id: order.id, shift_order_id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, table_id } = req.body;
    
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;

      if (status === 'completed' || status === 'cancelled') {
        if (table_id) {
          await supabase.from('tables').update({ status: 'available' }).eq('id', table_id);
        }
      }
      
      broadcastUpdate('orders_updated');
      broadcastUpdate('tables_updated');
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Staff & Shifts
  app.get('/api/staff', async (req, res) => {
    const { data, error } = await supabase.from('staff').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/staff', async (req, res) => {
    const { name, role, hourly_rate, pin } = req.body;
    const { data, error } = await supabase.from('staff').insert([{ name, role, hourly_rate, pin: pin || '0000' }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('staff_updated');
    res.json({ id: data.id });
  });

  app.put('/api/staff/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role, hourly_rate, pin } = req.body;
    const { error } = await supabase.from('staff').update({ name, role, hourly_rate, pin: pin || '0000' }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('staff_updated');
    res.json({ success: true });
  });

  app.put('/api/staff/:id/pin', async (req, res) => {
    const { id } = req.params;
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'Invalid PIN. Must be 4 digits.' });
    }
    const { error } = await supabase.from('staff').update({ pin }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('staff_updated');
    res.json({ success: true });
  });

  app.delete('/api/staff/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('staff_updated');
    res.json({ success: true });
  });

  app.get('/api/shifts/active/:staffId', async (req, res) => {
    const { staffId } = req.params;
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', staffId)
      .is('end_time', null)
      .maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || null);
  });

  app.get('/api/shifts/:id/orders', async (req, res) => {
    const { id } = req.params;
    const { data: shift, error: shiftError } = await supabase.from('shifts').select('*').eq('id', id).single();
    if (shiftError) return res.status(500).json({ error: shiftError.message });

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, staff(name)')
      .eq('staff_id', shift.staff_id)
      .gte('created_at', shift.start_time)
      .lte('created_at', shift.end_time || new Date().toISOString())
      .eq('status', 'completed');

    if (ordersError) return res.status(500).json({ error: ordersError.message });

    const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*');
    if (itemsError) return res.status(500).json({ error: itemsError.message });
    
    const ordersWithItems = orders.map((o: any) => ({
      ...o,
      staff_name: o.staff?.name,
      items: orderItems.filter((i: any) => i.order_id === o.id)
    }));

    res.json(ordersWithItems);
  });

  app.get('/api/shifts', async (req, res) => {
    const { data, error } = await supabase
      .from('shifts')
      .select('*, staff(name, hourly_rate)')
      .order('start_time', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    
    const shiftsWithStaff = data.map((s: any) => ({
      ...s,
      staff_name: s.staff?.name,
      hourly_rate: s.staff?.hourly_rate
    }));
    res.json(shiftsWithStaff);
  });

  app.post('/api/shifts/open', async (req, res) => {
    const { staff_id } = req.body;
    const { data, error } = await supabase.from('shifts').insert([{ staff_id, start_time: new Date().toISOString() }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('shifts_updated');
    res.json({ id: data.id });
  });

  app.put('/api/shifts/:id/close', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('shifts').update({ end_time: new Date().toISOString() }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('shifts_updated');
    res.json({ success: true });
  });

  // Staff Payments (Advances & Salaries)
  app.get('/api/staff/payments', async (req, res) => {
    const { data, error } = await supabase
      .from('staff_payments')
      .select('*, staff(name)')
      .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    
    const paymentsWithStaff = data.map((p: any) => ({
      ...p,
      staff_name: p.staff?.name
    }));
    res.json(paymentsWithStaff);
  });

  app.post('/api/staff/payments', async (req, res) => {
    const { staff_id, amount, type, description } = req.body;
    const { data, error } = await supabase
      .from('staff_payments')
      .insert([{ staff_id, amount, type, description, created_at: new Date().toISOString() }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('staff_payments_updated');
    res.json({ id: data.id });
  });

  app.delete('/api/staff/payments/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('staff_payments').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('staff_payments_updated');
    res.json({ success: true });
  });

  app.delete('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastUpdate('orders_updated');
    res.json({ success: true });
  });

  app.delete('/api/orders/:orderId/items/:itemId', async (req, res) => {
    const { orderId, itemId } = req.params;
    
    try {
      // Get the item to adjust the total
      const { data: item } = await supabase.from('order_items').select('*').eq('id', itemId).eq('order_id', orderId).single();
      
      if (item) {
        const amountToRemove = item.price * item.quantity;
        await supabase.rpc('decrement_order_total', { order_id: orderId, amount: amountToRemove });
        await supabase.from('order_items').delete().eq('id', itemId);
        
        // If no items left, delete the order
        const { count } = await supabase.from('order_items').select('*', { count: 'exact', head: true }).eq('order_id', orderId);
        if (count === 0) {
          await supabase.from('orders').delete().eq('id', orderId);
        }
      }
      
      broadcastUpdate('orders_updated');
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports
  app.get('/api/reports/revenue', async (req, res) => {
    const { date } = req.query; // YYYY-MM-DD
    let query = supabase.from('orders').select('*').eq('status', 'completed');
    
    if (date) {
      // Filter by date (start and end of day)
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
    }
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get('/api/reports/top-items', async (req, res) => {
    // This is more complex with Supabase without a custom RPC or complex join
    // For now, we'll fetch and aggregate in JS or suggest an RPC
    const { data, error } = await supabase
      .from('order_items')
      .select('quantity, menu_items(name), orders(status)')
      .eq('orders.status', 'completed');

    if (error) return res.status(500).json({ error: error.message });

    const aggregation = data.reduce((acc: any, item: any) => {
      const name = item.menu_items.name;
      acc[name] = (acc[name] || 0) + item.quantity;
      return acc;
    }, {});

    const topItems = Object.entries(aggregation)
      .map(([name, total_sold]) => ({ name, total_sold }))
      .sort((a: any, b: any) => b.total_sold - a.total_sold)
      .slice(0, 5);

    res.json(topItems);
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) return res.status(500).json({ error: error.message });
    
    const settingsMap = data.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post('/api/settings', async (req, res) => {
    const settings = req.body;
    const upsertData = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value)
    }));
    
    const { error } = await supabase.from('settings').upsert(upsertData);
    if (error) return res.status(500).json({ error: error.message });
    
    broadcastUpdate('settings_updated');
    res.json({ success: true });
  });

  // Vite middleware for development — do not let Vite handle /api (avoids 404 on API routes)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const appRoot = process.env.APP_ROOT || process.cwd();
    const distPath = path.join(appRoot, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
