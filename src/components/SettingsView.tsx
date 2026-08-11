import { useState, useEffect } from 'react';
import { Save, User, Settings as SettingsIcon, Building, FileText, Smartphone, Cloud, CloudOff, Moon, Sun } from 'lucide-react';
import { AppSettings } from '../types';
import { getLocalSettings, saveSettingsLocally } from '../lib/offlineSync';
import { hapticFeedback } from '../lib/haptics';
import { INDIAN_STATES } from '../lib/states';

export function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>({
    id: 'default',
    supplier: {
      businessName: '',
      address: '',
      gstin: '',
      phone: '',
      email: '',
      terms: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed.',
      authorizedSignatory: 'Authorized Signatory'
    },
    invoice: {
      prefix: 'INV-',
      startNumber: 1,
      defaultPlaceOfSupply: '',
      defaultStateCode: '',
      defaultBuyerState: '',
      defaultBuyerCity: ''
    },
    preferences: {
      showEwayBill: false,
      darkMode: false,
    },
    updatedAt: Date.now(),
    syncStatus: 'synced',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        const localData = await getLocalSettings();
        if (localData) {
          setSettings(localData);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const updateSupplier = (updates: Partial<AppSettings['supplier']>) => {
    setSettings(prev => ({
      ...prev,
      supplier: { ...prev.supplier, ...updates }
    }));
  };

  const updateInvoice = (updates: Partial<AppSettings['invoice']>) => {
    setSettings(prev => ({
      ...prev,
      invoice: { ...prev.invoice, ...updates }
    }));
  };

  const updatePreferences = (updates: Partial<AppSettings['preferences']>) => {
    setSettings(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates }
    }));
  };

  const updateTerm = (index: number, value: string) => {
    setSettings(prev => {
      const currentList = prev.supplier.termsList || [
        "Goods once sold will not be taken back.",
        "Interest @ 18% p.a. will be charged if payment is delayed.",
        "Subject to local jurisdiction.",
        "E.& O.E."
      ];
      const newList = [...currentList];
      newList[index] = value;
      return {
        ...prev,
        supplier: { ...prev.supplier, termsList: newList }
      };
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    hapticFeedback('medium');
    try {
      await saveSettingsLocally(settings);
      hapticFeedback('success');
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      hapticFeedback('error');
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-safe relative">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <SettingsIcon className="text-blue-600 mr-2 w-6 h-6" />
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full text-[10px] font-bold">
              <Cloud size={12} className="mr-1" />
              Synced
            </div>
          ) : (
            <div className="flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-[10px] font-bold">
              <CloudOff size={12} className="mr-1" />
              Offline / Pending
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center bg-blue-600 text-white font-semibold px-4 py-1.5 rounded-full active:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors"
          >
            <Save size={16} className="mr-1.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-6">
        
        {/* Business Profile */}
        <section className="p-4 bg-white mt-2 mb-2 shadow-sm border-y border-gray-100">
          <div className="flex items-center mb-4">
            <Building className="text-gray-400 mr-2" size={18} />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Business Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={settings.supplier.businessName || ''}
                onChange={(e) => updateSupplier({ businessName: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                placeholder="My Awesome Store"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={settings.supplier.gstin || ''}
                onChange={(e) => updateSupplier({ gstin: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 uppercase"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={settings.supplier.address}
                onChange={(e) => updateSupplier({ address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 resize-none"
                placeholder="Full Business Address"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={settings.supplier.phone || ''}
                onChange={(e) => updateSupplier({ phone: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                placeholder="+91 9876543210"
              />
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="p-4 bg-white mt-2 mb-2 shadow-sm border-y border-gray-100">
          <div className="flex items-center mb-4">
            <Building className="text-gray-400 mr-2" size={18} />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Bank Details</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={settings.supplier.bankName || ''}
                onChange={(e) => updateSupplier({ bankName: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                placeholder="State Bank of India"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">A/C Number</label>
              <input
                type="text"
                value={settings.supplier.accountNumber || ''}
                onChange={(e) => updateSupplier({ accountNumber: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                placeholder="1234567890"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={settings.supplier.ifsc || ''}
                onChange={(e) => updateSupplier({ ifsc: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 uppercase"
                placeholder="SBIN0001234"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">UPI ID</label>
              <input
                type="text"
                value={settings.supplier.upi || ''}
                onChange={(e) => updateSupplier({ upi: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                placeholder="merchant@upi"
              />
            </div>
          </div>
        </section>

        {/* Declaration & Terms */}
        <section className="p-4 bg-white mt-2 mb-2 shadow-sm border-y border-gray-100">
          <div className="flex items-center mb-4">
            <FileText className="text-gray-400 mr-2" size={18} />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Declaration & Terms</h2>
          </div>
          
          <div className="space-y-4">
            {[0, 1, 2, 3].map((index) => {
              const termsList = settings.supplier.termsList || [
                "Goods once sold will not be taken back.",
                "Interest @ 18% p.a. will be charged if payment is delayed.",
                "Subject to local jurisdiction.",
                "E.& O.E."
              ];
              return (
                <div key={index}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Term {index + 1}</label>
                  <input
                    type="text"
                    value={termsList[index] || ''}
                    onChange={(e) => updateTerm(index, e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                    placeholder={`Enter Term ${index + 1}`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Invoice Settings */}

        <section className="p-4 bg-white mb-2 shadow-sm border-y border-gray-100">
          <div className="flex items-center mb-4">
            <FileText className="text-gray-400 mr-2" size={18} />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Invoice Settings</h2>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Prefix</label>
              <input
                type="text"
                value={settings.invoice.prefix}
                onChange={(e) => updateInvoice({ prefix: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 uppercase"
                placeholder="INV-"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Number</label>
              <input
                type="number"
                value={settings.invoice.startNumber}
                onChange={(e) => updateInvoice({ startNumber: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                placeholder="1"
              />
            </div>
          </div>
          
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Default Place of Supply</label>
              <input
                type="text"
                value={settings.invoice.defaultPlaceOfSupply || ''}
                onChange={(e) => updateInvoice({ defaultPlaceOfSupply: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                placeholder="e.g. Maharashtra"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Default State Code</label>
              <input
                type="text"
                value={settings.invoice.defaultStateCode || ''}
                onChange={(e) => updateInvoice({ defaultStateCode: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                placeholder="e.g. 27"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Default Buyer City</label>
              <input
                type="text"
                value={settings.invoice.defaultBuyerCity || ''}
                onChange={(e) => updateInvoice({ defaultBuyerCity: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                placeholder="e.g. Mumbai"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Default Buyer State</label>
              <select
                value={settings.invoice.defaultBuyerState || ''}
                onChange={(e) => updateInvoice({ defaultBuyerState: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px_24px] bg-no-repeat bg-[position:right_10px_center]"
              >
                <option value="">Select State</option>
                {Object.keys(INDIAN_STATES).map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* App Preferences */}
        <section className="p-4 bg-white shadow-sm border-y border-gray-100 mb-20">
          <div className="flex items-center mb-4">
            <Smartphone className="text-gray-400 mr-2" size={18} />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">App Preferences</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Show E-way Bill Fields</h3>
              <p className="text-xs text-gray-500">Enable fields for e-way bill details on invoice</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                updatePreferences({ showEwayBill: !settings.preferences.showEwayBill });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.preferences.showEwayBill ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.preferences.showEwayBill}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.preferences.showEwayBill ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                {settings.preferences.darkMode ? <Moon size={14} className="mr-1 text-gray-700" /> : <Sun size={14} className="mr-1 text-amber-500" />}
                Dark Mode
              </h3>
              <p className="text-xs text-gray-500">Enable dark theme for the application</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                const newValue = !settings.preferences.darkMode;
                updatePreferences({ darkMode: newValue });
                if (newValue) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.preferences.darkMode ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.preferences.darkMode}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.preferences.darkMode ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
