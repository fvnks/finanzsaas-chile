-- ================================================
-- MIGRATION SQL: Pasos 3, 4 y 5
-- Módulos: Reportes Diarios, CRM, Proyectos
-- ================================================

-- ================================================
-- PASO 3: REPORTES DIARIOS
-- ================================================

-- Agregar columnas a DailyReport
ALTER TABLE "DailyReport" ADD COLUMN IF NOT EXISTS "status" VARCHAR NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "DailyReport" ADD COLUMN IF NOT EXISTS "attachments" TEXT[] DEFAULT '{}';
ALTER TABLE "DailyReport" ADD COLUMN IF NOT EXISTS "templateId" VARCHAR;

-- Crear tabla ReportTemplate
CREATE TABLE IF NOT EXISTS "ReportTemplate" (
  "id" VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR NOT NULL,
  "content" TEXT NOT NULL,
  "companyId" VARCHAR NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

-- Agregar FK a DailyReport.templateId
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE SET NULL;

-- ================================================
-- PASO 4: CRM
-- ================================================

-- Agregar columnas a Lead
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "score" INT DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "grade" VARCHAR;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "estimatedValue" FLOAT DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "assignedTo" VARCHAR;

-- Crear tabla LeadActivity
CREATE TABLE IF NOT EXISTS "LeadActivity" (
  "id" VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  "leadId" VARCHAR NOT NULL REFERENCES "Lead"("id") ON DELETE CASCADE,
  "type" VARCHAR NOT NULL,
  "content" TEXT NOT NULL,
  "userId" VARCHAR,
  "createdAt" TIMESTAMP DEFAULT now()
);

-- Crear tabla EmailTemplate
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "companyId" VARCHAR NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

-- ================================================
-- PASO 5: PROYECTOS
-- ================================================

-- Crear tabla ProjectMilestone
CREATE TABLE IF NOT EXISTS "ProjectMilestone" (
  "id" VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" VARCHAR NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "name" VARCHAR NOT NULL,
  "description" TEXT,
  "status" VARCHAR NOT NULL DEFAULT 'PENDING',
  "dueDate" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "order" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

-- Crear tabla TimeEntry
CREATE TABLE IF NOT EXISTS "TimeEntry" (
  "id" VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" VARCHAR NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "workerId" VARCHAR NOT NULL REFERENCES "Worker"("id"),
  "userId" VARCHAR NOT NULL,
  "date" TIMESTAMP NOT NULL,
  "hours" FLOAT NOT NULL DEFAULT 0,
  "description" TEXT,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

-- ================================================
-- NOTAS:
-- ================================================
--
-- 1. DailyReport.status valores: 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'
-- 2. Lead.status valores: 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'
-- 3. LeadActivity.type valores: 'CALL', 'MEETING', 'EMAIL', 'NOTE', 'STATUS_CHANGE', 'QUOTE_SENT'
-- 4. Lead.grade valores: 'A' (>=70), 'B' (40-69), 'C' (1-39)
-- 5. ProjectMilestone.status valores: 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'
--
-- Si Prisma migrate funciona, ejecutar:
--   npx prisma migrate dev --name add_reports_crm_projects_enhancements
-- ================================================
