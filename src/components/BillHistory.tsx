import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Search, FileText, Eye, Share2, Download, Edit2, Trash2, Check, X } from 'lucide-react';
import { Bill } from '../types';
import { getLocalBills, pullFromFirebase, deleteBillLocally, getLocalSettings } from '../lib/offlineSync';
import { SwipeableItem } from './SwipeableItem';
import { formatInvoiceDate } from '../lib/billingLogic';
import { hapticFeedback } from '../lib/haptics';
import { motion, AnimatePresence } from 'motion/react';
import { PreviewModal } from './PreviewModal';
import { generateInvoicePDF, generateBulkInvoicePDF } from '../lib/pdfGenerator';
import { sharePDF, downloadBlob } from '../lib/shareUtils';

interface BillHistoryCardProps {
  bill: Bill;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onLongPress: (id: string) => void;
  onEdit?: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onView: (bill: Bill) => void;
  onShare: (bill: Bill) => void;
  onDownload: (bill: Bill) => void;
  isSharing: boolean;
  isDownloading: boolean;
}

function BillHistoryCard({
  bill,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  onLongPress,
  onEdit,
  onDelete,
  onView,
  onShare,
  onDownload,
  isSharing,
  isDownloading
}: BillHistoryCardProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const startPress = (e: React.TouchEvent | React.MouseEvent) => {
    if (isSelectionMode) return;
    isLongPressTriggered.current = false;
    const point = 'touches' in e ? e.touches[0] : e;
    startPos.current = { x: point.clientX, y: point.clientY };

    timerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      hapticFeedback('medium');
      onLongPress(bill.id);
    }, 450);
  };

  const movePress = (e: React.TouchEvent | React.MouseEvent) => {
    if (!startPos.current || !timerRef.current) return;
    const point = 'touches' in e ? e.touches[0] : e;
    const diffX = Math.abs(point.clientX - startPos.current.x);
    const diffY = Math.abs(point.clientY - startPos.current.y);
    if (diffX > 10 || diffY > 10) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      return;
    }
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect(bill.id);
    }
  };

  return (
    <SwipeableItem 
      onDelete={() => onDelete(bill.id)}
      disabled={isSelectionMode}
    >
      <div 
        onTouchStart={startPress}
        onTouchMove={movePress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onMouseDown={startPress}
        onMouseMove={movePress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onClick={handleCardClick}
        className={`flex flex-col w-full select-none transition-all ${
          isSelectionMode ? 'cursor-pointer' : ''
        }`}
      >
        {/* Top Action Bar / Selection Checkbox */}
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          {isSelectionMode ? (
            <div className="flex items-center gap-2 py-0.5">
              <div 
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300' 
                    : 'border-2 border-gray-300 bg-white'
                }`}
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </div>
              <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                {isSelected ? 'Selected' : 'Tap to select'}
              </span>
            </div>
          ) : (
            <div />
          )}

          {!isSelectionMode && (
            <div className="flex justify-end gap-2 flex-wrap ml-auto">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) onEdit(bill);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-full active:bg-indigo-200 transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(bill.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-full active:bg-red-200 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(bill);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full active:bg-blue-100 transition-colors"
              >
                <Eye size={14} />
                Preview
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(bill);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                disabled={isSharing || isDownloading}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full active:bg-blue-200 transition-colors disabled:opacity-50"
              >
                {isSharing ? (
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Share2 size={14} />
                )}
                Share
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(bill);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                disabled={isSharing || isDownloading}
                className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full active:bg-green-200 transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Download size={14} />
                )}
                Download
              </button>
            </div>
          )}
        </div>

        {/* Bill Content details */}
        <div className={`flex justify-between items-start w-full border-t border-gray-50 pt-2 rounded-lg p-1.5 transition-colors ${
          isSelected ? 'bg-blue-50/70 border border-blue-200' : ''
        }`}>
          <div className="flex flex-col">
            <h3 className="font-bold text-gray-900">{bill.customerName || 'Cash'}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                {bill.invoiceNumber}
              </span>
              <span>•</span>
              <span>{formatInvoiceDate(bill.date).numerical}</span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end justify-center">
            <span className="font-extrabold text-gray-900 text-base">
              ₹{Number(bill.netAmount || 0).toFixed(2)}
            </span>
            {bill.syncStatus === 'pending_sync' ? (
              <span className="text-[10px] text-amber-500 font-bold tracking-wide mt-1 uppercase">Pending</span>
            ) : (
              <span className="text-[10px] text-green-500 font-bold tracking-wide mt-1 uppercase">Synced</span>
            )}
          </div>
        </div>
      </div>
    </SwipeableItem>
  );
}

export function BillHistory({ onEdit }: { onEdit?: (bill: Bill) => void }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isSharingId, setIsSharingId] = useState<string | null>(null);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);
  const [isSharingAll, setIsSharingAll] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  // Manual Selection Mode State
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [isSharingSelected, setIsSharingSelected] = useState(false);
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);

  const loadBills = useCallback(async () => {
    const localBills = await getLocalBills();
    setBills(localBills);
  }, []);

  useEffect(() => {
    loadBills();
    
    // Listen for local updates or realtime sync updates
    window.addEventListener('local-bills-updated', loadBills);
    
    return () => {
      window.removeEventListener('local-bills-updated', loadBills);
    };
  }, [loadBills]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    hapticFeedback('light');
    try {
      await pullFromFirebase();
      await loadBills(); // Refetch after pulling
      hapticFeedback('success');
    } catch (error) {
      console.error("Refresh failed:", error);
      hapticFeedback('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = (id: string) => {
    setBillToDelete(id);
  };

  const confirmDelete = async () => {
    if (!billToDelete) return;
    await deleteBillLocally(billToDelete);
    setBills(prev => prev.filter(b => b.id !== billToDelete));
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      next.delete(billToDelete);
      return next;
    });
    setBillToDelete(null);
  };

  const handleView = (bill: Bill) => {
    hapticFeedback('light');
    setSelectedBill(bill);
  };

  const handleShare = async (bill: Bill) => {
    hapticFeedback('light');
    setIsSharingId(bill.id);
    try {
      const settings = await getLocalSettings();
      const supplier = settings?.supplier || {
        businessName: 'ADARSH COLLECTION',
        address: 'Business Address',
        gstin: '',
        phone: '',
        email: '',
        terms: '',
        termsList: [
          "Goods once sold will not be taken back.",
          "Interest @ 18% p.a. will be charged if payment is delayed.",
          "Subject to local jurisdiction.",
          "E.& O.E."
        ],
        authorizedSignatory: 'Authorised Signatory'
      };
      
      const blob = await generateInvoicePDF(bill, supplier);
      const filename = `Bill_${bill.invoiceNumber}.pdf`;
      await sharePDF(blob, filename);
    } catch (err) {
      console.error("Failed to share directly:", err);
    } finally {
      setIsSharingId(null);
    }
  };

  const handleDownload = async (bill: Bill) => {
    hapticFeedback('light');
    setIsDownloadingId(bill.id);
    try {
      const settings = await getLocalSettings();
      const supplier = settings?.supplier || {
        businessName: 'ADARSH COLLECTION',
        address: 'Business Address',
        gstin: '',
        phone: '',
        email: '',
        terms: '',
        termsList: [
          "Goods once sold will not be taken back.",
          "Interest @ 18% p.a. will be charged if payment is delayed.",
          "Subject to local jurisdiction.",
          "E.& O.E."
        ],
        authorizedSignatory: 'Authorised Signatory'
      };
      
      const blob = await generateInvoicePDF(bill, supplier);
      const filename = `Bill_${bill.invoiceNumber}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("Failed to download directly:", err);
    } finally {
      setIsDownloadingId(null);
    }
  };

  const handleShareAll = async () => {
    hapticFeedback('light');
    setIsSharingAll(true);
    try {
      const settings = await getLocalSettings();
      const supplier = settings?.supplier || {
        businessName: 'ADARSH COLLECTION',
        address: 'Business Address',
        gstin: '',
        phone: '',
        email: '',
        terms: '',
        termsList: [
          "Goods once sold will not be taken back.",
          "Interest @ 18% p.a. will be charged if payment is delayed.",
          "Subject to local jurisdiction.",
          "E.& O.E."
        ],
        authorizedSignatory: 'Authorised Signatory'
      };
      
      const blob = await generateBulkInvoicePDF(filteredBills, supplier);
      const filename = `Bulk_Bills.pdf`;
      await sharePDF(blob, filename);
    } catch (err) {
      console.error("Failed to share all:", err);
    } finally {
      setIsSharingAll(false);
    }
  };

  const handleDownloadAll = async () => {
    hapticFeedback('light');
    setIsSharingAll(true);
    try {
      const settings = await getLocalSettings();
      const supplier = settings?.supplier || {
        businessName: 'ADARSH COLLECTION',
        address: 'Business Address',
        gstin: '',
        phone: '',
        email: '',
        terms: '',
        termsList: [
          "Goods once sold will not be taken back.",
          "Interest @ 18% p.a. will be charged if payment is delayed.",
          "Subject to local jurisdiction.",
          "E.& O.E."
        ],
        authorizedSignatory: 'Authorised Signatory'
      };
      
      const blob = await generateBulkInvoicePDF(filteredBills, supplier);
      const filename = `Bulk_Bills.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("Failed to download all:", err);
    } finally {
      setIsSharingAll(false);
    }
  };

  // Selection handlers
  const handleLongPressSelect = (id: string) => {
    setSelectedBillIds(new Set([id]));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    hapticFeedback('light');
  };

  const handleToggleSelectAll = () => {
    hapticFeedback('light');
    if (selectedBillIds.size === filteredBills.length) {
      setSelectedBillIds(new Set());
    } else {
      setSelectedBillIds(new Set(filteredBills.map(b => b.id)));
    }
  };

  const clearSelection = () => {
    hapticFeedback('light');
    setSelectedBillIds(new Set());
  };

  // Helper to get serially sorted selected bills
  const getSortedSelectedBills = useCallback(() => {
    const selectedList = bills.filter(b => selectedBillIds.has(b.id));
    return [...selectedList].sort((a, b) => {
      const numA = parseInt((a.invoiceNumber || '').replace(/\D/g, ''), 10);
      const numB = parseInt((b.invoiceNumber || '').replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '') || (a.date || '').localeCompare(b.date || '');
    });
  }, [bills, selectedBillIds]);

  const handleShareSelected = async () => {
    if (selectedBillIds.size === 0) return;
    hapticFeedback('light');
    setIsSharingSelected(true);
    try {
      const settings = await getLocalSettings();
      const supplier = settings?.supplier || {
        businessName: 'ADARSH COLLECTION',
        address: 'Business Address',
        gstin: '',
        phone: '',
        email: '',
        terms: '',
        termsList: [
          "Goods once sold will not be taken back.",
          "Interest @ 18% p.a. will be charged if payment is delayed.",
          "Subject to local jurisdiction.",
          "E.& O.E."
        ],
        authorizedSignatory: 'Authorised Signatory'
      };

      const sortedSelected = getSortedSelectedBills();
      const blob = await generateBulkInvoicePDF(sortedSelected, supplier);
      const filename = `Selected_Bills_${sortedSelected.length}.pdf`;
      await sharePDF(blob, filename);
    } catch (err) {
      console.error("Failed to share selected bills:", err);
    } finally {
      setIsSharingSelected(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedBillIds.size === 0) return;
    hapticFeedback('light');
    setIsDownloadingSelected(true);
    try {
      const settings = await getLocalSettings();
      const supplier = settings?.supplier || {
        businessName: 'ADARSH COLLECTION',
        address: 'Business Address',
        gstin: '',
        phone: '',
        email: '',
        terms: '',
        termsList: [
          "Goods once sold will not be taken back.",
          "Interest @ 18% p.a. will be charged if payment is delayed.",
          "Subject to local jurisdiction.",
          "E.& O.E."
        ],
        authorizedSignatory: 'Authorised Signatory'
      };

      const sortedSelected = getSortedSelectedBills();
      const blob = await generateBulkInvoicePDF(sortedSelected, supplier);
      const filename = `Selected_Bills_${sortedSelected.length}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("Failed to download selected bills:", err);
    } finally {
      setIsDownloadingSelected(false);
    }
  };

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const matchesSearch = 
        (b.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFrom = true;
      let matchesTo = true;
      
      if (fromDate) {
        matchesFrom = b.date >= fromDate;
      }
      
      if (toDate) {
        matchesTo = b.date <= toDate;
      }
      
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [bills, searchTerm, fromDate, toDate]);

  useEffect(() => {
    setDisplayLimit(20);
  }, [searchTerm, fromDate, toDate]);

  const visibleBills = useMemo(() => {
    return filteredBills.slice(0, displayLimit);
  }, [filteredBills, displayLimit]);

  const hasMore = displayLimit < filteredBills.length;

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setDisplayLimit(prev => prev + 20);
      }
    }, {
      rootMargin: '100px'
    });
    if (node) observer.current.observe(node);
  }, [hasMore]);

  const totalSales = useMemo(() => {
    return filteredBills.reduce((sum, bill) => sum + bill.netAmount, 0);
  }, [filteredBills]);

  const isSelectionMode = selectedBillIds.size > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-safe relative">
      <header className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-20 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">History</h1>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-full active:bg-gray-100 transition-colors ${isRefreshing ? 'opacity-50' : ''}`}
          >
            <RefreshCw size={20} className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search bills..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">From Date</label>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-100 border border-transparent rounded-lg text-xs focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">To Date</label>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-100 border border-transparent rounded-lg text-xs focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>
        
        {/* Aggregate Total */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col gap-3 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-blue-800 font-bold text-sm">Total Sales</span>
            <span className="text-blue-900 font-extrabold text-lg">₹{Number(totalSales || 0).toFixed(2)}</span>
          </div>
          {filteredBills.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={handleShareAll}
                disabled={isSharingAll}
                className="flex-1 bg-white border border-blue-200 text-blue-700 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 active:bg-blue-50 transition-colors text-xs shadow-sm disabled:opacity-50"
              >
                {isSharingAll ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Share2 size={14} />
                )}
                Share All
              </button>
              <button 
                onClick={handleDownloadAll}
                disabled={isSharingAll}
                className="flex-1 bg-blue-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 active:bg-blue-700 transition-colors text-xs shadow-sm disabled:opacity-50"
              >
                {isSharingAll ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Download size={14} />
                )}
                Download All
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28">
        {filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center mt-10">
            <FileText size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No bills found.</p>
            {(searchTerm || fromDate || toDate) && <p className="text-gray-400 text-sm mt-1">Try adjusting your filters.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {visibleBills.map(bill => (
                <motion.div
                  key={bill.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <BillHistoryCard 
                    bill={bill}
                    isSelected={selectedBillIds.has(bill.id)}
                    isSelectionMode={isSelectionMode}
                    onToggleSelect={handleToggleSelect}
                    onLongPress={handleLongPressSelect}
                    onEdit={onEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                    onShare={handleShare}
                    onDownload={handleDownload}
                    isSharing={isSharingId === bill.id}
                    isDownloading={isDownloadingId === bill.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {hasMore && (
              <div ref={lastElementRef} className="py-6 flex justify-center items-center">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-500 font-medium">Loading more bills...</span>
              </div>
            )}
            
            {!hasMore && filteredBills.length > 0 && (
              <div className="py-6 text-center">
                <span className="text-sm text-gray-400 font-medium">No more bills</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Bar for Selected Bills */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-2 left-3 right-3 max-w-md mx-auto z-40 bg-gray-900/95 text-white backdrop-blur-md rounded-xl shadow-xl px-3 py-1.5 border border-white/10 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-blue-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm shrink-0">
                {selectedBillIds.size}
              </span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] font-bold text-blue-300 hover:text-blue-200 active:underline whitespace-nowrap truncate"
              >
                {selectedBillIds.size === filteredBills.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleShareSelected}
                disabled={isSharingSelected || isDownloadingSelected}
                className="bg-white text-gray-900 font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 active:bg-gray-100 transition-all text-xs shadow-sm disabled:opacity-50"
              >
                {isSharingSelected ? (
                  <div className="w-3 h-3 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Share2 size={13} className="text-blue-600" />
                )}
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSelected}
                disabled={isSharingSelected || isDownloadingSelected}
                className="bg-blue-600 text-white font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 active:bg-blue-700 transition-all text-xs shadow-sm disabled:opacity-50"
              >
                {isDownloadingSelected ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Download size={13} />
                )}
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="p-1 rounded-lg text-gray-400 hover:text-white active:bg-white/10 transition-colors"
                title="Cancel Selection"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBill && (
          <PreviewModal 
            bill={selectedBill} 
            onClose={() => setSelectedBill(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {billToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Bill?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this bill? / क्या आप सच में इस बिल को डिलीट करना चाहते हैं?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setBillToDelete(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl active:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl active:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
