/*
  Warnings:

  - You are about to drop the `crash_cart_item_stocks` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `crash_cart_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `crashCartId` to the `crash_cart_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "crash_cart_item_stocks" DROP CONSTRAINT "crash_cart_item_stocks_crashCartId_fkey";

-- DropForeignKey
ALTER TABLE "crash_cart_item_stocks" DROP CONSTRAINT "crash_cart_item_stocks_crashCartItemId_fkey";

-- AlterTable
ALTER TABLE "crash_cart_items" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "crashCartId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "crash_carts" ADD COLUMN     "areaId" TEXT NOT NULL DEFAULT '__backfill__';

-- Backfill manual: los carros preexistentes (datos de prueba, sin ítems ni consumos) se
-- asignan al área más antigua. El equipo puede reasignarlos o borrarlos vía los endpoints.
-- Luego se quita el default transitorio para dejar la columna NOT NULL sin default (match con el schema).
UPDATE "crash_carts"
SET "areaId" = (SELECT "id" FROM "areas" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "areaId" = '__backfill__';
ALTER TABLE "crash_carts" ALTER COLUMN "areaId" DROP DEFAULT;

-- DropTable
DROP TABLE "crash_cart_item_stocks";

-- CreateIndex
CREATE INDEX "crash_cart_items_crashCartId_idx" ON "crash_cart_items"("crashCartId");

-- CreateIndex
CREATE INDEX "crash_carts_areaId_idx" ON "crash_carts"("areaId");

-- AddForeignKey
ALTER TABLE "crash_cart_items" ADD CONSTRAINT "crash_cart_items_crashCartId_fkey" FOREIGN KEY ("crashCartId") REFERENCES "crash_carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_carts" ADD CONSTRAINT "crash_carts_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
