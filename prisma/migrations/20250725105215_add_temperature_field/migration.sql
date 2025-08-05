-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
ALTER COLUMN "geminiModel" SET DEFAULT 'gemini-2.5-flash';
