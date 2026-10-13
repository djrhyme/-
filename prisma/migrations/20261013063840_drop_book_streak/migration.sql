/*
  Warnings:

  - You are about to drop the column `lastStudyDate` on the `BookSetting` table. All the data in the column will be lost.
  - You are about to drop the column `streakDays` on the `BookSetting` table. All the data in the column will be lost.
  - You are about to drop the column `totalNewWords` on the `BookSetting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BookSetting" DROP COLUMN "lastStudyDate",
DROP COLUMN "streakDays",
DROP COLUMN "totalNewWords";
