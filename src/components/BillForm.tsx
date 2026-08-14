import { useState, useEffect } from 'react';
import { Plus, Check, Receipt, Sliders, X, FileText, MapPin, Truck, Hash, Trash2, Phone } from 'lucide-react';
import { Bill, InvoiceItem, SupplierProfile, AppSettings } from '../types';
import { calculateItemAmount, calculateTotalAmount, calculateNetAmount, getNextInvoiceNumber } from '../lib/billingLogic';
import { hapticFeedback } from '../lib/haptics';
import { PreviewModal } from './PreviewModal';
import { saveBillLocally, getLocalSettings, getLocalBills, saveSettingsLocally } from '../lib/offlineSync';
import { AnimatePresence } from 'motion/react';
import { INDIAN_STATES } from '../lib/states';
import { DatePicker } from './DatePicker';

export function BillForm({ editingBill, onClearEdit }: { editingBill?: Bill | null, onClearEdit?: () => void }) {
  const [bill, setBill] = useState<Partial<Bill>>({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerDetails: '',
    customerGst: '',
    customerPhone: '',
    customerAddress: '',
    items: [],
    discount: 0,
    roundOff: 0,
  });

  
  const [isPrefOpen, setIsPrefOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [savedBill, setSavedBill] = useState<Bill | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      const localSettings = await getLocalSettings();
      if (localSettings) {
        setSettings(localSettings);
      }
      
      if (editingBill) {
        setBill(editingBill);
        return;
      }

      const localBills = await getLocalBills();
      
      let nextInvNumber = 'INV-0001';
      if (localSettings) {
        nextInvNumber = getNextInvoiceNumber(localBills, localSettings.invoice.prefix, localSettings.invoice.startNumber);
        
        setBill({
          invoiceNumber: nextInvNumber,
          date: new Date().toISOString().split('T')[0],
          customerName: localSettings.preferences?.defaultBuyerName || '',
          customerDetails: '',
          customerGst: '',
          customerPhone: '',
          customerAddress: localSettings.invoice.defaultBuyerAddress || '',
          items: [],
          discount: 0,
          roundOff: 0,
          placeOfSupply: localSettings.invoice.defaultPlaceOfSupply || '',
          supplyStateCode: localSettings.invoice.defaultStateCode || '',
          customerState: localSettings.invoice.defaultBuyerState || '',
          customerStateCode: localSettings.invoice.defaultBuyerState ? INDIAN_STATES[localSettings.invoice.defaultBuyerState] : '',
          customerCity: localSettings.invoice.defaultBuyerCity || '',
          modeOfPay: localSettings.preferences?.defaultModeOfPay || '',
          transportRef: '',
          ewayBillNo: '',
          dispatchThrough: ''
        });
      } else {
        nextInvNumber = getNextInvoiceNumber(localBills, 'INV-', 1);
        setBill({ 
          invoiceNumber: nextInvNumber,
          date: new Date().toISOString().split('T')[0],
          customerName: '',
          customerDetails: '',
          customerGst: '',
          customerPhone: '',
          customerAddress: '',
          items: [],
          discount: 0,
          roundOff: 0
        });
      }
    }
    loadInitialData();
  }, [editingBill]);

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

  const handleAddNewRow = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: '',
      hsnSac: '',
      quantity: 0,
      rate: 0,
      per: 'PCS',
      amount: 0,
    };
    updateBill({ items: [...(bill.items || []), newItem] });
  };

  const updateItemField = (id: string, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = (bill.items || []).map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        updatedItem.amount = calculateItemAmount(Number(updatedItem.quantity), Number(updatedItem.rate));
        return updatedItem;
      }
      return item;
    });
    updateBill({ items: updatedItems });
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
        id: bill.id || crypto.randomUUID(),
        invoiceNumber: bill.invoiceNumber,
        date: bill.date || new Date().toISOString(),
        
        customerName: bill.customerName || 'Cash',
        customerCity: bill.customerCity || '',
        customerState: bill.customerState || '',
        customerStateCode: bill.customerStateCode || '',
        customerGst: bill.customerGst || '',
        customerPhone: bill.customerPhone || '',
        customerAddress: bill.customerAddress || '',

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
        createdAt: bill.createdAt || Date.now(),
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
    setSavedBill(null); if (onClearEdit) onClearEdit();
    // Reset form after successful save
    const [allBills, localSettings] = await Promise.all([
      getLocalBills(),
      getLocalSettings()
    ]);
    const currentSettings = localSettings || settings;
    if (localSettings) {
      setSettings(localSettings);
    }

    const nextInv = getNextInvoiceNumber(
      allBills, 
      currentSettings?.invoice?.prefix || 'INV-', 
      currentSettings?.invoice?.startNumber || 1
    );
        
    setBill({
      invoiceNumber: nextInv,
      date: new Date().toISOString().split('T')[0],
      customerName: currentSettings?.preferences?.defaultBuyerName || '',
      customerDetails: '',
      customerGst: '',
      customerPhone: '',
      customerAddress: currentSettings?.invoice?.defaultBuyerAddress || '',
      items: [],
      discount: 0,
      roundOff: 0,
      placeOfSupply: currentSettings?.invoice?.defaultPlaceOfSupply || '',
      supplyStateCode: currentSettings?.invoice?.defaultStateCode || '',
      customerState: currentSettings?.invoice?.defaultBuyerState || '',
      customerStateCode: currentSettings?.invoice?.defaultBuyerState ? INDIAN_STATES[currentSettings.invoice.defaultBuyerState] : '',
      customerCity: currentSettings?.invoice?.defaultBuyerCity || '',
      modeOfPay: currentSettings?.preferences?.defaultModeOfPay || '',
      transportRef: '',
      ewayBillNo: '',
      dispatchThrough: ''
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-safe relative">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <Receipt className="text-blue-600 mr-2 w-6 h-6" />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{editingBill ? 'Edit Invoice' : 'New Invoice'}</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPrefOpen(true)}
          className="p-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 text-sm font-medium"
        >
          <Sliders className="w-4 h-4" />
        </button>
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
                onChange={(e) => updateBill({ invoiceNumber: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <DatePicker
                id="bill-date-picker"
                value={bill.date}
                onChange={(newDate) => updateBill({ date: newDate })}
              />
            </div>
          </div>
          
          <div className="flex gap-3 mb-3">
            {settings?.preferences?.showBillOfSupply !== false && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Place of Supply</label>
                <input
                  type="text"
                  value={bill.placeOfSupply || ''}
                  onChange={(e) => updateBill({ placeOfSupply: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            )}
            {settings?.preferences?.showStateCode !== false && (
              <div className="w-1/3">
                <label className="block text-xs font-medium text-gray-700 mb-1">State Code</label>
                <input
                  type="text"
                  value={bill.supplyStateCode || ''}
                  onChange={(e) => updateBill({ supplyStateCode: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            )}
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
            {settings?.preferences?.showTransportReference !== false && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Transport / Ref</label>
                <input
                  type="text"
                  value={bill.transportRef || ''}
                  onChange={(e) => updateBill({ transportRef: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            )}
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

          {settings?.preferences?.showBuyerGst !== false && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Buyer GST No.</label>
              <input
                type="text"
                value={bill.customerGst || ''}
                onChange={(e) => updateBill({ customerGst: e.target.value })}
                placeholder="e.g. 27AAAAA0000A1Z5"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 uppercase"
              />
            </div>
          )}

          {settings?.preferences?.showBuyerPhone !== false && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Buyer Phone No.</label>
              <input
                type="tel"
                value={bill.customerPhone || ''}
                onChange={(e) => updateBill({ customerPhone: e.target.value })}
                placeholder="e.g. +91 9876543210"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          )}

          {settings?.preferences?.showBuyerAddress !== false && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Buyer Address</label>
              <textarea
                value={bill.customerAddress || ''}
                onChange={(e) => updateBill({ customerAddress: e.target.value })}
                rows={2}
                placeholder="Enter buyer address"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 resize-none"
              />
            </div>
          )}

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
          </div>

          <div className="space-y-4">
            {(bill.items || []).map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative group">
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full shadow-sm"
                >
                  <Trash2 size={14} />
                </button>
                <div className="space-y-3 mt-1">
                  <div>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItemField(item.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                      placeholder="Item Description"
                    />
                  </div>
                  <div className="flex gap-2">
                    {settings?.preferences?.showHsnCode !== false && (
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">HSN/SAC</label>
                        <input
                          type="text"
                          value={item.hsnSac}
                          onChange={(e) => updateItemField(item.id, 'hsnSac', e.target.value)}
                          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                          placeholder="Code"
                        />
                      </div>
                    )}
                    <div className="w-16">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Qty</label>
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItemField(item.id, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        value={item.rate || ''}
                        onChange={(e) => updateItemField(item.id, 'rate', e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="w-16">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Per</label>
                      <input
                        type="text"
                        value={item.per}
                        onChange={(e) => updateItemField(item.id, 'per', e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm uppercase"
                        placeholder="PCS"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-gray-100 pt-2 mt-2">
                    <span className="text-xs text-gray-500 mr-2">Amount:</span>
                    <span className="font-bold text-gray-900">₹{Number(item.amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => {
                hapticFeedback('light');
                handleAddNewRow();
              }}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Plus size={18} /> Add New Row
            </button>
          </div>
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
            <span className="text-xl font-extrabold text-gray-900">₹{Number(netAmount || 0).toFixed(2)}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={!bill.items?.length}
            className="flex items-center justify-center bg-blue-600 text-white font-bold px-8 py-3 rounded-full active:bg-blue-700 shadow-lg disabled:opacity-50 disabled:active:bg-blue-600 transition-all"
          >
            <Check size={20} className="mr-2" /> {editingBill ? 'Update Bill' : 'Save Bill'}
          </button>
        </div>
      </div>


      <AnimatePresence>
        {savedBill && (
          <PreviewModal 
            bill={savedBill} 
            onClose={handleClosePreview} 
          />
        )}
      </AnimatePresence>

      {/* App Preferences Slider / Drawer Overlay */}
      {isPrefOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-80 max-w-full h-full bg-white shadow-2xl flex flex-col p-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-600 font-semibold">
                <Sliders className="w-5 h-5" />
                <span>App Preferences</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPrefOpen(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              <p className="text-xs text-gray-500 mb-4">
                Toggle options to show/hide fields on the bill form in real-time.
              </p>

              {[
                { key: 'showEwayBill' as const, label: 'Show E-way Bill Field', icon: <FileText className="w-5 h-5 text-gray-500" /> },
                { key: 'showBillOfSupply' as const, label: 'Place of Supply', icon: <MapPin className="w-5 h-5 text-gray-500" /> },
                { key: 'showStateCode' as const, label: 'State Code', icon: <MapPin className="w-5 h-5 text-gray-500" /> },
                { key: 'showTransportReference' as const, label: 'Transport Reference', icon: <Truck className="w-5 h-5 text-gray-500" /> },
                { key: 'showHsnCode' as const, label: 'HSN Code', icon: <Hash className="w-5 h-5 text-gray-500" /> },
                { key: 'showBuyerGst' as const, label: 'Buyer GST No.', icon: <FileText className="w-5 h-5 text-gray-500" /> },
                { key: 'showBuyerPhone' as const, label: 'Buyer Phone No.', icon: <Phone className="w-5 h-5 text-gray-500" /> },
                { key: 'showBuyerAddress' as const, label: 'Buyer Address', icon: <MapPin className="w-5 h-5 text-gray-500" /> },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50">
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      hapticFeedback('light');
                      if (settings) {
                        const newVal = !(settings.preferences[item.key] ?? true);
                        const newSettings = {
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            [item.key]: newVal
                          }
                        };
                        setSettings(newSettings);
                        await saveSettingsLocally(newSettings);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${(settings?.preferences[item.key] ?? true) ? 'bg-blue-600' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={settings?.preferences[item.key] ?? true}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(settings?.preferences[item.key] ?? true) ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsPrefOpen(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
