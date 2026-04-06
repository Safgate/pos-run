import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { Plus, Edit2, Trash2, Coffee, Upload, X } from 'lucide-react';

export const Menu: React.FC = () => {
  const { categories, menuItems } = useAppStore();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', category_id: categories[0]?.id || '', image_url: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'category' | 'item', id: number } | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const resetItemForm = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    setClearImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    if (editingCategoryId) {
      await fetch(`/api/categories/${editingCategoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName })
      });
    } else {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName })
      });
    }

    setNewCategoryName('');
    setIsAddingCategory(false);
    setEditingCategoryId(null);
  };

  const startEditingCategory = (category: any) => {
    setNewCategoryName(category.name);
    setEditingCategoryId(category.id);
    setIsAddingCategory(true);
  };

  const handleDeleteCategory = async (id: number) => {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price || !newItem.category_id) return;

    let image_url: string | null;
    if (clearImage) {
      image_url = null;
    } else if (imageFile) {
      const fd = new FormData();
      fd.append('image', imageFile);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert([body.error, body.hint].filter(Boolean).join('\n') || 'Image upload failed');
        return;
      }
      image_url = body.url as string;
    } else {
      image_url = newItem.image_url ? newItem.image_url : null;
    }

    const payload = {
      name: newItem.name,
      price: parseFloat(newItem.price),
      category_id: parseInt(newItem.category_id.toString(), 10),
      image_url
    };

    if (editingItemId) {
      await fetch(`/api/menu-items/${editingItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    resetItemForm();
    setNewItem({ name: '', price: '', category_id: categories[0]?.id || '', image_url: '' });
    setIsAddingItem(false);
    setEditingItemId(null);
  };

  const startEditingItem = (item: any) => {
    resetItemForm();
    setNewItem({
      name: item.name,
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || ''
    });
    setImagePreview(item.image_url || null);
    setEditingItemId(item.id);
    setIsAddingItem(true);
  };

  const handleDeleteItem = async (id: number) => {
    await fetch(`/api/menu-items/${id}`, { method: 'DELETE' });
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setClearImage(false);
    setImageFile(f);
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(f));
  };

  const removeImage = () => {
    setClearImage(true);
    setImageFile(null);
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setNewItem((prev) => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showImage = !clearImage && (imagePreview || (editingItemId && newItem.image_url));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">Menu Management</h1>
        <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage categories and menu items</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Categories */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg md:text-xl font-bold text-zinc-900">Categories</h2>
            <button
              onClick={() => {
                setEditingCategoryId(null);
                setNewCategoryName('');
                setIsAddingCategory(true);
              }}
              className="p-2 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {isAddingCategory && (
            <form onSubmit={handleAddCategory} className="mb-4 flex flex-col gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category Name"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600">
                  {editingCategoryId ? 'Update' : 'Add'}
                </button>
                <button type="button" onClick={() => { setIsAddingCategory(false); setEditingCategoryId(null); }} className="flex-1 bg-zinc-100 text-zinc-600 px-4 py-2 rounded-lg font-medium hover:bg-zinc-200">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {categories.map(category => (
              <div key={category.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                <span className="font-medium text-zinc-800 text-sm md:text-base">{category.name}</span>
                <div className="flex md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditingCategory(category)}
                    className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'category', id: category.id })}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg md:text-xl font-bold text-zinc-900">Menu Items</h2>
            <button
              onClick={() => {
                setEditingItemId(null);
                resetItemForm();
                setNewItem({ name: '', price: '', category_id: categories[0]?.id || '', image_url: '' });
                setIsAddingItem(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20"
            >
              <Plus size={20} /> Add Item
            </button>
          </div>

          {isAddingItem && (
            <form onSubmit={handleAddItem} className="mb-8 bg-zinc-50 p-4 md:p-6 rounded-xl border border-zinc-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                  <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Price (DH)</label>
                  <input required type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
                  <select required value={newItem.category_id} onChange={e => setNewItem({ ...newItem, category_id: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Photo (optional)</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-28 h-28 rounded-xl overflow-hidden bg-zinc-200 border border-zinc-300 flex-shrink-0 flex items-center justify-center">
                      {showImage ? (
                        <img
                          src={imagePreview || newItem.image_url || ''}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Coffee className="w-10 h-10 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        id="menu-item-photo"
                        onChange={onPickImage}
                      />
                      <label
                        htmlFor="menu-item-photo"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors w-fit"
                      >
                        <Upload size={18} />
                        Choose photo
                      </label>
                      <p className="text-xs text-zinc-500">JPEG, PNG, GIF or WebP · max 5 MB</p>
                      {(showImage || imageFile) && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 w-fit"
                        >
                          <X size={16} />
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetItemForm();
                    setIsAddingItem(false);
                    setEditingItemId(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 text-zinc-600 font-medium hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 sm:flex-none px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors">
                  {editingItemId ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100 group">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden bg-zinc-200 flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <Coffee size={20} className="md:w-6 md:h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-zinc-900 truncate text-sm md:text-base">{item.name}</h4>
                  <p className="text-xs md:text-sm text-zinc-500">{categories.find(c => c.id === item.category_id)?.name}</p>
                  <p className="text-emerald-600 font-semibold mt-1 text-sm md:text-base">DH{(item.price).toFixed(2)}</p>
                </div>
                <div className="flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => startEditingItem(item)}
                    className="p-1.5 md:p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"
                  >
                    <Edit2 size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'item', id: item.id })}
                    className="p-1.5 md:p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Confirm Deletion</h3>
            <p className="text-zinc-500 mb-6">
              {confirmDelete.type === 'category'
                ? 'Are you sure? This will delete all items in this category. This action cannot be undone.'
                : 'Are you sure you want to delete this item?'}
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
                  if (confirmDelete.type === 'category') {
                    await handleDeleteCategory(confirmDelete.id);
                  } else {
                    await handleDeleteItem(confirmDelete.id);
                  }
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
