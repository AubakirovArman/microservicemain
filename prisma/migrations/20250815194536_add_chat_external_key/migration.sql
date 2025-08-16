/*
  Warnings:

  - A unique constraint covering the columns `[projectId,externalKey]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "externalKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Chat_projectId_externalKey_key" ON "Chat"("projectId", "externalKey");
