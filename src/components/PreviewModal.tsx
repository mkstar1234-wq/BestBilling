import { useState, useEffect } from 'react';
import { X, Share2, Download } from 'lucide-react';
import { Bill, SupplierProfile } from '../types';
import { generateInvoicePDF } from '../lib/pdfGenerator';
import { sharePDF, downloadBlob } from '../lib/shareUtils';
import { getLocalSettings } from '../lib/offlineSync';
import { hapticFeedback } from '../lib/haptics';
import { formatInvoiceDate } from '../lib/billingLogic';

interface PreviewModalProps {
  bill: Bill | null;
  onClose: () => void;
}

export function PreviewModal({ bill, onClose }: PreviewModalProps) {
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!bill) return;
      const settings = await getLocalSettings();
      const sup = settings?.supplier || {
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
      setSupplier(sup);
    }
    loadData();
  }, [bill]);

  if (!bill) return null;

  const handleShare = async () => {
    if (!supplier) return;
    hapticFeedback('light');
    setIsGenerating(true);
    try {
      const blob = await generateInvoicePDF(bill, supplier);
      const filename = `Bill_${bill.invoiceNumber}.pdf`;
      await sharePDF(blob, filename);
    } catch (err) {
      console.error("Failed to generate and share PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!supplier) return;
    hapticFeedback('light');
    setIsGenerating(true);
    try {
      const blob = await generateInvoicePDF(bill, supplier);
      const filename = `Bill_${bill.invoiceNumber}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("Failed to generate and download PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const totalQty = bill.items.reduce((sum, item) => sum + item.quantity, 0);
  
  let termsText = '';
  if (supplier?.termsList && supplier.termsList.length > 0) {
    termsText = supplier.termsList.filter(t => t.trim() !== '').map((t, i) => `${i + 1}. ${t}`).join('\n');
  } else if (supplier?.terms) {
    termsText = supplier.terms;
  } else {
    termsText = "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed.\n3. Subject to local jurisdiction.\n4. E.& O.E.";
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col pt-safe animate-in fade-in duration-200">
      <div className="bg-white flex-1 mt-4 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">Bill Preview</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 text-gray-600 rounded-full active:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content (HTML Replica) */}
        <div className="flex-1 bg-gray-100 overflow-y-auto p-2 sm:p-4 relative">
          <div className="print-safe-preview bg-white w-full max-w-3xl mx-auto border border-gray-300 shadow-sm text-black font-sans text-[10px] leading-tight flex flex-col min-h-max pb-4">
            {/* Invoice Header */}
            <div className="text-center pt-2 px-2">
              <p className="text-[7px] uppercase tracking-wider mb-1">COMPOSITION TAXABLE PERSON, NOT ELIGIBLE TO COLLECT TAX ON SUPPLIES</p>
              <h1 className="font-bold text-sm mb-2">BILL OF SUPPLY</h1>
              <h2 className="font-bold text-base">{supplier?.businessName || 'ADARSH COLLECTION'}</h2>
              <p className="text-[9px] mb-1">{supplier?.address}</p>
              <p className="text-[9px]">
                {supplier?.phone ? `Mob: ${supplier.phone}` : ''} 
                {supplier?.phone && supplier?.gstin ? ' | ' : ''}
                {supplier?.gstin ? `GSTIN: ${supplier.gstin}` : ''}
              </p>
            </div>

            {/* Grid 1: Buyer and Info */}
            <div className="grid grid-cols-2 border border-black mt-3 mx-2">
              {/* Left Side: Buyer */}
              <div className="border-r border-black p-1.5 flex flex-col justify-start">
                <p className="text-[8px] mb-1">Buyer (Bill to)</p>
                <p className="font-bold text-xs">{bill.customerName}</p>
                {bill.customerCity && <p>{bill.customerCity}</p>}
                {(bill.customerState || bill.customerStateCode) && (
                  <p>{bill.customerState} {bill.customerStateCode ? `(Code: ${bill.customerStateCode})` : ''}</p>
                )}
              </div>
              
              {/* Right Side: Info 4 rows */}
              <div className="grid grid-cols-2 grid-rows-4">
                <div className="border-b border-r border-black p-1">
                  <p className="font-bold text-[7px]">BILL NO.</p>
                  <p>{bill.invoiceNumber}</p>
                </div>
                <div className="border-b border-black p-1">
                  <p className="font-bold text-[7px]">DATE</p>
                  <p>{formatInvoiceDate(bill.date).text}</p>
                </div>
                
                <div className="border-b border-r border-black p-1">
                  <p className="font-bold text-[7px]">PLACE OF SUPPLY</p>
                  <p>{bill.placeOfSupply || '-'}</p>
                </div>
                <div className="border-b border-black p-1">
                  <p className="font-bold text-[7px]">STATE CODE</p>
                  <p>{bill.supplyStateCode || '-'}</p>
                </div>
                
                <div className="border-b border-r border-black p-1">
                  <p className="font-bold text-[7px]">MODE OF PAY</p>
                  <p>{bill.modeOfPay || '-'}</p>
                </div>
                <div className="border-b border-black p-1">
                  <p className="font-bold text-[7px]">TRANSPORT / REF</p>
                  <p>{bill.transportRef || '-'}</p>
                </div>
                
                <div className="border-r border-black p-1">
                  <p className="font-bold text-[7px]">E-WAY BILL NO.</p>
                  <p>{bill.ewayBillNo || '-'}</p>
                </div>
                <div className="p-1">
                  <p className="font-bold text-[7px]">DISPATCH THROUGH</p>
                  <p>{bill.dispatchThrough || '-'}</p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mx-2 mt-0 border-x border-b border-black flex-1 flex flex-col min-h-[200px]">
              <table className="w-full text-left border-collapse h-full flex-1">
                <thead>
                  <tr className="border-b border-black">
                    <th className="p-1 border-r border-black font-bold text-center w-8">Sl No.</th>
                    <th className="p-1 border-r border-black font-bold">Description of Goods</th>
                    <th className="p-1 border-r border-black font-bold text-center w-12">HSN/SAC</th>
                    <th className="p-1 border-r border-black font-bold text-right w-12">Quantity</th>
                    <th className="p-1 border-r border-black font-bold text-right w-12">Rate</th>
                    <th className="p-1 border-r border-black font-bold text-center w-8">Per</th>
                    <th className="p-1 font-bold text-right w-16">Amount</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {bill.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="p-1 border-r border-black text-center">{idx + 1}</td>
                      <td className="p-1 border-r border-black">{item.description}</td>
                      <td className="p-1 border-r border-black text-center">{item.hsnSac}</td>
                      <td className="p-1 border-r border-black text-right">{item.quantity}</td>
                      <td className="p-1 border-r border-black text-right">{Number(item.rate || 0).toFixed(2)}</td>
                      <td className="p-1 border-r border-black text-center">{item.per || 'PCS'}</td>
                      <td className="p-1 text-right border-black border-l-0">{Number(item.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Fill empty space logic is tricky in HTML, we will just use min-height on tbody and let vertical lines stretch via cell borders if we added empty rows, but for HTML rendering flex-1 is enough. Let's just make the last row stretch. */}
                  <tr className="flex-1">
                    <td className="border-r border-black h-full"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Box */}
            <div className="mx-2 flex justify-end border-x border-b border-black">
              <div className="w-[120px] text-right p-1 font-bold flex-1">
                {bill.discount ? <div className="mb-0.5">Less: Discount</div> : null}
                {bill.roundOff ? <div className="mb-0.5">Add: Round Off</div> : null}
                <div>Total</div>
              </div>
              <div className="w-[48px] text-right p-1 border-l border-black font-bold">
                {totalQty > 0 ? (
                  <>
                    {bill.discount ? <div className="mb-0.5 invisible">0</div> : null}
                    {bill.roundOff ? <div className="mb-0.5 invisible">0</div> : null}
                    <div>{totalQty}</div>
                  </>
                ) : null}
              </div>
              <div className="w-[48px] border-l border-black"></div>
              <div className="w-[32px] border-l border-black"></div>
              <div className="w-[64px] text-right p-1 border-l border-black font-bold">
                {bill.discount ? <div className="mb-0.5 font-normal">-{Number(bill.discount || 0).toFixed(2)}</div> : null}
                {bill.roundOff ? <div className="mb-0.5 font-normal">{bill.roundOff > 0 ? '+' : ''}{Number(bill.roundOff || 0).toFixed(2)}</div> : null}
                <div>{Number(bill.netAmount || 0).toFixed(2)}</div>
              </div>
            </div>

            {/* Footer sections */}
            <div className="mx-2 grid grid-cols-2 border-x border-b border-black">
              {/* Declaration & Bank */}
              <div className="border-r border-black p-1.5 flex flex-col justify-between">
                <div>
                  <p className="font-bold mb-0.5 text-[8px]">DECLARATION & TERMS</p>
                  <p className="whitespace-pre-line text-[7px] leading-tight mb-2">
                    {termsText}
                  </p>
                </div>
                <div>
                  <p className="font-bold mb-0.5 text-[8px]">BANK ACCOUNT DETAILS</p>
                  <div className="text-[7px]">
                    {supplier?.bankName && <p>Bank Name: {supplier.bankName}</p>}
                    {supplier?.accountNumber && <p>A/C No: {supplier.accountNumber}</p>}
                    {supplier?.ifsc && <p>IFSC: {supplier.ifsc}</p>}
                    {supplier?.upi && <p>UPI: {supplier.upi}</p>}
                  </div>
                </div>
              </div>
              {/* Signatory */}
              <div className="p-1.5 flex flex-col justify-between items-end text-right">
                <p className="font-bold text-[8px]">for {supplier?.businessName || 'ADARSH COLLECTION'}</p>
                <p className="mt-12 text-[7px]">{supplier?.authorizedSignatory || 'Authorised Signatory'}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Actions Bottom Bar */}
        <div className="p-4 bg-white border-t border-gray-100 flex gap-4 pb-safe z-10 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            onClick={handleShare}
            disabled={isGenerating}
            className="flex-1 bg-blue-50 border border-blue-100 text-blue-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:bg-blue-100 transition-colors shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Share2 size={20} />
            )}
            Share
          </button>
          <button 
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download size={20} />
            )}
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
