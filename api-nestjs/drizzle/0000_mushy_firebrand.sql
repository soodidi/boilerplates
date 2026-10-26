CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(120) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notes_created_at_id_idx" ON "notes" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);