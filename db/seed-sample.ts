import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { createDb, type Database } from "./client";
import { seedAll } from "./seed";
import { companies, people } from "./schema/companies";
import { deals, pipelines, stages } from "./schema/deals";
import { meetings } from "./schema/meetings";
import { notes } from "./schema/notes";
import { research, signals } from "./schema/signals";
import { tasks } from "./schema/tasks";

type SampleCompany = {
  name: string;
  domain: string;
  industry: string;
  employees: number;
  description: string;
  temperature: "cold" | "warm" | "hot" | "on_fire";
  people: SamplePerson[];
};

type SamplePerson = {
  name: string;
  title: string;
  email: string;
  persona: "champion" | "decision_maker" | "technical_evaluator" | "end_user" | "unknown";
  engagement?: "cold" | "warm" | "hot" | "on_fire";
};

const SAMPLE: SampleCompany[] = [
  {
    name: "Stripe",
    domain: "stripe.com",
    industry: "Fintech",
    employees: 8200,
    description: "Payments infrastructure for the internet.",
    temperature: "on_fire",
    people: [
      { name: "Patrick Collison", title: "CEO", email: "patrick@stripe.com", persona: "decision_maker", engagement: "warm" },
      { name: "Maya Chen", title: "VP Engineering", email: "maya@stripe.com", persona: "champion", engagement: "on_fire" },
    ],
  },
  {
    name: "Linear",
    domain: "linear.app",
    industry: "Developer Tools",
    employees: 70,
    description: "Issue tracking and project planning for software teams.",
    temperature: "hot",
    people: [
      { name: "Karri Saarinen", title: "Co-founder & CEO", email: "karri@linear.app", persona: "decision_maker", engagement: "warm" },
      { name: "Tuomas Artman", title: "Co-founder & CTO", email: "tuomas@linear.app", persona: "technical_evaluator", engagement: "hot" },
    ],
  },
  {
    name: "Vercel",
    domain: "vercel.com",
    industry: "Developer Infrastructure",
    employees: 600,
    description: "Frontend cloud platform built for the Next.js ecosystem.",
    temperature: "warm",
    people: [
      { name: "Guillermo Rauch", title: "CEO", email: "rauchg@vercel.com", persona: "decision_maker" },
      { name: "Lee Robinson", title: "VP DX", email: "lee@vercel.com", persona: "champion", engagement: "warm" },
    ],
  },
  {
    name: "Plaid",
    domain: "plaid.com",
    industry: "Fintech",
    employees: 1200,
    description: "Financial data network and APIs.",
    temperature: "warm",
    people: [
      { name: "Zach Perret", title: "CEO", email: "zach@plaid.com", persona: "decision_maker" },
      { name: "Adam Cohen-Aslatei", title: "Director of Sales", email: "adam@plaid.com", persona: "champion", engagement: "warm" },
    ],
  },
  {
    name: "Notion",
    domain: "notion.so",
    industry: "Productivity",
    employees: 1100,
    description: "All-in-one workspace for notes, docs, and project management.",
    temperature: "cold",
    people: [
      { name: "Ivan Zhao", title: "CEO", email: "ivan@notion.so", persona: "decision_maker" },
    ],
  },
  {
    name: "Anthropic",
    domain: "anthropic.com",
    industry: "AI",
    employees: 800,
    description: "AI safety company building reliable, interpretable AI systems.",
    temperature: "on_fire",
    people: [
      { name: "Dario Amodei", title: "CEO", email: "dario@anthropic.com", persona: "decision_maker", engagement: "warm" },
      { name: "Tom Brown", title: "Lead Researcher", email: "tom@anthropic.com", persona: "technical_evaluator", engagement: "hot" },
      { name: "Mike Krieger", title: "CPO", email: "mike@anthropic.com", persona: "champion", engagement: "on_fire" },
    ],
  },
  {
    name: "Supabase",
    domain: "supabase.com",
    industry: "Developer Infrastructure",
    employees: 120,
    description: "Open-source Firebase alternative built on Postgres.",
    temperature: "hot",
    people: [
      { name: "Paul Copplestone", title: "CEO", email: "paul@supabase.com", persona: "decision_maker", engagement: "warm" },
    ],
  },
  {
    name: "Hugging Face",
    domain: "huggingface.co",
    industry: "AI",
    employees: 350,
    description: "Open-source machine learning platform and model hub.",
    temperature: "warm",
    people: [
      { name: "Clem Delangue", title: "CEO", email: "clem@huggingface.co", persona: "decision_maker" },
    ],
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    industry: "Infrastructure",
    employees: 4200,
    description: "Edge network for performance, reliability, and security.",
    temperature: "cold",
    people: [
      { name: "Matthew Prince", title: "CEO", email: "matthew@cloudflare.com", persona: "decision_maker" },
    ],
  },
  {
    name: "Datadog",
    domain: "datadoghq.com",
    industry: "Observability",
    employees: 7800,
    description: "Monitoring and security platform for cloud applications.",
    temperature: "warm",
    people: [
      { name: "Olivier Pomel", title: "CEO", email: "olivier@datadoghq.com", persona: "decision_maker" },
    ],
  },
];

const SIGNAL_TYPES = [
  "page_visit",
  "linkedin_post",
  "funding_round",
  "hiring",
  "product_launch",
  "news",
] as const;

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export async function seedSampleData(db: Database, organizationId: string): Promise<void> {
  const existing = await db
    .select()
    .from(companies)
    .where(eq(companies.organizationId, organizationId))
    .limit(1);
  if (existing[0]) {
    console.log("sample data already present, skipping");
    return;
  }

  const pipeline = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.organizationId, organizationId), eq(pipelines.isDefault, true)))
    .limit(1);
  const pipelineId = pipeline[0]?.id;
  if (!pipelineId) throw new Error("default pipeline not found; run seed first");

  const stageRows = await db.select().from(stages).where(eq(stages.pipelineId, pipelineId));
  const stageByName = new Map(stageRows.map((s) => [s.name, s.id]));

  for (let i = 0; i < SAMPLE.length; i++) {
    const sample = SAMPLE[i]!;
    const companyId = randomUUID();
    const lastSignalAt = daysAgo(i % 5);

    await db.insert(companies).values({
      id: companyId,
      organizationId,
      name: sample.name,
      domain: sample.domain,
      industry: sample.industry,
      employeeCount: sample.employees,
      description: sample.description,
      temperature: sample.temperature,
      temperatureUpdatedAt: daysAgo(2),
      lastSignalAt,
    });

    const personIds: string[] = [];
    for (const sp of sample.people) {
      const personId = randomUUID();
      personIds.push(personId);
      await db.insert(people).values({
        id: personId,
        organizationId,
        companyId,
        name: sp.name,
        email: sp.email,
        title: sp.title,
        persona: sp.persona,
        engagement: sp.engagement ?? null,
        lastInteractionAt: daysAgo((i + 3) % 14),
      });
    }

    const signalCount = 4 + (i % 6);
    for (let s = 0; s < signalCount; s++) {
      const type = SIGNAL_TYPES[(i + s) % SIGNAL_TYPES.length]!;
      await db.insert(signals).values({
        organizationId,
        companyId,
        personId: personIds[s % personIds.length] ?? null,
        type,
        title: `${type.replace(/_/g, " ")} — ${sample.name}`,
        description: `${sample.name} — observed ${type.replace(/_/g, " ")} on day ${s}.`,
        sourceUrl: `https://${sample.domain}`,
        occurredAt: daysAgo(s * 2),
      });
    }

    await db.insert(research).values([
      {
        organizationId,
        companyId,
        section: "why_we_win",
        body: `**${sample.name}** is a strong fit because: (1) clear pain in the ${sample.industry.toLowerCase()} space, (2) executive team is engaged, (3) technical evaluator already champion-level.`,
      },
      {
        organizationId,
        companyId,
        section: "icp_fit",
        body: `Headcount ${sample.employees}; industry ${sample.industry}; budget signals positive over the last 90 days.`,
      },
      {
        organizationId,
        companyId,
        section: "tech_stack",
        body: `Public stack signals: TypeScript, Postgres, AWS. No competing solution in production yet.`,
      },
    ]);

    if (i < 6) {
      const dealId = randomUUID();
      const stageName = ["Lead", "Qualified", "Discovery", "Proposal", "Negotiation", "Won"][i] ?? "Lead";
      await db.insert(deals).values({
        id: dealId,
        organizationId,
        companyId,
        pipelineId,
        stageId: stageByName.get(stageName)!,
        name: `${sample.name} — Annual contract`,
        value: ((i + 1) * 12500).toString(),
        expectedCloseDate: daysAgo(-30 + i * 5),
        stageEnteredAt: daysAgo(7 - i),
      });
    }

    const taskTitles = [
      { title: `Email ${sample.people[0]?.name ?? "buyer"} re: pricing`, type: "email" as const, priority: "high" as const, reasoning: "Buyer asked for pricing on the last call but no response yet." },
      { title: `Schedule technical review with ${sample.name}`, type: "call" as const, priority: "medium" as const, reasoning: "Champion requested a deep-dive with their architect." },
      { title: `Research ${sample.name} security posture`, type: "research" as const, priority: "low" as const, reasoning: "Procurement will ask. Get ahead." },
    ];
    for (let t = 0; t < taskTitles.length; t++) {
      const def = taskTitles[t]!;
      await db.insert(tasks).values({
        organizationId,
        companyId,
        personId: personIds[t % personIds.length] ?? null,
        title: def.title,
        reasoning: def.reasoning,
        priority: def.priority,
        type: def.type,
        status: i === 0 && t === 2 ? "done" : "open",
        dueDate: daysAgo(-(t + 1)),
      });
    }

    if (i < 4) {
      await db.insert(meetings).values({
        organizationId,
        companyId,
        title: `${sample.name} — discovery call`,
        scheduledAt: daysAgo(i + 1),
        durationMinutes: 30,
        summary: `30-min discovery with ${sample.people[0]?.name ?? "buyer"}. Confirmed budget cycle, identified next stakeholders.`,
        recordingUrl: `https://recordings.example.com/${companyId}.mp4`,
      });
    }

    await db.insert(notes).values({
      organizationId,
      companyId,
      author: "agent",
      body: `Initial brief on ${sample.name}: see Research tab for ICP fit, Why We Win, and Tech Stack analysis.`,
    });
  }

  console.log(`seeded ${SAMPLE.length} sample companies`);
}

if (import.meta.main) {
  const db = createDb(process.env.DATABASE_URL!);
  const result = await seedAll(db);
  await seedSampleData(db, result.organizationId);
  process.exit(0);
}
