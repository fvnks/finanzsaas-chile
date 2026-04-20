-- Enable Row Level Security (RLS) for all multi-tenant tables
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CostCenter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Worker" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Crew" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobTitle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentRequirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientMonthlyInfo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tool" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Epp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;

-- Create Tenant Isolation Policies
-- These policies use current_setting('app.current_company_id', true) to filter records based on the active company.

CREATE POLICY tenant_isolation_client ON "Client" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_project ON "Project" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_costcenter ON "CostCenter" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_worker ON "Worker" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_crew ON "Crew" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_jobtitle ON "JobTitle" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_invoice ON "Invoice" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_payment ON "Payment" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_supplier ON "Supplier" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_dailyreport ON "DailyReport" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_reporttemplate ON "ReportTemplate" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_purchaseorder ON "PurchaseOrder" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_document ON "Document" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_documentrequirement ON "DocumentRequirement" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_product ON "Product" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_warehouse ON "Warehouse" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_inventorymovement ON "InventoryMovement" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_clientmonthlyinfo ON "ClientMonthlyInfo" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_plan ON "Plan" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_tool ON "Tool" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_epp ON "Epp" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_lead ON "Lead" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_emailtemplate ON "EmailTemplate" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_quote ON "Quote" USING ("companyId"::text = current_setting('app.current_company_id', true));
CREATE POLICY tenant_isolation_bankaccount ON "BankAccount" USING ("companyId"::text = current_setting('app.current_company_id', true));

-- Special policy for Expense (allows read/write if company is either origin or target)
DROP POLICY IF EXISTS tenant_isolation_expense ON "Expense";
CREATE POLICY tenant_isolation_expense ON "Expense" 
USING (
    "originCompanyId"::text = current_setting('app.current_company_id', true) OR 
    "targetCompanyId"::text = current_setting('app.current_company_id', true)
);

-- Note: Child tables like InvoiceItem, ProjectMilestone, etc., are currently protected 
-- implicitly by joins in the application layer. Consider adding RLS to them if direct access is needed.
