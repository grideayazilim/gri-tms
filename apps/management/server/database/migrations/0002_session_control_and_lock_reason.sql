ALTER TABLE "app"."periods" ADD COLUMN "lock_reason" text DEFAULT 'AUTO' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- lock_reason yalnızca AUTO veya MANUAL olabilir
ALTER TABLE "app"."periods" ADD CONSTRAINT "periods_lock_reason_check" CHECK ("lock_reason" IN ('AUTO','MANUAL'));
