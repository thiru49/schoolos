CREATE TABLE "fee_heads" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "fee_heads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "fee_heads_id_school_id_key" ON "fee_heads"("id", "school_id");
CREATE UNIQUE INDEX "fee_heads_school_id_name_key" ON "fee_heads"("school_id", "name");
ALTER TABLE "fee_heads" ADD CONSTRAINT "fee_heads_amount_check" CHECK ("amount" > 0);
ALTER TABLE "fee_heads" ADD CONSTRAINT "fee_heads_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "fee_payments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "fee_head_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "recorded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "fee_payments_id_school_id_key" ON "fee_payments"("id", "school_id");
CREATE INDEX "fee_payments_school_id_student_id_idx" ON "fee_payments"("school_id", "student_id");
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_method_check" CHECK ("method" IN ('cash', 'upi', 'bank'));
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_amount_check" CHECK ("amount" > 0);

ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_id_school_id_fkey"
  FOREIGN KEY ("student_id", "school_id") REFERENCES "students"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_fee_head_id_school_id_fkey"
  FOREIGN KEY ("fee_head_id", "school_id") REFERENCES "fee_heads"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_recorded_by_user_id_school_id_fkey"
  FOREIGN KEY ("recorded_by_user_id", "school_id") REFERENCES "users"("id", "school_id") ON UPDATE CASCADE;

CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");
CREATE UNIQUE INDEX "receipts_id_school_id_key" ON "receipts"("id", "school_id");
CREATE UNIQUE INDEX "receipts_school_id_seq_key" ON "receipts"("school_id", "seq");
CREATE UNIQUE INDEX "receipts_school_id_number_key" ON "receipts"("school_id", "number");
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_school_id_fkey"
  FOREIGN KEY ("payment_id", "school_id") REFERENCES "fee_payments"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fee_heads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fee_heads" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fee_heads"
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid);

ALTER TABLE "fee_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fee_payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fee_payments"
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid);

ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "receipts"
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid);
