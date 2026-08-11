export interface SupplierProfile {
  businessName: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  terms: string;
  termsList?: string[];
  authorizedSignatory: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upi?: string;
}

export interface AppSettings {
  id: string; // "default"
  supplier: SupplierProfile;
  invoice: {
    prefix: string;
    startNumber: number;
    defaultPlaceOfSupply?: string;
    defaultStateCode?: string;
    defaultBuyerState?: string;
    defaultBuyerCity?: string;
  };
  preferences: {
    showEwayBill: boolean;
    darkMode?: boolean;
  };
  updatedAt: number;
  syncStatus: 'synced' | 'pending_sync';
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  per: string;
  amount: number;
}

export interface Bill {
  id: string; // Unique ID (e.g. timestamp or UUID)
  invoiceNumber: string;
  date: string; // ISO string
  
  customerName: string;
  customerCity: string;
  customerState: string;
  customerStateCode: string;

  placeOfSupply: string;
  supplyStateCode: string;
  modeOfPay: string;
  transportRef: string;
  ewayBillNo: string;
  dispatchThrough: string;

  items: InvoiceItem[];
  totalAmount: number;
  discount: number;
  roundOff: number;
  netAmount: number;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending_sync';
}
