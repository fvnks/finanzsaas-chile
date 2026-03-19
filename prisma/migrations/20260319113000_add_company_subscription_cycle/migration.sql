ALTER TABLE "Company"
ADD COLUMN "subscriptionStartedAt" TIMESTAMP(3),
ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN "lastPaymentAt" TIMESTAMP(3),
ADD COLUMN "billingCycleMonths" INTEGER NOT NULL DEFAULT 1;
