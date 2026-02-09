
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
  NOTA_DEBITO = 'NOTA_DEBITO'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  allowedSections?: string[];
  assignedProjectIds?: string[];
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

export interface DocumentRequirement {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  documents?: Document[];
  status?: string; // 'PENDING' | 'OK'
  dueDate?: string;
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
