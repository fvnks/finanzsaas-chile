
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  WORKER = 'WORKER',
  SUPERVISOR = 'SUPERVISOR'
}

export enum InvoiceType {
  COMPRA = 'COMPRA',
  VENTA = 'VENTA',
  NOTA_CREDITO = 'NOTA_CREDITO'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  allowedSections?: string[];
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
  tasks: string[];
  costCenterIds: string[];
  progress: number;
  startDate?: string;
  endDate?: string;
  workerIds: string[];
  createdAt: string;
  updatedAt: string;
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
  net: number;
  iva: number;
  total: number;
  clientId: string;
  costCenterId: string;
  projectId?: string;
  items?: InvoiceItem[];
  pdfUrl?: string;
  purchaseOrderNumber?: string;
  dispatchGuideNumber?: string;
  relatedInvoiceId?: string;
}

// ... existing types


// ... existing types

export interface DailyReport {
  id: string;
  userId: string; // ID of the user creating the report
  date: string;
  content: string;
  projectId?: string;
  createdAt: string;
}

export interface JobTitle {
  id: string;
  name: string;
  description?: string;
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
}
