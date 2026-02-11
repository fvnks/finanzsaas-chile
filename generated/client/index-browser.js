
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.0.0
 * Query Engine version: 5dbef10bdbfb579e07d35cc85fb1518d357cb99e
 */
Prisma.prismaVersion = {
  client: "6.0.0",
  engine: "5dbef10bdbfb579e07d35cc85fb1518d357cb99e"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  name: 'name',
  role: 'role',
  allowedSections: 'allowedSections',
  assignedProjectIds: 'assignedProjectIds',
  activeCompanyId: 'activeCompanyId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompanyScalarFieldEnum = {
  id: 'id',
  rut: 'rut',
  name: 'name',
  logoUrl: 'logoUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  rut: 'rut',
  name: 'name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.ProjectScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  status: 'status',
  clientId: 'clientId',
  progress: 'progress',
  budget: 'budget',
  address: 'address',
  startDate: 'startDate',
  endDate: 'endDate',
  workerIds: 'workerIds',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.CostCenterScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  budget: 'budget',
  createAt: 'createAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.WorkerScalarFieldEnum = {
  id: 'id',
  rut: 'rut',
  name: 'name',
  role: 'role',
  specialty: 'specialty',
  email: 'email',
  phone: 'phone',
  experienceYears: 'experienceYears',
  certifications: 'certifications',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.CrewScalarFieldEnum = {
  id: 'id',
  name: 'name',
  role: 'role',
  projectId: 'projectId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.JobTitleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  number: 'number',
  date: 'date',
  dueDate: 'dueDate',
  status: 'status',
  type: 'type',
  emissionType: 'emissionType',
  purchaseOrderNumber: 'purchaseOrderNumber',
  dispatchGuideNumber: 'dispatchGuideNumber',
  netAmount: 'netAmount',
  taxAmount: 'taxAmount',
  totalAmount: 'totalAmount',
  clientId: 'clientId',
  projectId: 'projectId',
  costCenterId: 'costCenterId',
  relatedInvoiceId: 'relatedInvoiceId',
  isPaid: 'isPaid',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.InvoiceItemScalarFieldEnum = {
  id: 'id',
  description: 'description',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  total: 'total',
  invoiceId: 'invoiceId'
};

exports.Prisma.DailyReportScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  date: 'date',
  content: 'content',
  projectId: 'projectId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.PurchaseOrderScalarFieldEnum = {
  id: 'id',
  number: 'number',
  provider: 'provider',
  date: 'date',
  status: 'status',
  projectId: 'projectId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.PurchaseOrderItemScalarFieldEnum = {
  id: 'id',
  description: 'description',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  total: 'total',
  purchaseOrderId: 'purchaseOrderId'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  url: 'url',
  type: 'type',
  projectId: 'projectId',
  clientId: 'clientId',
  createdAt: 'createdAt',
  requirementId: 'requirementId',
  status: 'status',
  companyId: 'companyId'
};

exports.Prisma.DocumentRequirementScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  month: 'month',
  year: 'year',
  status: 'status',
  dueDate: 'dueDate',
  clientId: 'clientId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.MaterialScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  unit: 'unit',
  minStock: 'minStock',
  currentStock: 'currentStock',
  price: 'price',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.InventoryMovementScalarFieldEnum = {
  id: 'id',
  type: 'type',
  quantity: 'quantity',
  date: 'date',
  description: 'description',
  materialId: 'materialId',
  projectId: 'projectId',
  createdAt: 'createdAt',
  companyId: 'companyId'
};

exports.Prisma.ClientMonthlyInfoScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  month: 'month',
  year: 'year',
  edpDate: 'edpDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.PlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  imageUrl: 'imageUrl',
  projectId: 'projectId',
  costCenterId: 'costCenterId',
  stages: 'stages',
  systemType: 'systemType',
  installationType: 'installationType',
  installationDetail: 'installationDetail',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  companyId: 'companyId'
};

exports.Prisma.PlanMarkScalarFieldEnum = {
  id: 'id',
  planId: 'planId',
  userId: 'userId',
  x: 'x',
  y: 'y',
  points: 'points',
  type: 'type',
  date: 'date',
  meters: 'meters',
  comment: 'comment',
  imageUrl: 'imageUrl',
  stage: 'stage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  Company: 'Company',
  Client: 'Client',
  Project: 'Project',
  CostCenter: 'CostCenter',
  Worker: 'Worker',
  Crew: 'Crew',
  JobTitle: 'JobTitle',
  Invoice: 'Invoice',
  InvoiceItem: 'InvoiceItem',
  DailyReport: 'DailyReport',
  PurchaseOrder: 'PurchaseOrder',
  PurchaseOrderItem: 'PurchaseOrderItem',
  Document: 'Document',
  DocumentRequirement: 'DocumentRequirement',
  Material: 'Material',
  InventoryMovement: 'InventoryMovement',
  ClientMonthlyInfo: 'ClientMonthlyInfo',
  Plan: 'Plan',
  PlanMark: 'PlanMark'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
