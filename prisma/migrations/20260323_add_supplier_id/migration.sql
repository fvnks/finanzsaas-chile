-- Add supplierId column to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "supplierId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add relation field to Supplier model (Prisma requires this for the relation to work)
-- Note: This is handled by Prisma Client at runtime, no DB change needed for the inverse relation
