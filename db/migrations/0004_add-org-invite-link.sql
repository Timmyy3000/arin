CREATE TABLE "org_invite_link" (
	"token" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_user_id" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_invite_link" ADD CONSTRAINT "org_invite_link_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invite_link" ADD CONSTRAINT "org_invite_link_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invite_link" ADD CONSTRAINT "org_invite_link_used_by_user_id_user_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;