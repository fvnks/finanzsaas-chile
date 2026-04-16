
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  WORKER = 'WORKER',
  SUPERVISOR = 'SUPERVISOR'
}

export enum InvoiceType {
  COMPRA = 'COMPRA',
  VENTA = 'VENTA',
  NOTA_CREDITO = 'NOTA_CREDITO',
  NOTA_DEBITO = 'NOTA_DEBITO',
  GUIA_DESPACHO = 'GUIA_DESPACHO',
  FACTURA_EXENTA = 'FACTURA_EXENTA'
}

export interface Company {
  id: string;
  name: string;
  rut: string;
  logoUrl?: string;
  primaryColor?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  planId?: string;
  planStatus?: string;
  modules?: string[];
  plan?: SubscriptionPlan;
  userCount?: number;
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;
  lastPaymentAt?: string;
  billingCycleMonths?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  allowedSections?: string[];
  assignedProjectIds?: string[];
  companies?: Company[];
  activeCompanyId?: string;
}

export interface Client {
  id: string;
  rut: string;
  razonSocial: string;
  nombreComercial: string;
  email: string;
  telefono: string;
  notas?: string;
}

export interface Worker {
  id: string;
  rut: string;
  name: string;
  role: string;
  specialty: string;
  email?: string;
  phone?: string;
  experienceYears?: number;
  certifications?: string[];
}

export interface Crew {
  id: string;
  name: string;
  workerIds: string[];
  projectId?: string;
}

export interface CostCenter {
  id: string;
  code: string; // Internal Code (e.g., BRJ-01)
  name: string;
  budget?: number;
  projectIds: string[]; // Relación con proyectos
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  clientId?: string;
  budget: number;
  address?: string;
  tasks?: string[];
  costCenterIds: string[];
  progress: number;
  startDate?: string;
  endDate?: string;
  workerIds: string[];
  milestones?: ProjectMilestone[];
  timeEntries?: TimeEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  dueDate?: string;
  completedAt?: string;
  order: number;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  workerId: string;
  userId: string;
  date: string;
  hours: number;
  description?: string;
  createdAt: string;
  worker?: Worker;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  type: InvoiceType;
  number: string;
  date: string;
  dueDate?: string; // Added for Cash Flow
  net: number;
  iva: number;
  total: number;
  clientId?: string;
  supplierId?: string;
  supplier?: Supplier;
  costCenterId: string;
  projectId?: string;
  items?: InvoiceItem[];
  payments?: Payment[]; // Optional to avoid breaking existing assignments
  pdfUrl?: string;
  relatedInvoiceId?: string;
  relatedInvoice?: Invoice;
  purchaseOrderNumber?: string;
  dispatchGuideNumber?: string;
  hesNumber?: string;
  status?: 'CANCELLED' | 'PENDING' | 'PAID';
  isPaid: boolean;
  paymentDate?: string;
  currency?: 'CLP' | 'UF' | 'USD';
  exchangeRate?: number;
  companyId: string;
  paymentStatus?: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string | Date;
  method: string;
  reference?: string;
  comment?: string;
  invoiceId: string;
  companyId: string;
}


export interface DailyReport {
  id: string;
  userId: string; // ID of the user creating the report
  date: string;
  content: string;
  projectId?: string;
  status: string;
  attachments: string[];
  templateId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  content: string;
  companyId: string;
  createdAt: string;
}

export interface JobTitle {
  id: string;
  name: string;
  description?: string;
}

export interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  projectId?: string;
  clientId?: string;
  requirementId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  color?: string;
  companyId: string;
}

export interface DocumentRequirement {
  id: string;
  name: string;
  description?: string;
  clientId: string;

  month?: number;
  year?: number;

  documents?: Document[];
  status?: string; // 'PENDING' | 'REVIEW' | 'OK'
  dueDate?: string;

  categoryId?: string;
  category?: DocumentCategory;

  createdAt: string;
  updatedAt: string;
}

export interface ClientMonthlyInfo {
  id: string;
  clientId: string;
  month: number;
  year: number;
  edpDate?: string;
  createdAt: string;
  updatedAt: string;
}


export type AppState = {
  user: User | null;
  clients: Client[];
  invoices: Invoice[];
  projects: Project[];
  costCenters: CostCenter[];
  workers: Worker[];
  crews: Crew[];
  jobTitles: JobTitle[];
  dailyReports: DailyReport[];
  documents: Document[];
  requirements: DocumentRequirement[];
  plans: Plan[];
  tools: Tool[];
  epps: Epp[];
  eppDeliveries: EppDelivery[];
  toolAssignments: ToolAssignment[];
  products: Product[];
  warehouses: Warehouse[];
  inventoryMovements: InventoryMovement[];
  bankAccounts?: BankAccount[];
  exchangeRates?: ExchangeRate[];
}

export interface Plan {
  id: string;
  name: string;
  imageUrl: string;
  projectId?: string;
  costCenterId?: string;
  stages?: number;
  systemType?: string;
  installationType?: string;
  installationDetail?: string;
  marks?: PlanMark[];
}

export interface PlanMark {
  id: string;
  planId: string;
  userId: string;
  x: number;
  y: number;
  date: string; // ISO Date
  meters: number;
  comment?: string;
  imageUrl?: string;
  points?: { x: number; y: number }[];
  type?: 'POINT' | 'PATH';
  user?: User;
  workers?: Worker[]; // Relation
  stage?: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  rut: string;
  razonSocial: string;
  fantasyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
  companyId: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category?: string;
  date: string;
  originCompanyId: string;
  originCompany?: Company;
  targetCompanyId: string;
  targetCompany?: Company;
  workerId?: string;
  worker?: Worker;
  invoiceNumber?: string;
  invoiceId?: string;
  invoice?: Invoice;
  status: 'PENDING' | 'SETTLED';
  distributions?: ExpenseDistribution[];
  currency?: 'CLP' | 'UF' | 'USD';
  exchangeRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseDistribution {
  id: string;
  amount: number;
  expenseId: string;
  projectId?: string;
  project?: Project;
  costCenterId?: string;
  costCenter?: CostCenter;
}



export interface ToolMaintenance {
  id: string;
  date: string;
  description: string;
  cost: number;
  provider?: string;
  toolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tool {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE' | 'RETIRED';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenances?: ToolMaintenance[];
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Epp {
  id: string;
  name: string;
  description?: string;
  stock: number;
  companyId: string;
}

export interface EppDelivery {
  id: string;
  quantity: number;
  date: string;
  notes?: string;
  workerId: string;
  worker?: Worker;
  eppId: string;
  epp?: Epp;
}

export interface ToolAssignment {
  id: string;
  assignedAt: string;
  returnedAt?: string;
  notes?: string;
  workerId: string;
  worker?: Worker;
  toolId: string;
  tool?: Tool;
}

// --- CRM MODULE ---

export interface Lead {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  source?: string;
  notes?: string;
  score: number;
  grade?: 'A' | 'B' | 'C';
  estimatedValue: number;
  assignedTo?: string;
  quotes?: Quote[];
  activities?: LeadActivity[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  companyId: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE' | 'STATUS_CHANGE' | 'QUOTE_SENT';
  content: string;
  userId?: string;
  createdAt?: string | Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  companyId: string;
  createdAt?: string | Date;
}

export interface Quote {
  id: string;
  number: string;
  date: string | Date;
  validUntil?: string | Date;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  leadId?: string;
  lead?: Lead;
  items?: QuoteItem[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  companyId: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  quoteId: string;
  quote?: Quote;
}

// --- NEW INVENTORY MODULE ---
export interface Product {
    id: string;
    code?: string;
    name: string;
    description?: string;
    type: 'GOOD' | 'SERVICE';
    category?: string;
    unit: string;
    price: number;
    stocks?: Stock[];
    movements?: InventoryMovement[];
    createdAt: string;
    updatedAt: string;
    companyId: string;
}

export interface Warehouse {
    id: string;
    name: string;
    location?: string;
    manager?: string;
    stocks?: Stock[];
    movementsFrom?: InventoryMovement[];
    movementsTo?: InventoryMovement[];
    createdAt: string;
    updatedAt: string;
    companyId: string;
}

export interface Stock {
    id: string;
    quantity: number;
    minStock: number;
    productId: string;
    product?: Product;
    warehouseId: string;
    warehouse?: Warehouse;
    updatedAt: string;
}

export interface InventoryMovement {
    id: string;
    type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
    quantity: number;
    date: string;
    description?: string;
    productId: string;
    product?: Product;
    fromWarehouseId?: string;
    fromWarehouse?: Warehouse;
    toWarehouseId?: string;
    toWarehouse?: Warehouse;
    projectId?: string;
    project?: Project;
    createdAt: string;
    companyId: string;
}

// --- FINANCE MODULE ---

export interface BankAccount {
    id: string;
    name: string;
    number?: string;
    currency: 'CLP' | 'UF' | 'USD';
    balance: number;
    transactions?: BankTransaction[];
    createdAt: string;
    updatedAt: string;
    companyId: string;
}

export interface BankTransaction {
    id: string;
    date: string;
    type: 'IN' | 'OUT';
    amount: number;
    description?: string;
    reference?: string;
    category?: string;
    bankAccountId: string;
    bankAccount?: BankAccount;
    createdAt: string;
    updatedAt: string;
}

export interface ExchangeRate {
    id: string;
    date: string;
    currency: 'UF' | 'USD';
    value: number;
    createdAt: string;
    updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description?: string;
  features: string[];
  modules: string[];
  maxUsers?: number | null;
  maxStorageGB?: number | null;
  createdAt?: string;
  updatedAt?: string;
}
