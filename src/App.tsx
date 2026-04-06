/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store';
import { Sidebar } from './components/Sidebar';
import { POS } from './pages/POS';
import { Dashboard } from './pages/Dashboard';
import { Menu } from './pages/Menu';
import { Staff } from './pages/Staff';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';

const MainApp = () => {
  const { currentUser } = useAppStore();
  const [currentTab, setCurrentTab] = useState('pos');

  React.useEffect(() => {
    if (currentUser) {
      setCurrentTab('pos');
    }
  }, [currentUser]);

  if (!currentUser) {
    return <Login />;
  }

  const isManagerOrAdmin = currentUser.role === 'Manager' || currentUser.role === 'Admin';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-100 font-sans overflow-hidden">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {currentTab === 'pos' && <POS />}
        {currentTab === 'dashboard' && isManagerOrAdmin && <Dashboard />}
        {currentTab === 'menu' && isManagerOrAdmin && <Menu />}
        {currentTab === 'staff' && isManagerOrAdmin && <Staff />}
        {currentTab === 'settings' && isManagerOrAdmin && <Settings />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

