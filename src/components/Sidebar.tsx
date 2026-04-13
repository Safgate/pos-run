import React, { useState } from 'react';
import { Coffee, LayoutDashboard, Menu as MenuIcon, Users, LogOut, User, Settings as SettingsIcon, Key, XCircle, CheckCircle, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAppStore } from '../store';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { currentUser, setCurrentUser, endShift } = useAppStore();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEndShiftAndLogout = async () => {
    if (currentUser) {
      await endShift(currentUser.id);
      setCurrentUser(null);
      setIsLogoutModalOpen(false);
    }
  };

  const handleUpdatePin = async () => {
    if (!currentUser) return;
    if (!/^\d{4}$/.test(newPin)) {
      setPinMessage({ text: 'PIN must be 4 digits', type: 'error' });
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/staff/${currentUser.id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin })
      });

      if (res.ok) {
        setPinMessage({ text: 'PIN updated successfully!', type: 'success' });
        setTimeout(() => {
          setIsPinModalOpen(false);
          setPinMessage(null);
          setNewPin('');
        }, 2000);
      } else {
        const data = await res.json();
        setPinMessage({ text: data.error || 'Update failed', type: 'error' });
      }
    } catch (error) {
      setPinMessage({ text: 'Network error', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const navItems = [
    { id: 'pos', label: 'POS', icon: Coffee },
    { id: 'myshift', label: 'My Shift', icon: Clock },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Manager', 'Admin'] },
    { id: 'menu', label: 'Menu', icon: MenuIcon, roles: ['Manager', 'Admin'] },
    { id: 'staff', label: 'Staff', icon: Users, roles: ['Manager', 'Admin'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['Manager', 'Admin'] },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    if (!currentUser) return false;
    const userRole = (currentUser.role || '').toLowerCase();
    return item.roles.some(r => r.toLowerCase() === userRole) || userRole === 'admin' || userRole === 'manager';
  });

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-20 hover:w-64 bg-zinc-900 text-zinc-300 flex-col h-full border-r border-zinc-800 transition-all duration-300 group overflow-hidden z-30">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800 min-w-[256px]">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            PR
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">POS Run</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 min-w-[256px]">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left",
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-400 font-medium" 
                    : "hover:bg-zinc-800 hover:text-white"
                )}
              >
                <Icon size={20} className={cn("shrink-0", isActive ? "text-emerald-400" : "text-zinc-400")} />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        
        {currentUser && (
          <div className="p-4 border-t border-zinc-800 min-w-[256px]">
            <div className="flex items-center justify-between bg-zinc-800/50 p-3 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPinModalOpen(true)}
                  className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-zinc-300 shrink-0 hover:bg-emerald-500 hover:text-white transition-colors"
                  title="Change PIN"
                >
                  <Key size={16} />
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">{currentUser.name}</div>
                  <div className="text-xs text-zinc-400">{currentUser.role}</div>
                </div>
              </div>
              <button 
                onClick={() => setIsLogoutModalOpen(true)}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Logout Options"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50 px-2 pb-safe">
        <div className="flex justify-around items-center h-16">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg transition-colors min-w-[64px]",
                  isActive ? "text-emerald-400" : "text-zinc-500"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
              </button>
            );
          })}
          {currentUser && (
            <>
              <button 
                onClick={() => setIsPinModalOpen(true)}
                className="flex flex-col items-center justify-center gap-1 px-2 py-1 text-zinc-500 min-w-[64px]"
              >
                <Key size={20} />
                <span className="text-[10px] font-medium uppercase tracking-wider">PIN</span>
              </button>
              <button 
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex flex-col items-center justify-center gap-1 px-2 py-1 text-zinc-500 min-w-[64px]"
              >
                <LogOut size={20} />
                <span className="text-[10px] font-medium uppercase tracking-wider">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Change PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-zinc-900">Change PIN</h3>
              <button onClick={() => setIsPinModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900">
                <XCircle size={24} />
              </button>
            </div>

            {pinMessage && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                pinMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {pinMessage.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                <span className="text-sm font-medium">{pinMessage.text}</span>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">New 4-Digit PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl outline-none focus:border-emerald-500 text-center font-mono text-3xl tracking-[0.5em]"
                  placeholder="0000"
                  autoFocus
                />
              </div>

              <button
                onClick={handleUpdatePin}
                disabled={isUpdating || newPin.length !== 4}
                className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-zinc-900/20"
              >
                {isUpdating ? 'Updating...' : 'Update PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Logout Options Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-zinc-900">Logout Options</h3>
              <button onClick={() => setIsLogoutModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900">
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setCurrentUser(null);
                  setIsLogoutModalOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 shadow-sm">
                  <LogOut size={24} className="rotate-180" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-zinc-900">Quick Logout</div>
                  <div className="text-xs text-zinc-500">Keep shift active for later</div>
                </div>
              </button>

              <button
                onClick={handleEndShiftAndLogout}
                className="w-full flex items-center gap-4 p-4 bg-red-50 border-2 border-red-100 rounded-2xl hover:border-red-500 hover:bg-red-100/50 transition-all group"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-400 shadow-sm">
                  <Clock size={24} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-red-600">End Shift & Logout</div>
                  <div className="text-xs text-red-500">Clock out and finish workday</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
