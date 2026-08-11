import { useState, useEffect } from 'react';
import { Plus, Check, Receipt } from 'lucide-react';
import { Bill, InvoiceItem, SupplierProfile, AppSettings } from '../types';
import { calculateItemAmount, calculateTotalAmount, calculateNetAmount, getNextInvoiceNumber } from '../lib/billingLogic';
import { hapticFeedback } from '../lib/haptics';
import { SwipeableItem } from './SwipeableItem';
import { AddItemDrawer } from './AddItemDrawer';
import { PreviewModal } from './PreviewModal';
import { saveBillLocally, getLocalSettings, getLocalBills } from '../lib/offlineSync';
import { AnimatePresence } from 'motion/react';
import { INDIAN_STATES } from '../lib/states';

export function BillForm() {
  const [bill, setBill] = useState<Partial<Bill>>({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerDetails: '',
    items: [],
    discount: 0,
    roundOff: 0,
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [savedBill, setSavedBill] = useState<Bill | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      const localSettings = await getLocalSettings();
      const localBills = await getLocalBills();
      
      let nextInvNumber = 'INV-0001';
      if (localSettings) {
        setSettings(localSettings);
        nextInvNumber = getNextInvoiceNumber(localBills, localSettings.invoice.prefix, localSettings.invoice.startNumber);
        
        setBill(prev => ({
          ...prev,
          invoiceNumber: nextInvNumber,
          placeOfSupply: prev.placeOfSupply || localSettings.invoice.defaultPlaceOfSupply || '',
          supplyStateCode: prev.supplyStateCode || localSettings.invoice.defaultStateCode || '',
          customerState: prev.customerState || localSettings.invoice.defaultBuyerState || '',
          customerStateCode: prev.customerStateCode || (localSettings.invoice.defaultBuyerState ? INDIAN_STATES[localSettings.invoice.defaultBuyerState] : ''),
          customerCity: prev.customerCity || localSettings.invoice.defaultBuyerCity || ''
        }));
      } else {
        nextInvNumber = getNextInvoiceNumber(localBills, 'INV-', 1);
        setBill(prev => ({ ...prev, invoiceNumber: nextInvNumber }));
      }
    }
    loadInitialData();
  }, []);

  // Recalculate totals whenever items, discount, or roundOff change
  useEffect(() => {
    const total = calculateTotalAmount(bill.items || []);
    const net = calculateNetAmount(total, bill.discount || 0, bill.roundOff || 0);
    setTotalAmount(total);
    setNetAmount(net);
  }, [bill.items, bill.discount, bill.roundOff]);

  const updateBill = (updates: Partial<Bill>) => {
    setBill(prev => ({ ...prev, ...updates }));
  };

  const handleAddItem = (itemData: { description: string; hsnSac: string; quantity: number; rate: number; per: string }) => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      ...itemData,
      amount: calculateItemAmount(itemData.quantity, itemData.rate),
    };
    updateBill({ items: [...(bill.items || []), newItem] });
    setIsDrawerOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    updateBill({ items: (bill.items || []).filter(item => item.id !== id) });
  };

  const handleSave = async () => {
    if (isSaving || !bill.invoiceNumber) return;
    setIsSaving(true);
    hapticFeedback('medium');

    try {
      const fullBill: Bill = {
        id: crypto.randomUUID(),
        invoiceNumber: bill.invoiceNumber,
        date: bill.date || new Date().toISOString(),
        
        customerName: bill.customerName || 'Cash',
        customerCity: bill.customerCity || '',
        customerState: bill.customerState || '',
        customerStateCode: bill.customerStateCode || '',

        placeOfSupply: bill.placeOfSupply || '',
        supplyStateCode: bill.supplyStateCode || '',
        modeOfPay: bill.modeOfPay || '',
        transportRef: bill.transportRef || '',
        ewayBillNo: bill.ewayBillNo || '',
        dispatchThrough: bill.dispatchThrough || '',

        items: bill.items || [],
        totalAmount,
        discount: bill.discount || 0,
        roundOff: bill.roundOff || 0,
        netAmount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'pending_sync'
      };

      // 1. Save to IndexedDB (Queues for Firebase Background Sync)
      await saveBillLocally(fullBill);

      hapticFeedback('success');
      
      // Open Preview Modal with the saved bill
      setSavedBill(fullBill);
    } catch (error) {
      console.error("Failed to save bill:", error);
      hapticFeedback('error');
      alert("Failed to process bill. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClosePreview = async () => {
    setSavedBill(null);
    // Reset form after successful save
    const allBills = await getLocalBills(); // Refresh to include just saved bill
    const nextInv = getNextInvoiceNumber(
      allBills, 
      settings?.invoice.prefix || 'INV-', 
      settings?.invoice.startNumber || 1
    );
    
    setBill({
      invoiceNumber: nextInv,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerDetails: '',
      items: [],
      discount: 0,
      roundOff: 0,
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-safe relative">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-20 flex items-center shadow-sm">
        <Receipt className="text-blue-600 mr-2 w-6 h-6" />
        <h1 className="text-xl font-bold text-gray-900">New Invoice</h1>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-[140px]">
        {/* Section: Party Details */}
        <section className="p-4 bg-white mb-2 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Bill Information</h2>
          
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Bill No.</label>
              <input
                type="text"
                value={bill.invoiceNumber}
                readOnly
                className="w-full px-3 py-2.5 bg-gray-100 border border-transparent rounded-lg font-mono text-gray-600 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={bill.date}
                onChange={(e) => updateBill({ date: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Place of Supply</label>
              <input
                type="text"
                value={bill.placeOfSupply || ''}
                onChange={(e) => updateBill({ placeOfSupply: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div className="w-1/3">
              <label className="block text-xs font-medium text-gray-700 mb-1">State Code</label>
              <input
                type="text"
                value={bill.supplyStateCode || ''}
                onChange={(e) => updateBill({ supplyStateCode: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Mode of Pay</label>
              <input
                type="text"
                value={bill.modeOfPay || ''}
                onChange={(e) => updateBill({ modeOfPay: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Transport / Ref</label>
              <input
                type="text"
                value={bill.transportRef || ''}
                onChange={(e) => updateBill({ transportRef: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          {settings?.preferences?.showEwayBill && (
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">E-way Bill No.</label>
                <input
                  type="text"
                  value={bill.ewayBillNo || ''}
                  onChange={(e) => updateBill({ ewayBillNo: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Dispatch Through</label>
                <input
                  type="text"
                  value={bill.dispatchThrough || ''}
                  onChange={(e) => updateBill({ dispatchThrough: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <hr className="my-4 border-gray-100" />
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Buyer (Bill To)</h2>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer Name</label>
            <input
              type="text"
              value={bill.customerName}
              onChange={(e) => updateBill({ customerName: e.target.value })}
              placeholder="Enter name"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={bill.customerCity || ''}
                onChange={(e) => updateBill({ customerCity: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
              <select
                value={bill.customerState || ''}
                onChange={(e) => {
                  const state = e.target.value;
                  updateBill({ 
                    customerState: state,
                    customerStateCode: state ? INDIAN_STATES[state] : bill.customerStateCode
                  });
                }}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px_24px] bg-no-repeat bg-[position:right_10px_center]"
              >
                <option value="">Select State</option>
                {Object.keys(INDIAN_STATES).map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="w-1/4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={bill.customerStateCode || ''}
                onChange={(e) => updateBill({ customerStateCode: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Section: Items */}
        <section className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Line Items</h2>
            <button
              onClick={() => {
                hapticFeedback('light');
                setIsDrawerOpen(true);
              }}
              className="flex items-center text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full active:bg-blue-100 transition-colors"
            >
              <Plus size={16} className="mr-1" /> Add
            </button>
          </div>

          {(!bill.items || bill.items.length === 0) ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-400 text-sm">No items added yet</p>
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="mt-2 text-blue-600 font-medium text-sm"
              >
                Tap here to add item
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {bill.items.map((item) => (
                <SwipeableItem key={item.id} onDelete={() => handleDeleteItem(item.id)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.description}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.quantity} × ₹{item.rate.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">₹{item.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </SwipeableItem>
              ))}
            </div>
          )}
        </section>

        {/* Section: Summary Tweaks (Discount/Roundoff) */}
        <section className="px-4 py-2 space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <label className="text-sm font-medium text-gray-700">Discount (₹)</label>
            <input
              type="number"
              value={bill.discount || ''}
              onChange={(e) => updateBill({ discount: Number(e.target.value) })}
              className="w-24 px-2 py-1 text-right bg-gray-50 border border-gray-200 rounded-lg outline-none"
              placeholder="0"
            />
          </div>
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <label className="text-sm font-medium text-gray-700">Round Off (₹)</label>
            <input
              type="number"
              value={bill.roundOff || ''}
              onChange={(e) => updateBill({ roundOff: Number(e.target.value) })}
              className="w-24 px-2 py-1 text-right bg-gray-50 border border-gray-200 rounded-lg outline-none"
              placeholder="0"
            />
          </div>
        </section>
      </main>

      {/* Sticky Checkout Bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium">Net Payable</span>
            <span className="text-xl font-extrabold text-gray-900">₹{netAmount.toFixed(2)}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={!bill.items?.length}
            className="flex items-center justify-center bg-blue-600 text-white font-bold px-8 py-3 rounded-full active:bg-blue-700 shadow-lg disabled:opacity-50 disabled:active:bg-blue-600 transition-all"
          >
            <Check size={20} className="mr-2" /> Save Bill
          </button>
        </div>
      </div>

      {/* Bottom Sheet Modal */}
      <AddItemDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onAdd={handleAddItem} 
      />

      <AnimatePresence>
        {savedBill && (
          <PreviewModal 
            bill={savedBill} 
            onClose={handleClosePreview} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
