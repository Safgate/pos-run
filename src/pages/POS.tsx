import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { MenuItem, OrderItem, Table } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, XCircle, Coffee, Search } from 'lucide-react';

export const POS: React.FC = () => {
  const { categories, menuItems, tables, currentUser, settings } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (selectedCategory !== null) {
      items = items.filter(item => item.category_id === selectedCategory);
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => item.name.toLowerCase().includes(query));
    }
    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menu_item_id === item.id);
      if (existing) {
        return prev.map(i => i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menu_item_id: item.id, quantity: 1, price: item.price, name: item.name }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.menu_item_id === id) {
        const newQuantity = i.quantity + delta;
        return newQuantity > 0 ? { ...i, quantity: newQuantity } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.menu_item_id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const printReceipt = (orderData: any, orderNumber: number) => {
    const tableName = selectedTable 
      ? tables.find(t => t.id === selectedTable)?.name 
      : 'Takeaway';

    const date = new Date().toLocaleString();

    const receiptName = settings.receipt_name || 'BILBAO COFFEE';
    const receiptAddress = settings.receipt_address || '123 Coffee Street, Bilbao';
    const receiptPhone = settings.receipt_phone || '+123 456 789';
    const wifiNetwork = settings.receipt_wifi_network || 'Bilbao_Guest';
    const wifiPassword = settings.receipt_wifi_password || 'coffee2024';
    const receiptFooter = settings.receipt_footer || 'Thank you for choosing Bilbao Coffee!\nFollow us @bilbaocoffee';

    const styles = `
      /* 72mm roll width; auto height avoids drivers shrinking content to fit a short page */
      @page { size: 72mm auto; margin: 0; }
      html { -webkit-text-size-adjust: 100%; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: 'Courier New', Courier, monospace;
        box-sizing: border-box;
        width: 72mm;
        max-width: 72mm;
        margin: 0 auto;
        padding: 4mm 3mm;
        font-size: 14pt;
        line-height: 1.35;
        color: #000;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .mb-1 { margin-bottom: 3pt; }
      .mb-2 { margin-bottom: 6pt; }
      .mb-4 { margin-bottom: 10pt; }
      .mt-4 { margin-top: 10pt; }
      .flex { display: flex; justify-content: space-between; gap: 4pt; }
      .border-b { border-bottom: 1px dashed #000; padding-bottom: 8pt; margin-bottom: 8pt; }
      .bold { font-weight: bold; }
      .header { font-size: 20pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5pt; line-height: 1.15; }
      .sub { font-size: 12pt; color: #333; }
      .order-no { font-size: 17pt; }
      .table-pill { font-size: 15pt; padding: 5pt 6pt; }
      .line-row { font-size: 14pt; }
      .total-row { font-size: 17pt; margin-top: 8pt; }
      .wifi-box { border: 1px solid #000; padding: 8pt; margin-top: 12pt; font-size: 12pt; }
      .footer-note { font-size: 11pt; font-style: italic; }
      .whitespace-pre { white-space: pre-line; }
      @media print {
        @page { margin: 0; size: 72mm auto; }
        html, body {
          width: 72mm !important;
          max-width: 72mm !important;
          margin: 0 !important;
          transform: none !important;
          zoom: 1 !important;
        }
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    `;

    const bodyHtml = `
      <div class="text-center mb-4">
        <div class="header mb-1">${receiptName}</div>
        <div class="mb-1 sub">${receiptAddress}</div>
        <div class="mb-2 sub">Tel: ${receiptPhone}</div>
        <div class="border-b"></div>
        <div class="bold order-no">ORDER #${orderNumber}</div>
        <div class="sub" style="color:#666;">${date}</div>
        ${currentUser ? `<div class="sub">Server: ${currentUser.name}</div>` : ''}
        <div class="bold mt-4 table-pill" style="background: #000; color: #fff;">${tableName}</div>
      </div>
      <div class="border-b">
        ${orderData.items.map((item: any) => `
          <div class="flex mb-1 line-row">
            <div>${item.quantity}x ${item.name}</div>
            <div>DH${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
      <div class="flex bold total-row">
        <div>TOTAL</div>
        <div>DH${orderData.total.toFixed(2)}</div>
      </div>
      <div class="text-center mt-4">
        <div class="wifi-box">
          <div class="bold">WIFI ACCESS</div>
          <div>Network: ${wifiNetwork}</div>
          <div>Password: ${wifiPassword}</div>
        </div>
      </div>
      <div class="text-center mt-4 whitespace-pre footer-note">
        ${receiptFooter}
      </div>
    `;

    const htmlDocument = (includePrintScript: boolean) => `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt</title>
          <style>${styles}</style>
        </head>
        <body>
          ${bodyHtml}
          ${includePrintScript ? `
          <script>
            window.onload = function () {
              window.focus();
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>` : ''}
        </body>
      </html>
    `;

    const receiptHtml = htmlDocument(false);

    // Electron: silent print via main process (no system print dialog)
    if (window.electronAPI?.printReceiptSilent) {
      void window.electronAPI.printReceiptSilent(receiptHtml).then((r) => {
        if (!r.success) {
          console.error('Silent print failed:', r.error);
          alert(
            `Could not print receipt: ${r.error || 'unknown error'}\n\n` +
              'If the wrong printer is used, set RECEIPT_PRINTER_NAME in .env to the exact name from your OS printer list.'
          );
        }
      });
      return;
    }

    // Browser / non-Electron: show print dialog
    const printWin = window.open('', '_blank', 'popup=yes,width=360,height=640');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlDocument(true));
      printWin.document.close();
      return;
    }

    // Fallback: iframe must NOT be 0×0
    const iframe = document.createElement('iframe');
    iframe.setAttribute(
      'style',
      'position:fixed;left:-9999px;top:0;width:72mm;min-height:120mm;height:auto;border:0;opacity:0;pointer-events:none;z-index:-1'
    );
    document.body.appendChild(iframe);

    const w = iframe.contentWindow;
    const doc = w?.document || iframe.contentDocument;
    if (!doc || !w) {
      document.body.removeChild(iframe);
      console.error('Receipt print: could not create print frame');
      return;
    }

    doc.open();
    doc.write(htmlDocument(false));
    doc.close();

    const doPrint = () => {
      try {
        w.focus();
        w.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      }
    };

    setTimeout(doPrint, 150);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTable,
          staff_id: currentUser?.id,
          items: cart,
          total: cartTotal
        })
      });
      
      const data = await res.json();
      
      // Print receipt
      printReceipt({ items: cart, total: cartTotal }, data.shift_order_id || data.id);

      setCart([]);
      setSelectedTable(null);
      setIsCartOpen(false);
    } catch (error) {
      console.error('Failed to place order', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full bg-zinc-50 relative">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Categories & Search */}
        <div className="bg-white border-b border-zinc-200 p-4 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-6 py-2.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null 
                  ? 'bg-zinc-900 text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              All Items
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id 
                    ? 'bg-zinc-900 text-white' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-zinc-100 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mb-3 md:mb-4 bg-zinc-100">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <Coffee size={28} />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-zinc-800 mb-1 text-sm md:text-base line-clamp-1">{item.name}</h3>
                <p className="text-emerald-600 font-bold text-sm md:text-base">DH{(item.price).toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Cart FAB */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="md:hidden fixed right-6 bottom-24 bg-emerald-500 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/40 z-40 active:scale-90 transition-transform"
      >
        <div className="relative">
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-emerald-500">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </div>
      </button>

      {/* Right Sidebar - Cart */}
      <div className={`
        fixed inset-0 z-50 md:relative md:inset-auto md:flex
        w-full md:w-96 bg-white border-l border-zinc-200 flex flex-col h-full shadow-xl
        transition-transform duration-300 ease-in-out
        ${isCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCartOpen(false)}
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-zinc-900"
            >
              <XCircle size={24} />
            </button>
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <ShoppingCart size={24} className="text-emerald-500" />
              Current Order
            </h2>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} items
          </span>
        </div>

        {/* Table Selection */}
        <div className="p-4 border-b border-zinc-100 bg-zinc-50">
          <label className="block text-sm font-medium text-zinc-700 mb-2">Select Table (Optional)</label>
          <select
            value={selectedTable || ''}
            onChange={(e) => setSelectedTable(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            <option value="">Takeaway / No Table</option>
            {tables.filter(t => t.status === 'available').map(table => (
              <option key={table.id} value={table.id}>{table.name}</option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.menu_item_id} className="flex items-center justify-between bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <div className="flex-1">
                  <h4 className="font-medium text-zinc-900 text-sm md:text-base">{item.name}</h4>
                  <p className="text-emerald-600 font-semibold text-sm">DH{(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <button onClick={() => updateQuantity(item.menu_item_id, -1)} className="p-1.5 bg-white rounded-full text-zinc-500 hover:text-zinc-900 shadow-sm border border-zinc-200">
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menu_item_id, 1)} className="p-1.5 bg-white rounded-full text-zinc-500 hover:text-zinc-900 shadow-sm border border-zinc-200">
                    <Plus size={14} />
                  </button>
                  <button onClick={() => removeFromCart(item.menu_item_id)} className="p-1.5 ml-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div className="p-5 bg-zinc-50 border-t border-zinc-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-500 font-medium">Total</span>
            <span className="text-2xl md:text-3xl font-bold text-zinc-900">DH{(cartTotal).toFixed(2)}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={cart.length === 0 || isProcessing}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98]"
          >
            {isProcessing ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
};
