export type Role = 'ADMIN' | 'STAFF' | 'MANAGER';

export type User = {
  id: string;
  username: string;
  password?: string;
  role: Role;
  permissions: string[]; // e.g., 'MANAGE_USERS', 'MANAGE_MASTER', 'VIEW_REPORTS', 'MANAGE_TRANSACTIONS'
  allowedCategoryIds?: string[]; // If set and not empty, restrict access to these categories.
};

export type Category = {
  id: string;
  name: string;
};

export type Unit = {
  id: string;
  name: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
};

export type Staff = {
  id: string;
  name: string;
  phone?: string;
};

export type Item = {
  id: string;
  sku: string;
  name: string;
  imageUrl?: string;
  categoryId: string;
  unitId: string;
  stock: number;
  unbatchedStock?: number;
  minStock: number;
  sellingPrice?: number;
  expiryDate?: string;
  batchNumber?: string;
  batches?: { batchNumber: string; expiryDate: string; stock?: number }[];
  supplierId?: string;
  altSupplierId?: string;
  alternateUnits?: { unitId: string; conversionRate: number }[];
};

export type TransactionType = 'IN' | 'OUT';

export type Transaction = {
  id: string;
  groupId?: string;
  date: string;
  type: TransactionType;
  itemId: string;
  qty: number; // base quantity
  displayUnitId?: string; // unit used at checkout
  displayQty?: number; // quantity in display units
  conversionRate?: number; // conversion from display to base
  supplierId?: string; // Only for 'IN' usually, or optional
  notes: string;
  userId: string;
  invoiceId?: string; // Link to invoice
  returnDate?: string;
  returnNote?: string;
};

export type PurchaseInvoiceStatus = 'COMPLETED' | 'CANCELED' | 'RETURNED';

export type PurchaseInvoiceItem = {
  id: string;
  itemId: string;
  qty: number; // input quantity based on selected unit
  baseQty?: number; // computed stock quantity
  selectedUnitId?: string;
  conversionRate?: number;
  returnedQty: number; // in base units
  price: number;
  discountType: 'Rp' | '%';
  discountValue: number;
  batchNo: string;
  expDate: string;
  subtotal: number;
};

export type PurchaseInvoice = {
  id: string;
  invoiceNo: string;
  supplierId: string;
  warehouse: string;
  invoiceDate: string;
  paymentMethod: string;
  dueDays: number;
  invoiceDiscType: 'Rp' | '%';
  invoiceDiscValue: number;
  useTax: boolean;
  taxPercent: number;
  paidAmount: number;
  items: PurchaseInvoiceItem[];
  status: PurchaseInvoiceStatus;
  createdAt: string;
  total: number;
};

export type WarehouseProfile = {
  name: string;
  address: string;
  phone: string;
  logo?: string;
};

export type AppData = {
  users: User[];
  categories: Category[];
  units: Unit[];
  suppliers: Supplier[];
  staffs: Staff[];
  items: Item[];
  transactions: Transaction[];
  purchaseInvoices: PurchaseInvoice[];
  theme: 'light' | 'dark';
  colorTheme: 'indigo' | 'emerald' | 'blue' | 'orange' | 'rose';
  navBgColor?: string;
  navTextColor?: string;
  navIsTransparent?: boolean;
  warehouseProfile?: WarehouseProfile;
};
