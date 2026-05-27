/*
  Warnings:

  - Added the required column `reason` to the `review_flags` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "review_flags" ADD COLUMN     "reason" VARCHAR(500) NOT NULL;
