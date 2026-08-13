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
import { Bill } from './types';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('new');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

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
        {activeTab === 'new' && (
          <BillForm 
            editingBill={editingBill} 
            onClearEdit={() => setEditingBill(null)} 
          />
        )}
        {activeTab === 'history' && (
          <BillHistory 
            onEdit={(bill) => { 
              setEditingBill(bill); 
              setActiveTab('new'); 
            }} 
          />
        )}
        {activeTab === 'settings' && <SettingsView />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChange={(tab) => {
        if (tab !== 'new') {
          setEditingBill(null); // Clear editing state if navigating away
        }
        setActiveTab(tab);
      }} />
    </div>
  );
}
