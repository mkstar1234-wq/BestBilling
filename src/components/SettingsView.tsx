import { useState, useEffect } from 'react';
import { Save, User as UserIcon, Settings as SettingsIcon, Building, FileText, Smartphone, Cloud, CloudOff, Moon, Sun, LogOut } from 'lucide-react';
import { AppSettings } from '../types';
import { getLocalSettings, saveSettingsLocally } from '../lib/offlineSync';
import { hapticFeedback } from '../lib/haptics';
import { INDIAN_STATES } from '../lib/states';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface SettingsViewProps {
  user?: User | null;
  onLogout?: () => Promise<void>;
}

export function SettingsView({ user, onLogout }: SettingsViewProps) {
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
      defaultBuyerCity: '',
      defaultBuyerAddress: ''
    },
    preferences: {
      showEwayBill: false,
      darkMode: false,
      showBillOfSupply: true,
      showStateCode: true,
      showTransportReference: true,
      showHsnCode: true,
      showBuyerGst: true,
      showBuyerPhone: true,
      showBuyerAddress: true,
      defaultModeOfPay: '',
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
        
        {/* Account / User Section */}
        {user && (
          <section className="p-4 bg-white mt-2 mb-2 shadow-sm border-y border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <UserIcon className="text-blue-600 dark:text-blue-400 mr-2" size={18} />
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Account & Security</h2>
              </div>
              <span className="text-[10px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-semibold px-2 py-0.5 rounded-full">
                Authorized
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-750 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                    {(user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {user.displayName || 'Google Account'}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate font-mono">
                    {user.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="sign-out-btn"
                onClick={async () => {
                  hapticFeedback('medium');
                  try {
                    if (onLogout) {
                      await onLogout();
                    } else {
                      await signOut(auth);
                    }
                  } catch (err) {
                    console.error('Sign Out failed:', err);
                    await signOut(auth);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 active:scale-95 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </section>
        )}

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

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Buyer Address</label>
            <input
              type="text"
              value={settings.invoice.defaultBuyerAddress || ''}
              onChange={(e) => updateInvoice({ defaultBuyerAddress: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="e.g. 123 Main Street, Sector 4"
            />
          </div>
        </section>

        {/* App Preferences */}
        <section className="p-4 bg-white shadow-sm border-y border-gray-100 mb-20">
          <div className="flex items-center mb-4">
            <Smartphone className="text-gray-400 mr-2" size={18} />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">App Preferences</h2>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Buyer Name</label>
            <input
              type="text"
              value={settings.preferences.defaultBuyerName || ''}
              onChange={(e) => updatePreferences({ defaultBuyerName: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="e.g., Cash Customer, General"
            />
            <p className="text-xs text-gray-500 mt-1">This will automatically fill in new bills.</p>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Mode of Payment</label>
            <input
              type="text"
              value={settings.preferences.defaultModeOfPay || ''}
              onChange={(e) => updatePreferences({ defaultModeOfPay: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="e.g., Cash, UPI, Bank Transfer"
            />
            <p className="text-xs text-gray-500 mt-1">This will automatically fill in new bills.</p>
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
              <h3 className="text-sm font-medium text-gray-900">Place of Supply</h3>
              <p className="text-xs text-gray-500">Show 'Place of Supply' field on the invoice</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                updatePreferences({ showBillOfSupply: !settings.preferences.showBillOfSupply });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.preferences.showBillOfSupply ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.preferences.showBillOfSupply}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.preferences.showBillOfSupply ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900">State Code</h3>
              <p className="text-xs text-gray-500">Enable fields for state codes</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                updatePreferences({ showStateCode: !settings.preferences.showStateCode });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.preferences.showStateCode ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.preferences.showStateCode}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.preferences.showStateCode ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Transport Reference</h3>
              <p className="text-xs text-gray-500">Enable transport reference field</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                updatePreferences({ showTransportReference: !settings.preferences.showTransportReference });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.preferences.showTransportReference ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.preferences.showTransportReference}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.preferences.showTransportReference ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900">HSN Code</h3>
              <p className="text-xs text-gray-500">Enable HSN code field for items</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                updatePreferences({ showHsnCode: !settings.preferences.showHsnCode });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.preferences.showHsnCode ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.preferences.showHsnCode}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.preferences.showHsnCode ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Buyer GST No.</h3>
              <p className="text-xs text-gray-500">Enable Buyer GST No. field under Buyer details</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                updatePreferences({ showBuyerGst: !(settings.preferences.showBuyerGst ?? true) });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${(settings.preferences.showBuyerGst ?? true) ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.preferences.showBuyerGst ?? true}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(settings.preferences.showBuyerGst ?? true) ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Buyer Phone No.</h3>
              <p className="text-xs text-gray-500">Enable Buyer Phone No. field under Buyer details</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                updatePreferences({ showBuyerPhone: !(settings.preferences.showBuyerPhone ?? true) });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${(settings.preferences.showBuyerPhone ?? true) ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.preferences.showBuyerPhone ?? true}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(settings.preferences.showBuyerPhone ?? true) ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Buyer Address</h3>
              <p className="text-xs text-gray-500">Enable Buyer Address field under Buyer details</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                updatePreferences({ showBuyerAddress: !(settings.preferences.showBuyerAddress ?? true) });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${(settings.preferences.showBuyerAddress ?? true) ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.preferences.showBuyerAddress ?? true}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(settings.preferences.showBuyerAddress ?? true) ? 'translate-x-5' : 'translate-x-0'}`}
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
