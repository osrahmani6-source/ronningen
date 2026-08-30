import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  FileCheck2,
  FileText,
  HeartHandshake,
  Layers3,
  Leaf,
  Loader2,
  Mail,
  MapPin,
  Menu,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  TimerReset,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey,
  getGetQuoteQueryKey,
  getHealthCheckQueryKey,
  getListQuotesQueryKey,
  getListServicesQueryKey,
  getListSuppliersQueryKey,
  useCreateQuote,
  useGetDashboardSummary,
  useGetQuote,
  useHealthCheck,
  useListQuotes,
  useListServices,
  useListSuppliers,
  useUpdateQuoteStatus,
  type Quote,
  type QuoteItem,
  type Service,
  type Supplier,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const categoryLabels: Record<string, string> = {
  venue: 'Sted',
  food: 'Mat og drikke',
  transport: 'Transport',
  activity: 'Aktivitet',
  service: 'Tjeneste',
};
const statusLabels: Record<string, string> = {
  draft: 'Kladd',
  approval: 'Til godkjenning',
  sent: 'Sendt',
  accepted: 'Akseptert',
  declined: 'Avslått',
  changes_requested: 'Endringer ønsket',
};
const marketLabels: Record<string, string> = {
  competitive: 'Konkurransedyktig',
  above_target: 'Over målpris',
  manual_review: 'Manuell vurdering',
};

const formatNok = (value = 0) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(value).replace(/\u00a0/g, ' ');
const formatDate = (value?: string) =>
  value ? new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Ikke satt';
const initials = (value = 'Rønningen') => value.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

function StatusPill({ status, market = false }: { status: string; market?: boolean }) {
  const color = market
    ? status === 'competitive' ? 'bg-[#dfeadd] text-[#28513b]' : status === 'above_target' ? 'bg-[#f3e5c9] text-[#805f29]' : 'bg-[#f0ddd4] text-[#864936]'
    : status === 'accepted' ? 'bg-[#dfeadd] text-[#28513b]' : status === 'approval' ? 'bg-[#f3e5c9] text-[#805f29]' : status === 'sent' ? 'bg-[#dce8ed] text-[#31586a]' : status === 'declined' ? 'bg-[#f0ddd4] text-[#864936]' : 'bg-[#e7e6dd] text-[#59635a]';
  return <span data-testid={`status-pill-${status}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${color}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{market ? marketLabels[status] ?? status : statusLabels[status] ?? status}</span>;
}

function LoadingState({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3" data-testid="state-loading">{Array.from({ length: rows }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-[#e9e8df]" />)}</div>;
}

function ErrorState({ onRetry, compact = false }: { onRetry: () => void; compact?: boolean }) {
  return <div className={`rounded-2xl border border-[#e6c9bb] bg-[#fbf1eb] ${compact ? 'p-4' : 'p-8'} text-[#713f32]`} data-testid="state-error">
    <div className="flex items-start gap-3"><CircleHelp className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Vi fikk ikke hentet dette akkurat nå.</p><p className="mt-1 text-sm opacity-80">Sjekk tilkoblingen og prøv igjen.</p><button type="button" data-testid="button-retry" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"><RefreshCw className="h-3.5 w-3.5" /> Prøv igjen</button></div></div>
  </div>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = [
    { href: '/', label: 'Oversikt', icon: BarChart3 },
    { href: '/builder', label: 'Bygg et tilbud', icon: Sparkles },
    { href: '/quotes', label: 'Tilbud', icon: FileText },
    { href: '/catalog', label: 'Katalog', icon: Store },
  ];
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 60000 } });
  return <div className="noise flex min-h-[100dvh] bg-background text-foreground">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[250px] flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform duration-300 md:relative md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between px-2">
        <Link href="/" data-testid="link-brand" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-lg font-bold text-sidebar-primary-foreground shadow-[0_8px_24px_rgba(215,188,123,.18)]">R</span>
          <span><span className="block font-serif text-lg leading-none">Rønningen</span><span className="mono-font mt-1 block text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/55">Event builder</span></span>
        </Link>
        <button type="button" data-testid="button-close-menu" className="rounded-lg p-2 md:hidden" onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-14 px-2 text-[10px] font-bold uppercase tracking-[.2em] text-sidebar-foreground/40">Arbeidsflate</div>
      <nav className="mt-3 space-y-1" aria-label="Hovedmeny">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${location === href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}><Icon className={`h-[17px] w-[17px] ${location === href ? 'text-sidebar-primary' : 'opacity-70'}`} />{label}{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}</Link>)}</nav>
      <div className="mt-auto space-y-5">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/35 p-4"><div className="flex items-center gap-2 text-[11px] font-bold"><span className={`h-2 w-2 rounded-full ${health.isError ? 'bg-[#d18469]' : 'bg-[#9fbe8f]'}`} /> Systemstatus</div><p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/55">{health.isError ? 'Noe trenger tilsyn' : 'Alt går som det skal'}</p></div>
        <div className="flex items-center gap-3 border-t border-sidebar-border pt-4"><div className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">KS</div><div className="min-w-0"><p className="truncate text-xs font-bold">Kari Solberg</p><p className="truncate text-[11px] text-sidebar-foreground/45">Eventansvarlig</p></div><button type="button" data-testid="button-user-menu" className="ml-auto text-sidebar-foreground/40"><MoreHorizontal className="h-4 w-4" /></button></div>
      </div>
    </aside>
    {mobileOpen && <button type="button" aria-label="Lukk meny" data-testid="button-menu-overlay" className="fixed inset-0 z-20 bg-[#102e2a]/40 md:hidden" onClick={() => setMobileOpen(false)} />}
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md md:px-10">
        <div className="flex items-center gap-3"><button type="button" data-testid="button-open-menu" className="rounded-lg p-2 hover:bg-muted md:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button><span className="mono-font text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{location === '/' ? 'God morgen, Kari' : location === '/builder' ? 'Ny konfigurasjon' : location === '/quotes' ? 'Tilbudsarkiv' : 'Katalog og partnere'}</span></div>
        <div className="flex items-center gap-3"><span className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex"><Bell className="h-4 w-4" /> 3 oppgaver i dag</span><div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">KS</div></div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-12">{children}</div>
    </main>
  </div>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mono-font text-[10px] font-bold uppercase tracking-[.2em] text-[#8b6f3e]">{eyebrow}</p><h1 className="display-font mt-2 text-4xl leading-[.95] tracking-[-.03em] text-foreground md:text-5xl">{title}</h1>{description && <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function Dashboard() {
  const dashboard = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const summary = dashboard.data;
  return <Shell><SectionHeading eyebrow="Rønningen bedriftsdag / oversikt" title="Godt vertskap begynner her." description="Hold blikket på det som betyr noe: tilbud som beveger seg, marginer som tåler en nærmere titt og gjester som gleder seg." action={<Link href="/builder" data-testid="link-new-quote" className="pressable inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/10"><Plus className="h-4 w-4" /> Nytt tilbud</Link>} />
    {dashboard.isLoading ? <LoadingState rows={4} /> : dashboard.isError || !summary ? <ErrorState onRetry={() => dashboard.refetch()} /> : <div className="animate-rise">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Åpne tilbud" value={String(summary.openQuotes)} note="aktive i pipelinen" icon={FileCheck2} accent="gold" />
        <MetricCard label="Pipeline" value={formatNok(summary.pipelineNok)} note="estimert omsetning" icon={TrendingUp} accent="ink" />
        <MetricCard label="Snittmargin" value={`${summary.averageMargin.toFixed(1)} %`} note="på åpne tilbud" icon={Activity} accent="sage" />
        <MetricCard label="Venter godkjenning" value={String(summary.approvalCount)} note="klar for din vurdering" icon={TimerReset} accent="clay" />
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
        <div className="soft-shadow rounded-2xl border border-border bg-card p-5 md:p-7"><div className="flex items-start justify-between"><div><p className="mono-font text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Siste bevegelse</p><h2 className="mt-2 display-font text-2xl">Tilbudspipelinen</h2></div><Link href="/quotes" data-testid="link-view-all-quotes" className="text-xs font-bold text-[#8b6f3e] underline underline-offset-4">Se alle</Link></div><div className="mt-6 divide-y divide-border">{summary.recentQuotes?.slice(0, 5).map((quote, index) => <QuoteRow key={quote.id} quote={quote} index={index} />)}</div>{!summary.recentQuotes?.length && <EmptyState title="Ingen tilbud ennå" body="Start med å sette sammen deres neste bedriftsdag." action={<Link href="/builder" data-testid="link-empty-builder" className="font-bold text-[#8b6f3e]">Åpne byggeren <ArrowRight className="ml-1 inline h-4 w-4" /></Link>} />}</div>
        <div className="rounded-2xl bg-[#dce7d7] p-6 text-[#294b3a] md:p-7"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#c4d8be]"><Leaf className="h-5 w-5" /></span><span className="mono-font text-[10px] font-bold uppercase tracking-[.16em] opacity-60">Dagens signal</span></div><h2 className="display-font mt-8 max-w-xs text-3xl leading-tight">Rolige dager bygges med gode valg.</h2><p className="mt-4 text-sm leading-6 opacity-75">Hold gjesteopplevelsen varm, uten å gi slipp på det som skal bære driften.</p><div className="mt-10 border-t border-[#b4cdae] pt-4 text-xs font-semibold opacity-75"><span className="font-bold">Neste sjekkpunkt</span><br />2 tilbud trenger marginvurdering før fredag</div></div>
      </div>
    </div>}
  </Shell>;
}

function MetricCard({ label, value, note, icon: Icon, accent }: { label: string; value: string; note: string; icon: typeof Activity; accent: string }) {
  const accents: Record<string, string> = { gold: 'bg-[#f3e5c9] text-[#866a35]', ink: 'bg-[#dce8e4] text-[#315e52]', sage: 'bg-[#dfeadd] text-[#477056]', clay: 'bg-[#f0ddd4] text-[#9a5b44]' };
  return <div className="pressable rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between"><p className="text-xs font-bold text-muted-foreground">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${accents[accent]}`}><Icon className="h-4 w-4" /></span></div><p className="mt-6 text-2xl font-extrabold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></div>;
}

function QuoteRow({ quote, index = 0 }: { quote: Quote; index?: number }) {
  return <Link href={`/customer-quote/${quote.id}`} data-testid={`link-quote-${quote.id}`} className={`group flex animate-rise items-center gap-3 py-4 delay-${Math.min(index + 1, 5)} sm:gap-5`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-bold text-secondary-foreground">{initials(quote.company)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-extrabold">{quote.company}</p><StatusPill status={quote.status} /></div><p className="mt-1 text-xs text-muted-foreground">{quote.quoteNumber} · {formatDate(quote.eventDate)} · {quote.guests} gjester</p></div><div className="hidden text-right sm:block"><p className="text-sm font-extrabold">{formatNok(quote.totalNok)}</p><p className="mt-1 text-[11px] text-muted-foreground">{quote.pricePerPersonNok ? `${formatNok(quote.pricePerPersonNok)} / person` : ''}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></Link>;
}

function Builder() {
  const [, setLocation] = useLocation();
  const servicesQuery = useListServices({ query: { queryKey: getListServicesQueryKey() } });
  const createQuote = useCreateQuote();
  const services = servicesQuery.data?.filter((service) => service.active) ?? [];
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('16:00');
  const [guests, setGuests] = useState(35);
  const [eventType, setEventType] = useState('Bedriftsdag');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [step, setStep] = useState(1);
  const toggleService = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((serviceId) => serviceId !== id) : [...current, id]);
  const selected = services.filter((service) => selectedIds.includes(service.id));
  const estimate = useMemo(() => selected.reduce((sum, service) => sum + (service.pricingType === 'per_person' ? service.priceNok * guests : service.priceNok), 0), [selected, guests]);
  const estimateCost = useMemo(() => selected.reduce((sum, service) => sum + (service.pricingType === 'per_person' ? service.costNok * guests : service.costNok), 0), [selected, guests]);
  const margin = estimate ? ((estimate - estimateCost) / estimate) * 100 : 0;
  const canContinue = company.trim().length > 0 && eventDate.length > 0;
  const save = (status: 'draft' | 'approval') => {
    if (!canContinue || selectedIds.length === 0) { setStep(1); return; }
    createQuote.mutate({ data: { company: company.trim(), contactName: contactName.trim() || undefined, eventDate, startTime, endTime, guests: Number(guests), eventType, serviceIds: selectedIds } }, { onSuccess: (quote) => { queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); if (status === 'approval') setLocation(`/customer-quote/${quote.id}`); else setLocation('/quotes'); } });
  };
  return <Shell><div className="mx-auto max-w-[1180px]"><div className="mb-7 flex items-center justify-between"><div><Link href="/quotes" data-testid="link-back-quotes" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Tilbud</Link><p className="mono-font mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-[#8b6f3e]">Konfigurasjon / nytt tilbud</p><h1 className="display-font mt-2 text-4xl tracking-[-.03em] md:text-5xl">Bygg en bedriftsdag.</h1></div><div className="hidden items-center gap-2 sm:flex"><StepDot number={1} active={step === 1} label="Rammer" /><span className="h-px w-8 bg-border" /><StepDot number={2} active={step === 2} label="Opplevelse" /><span className="h-px w-8 bg-border" /><StepDot number={3} active={step === 3} label="Oppsummering" /></div></div>
    {servicesQuery.isError && <div className="mb-4"><ErrorState compact onRetry={() => servicesQuery.refetch()} /></div>}
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]"><div className="space-y-5">
      {step === 1 && <div className="soft-shadow animate-rise rounded-2xl border border-border bg-card p-5 md:p-8"><div className="flex items-start justify-between"><div><p className="mono-font text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">01 / Rammene</p><h2 className="mt-2 display-font text-2xl">Hvem skal vi ta imot?</h2><p className="mt-2 text-sm text-muted-foreground">Start med de praktiske rammene. Resten finner vi sammen.</p></div><Users className="h-5 w-5 text-[#8b6f3e]" /></div><div className="mt-8 grid gap-5 sm:grid-cols-2"><Field label="Bedrift" value={company} onChange={setCompany} placeholder="For eksempel Kantega" testId="input-company" /><Field label="Kontaktperson" value={contactName} onChange={setContactName} placeholder="Navn på kontaktperson" testId="input-contact" /><Field label="Dato" type="date" value={eventDate} onChange={setEventDate} placeholder="" testId="input-event-date" /><div><label className="mb-2 block text-xs font-bold">Antall gjester</label><div className="flex h-11 items-center rounded-xl border border-input bg-background"><button type="button" data-testid="button-decrease-guests" onClick={() => setGuests(Math.max(1, guests - 1))} className="grid h-full w-11 place-items-center text-muted-foreground hover:text-foreground"><Minus className="h-4 w-4" /></button><input data-testid="input-guests" type="number" min="1" max="500" value={guests} onChange={(event) => setGuests(Math.min(500, Math.max(1, Number(event.target.value) || 1)))} className="h-full min-w-0 flex-1 bg-transparent text-center text-sm font-bold outline-none" /><button type="button" data-testid="button-increase-guests" onClick={() => setGuests(Math.min(500, guests + 1))} className="grid h-full w-11 place-items-center text-muted-foreground hover:text-foreground"><Plus className="h-4 w-4" /></button></div></div><div><label className="mb-2 block text-xs font-bold">Fra</label><input data-testid="input-start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent/40" /></div><div><label className="mb-2 block text-xs font-bold">Til</label><input data-testid="input-end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent/40" /></div><div className="sm:col-span-2"><label className="mb-2 block text-xs font-bold">Type arrangement</label><div className="relative"><select data-testid="select-event-type" value={eventType} onChange={(event) => setEventType(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"><option>Bedriftsdag</option><option>Ledersamling</option><option>Sommeravslutning</option><option>Julebord</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" /></div></div></div><div className="mt-8 flex justify-end"><button type="button" data-testid="button-next-experience" disabled={!canContinue} onClick={() => setStep(2)} className="pressable inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-35">Velg opplevelse <ArrowRight className="h-4 w-4" /></button></div></div>}
      {step === 2 && <div className="soft-shadow animate-rise rounded-2xl border border-border bg-card p-5 md:p-8"><div className="flex items-start justify-between"><div><p className="mono-font text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">02 / Opplevelsen</p><h2 className="mt-2 display-font text-2xl">Sett sammen dagen.</h2><p className="mt-2 text-sm text-muted-foreground">Velg det som passer gjestene. Prisen regnes ut mens dere bygger.</p></div><Layers3 className="h-5 w-5 text-[#8b6f3e]" /></div><div className="mt-7 grid gap-3 sm:grid-cols-2">{services.map((service, index) => <ServiceCard key={service.id} service={service} guests={guests} selected={selectedIds.includes(service.id)} onToggle={() => toggleService(service.id)} index={index} />)}</div><div className="mt-7 flex items-center justify-between border-t border-border pt-5"><button type="button" data-testid="button-back-details" onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Tilbake</button><button type="button" data-testid="button-next-summary" disabled={selectedIds.length === 0} onClick={() => setStep(3)} className="pressable inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-35">Se oppsummering <ArrowRight className="h-4 w-4" /></button></div></div>}
      {step === 3 && <div className="soft-shadow animate-rise rounded-2xl border border-border bg-card p-5 md:p-8"><div className="flex items-start justify-between"><div><p className="mono-font text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">03 / Klar til å dele</p><h2 className="mt-2 display-font text-2xl">Dette har dere landet på.</h2><p className="mt-2 text-sm text-muted-foreground">{company} · {formatDate(eventDate)} · {guests} gjester</p></div><CheckCircle2 className="h-5 w-5 text-[#477056]" /></div><div className="mt-7 divide-y divide-border rounded-xl border border-border px-4">{selected.map((service) => <div key={service.id} className="flex items-center gap-3 py-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Package className="h-4 w-4" /></div><div className="flex-1"><p className="text-sm font-bold">{service.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{categoryLabels[service.category]}</p></div><p className="text-sm font-extrabold">{formatNok(service.pricingType === 'per_person' ? service.priceNok * guests : service.priceNok)}</p></div>)}</div><div className="mt-7 flex items-center justify-between border-t border-border pt-5"><button type="button" data-testid="button-back-services" onClick={() => setStep(2)} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Juster utvalg</button><div className="flex gap-2"><button type="button" data-testid="button-save-draft" disabled={createQuote.isPending} onClick={() => save('draft')} className="pressable inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold disabled:opacity-50">{createQuote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Lagre kladd</button><button type="button" data-testid="button-request-approval" disabled={createQuote.isPending} onClick={() => save('approval')} className="pressable inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{createQuote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Be om godkjenning</button></div></div>{createQuote.isError && <p className="mt-4 text-sm font-semibold text-destructive">Kunne ikke lagre tilbudet. Prøv igjen.</p>}</div>}
    </div><aside className="sticky top-24 rounded-2xl bg-primary p-6 text-primary-foreground soft-shadow"><div className="flex items-center justify-between"><p className="mono-font text-[10px] font-bold uppercase tracking-[.18em] text-primary-foreground/60">Foreløpig pris</p><ShieldCheck className="h-5 w-5 text-accent" /></div><p data-testid="text-builder-total" className="mt-3 text-3xl font-extrabold tracking-tight">{formatNok(estimate)}</p><p className="mt-1 text-xs text-primary-foreground/60">{guests} gjester · eks. mva.</p><div className="mt-7 space-y-3 border-t border-primary-foreground/15 pt-5 text-sm">{selected.length ? selected.map((service) => <div key={service.id} className="flex justify-between gap-3 text-primary-foreground/75"><span className="truncate">{service.name}</span><span className="shrink-0">{formatNok(service.pricingType === 'per_person' ? service.priceNok * guests : service.priceNok)}</span></div>) : <p className="text-primary-foreground/55">Velg tjenester for å se en levende pris.</p>}</div><div className="mt-6 flex items-center justify-between border-t border-primary-foreground/15 pt-4 text-xs"><span className="text-primary-foreground/60">Pris per person</span><span className="font-bold">{formatNok(estimate && guests ? estimate / guests : 0)}</span></div><div className="mt-5 rounded-xl bg-primary-foreground/10 p-3 text-[11px] leading-5 text-primary-foreground/65"><span className="font-bold text-primary-foreground">Internt estimat</span><br />Kost {formatNok(estimateCost)} · Margin {margin.toFixed(1)} %</div></aside></div>
    </div>
  </Shell>;
}

function StepDot({ number, active, label }: { number: number; active: boolean; label: string }) {
  return <div className={`flex items-center gap-2 text-[11px] font-bold ${active ? 'text-foreground' : 'text-muted-foreground'}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${active ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>{number}</span>{label}</div>;
}
function Field({ label, type = 'text', value, onChange, placeholder, testId }: { label: string; type?: string; value: string; onChange: (value: string) => void; placeholder: string; testId: string }) {
  return <div><label className="mb-2 block text-xs font-bold">{label}</label><input data-testid={testId} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-accent/40" /></div>;
}
function ServiceCard({ service, guests, selected, onToggle, index }: { service: Service; guests: number; selected: boolean; onToggle: () => void; index: number }) {
  const price = service.pricingType === 'per_person' ? service.priceNok * guests : service.priceNok;
  return <button type="button" data-testid={`button-service-${service.id}`} onClick={onToggle} className={`pressable animate-rise delay-${Math.min(index + 1, 5)} relative text-left rounded-xl border p-4 ${selected ? 'border-primary bg-[#edf2e9] shadow-[0_0_0_2px_hsl(var(--accent)/.55)]' : 'border-border bg-background hover:border-[#9cac9a]'}`}><div className="flex items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{selected ? <Check className="h-4 w-4" /> : <span className="text-xs font-extrabold">{categoryLabels[service.category]?.slice(0, 1)}</span>}</span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{service.name}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{service.description}</span></span><span className="shrink-0 text-right"><span className="block text-sm font-extrabold">{formatNok(price)}</span><span className="mt-1 block text-[10px] text-muted-foreground">{service.pricingType === 'per_person' ? 'per person' : 'fast pris'}</span></span></div></button>;
}

function Quotes() {
  const quotesQuery = useListQuotes({ query: { queryKey: getListQuotesQueryKey() } });
  const [filter, setFilter] = useState('all');
  const quotes = quotesQuery.data ?? [];
  const filtered = filter === 'all' ? quotes : quotes.filter((quote) => quote.status === filter);
  return <Shell><SectionHeading eyebrow="Arbeidsflate / tilbud" title="Tilbud, med ro i magen." description="Alle forespørsler på ett sted. Se hvor de står, hva de tåler og hva som bør skje videre." action={<Link href="/builder" data-testid="link-quotes-new" className="pressable inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" /> Nytt tilbud</Link>} />
    <div className="mb-5 flex flex-wrap gap-2">{[['all', 'Alle'], ['draft', 'Kladd'], ['approval', 'Godkjenning'], ['sent', 'Sendt'], ['accepted', 'Akseptert']].map(([value, label]) => <button key={value} type="button" data-testid={`button-filter-${value}`} onClick={() => setFilter(value)} className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${filter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>{label}</button>)}</div>
    {quotesQuery.isLoading ? <LoadingState rows={5} /> : quotesQuery.isError ? <ErrorState onRetry={() => quotesQuery.refetch()} /> : <div className="soft-shadow overflow-hidden rounded-2xl border border-border bg-card"><div className="hidden grid-cols-[1.5fr_1fr_.8fr_.75fr_.7fr_24px] gap-4 border-b border-border px-6 py-4 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground md:grid"><span>Bedrift</span><span>Arrangement</span><span>Status</span><span>Total</span><span>Margin</span><span /></div>{filtered.map((quote) => <QuoteTableRow key={quote.id} quote={quote} />)}{filtered.length === 0 && <EmptyState title="Ingen tilbud i denne visningen" body="Prøv et annet filter eller bygg et nytt tilbud." action={<Link href="/builder" data-testid="link-filter-empty-builder" className="font-bold text-[#8b6f3e]">Bygg nytt tilbud <ArrowRight className="ml-1 inline h-4 w-4" /></Link>} />}</div>}
  </Shell>;
}
function QuoteTableRow({ quote }: { quote: Quote }) {
  const [, setLocation] = useLocation();
  return <button type="button" data-testid={`button-open-quote-${quote.id}`} onClick={() => setLocation(`/customer-quote/${quote.id}`)} className="group grid w-full gap-3 border-b border-border px-5 py-5 text-left transition-colors last:border-0 hover:bg-[#f4f3eb] md:grid-cols-[1.5fr_1fr_.8fr_.75fr_.7fr_24px] md:items-center md:gap-4 md:px-6"><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-[10px] font-extrabold text-secondary-foreground">{initials(quote.company)}</div><div><p className="text-sm font-extrabold">{quote.company}</p><p className="mt-1 text-[11px] text-muted-foreground">{quote.quoteNumber} · {quote.contactName ?? 'Uten kontaktperson'}</p></div></div><div className="flex items-center gap-2 pl-12 text-xs text-muted-foreground md:block md:pl-0"><CalendarDays className="inline h-3.5 w-3.5 md:hidden" /> {formatDate(quote.eventDate)} <span className="mx-1 md:hidden">·</span> {quote.guests} gjester</div><div className="pl-12 md:pl-0"><StatusPill status={quote.status} /></div><p className="pl-12 text-sm font-extrabold md:pl-0">{formatNok(quote.totalNok)}</p><div className="flex items-center gap-2 pl-12 md:pl-0"><span className="text-sm font-extrabold">{quote.marginPercent.toFixed(1)} %</span><StatusPill status={quote.marketStatus} market /></div><ArrowRight className="absolute right-5 hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 md:relative md:right-auto md:block" /></button>;
}

function Catalog() {
  const servicesQuery = useListServices({ query: { queryKey: getListServicesQueryKey() } });
  const suppliersQuery = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const [tab, setTab] = useState<'services' | 'suppliers'>('services');
  const services = servicesQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  return <Shell><SectionHeading eyebrow="Driftsgrunnlag / katalog" title="Det gode tilbudet starter bak kulissene." description="Hold priser, partnere og løfter oppdatert. Så kan teamet selge med trygghet." action={<button type="button" data-testid="button-catalog-settings" className="pressable inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold"><Settings2 className="h-4 w-4" /> Kataloginnstillinger</button>} />
    <div className="mb-5 flex border-b border-border"><button type="button" data-testid="button-tab-services" onClick={() => setTab('services')} className={`border-b-2 px-1 pb-3 text-sm font-bold ${tab === 'services' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}>Tjenester <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px]">{services.length}</span></button><button type="button" data-testid="button-tab-suppliers" onClick={() => setTab('suppliers')} className={`ml-6 border-b-2 px-1 pb-3 text-sm font-bold ${tab === 'suppliers' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}>Leverandører <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px]">{suppliers.length}</span></button></div>
    {tab === 'services' ? <CatalogServices query={servicesQuery} services={services} /> : <CatalogSuppliers query={suppliersQuery} suppliers={suppliers} />}
  </Shell>;
}
function CatalogServices({ query, services }: { query: ReturnType<typeof useListServices>; services: Service[] }) {
  if (query.isLoading) return <LoadingState rows={5} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return <div className="grid gap-3 lg:grid-cols-2">{services.map((service, index) => <div key={service.id} data-testid={`card-service-${service.id}`} className={`pressable animate-rise delay-${Math.min(index + 1, 5)} rounded-2xl border border-border bg-card p-5 ${!service.active ? 'opacity-55' : ''}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Package className="h-5 w-5" /></span><div><p className="text-sm font-extrabold">{service.name}</p><p className="mt-1 text-xs text-muted-foreground">{categoryLabels[service.category]} · {service.active ? 'Aktiv' : 'Inaktiv'}</p></div></div><button type="button" data-testid={`button-edit-service-${service.id}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button></div><p className="mt-5 text-sm leading-6 text-muted-foreground">{service.description}</p><div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Salgspris</p><p className="mt-1 text-sm font-extrabold">{formatNok(service.priceNok)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Kost</p><p className="mt-1 text-sm font-extrabold">{formatNok(service.costNok)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Prising</p><p className="mt-1 text-xs font-bold">{service.pricingType.replace('_', ' ')}</p></div></div></div>)}{services.length === 0 && <EmptyState title="Katalogen er tom" body="Legg til tjenester i API-et for å gjøre dem tilgjengelige i byggeren." />}</div>;
}
function CatalogSuppliers({ query, suppliers }: { query: ReturnType<typeof useListSuppliers>; suppliers: Supplier[] }) {
  if (query.isLoading) return <LoadingState rows={4} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return <div className="overflow-hidden rounded-2xl border border-border bg-card">{suppliers.map((supplier) => <div key={supplier.id} data-testid={`row-supplier-${supplier.id}`} className="flex flex-col gap-4 border-b border-border p-5 last:border-0 sm:flex-row sm:items-center"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3e5c9] text-[#805f29]"><HeartHandshake className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold">{supplier.name}</p>{supplier.preferred && <span className="rounded-full bg-[#dfeadd] px-2 py-1 text-[10px] font-bold text-[#28513b]">Foretrukket</span>}</div><p className="mt-1 text-xs text-muted-foreground">{supplier.serviceCount} tjenester · {supplier.active ? 'Aktiv avtale' : 'Inaktiv'}</p></div><div className="flex items-center gap-5 text-xs text-muted-foreground"><span><span className="block text-[10px] font-bold uppercase tracking-wide">Neste vurdering</span><span className="mt-1 block font-semibold text-foreground">{supplier.nextReview ? formatDate(supplier.nextReview) : 'Ikke satt'}</span></span><button type="button" data-testid={`button-supplier-menu-${supplier.id}`} className="rounded-lg p-2 hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button></div></div>)}{suppliers.length === 0 && <EmptyState title="Ingen leverandører" body="Leverandørlisten blir synlig når API-et har partnere registrert." />}</div>;
}

function CustomerQuote() {
  const params = useParams<{ id: string }>();
  const quoteId = Number(params.id);
  const quoteQuery = useGetQuote(quoteId, { query: { queryKey: getGetQuoteQueryKey(quoteId), enabled: Number.isFinite(quoteId) } });
  const updateStatus = useUpdateQuoteStatus();
  const [copied, setCopied] = useState(false);
  const quote = quoteQuery.data;
  const copyLink = () => { navigator.clipboard?.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const setStatus = (status: 'sent' | 'accepted' | 'changes_requested') => { if (!quote) return; updateStatus.mutate({ quoteId: quote.id, data: { status } }, { onSuccess: () => { queryClient.setQueryData(getGetQuoteQueryKey(quote.id), (old: Quote | undefined) => old ? { ...old, status } : old); queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } }); };
  if (quoteQuery.isLoading) return <CustomerFrame><LoadingState rows={5} /></CustomerFrame>;
  if (quoteQuery.isError || !quote) return <CustomerFrame><ErrorState onRetry={() => quoteQuery.refetch()} /></CustomerFrame>;
  const details = [
    { Icon: CalendarDays, label: 'Dato', value: formatDate(quote.eventDate) },
    { Icon: Clock3, label: 'Tid', value: `${quote.startTime ?? ''}–${quote.endTime ?? ''}` },
    { Icon: Users, label: 'Gjester', value: String(quote.guests) },
    { Icon: MapPin, label: 'Sted', value: 'Rønningen' },
  ];
  return <CustomerFrame><div className="mx-auto max-w-[880px]"><div className="flex items-center justify-between"><Link href="/" data-testid="link-customer-brand" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">R</span><span><span className="block font-serif text-lg leading-none">Rønningen</span><span className="mono-font mt-1 block text-[9px] uppercase tracking-[.18em] text-muted-foreground">Bedriftsdag</span></span></Link><button type="button" data-testid="button-copy-quote-link" onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold">{copied ? <Check className="h-3.5 w-3.5 text-[#477056]" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Lenke kopiert' : 'Del tilbud'}</button></div><div className="mt-12 grid gap-8 lg:grid-cols-[1fr_285px]"><div><div className="animate-rise"><p className="mono-font text-[10px] font-bold uppercase tracking-[.2em] text-[#8b6f3e]">Tilbud {quote.quoteNumber}</p><h1 className="display-font mt-3 max-w-xl text-5xl leading-[.92] tracking-[-.04em] md:text-7xl">En dag å samles rundt.</h1><p className="mt-6 text-base leading-7 text-muted-foreground">Hei {quote.contactName || quote.company}. Her er forslaget vårt til en {quote.eventType.toLowerCase()} på Rønningen.</p></div><div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">{details.map(({ Icon, label, value }) => <div key={label} className="rounded-xl border border-border bg-card p-4"><Icon className="h-4 w-4 text-[#8b6f3e]" /><p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p data-testid={`text-customer-${label.toLowerCase()}`} className="mt-1 text-sm font-extrabold">{value}</p></div>)}</div><div className="mt-10"><div className="flex items-end justify-between border-b border-border pb-3"><div><p className="mono-font text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Forslaget</p><h2 className="display-font mt-2 text-3xl">Det som er med.</h2></div><p className="text-xs text-muted-foreground">Eks. mva.</p></div><div className="divide-y divide-border">{quote.items.map((item) => <CustomerItem item={item} key={item.id} />)}</div></div></div><aside><div className="sticky top-8 rounded-2xl bg-primary p-6 text-primary-foreground"><p className="mono-font text-[10px] font-bold uppercase tracking-[.18em] text-primary-foreground/60">Totalpris</p><p data-testid="text-customer-total" className="mt-3 text-4xl font-extrabold tracking-tight">{formatNok(quote.totalNok)}</p><p className="mt-1 text-xs text-primary-foreground/60">{formatNok(quote.pricePerPersonNok)} per person</p><div className="mt-7 border-t border-primary-foreground/15 pt-4 text-xs text-primary-foreground/65">Tilbudet gjelder til <span className="font-bold text-primary-foreground">{formatDate(quote.expiryDate)}</span></div>{quote.status === 'accepted' ? <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#b7d2b7]/20 p-3 text-sm font-bold"><CheckCircle2 className="h-4 w-4 text-[#b7d2b7]" /> Tilbud akseptert</div> : <div className="mt-5 space-y-2"><button type="button" data-testid="button-accept-quote" disabled={updateStatus.isPending} onClick={() => setStatus('accepted')} className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-extrabold text-accent-foreground disabled:opacity-50"><Check className="h-4 w-4" /> Dette ser bra ut</button><button type="button" data-testid="button-request-changes" disabled={updateStatus.isPending} onClick={() => setStatus('changes_requested')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-foreground/20 px-4 py-3 text-xs font-bold text-primary-foreground/75 hover:bg-primary-foreground/10"><Mail className="h-3.5 w-3.5" /> Be om endringer</button></div>}</div><div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-card p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#477056]" /><p className="text-xs leading-5 text-muted-foreground">Spørsmål underveis? Vi hjelper dere gjerne med å finne riktig rytme for dagen.</p></div></aside></div><p className="mt-12 text-center text-xs text-muted-foreground">Rønningen folkehøgskole · Oslo</p></div></CustomerFrame>;
}
function CustomerItem({ item }: { item: QuoteItem }) {
  return <div className="flex items-center gap-3 py-4"><div className={`grid h-9 w-9 place-items-center rounded-lg ${item.included ? 'bg-[#dfeadd] text-[#477056]' : 'bg-secondary text-secondary-foreground'}`}>{item.included ? <Check className="h-4 w-4" /> : <Package className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.quantity} {item.unit ?? 'stk.'}</p></div><p className="text-sm font-extrabold">{item.included ? 'Inkludert' : formatNok(item.totalNok)}</p></div>;
}
function CustomerFrame({ children }: { children: ReactNode }) {
  return <div className="noise min-h-[100dvh] bg-background px-5 py-6 text-foreground md:px-10 md:py-8">{children}</div>;
}
function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center px-5 py-16 text-center" data-testid="state-empty"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><Sparkles className="h-5 w-5" /></div><h3 className="mt-5 font-serif text-2xl">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Dashboard} /><Route path="/builder" component={Builder} /><Route path="/quotes" component={Quotes} /><Route path="/catalog" component={Catalog} /><Route path="/customer-quote/:id" component={CustomerQuote} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;