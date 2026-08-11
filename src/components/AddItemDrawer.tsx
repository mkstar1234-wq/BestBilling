import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { hapticFeedback } from '../lib/haptics';

interface AddItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: { description: string; hsnSac: string; quantity: number; rate: number; per: string }) => void;
}

export function AddItemDrawer({ isOpen, onClose, onAdd }: AddItemDrawerProps) {
  const [description, setDescription] = useState('');
  const [hsnSac, setHsnSac] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [per, setPer] = useState('PCS');

  const handleAdd = () => {
    if (!description || !quantity || !rate) {
      hapticFeedback('error');
      return;
    }
    
    hapticFeedback('success');
    onAdd({
      description,
      hsnSac,
      quantity: Number(quantity),
      rate: Number(rate),
      per,
    });
    
    // Reset form
    setDescription('');
    setHsnSac('');
    setQuantity('');
    setRate('');
    setPer('PCS');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-4 shadow-xl max-w-md mx-auto border-t border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Item</h3>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full active:bg-gray-200">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4 pb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Cotton T-Shirt"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HSN/SAC Code (Optional)</label>
                <input
                  type="text"
                  value={hsnSac}
                  onChange={(e) => setHsnSac(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  placeholder="e.g. 6205"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Per (Unit)</label>
                  <input
                    type="text"
                    value={per}
                    onChange={(e) => setPer(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                    placeholder="PCS"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                onClick={handleAdd}
                className="w-full py-4 mt-2 bg-blue-600 text-white font-bold rounded-xl active:bg-blue-700 shadow-md transition-colors"
              >
                Add Item
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
