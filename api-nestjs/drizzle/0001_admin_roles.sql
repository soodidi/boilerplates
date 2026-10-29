-- BE-003 : une transaction longue sur ces tables ne bloque pas toutes les requêtes derrière la migration :
-- elle échoue vite, et l'instance redémarre et réessaie.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "impersonated_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_expires" timestamp (3) with time zone;