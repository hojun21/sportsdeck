/*
  Warnings:

  - The `forumId` column on the `Thread` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "public"."Thread" DROP CONSTRAINT "Thread_forumId_fkey";

-- AlterTable
ALTER TABLE "Thread" DROP COLUMN "forumId",
ADD COLUMN     "forumId" INTEGER[];

-- CreateTable
CREATE TABLE "_ForumToThread" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ForumToThread_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ForumToThread_B_index" ON "_ForumToThread"("B");

-- AddForeignKey
ALTER TABLE "_ForumToThread" ADD CONSTRAINT "_ForumToThread_A_fkey" FOREIGN KEY ("A") REFERENCES "Forum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ForumToThread" ADD CONSTRAINT "_ForumToThread_B_fkey" FOREIGN KEY ("B") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
