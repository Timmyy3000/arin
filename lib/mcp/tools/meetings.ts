import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { meetingAttendees, meetings } from "@/db/schema/meetings";
import { recordAudit } from "@/lib/audit";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerMeetingTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "create_meeting",
    {
      title: "Log a meeting",
      description:
        "Record a meeting after the fact. Pass attendee personIds in the same call to link them.",
      inputSchema: {
        companyId: z.string().uuid(),
        title: z.string().min(1),
        scheduledAt: z.string().datetime(),
        durationMinutes: z.number().int().positive().optional(),
        summary: z.string().optional(),
        recordingUrl: z.string().url().optional(),
        attendeePersonIds: z.array(z.string().uuid()).optional(),
      },
    },
    async (args) => {
      const [meeting] = await ctx.db
        .insert(meetings)
        .values({
          organizationId: ctx.organizationId,
          companyId: args.companyId,
          title: args.title,
          scheduledAt: new Date(args.scheduledAt),
          durationMinutes: args.durationMinutes,
          summary: args.summary,
          recordingUrl: args.recordingUrl,
        })
        .returning();
      const attendees = args.attendeePersonIds ?? [];
      if (attendees.length) {
        await ctx.db.insert(meetingAttendees).values(
          attendees.map((personId) => ({
            meetingId: meeting!.id,
            personId,
          })),
        );
      }
      await recordAudit(ctx.db, {
        organizationId: ctx.organizationId,
        actor: ctx.actor,
        entityType: "meeting",
        entityId: meeting!.id,
        action: "create",
        changes: { after: { ...meeting, attendees } },
      });
      return jsonResult({ meeting });
    },
  );

  server.registerTool(
    "add_meeting_attendees",
    {
      title: "Add attendees to a meeting",
      description: "Link people to an existing meeting (idempotent on duplicate pairs).",
      inputSchema: {
        meetingId: z.string().uuid(),
        personIds: z.array(z.string().uuid()).min(1),
      },
    },
    async ({ meetingId, personIds }) => {
      const owned = await ctx.db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(eq(meetings.id, meetingId), eq(meetings.organizationId, ctx.organizationId)))
        .limit(1);
      if (!owned[0]) return jsonResult({ error: "not_found" });

      const beforeRows = await ctx.db
        .select({ personId: meetingAttendees.personId })
        .from(meetingAttendees)
        .where(eq(meetingAttendees.meetingId, meetingId));
      const before = beforeRows.map((r) => r.personId).sort();

      await ctx.db
        .insert(meetingAttendees)
        .values(personIds.map((personId) => ({ meetingId, personId })))
        .onConflictDoNothing();

      const afterRows = await ctx.db
        .select({ personId: meetingAttendees.personId })
        .from(meetingAttendees)
        .where(eq(meetingAttendees.meetingId, meetingId));
      const after = afterRows.map((r) => r.personId).sort();

      if (before.join(",") !== after.join(",")) {
        await recordAudit(ctx.db, {
          organizationId: ctx.organizationId,
          actor: ctx.actor,
          entityType: "meeting",
          entityId: meetingId,
          action: "update",
          changes: { before: { attendees: before }, after: { attendees: after } },
        });
      }
      return jsonResult({ ok: true });
    },
  );

  server.registerTool(
    "list_meetings_for_company",
    {
      title: "List meetings for a company",
      description: "Reverse-chronological list of meetings on this account.",
      inputSchema: { companyId: z.string().uuid() },
    },
    async ({ companyId }) => {
      const rows = await ctx.db
        .select()
        .from(meetings)
        .where(
          and(eq(meetings.companyId, companyId), eq(meetings.organizationId, ctx.organizationId)),
        )
        .orderBy(desc(meetings.scheduledAt));
      return jsonResult({ meetings: rows });
    },
  );
}
