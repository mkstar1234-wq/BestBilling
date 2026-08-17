/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { BillForm } from './components/BillForm';
import { BillHistory } from './components/BillHistory';
import { SettingsView } from './components/SettingsView';
import { LoginScreen } from './components/LoginScreen';
import { setupRealtimeSync, getLocalSettings, registerNetworkSyncListeners } from './lib/offlineSync';
import { useAuth } from './lib/auth';
import { Bill } from './types';
import './index.css';

export default function App() {
  const { user, loading, error, signInWithGoogle, logout, allowedEmail } = useAuth();
  const [activeTab, setActiveTab] = useState('new');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  useEffect(() => {
    // Only initialize DB operations and sync listeners after authentication
    if (user) {
      setupRealtimeSync();
      const unregisterNetwork = registerNetworkSyncListeners();

      // Check dark mode preference from local DB once authenticated
      const loadTheme = async () => {
        try {
          const settings = await getLocalSettings();
          if (settings?.preferences?.darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme_dark', 'true');
          } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme_dark', 'false');
          }
        } catch (e) {
          console.warn('Failed to load theme preference:', e);
        }
      };
      loadTheme();

      return () => {
        unregisterNetwork();
      };
    } else {
      // For unauthenticated login screen, use simple localStorage check to avoid touching IndexedDB
      if (localStorage.getItem('theme_dark') === 'true') {
        document.documentElement.classList.add('dark');
      }
    }
  }, [user]);

  // Loading state while checking auth
  if (loading) {
    return (
      <div className="max-w-md mx-auto h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-medium">Verifying authorization...</p>
      </div>
    );
  }

  // If not logged in, show ONLY the Login screen
  if (!user) {
    return (
      <LoginScreen
        onLogin={signInWithGoogle}
        loading={loading}
        error={error}
        allowedEmail={allowedEmail}
      />
    );
  }

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
        {activeTab === 'settings' && (
          <SettingsView 
            user={user}
            onLogout={logout}
          />
        )}
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

