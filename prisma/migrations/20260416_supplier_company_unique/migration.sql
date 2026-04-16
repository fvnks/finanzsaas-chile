DROP INDEX IF EXISTS "Supplier_rut_key";

CREATE UNIQUE INDEX "Supplier_rut_companyId_key" ON "Supplier"("rut", "companyId");
