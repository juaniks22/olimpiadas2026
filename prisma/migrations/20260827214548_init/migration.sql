-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GENERIC');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('NORMAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "CallOrigin" AS ENUM ('INTRA_HOSPITAL', 'EXTRA_HOSPITAL');

-- CreateEnum
CREATE TYPE "PatientIdentificationType" AS ENUM ('DNI', 'TEMPORARY_ID', 'NN');

-- CreateEnum
CREATE TYPE "CrashCartStatus" AS ENUM ('IN_SERVICE', 'OUT_OF_SERVICE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "type" "CallType" NOT NULL,
    "origin" "CallOrigin" NOT NULL,
    "areaId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_forms" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "patientIdentificationType" "PatientIdentificationType" NOT NULL,
    "patientDni" TEXT,
    "patientTemporaryId" TEXT,
    "patientSex" TEXT,
    "patientAge" INTEGER,
    "admissionDate" TIMESTAMP(3),
    "timeSinceDiscoveryMinutes" INTEGER,
    "callReceivedAt" TIMESTAMP(3),
    "teamArrivalAt" TIMESTAMP(3),
    "cprStartedAt" TIMESTAMP(3),
    "returnOfSpontaneousCirculationAt" TIMESTAMP(3),
    "eventEndedAt" TIMESTAMP(3),
    "airwayManagement" TEXT,
    "venousAccess" TEXT,
    "postResuscitationStatus" TEXT,
    "suspensionCause" TEXT,
    "crashCartId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defibrillation_records" (
    "id" TEXT NOT NULL,
    "eventFormId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "energyDelivered" DOUBLE PRECISION,
    "rhythm" TEXT,

    CONSTRAINT "defibrillation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drugs_administered" (
    "id" TEXT NOT NULL,
    "eventFormId" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "dose" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "route" TEXT,
    "administeredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drugs_administered_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_team_positions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "response_team_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "certifications" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_team_assignments" (
    "id" TEXT NOT NULL,
    "eventFormId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "response_team_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_cart_positions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crash_cart_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_cart_items" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standardQuantity" INTEGER NOT NULL,
    "unit" TEXT,

    CONSTRAINT "crash_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_carts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CrashCartStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "reactivatedAt" TIMESTAMP(3),
    "reactivatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crash_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_cart_item_stocks" (
    "id" TEXT NOT NULL,
    "crashCartId" TEXT NOT NULL,
    "crashCartItemId" TEXT NOT NULL,
    "intactUnitsRemaining" INTEGER NOT NULL,

    CONSTRAINT "crash_cart_item_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_cart_consumptions" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "crashCartId" TEXT NOT NULL,
    "crashCartItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crash_cart_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "areas_name_key" ON "areas"("name");

-- CreateIndex
CREATE INDEX "calls_createdByUserId_idx" ON "calls"("createdByUserId");

-- CreateIndex
CREATE INDEX "calls_areaId_idx" ON "calls"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "event_forms_callId_key" ON "event_forms"("callId");

-- CreateIndex
CREATE INDEX "defibrillation_records_eventFormId_idx" ON "defibrillation_records"("eventFormId");

-- CreateIndex
CREATE INDEX "drugs_administered_eventFormId_idx" ON "drugs_administered"("eventFormId");

-- CreateIndex
CREATE UNIQUE INDEX "response_team_positions_name_key" ON "response_team_positions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_dni_key" ON "staff_members"("dni");

-- CreateIndex
CREATE INDEX "response_team_assignments_eventFormId_idx" ON "response_team_assignments"("eventFormId");

-- CreateIndex
CREATE INDEX "response_team_assignments_positionId_idx" ON "response_team_assignments"("positionId");

-- CreateIndex
CREATE INDEX "response_team_assignments_staffMemberId_idx" ON "response_team_assignments"("staffMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "crash_cart_positions_name_key" ON "crash_cart_positions"("name");

-- CreateIndex
CREATE INDEX "crash_cart_items_positionId_idx" ON "crash_cart_items"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "crash_carts_name_key" ON "crash_carts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crash_cart_item_stocks_crashCartId_crashCartItemId_key" ON "crash_cart_item_stocks"("crashCartId", "crashCartItemId");

-- CreateIndex
CREATE INDEX "crash_cart_consumptions_callId_idx" ON "crash_cart_consumptions"("callId");

-- CreateIndex
CREATE INDEX "crash_cart_consumptions_crashCartId_idx" ON "crash_cart_consumptions"("crashCartId");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_forms" ADD CONSTRAINT "event_forms_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_forms" ADD CONSTRAINT "event_forms_crashCartId_fkey" FOREIGN KEY ("crashCartId") REFERENCES "crash_carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defibrillation_records" ADD CONSTRAINT "defibrillation_records_eventFormId_fkey" FOREIGN KEY ("eventFormId") REFERENCES "event_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drugs_administered" ADD CONSTRAINT "drugs_administered_eventFormId_fkey" FOREIGN KEY ("eventFormId") REFERENCES "event_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_team_assignments" ADD CONSTRAINT "response_team_assignments_eventFormId_fkey" FOREIGN KEY ("eventFormId") REFERENCES "event_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_team_assignments" ADD CONSTRAINT "response_team_assignments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "response_team_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_team_assignments" ADD CONSTRAINT "response_team_assignments_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_cart_items" ADD CONSTRAINT "crash_cart_items_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "crash_cart_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_carts" ADD CONSTRAINT "crash_carts_reactivatedByUserId_fkey" FOREIGN KEY ("reactivatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_cart_item_stocks" ADD CONSTRAINT "crash_cart_item_stocks_crashCartId_fkey" FOREIGN KEY ("crashCartId") REFERENCES "crash_carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_cart_item_stocks" ADD CONSTRAINT "crash_cart_item_stocks_crashCartItemId_fkey" FOREIGN KEY ("crashCartItemId") REFERENCES "crash_cart_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_cart_consumptions" ADD CONSTRAINT "crash_cart_consumptions_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_cart_consumptions" ADD CONSTRAINT "crash_cart_consumptions_crashCartId_fkey" FOREIGN KEY ("crashCartId") REFERENCES "crash_carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_cart_consumptions" ADD CONSTRAINT "crash_cart_consumptions_crashCartItemId_fkey" FOREIGN KEY ("crashCartItemId") REFERENCES "crash_cart_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
