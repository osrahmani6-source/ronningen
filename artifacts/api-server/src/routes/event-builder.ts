import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  quoteItemsTable as eventQuoteItemsTable,
  quotesTable,
  servicesTable,
  suppliersTable,
} from "@workspace/db";
import {
  CreateQuoteBody,
  CreateQuoteResponse,
  GetDashboardSummaryResponse,
  GetQuoteParams,
  GetQuoteResponse,
  ListQuotesResponse,
  ListServicesResponse,
  ListSuppliersResponse,
  UpdateQuoteStatusBody,
  UpdateQuoteStatusParams,
  UpdateQuoteStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const ORE_PER_NOK = 100;
const DEFAULT_EXPIRY_DAYS = 14;

const seedServices = [
  {
    slug: "venue-1-20",
    name: "Rønningen – intimt lokale",
    category: "venue",
    pricingType: "tiered",
    priceOre: 690000,
    costOre: 165000,
    minPriceOre: 690000,
    description: "For grupper på 1–20 personer.",
    included: ["Bord og stoler", "WiFi", "Parkering", "Projektor og lerret"],
    active: true,
  },
  {
    slug: "venue-21-50",
    name: "Rønningen – selskapslokale",
    category: "venue",
    pricingType: "tiered",
    priceOre: 990000,
    costOre: 225000,
    minPriceOre: 990000,
    description: "For grupper på 21–50 personer.",
    included: ["Bord og stoler", "WiFi", "Parkering", "Projektor og lerret", "Mikrofon"],
    active: true,
  },
  {
    slug: "venue-51-100",
    name: "Rønningen – storstue",
    category: "venue",
    pricingType: "tiered",
    priceOre: 1290000,
    costOre: 295000,
    minPriceOre: 1290000,
    description: "For grupper på 51–100 personer.",
    included: ["Bord og stoler", "WiFi", "Parkering", "Projektor og lerret", "Mikrofon", "Grunnleggende teknikk"],
    active: true,
  },
  {
    slug: "venue-101-150",
    name: "Rønningen – full kapasitet",
    category: "venue",
    pricingType: "tiered",
    priceOre: 1690000,
    costOre: 405000,
    minPriceOre: 1690000,
    description: "For grupper på 101–150 personer. Fra-pris.",
    included: ["Bord og stoler", "WiFi", "Parkering", "Projektor og lerret", "Mikrofon", "Grunnleggende teknikk"],
    active: true,
  },
  {
    slug: "food-simple",
    name: "Enkel servering",
    category: "food",
    pricingType: "per_person",
    priceOre: 39500,
    costOre: 25500,
    minPriceOre: 34000,
    description: "En god start på dagen med enkel mat.",
    included: ["Kaffe og te", "Sesongens bakst", "Lunsjbuffet"],
    active: true,
  },
  {
    slug: "food-buffet",
    name: "Buffet / tapas",
    category: "food",
    pricingType: "per_person",
    priceOre: 59500,
    costOre: 38500,
    minPriceOre: 51000,
    description: "Sosial mat med noe for alle.",
    included: ["Tapasbuffet", "Brød og smør", "Kaffe og te"],
    active: true,
  },
  {
    slug: "food-dinner",
    name: "Middag",
    category: "food",
    pricingType: "per_person",
    priceOre: 79500,
    costOre: 56000,
    minPriceOre: 70000,
    description: "Middag levert av våre lokale samarbeidspartnere.",
    included: ["Forrett", "Hovedrett", "Dessert", "Kaffe og te"],
    active: true,
  },
  {
    slug: "transport-drammen",
    name: "Transport Drammen tur/retur",
    category: "transport",
    pricingType: "fixed",
    priceOre: 890000,
    costOre: 660000,
    minPriceOre: 820000,
    description: "Buss fra Drammen og tilbake etter arrangementet.",
    included: ["Sjåfør", "Tur/retur", "Koordinering"],
    active: true,
  },
  {
    slug: "transport-oslo",
    name: "Transport Oslo tur/retur",
    category: "transport",
    pricingType: "fixed",
    priceOre: 1490000,
    costOre: 1080000,
    minPriceOre: 1350000,
    description: "Buss fra Oslo og tilbake etter arrangementet.",
    included: ["Sjåfør", "Tur/retur", "Koordinering"],
    active: true,
  },
  {
    slug: "activity-team-challenge",
    name: "Team Challenge",
    category: "activity",
    pricingType: "per_person",
    priceOre: 29900,
    costOre: 14500,
    minPriceOre: 24000,
    description: "Leken konkurranse som samler laget.",
    included: ["Aktivitetsleder", "Utstyr", "Poengføring"],
    active: true,
  },
  {
    slug: "activity-lavo",
    name: "Lavo og bål",
    category: "activity",
    pricingType: "fixed",
    priceOre: 390000,
    costOre: 115000,
    minPriceOre: 330000,
    description: "Uteopplevelse rundt bålet, uansett vær.",
    included: ["Lavo", "Ved og bålvakt", "Sitteplasser"],
    active: true,
  },
  {
    slug: "service-event",
    name: "Gjennomføring",
    category: "service",
    pricingType: "fixed",
    priceOre: 490000,
    costOre: 290000,
    minPriceOre: 440000,
    description: "Vi holder trådene samlet fra start til slutt.",
    included: ["Rigging", "Koordinering", "Leverandørkontakt", "Grunnbemanning"],
    active: true,
  },
  {
    slug: "service-waiters",
    name: "Ekstra servitører",
    category: "service",
    pricingType: "per_hour",
    priceOre: 65000,
    costOre: 39000,
    minPriceOre: 57000,
    description: "Ekstra vertskap når arrangementet trenger det.",
    included: ["Vertskap", "Servering", "Opprydding"],
    active: true,
  },
];

const seedSuppliers = [
  { name: "Rønningen drift", serviceCount: 6, preferred: true, active: true, nextReview: "2026-11-01" },
  { name: "Smakfulle Øyeblikk", serviceCount: 3, preferred: true, active: true, nextReview: "2026-10-15" },
  { name: "Busspartner Øst", serviceCount: 2, preferred: false, active: true, nextReview: "2026-09-30" },
];

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function formatNok(ore: number): number {
  return Math.round(ore / ORE_PER_NOK);
}

function serviceResponse(service: typeof servicesTable.$inferSelect) {
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    category: service.category as "venue" | "food" | "transport" | "activity" | "service",
    pricingType: service.pricingType as "fixed" | "per_person" | "per_hour" | "per_unit" | "tiered" | "manual",
    priceNok: formatNok(service.priceOre),
    costNok: formatNok(service.costOre),
    minPriceNok: formatNok(service.minPriceOre),
    description: service.description,
    included: service.included,
    active: service.active,
  };
}

async function ensureSeeded(): Promise<void> {
  const existingServices = await db.select({ id: servicesTable.id }).from(servicesTable).limit(1);
  if (existingServices.length === 0) {
    await db.insert(servicesTable).values(seedServices);
  }
  const existingSuppliers = await db.select({ id: suppliersTable.id }).from(suppliersTable).limit(1);
  if (existingSuppliers.length === 0) {
    await db.insert(suppliersTable).values(seedSuppliers);
  }
}

async function quoteResponse(quote: typeof quotesTable.$inferSelect) {
  const items = await db
    .select()
    .from(eventQuoteItemsTable)
    .where(eq(eventQuoteItemsTable.quoteId, quote.id));
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    company: quote.company,
    contactName: quote.contactName,
    eventDate: new Date(`${quote.eventDate}T00:00:00.000Z`),
    startTime: quote.startTime,
    endTime: quote.endTime,
    guests: quote.guests,
    eventType: quote.eventType,
    totalNok: formatNok(quote.totalOre),
    pricePerPersonNok: formatNok(quote.pricePerPersonOre),
    costNok: formatNok(quote.costOre),
    marginPercent: Number(quote.marginPercent),
    marketStatus: quote.marketStatus as "competitive" | "above_target" | "manual_review",
    status: quote.status as "draft" | "approval" | "sent" | "accepted" | "declined" | "changes_requested",
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPriceNok: formatNok(item.unitPriceOre),
      totalNok: formatNok(item.totalOre),
      included: item.included,
    })),
    expiryDate: new Date(`${quote.expiryDate}T00:00:00.000Z`),
    createdAt: quote.createdAt,
  };
}

async function createSeedQuotes(): Promise<void> {
  const existingQuotes = await db.select({ id: quotesTable.id }).from(quotesTable).limit(1);
  if (existingQuotes.length > 0) return;

  const services = await db.select().from(servicesTable);
  const find = (slug: string) => services.find((service) => service.slug === slug);
  const examples = [
    {
      quoteNumber: "RB-2026-0042",
      company: "Nordic Design AS",
      contactName: "Ingrid Nilsen",
      eventDate: "2026-09-18",
      startTime: "09:00",
      endTime: "16:30",
      guests: 48,
      eventType: "Teamdag",
      slugs: ["venue-21-50", "food-buffet", "transport-oslo", "activity-team-challenge", "service-event"],
      status: "sent",
    },
    {
      quoteNumber: "RB-2026-0041",
      company: "Fjordkraft Partner",
      contactName: "Marius Berg",
      eventDate: "2026-09-08",
      startTime: "10:00",
      endTime: "17:00",
      guests: 22,
      eventType: "Workshop",
      slugs: ["venue-21-50", "food-simple", "service-event"],
      status: "approval",
    },
  ];

  for (const example of examples) {
    const selected = example.slugs.map(find).filter((service): service is NonNullable<typeof service> => Boolean(service));
    const calculated = calculateItems(selected, example.guests);
    const [quote] = await db.insert(quotesTable).values({
      quoteNumber: example.quoteNumber,
      company: example.company,
      contactName: example.contactName,
      eventDate: example.eventDate,
      startTime: example.startTime,
      endTime: example.endTime,
      guests: example.guests,
      eventType: example.eventType,
      totalOre: calculated.totalOre,
      pricePerPersonOre: Math.round(calculated.totalOre / example.guests),
      costOre: calculated.costOre,
      marginPercent: calculated.marginPercent,
      marketStatus: calculated.marketStatus,
      status: example.status,
      expiryDate: "2026-09-01",
    }).returning();
    await db.insert(eventQuoteItemsTable).values(calculated.items.map((item) => ({
      quoteId: quote.id,
      serviceId: item.serviceId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unitPriceOre: item.unitPriceOre,
      totalOre: item.totalOre,
      included: false,
    })));
  }
}

function calculateItems(services: (typeof servicesTable.$inferSelect)[], guests: number) {
  const items = services.map((service) => {
    const quantity = service.pricingType === "per_person" ? guests : service.pricingType === "per_hour" ? 4 : 1;
    return {
      serviceId: service.id,
      name: service.name,
      category: service.category,
      quantity,
      unit: service.pricingType === "per_person" ? "person" : service.pricingType === "per_hour" ? "time" : "stk",
      unitPriceOre: service.priceOre,
      totalOre: Math.round(service.priceOre * quantity),
      costOre: Math.round(service.costOre * quantity),
    };
  });
  const totalOre = items.reduce((sum, item) => sum + item.totalOre, 0);
  const costOre = items.reduce((sum, item) => sum + item.costOre, 0);
  const marginPercent = totalOre > 0 ? Number((((totalOre - costOre) / totalOre) * 100).toFixed(1)) : 0;
  const pricePerPerson = guests > 0 ? totalOre / guests : totalOre;
  return {
    items,
    totalOre,
    costOre,
    marginPercent,
    marketStatus: marginPercent < 20 ? "manual_review" : pricePerPerson > 250000 ? "above_target" : "competitive",
  } as const;
}

router.get("/services", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const services = await db.select().from(servicesTable).where(eq(servicesTable.active, true));
  res.json(ListServicesResponse.parse(services.map(serviceResponse)));
});

router.get("/suppliers", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const suppliers = await db.select().from(suppliersTable).orderBy(desc(suppliersTable.preferred), suppliersTable.name);
  res.json(ListSuppliersResponse.parse(suppliers));
});

router.get("/quotes", async (_req, res): Promise<void> => {
  await ensureSeeded();
  await createSeedQuotes();
  const quotes = await db.select().from(quotesTable).orderBy(desc(quotesTable.createdAt)).limit(20);
  const data = await Promise.all(quotes.map(quoteResponse));
  res.json(ListQuotesResponse.parse(data));
});

router.get("/quotes/:quoteId", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = GetQuoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, params.data.quoteId));
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  res.json(GetQuoteResponse.parse(await quoteResponse(quote)));
});

router.post("/quotes", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = CreateQuoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { data } = parsed;
  const services = await db.select().from(servicesTable).where(and(eq(servicesTable.active, true), inArray(servicesTable.id, data.serviceIds)));
  if (services.length !== data.serviceIds.length) {
    res.status(400).json({ error: "One or more selected services are unavailable" });
    return;
  }
  const calculated = calculateItems(services, data.guests);
  const quoteCount = await db.select({ count: sql<number>`count(*)` }).from(quotesTable);
  const quoteNumber = `RB-${new Date().getFullYear()}-${String(Number(quoteCount[0]?.count ?? 0) + 1).padStart(4, "0")}`;
  const [quote] = await db.insert(quotesTable).values({
    quoteNumber,
    company: data.company,
    contactName: data.contactName ?? null,
    eventDate: data.eventDate.toISOString().slice(0, 10),
    startTime: data.startTime,
    endTime: data.endTime,
    guests: data.guests,
    eventType: data.eventType,
    totalOre: calculated.totalOre,
    pricePerPersonOre: Math.round(calculated.totalOre / data.guests),
    costOre: calculated.costOre,
    marginPercent: calculated.marginPercent,
    marketStatus: calculated.marketStatus,
    status: calculated.marginPercent < 20 ? "approval" : "draft",
    expiryDate: addDays(data.eventDate, DEFAULT_EXPIRY_DAYS),
  }).returning();
  await db.insert(eventQuoteItemsTable).values(calculated.items.map((item) => ({
    quoteId: quote.id,
    serviceId: item.serviceId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    unitPriceOre: item.unitPriceOre,
    totalOre: item.totalOre,
    included: item.category === "venue",
  })));
  res.status(201).json(CreateQuoteResponse.parse(await quoteResponse(quote)));
});

router.patch("/quotes/:quoteId/status", async (req, res): Promise<void> => {
  const params = UpdateQuoteStatusParams.safeParse(req.params);
  const body = UpdateQuoteStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    const errorMessage = !params.success
      ? params.error.message
      : !body.success
        ? body.error.message
        : "Invalid request";
    res.status(400).json({ error: errorMessage });
    return;
  }
  const [quote] = await db.update(quotesTable).set({ status: body.data.status }).where(eq(quotesTable.id, params.data.quoteId)).returning();
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  res.json(UpdateQuoteStatusResponse.parse(await quoteResponse(quote)));
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  await ensureSeeded();
  await createSeedQuotes();
  const quotes = await db.select().from(quotesTable).orderBy(desc(quotesTable.createdAt));
  const openQuotes = quotes.filter((quote) => !["declined", "accepted"].includes(quote.status));
  const pipelineOre = openQuotes.reduce((sum, quote) => sum + quote.totalOre, 0);
  const averageMargin = quotes.length > 0 ? quotes.reduce((sum, quote) => sum + Number(quote.marginPercent), 0) / quotes.length : 0;
  const approvalCount = quotes.filter((quote) => quote.status === "approval" || quote.marketStatus === "manual_review").length;
  const recentQuotes = await Promise.all(quotes.slice(0, 5).map(quoteResponse));
  res.json(GetDashboardSummaryResponse.parse({
    openQuotes: openQuotes.length,
    pipelineNok: formatNok(pipelineOre),
    averageMargin: Number(averageMargin.toFixed(1)),
    approvalCount,
    recentQuotes,
  }));
});

export default router;