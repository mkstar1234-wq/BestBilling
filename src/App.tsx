/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { BillForm } from './components/BillForm';
import { BillHistory } from './components/BillHistory';
import { SettingsView } from './components/SettingsView';
import { setupRealtimeSync, getLocalSettings } from './lib/offlineSync';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('new');

  useEffect(() => {
    // Start realtime sync for when the app is online to receive remote updates
    setupRealtimeSync();

    // Check dark mode preference on load
    const loadTheme = async () => {
      const settings = await getLocalSettings();
      if (settings?.preferences?.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    loadTheme();
  }, []);

  return (
    <div className="max-w-md mx-auto h-[100dvh] relative overflow-hidden bg-gray-50 dark:bg-gray-900 dark:text-gray-100 shadow-2xl ring-1 ring-gray-900/5">
      {/* Tab Content Rendering */}
      <div className="h-full overflow-hidden pb-16">
        {activeTab === 'new' && <BillForm />}
        {activeTab === 'history' && <BillHistory />}
        {activeTab === 'settings' && <SettingsView />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
