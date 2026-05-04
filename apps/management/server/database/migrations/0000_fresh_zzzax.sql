CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TABLE "app"."announcement_reads" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"user_id" uuid,
	"announcement_id" uuid,
	"read_at" timestamp DEFAULT now(),
	CONSTRAINT "announcement_reads_user_id_announcement_id_key" UNIQUE("user_id","announcement_id")
);
--> statement-breakpoint
CREATE TABLE "app"."announcements" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"action" varchar(64) NOT NULL,
	"actor_username" varchar(64) NOT NULL,
	"actor_role" varchar(32),
	"entity_type" varchar(32),
	"entity_id" uuid,
	"summary" text NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."employees" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"unit_id" uuid NOT NULL,
	"tc_no" text,
	"iban_no" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "employees_tc_no_unique" UNIQUE("tc_no")
);
--> statement-breakpoint
CREATE TABLE "app"."locations" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	"program_no" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_program_no_unique" UNIQUE("program_no")
);
--> statement-breakpoint
CREATE TABLE "app"."periods" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_locked" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "periods_year_month_key" UNIQUE("year","month")
);
--> statement-breakpoint
CREATE TABLE "app"."settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"daily_wage" numeric(10, 2) DEFAULT '500.00' NOT NULL,
	"max_weekly_days" integer DEFAULT 6 NOT NULL,
	"program_start_date" date NOT NULL,
	"program_end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app"."timesheet_days" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"timesheet_id" uuid NOT NULL,
	"day" date NOT NULL,
	"marker_code" text NOT NULL,
	"note" text,
	CONSTRAINT "timesheet_days_timesheet_id_day_key" UNIQUE("timesheet_id","day")
);
--> statement-breakpoint
CREATE TABLE "app"."timesheets" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"employee_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timesheets_employee_id_period_id_key" UNIQUE("employee_id","period_id")
);
--> statement-breakpoint
CREATE TABLE "app"."units" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"location_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_location_id_name_key" UNIQUE("location_id","name")
);
--> statement-breakpoint
CREATE TABLE "app"."users" (
	"id" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"location_id" uuid,
	"unit_id" uuid,
	"expiry_date" date,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "app"."announcement_reads" ADD CONSTRAINT "announcement_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "app"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."employees" ADD CONSTRAINT "employees_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "app"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."timesheet_days" ADD CONSTRAINT "timesheet_days_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "app"."timesheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."timesheets" ADD CONSTRAINT "timesheets_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "app"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."timesheets" ADD CONSTRAINT "timesheets_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "app"."periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."timesheets" ADD CONSTRAINT "timesheets_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "app"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."units" ADD CONSTRAINT "units_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "app"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."users" ADD CONSTRAINT "users_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "app"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."users" ADD CONSTRAINT "users_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "app"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "app"."audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor_username" ON "app"."audit_logs" USING btree ("actor_username");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "app"."audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_employees_unit_id" ON "app"."employees" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_timesheet_days_ts_day" ON "app"."timesheet_days" USING btree ("timesheet_id","day");--> statement-breakpoint
CREATE INDEX "idx_timesheets_employee_id" ON "app"."timesheets" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_timesheets_unit_period" ON "app"."timesheets" USING btree ("unit_id","period_id");--> statement-breakpoint
CREATE INDEX "idx_units_location_id" ON "app"."units" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_users_location_id" ON "app"."users" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_users_unit_id" ON "app"."users" USING btree ("unit_id");