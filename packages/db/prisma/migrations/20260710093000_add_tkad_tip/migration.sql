-- V17.2: create storage for editable TKAD tips.
-- Idempotent so it is safe when the table was already created with `prisma db push`.
CREATE TABLE IF NOT EXISTS "TkadTip" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "contentHtml" TEXT NOT NULL,
  "orderNo" INTEGER NOT NULL DEFAULT 0,
  "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TkadTip_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "TkadTip"
    ADD CONSTRAINT "TkadTip_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
