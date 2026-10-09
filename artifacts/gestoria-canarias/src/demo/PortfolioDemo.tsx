import { useMemo, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, BookOpen, Building2, Check,
  ChevronRight, Download, FileSearch, FileText, Globe2, Info,
  Layers3, LockKeyhole, Search, ShieldCheck, Sparkles,
} from "lucide-react";
import {
  DEMO_ENTRIES, DEMO_ORGANIZATIONS, SOURCE_LABELS,
  filterDemoEntries, relevanceExamples, sampleSummary,
  type DemoEntry, type SourceCode,
} from "./fixtures";

type View = "dashboard" | "entries" | "relevance" | "about";

const NAV = [
  { key: "dashboard", label: "Panel general", icon: Activity },
  { key: "entries", label: "Publicaciones", icon: FileText },
  { key: "relevance", label: "Relevancia", icon: Building2 },
  { key: "about", label: "Sobre la demo", icon: Info },
] as const;

const CATEGORIES = [...new Set(DEMO_ENTRIES.map(e => e.category))].sort();
const sources = Object.keys(SOURCE_LABELS) as SourceCode[];

const readableDate = (date: string) =>
  new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));

function downloadDemoCsv(entries: readonly DemoEntry[]) {
  const columns = ["Fuente", "Título", "Categoría", "Fecha", "Etiquetas"];
  const quote = (value: string) => '"' + value.replaceAll('"', '""') + '"';
  const rows = entries.map(e => [
    SOURCE_LABELS[e.source], e.title, e.category, e.publishedAt, e.tags.join(" / "),
  ]);
  const csv = [columns, ...rows].map(row => row.map(quote).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "boletines_demo_ficticia.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SourcePill({ source }: { source: SourceCode }) {
  return <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold tracking-wide text-blue-800 ring-1 ring-blue-100">{source.replace("_", " ")}</span>;
}

function DemoBadge() {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">
    <ShieldCheck className="h-3.5 w-3.5" /> DEMOSTRACIÓN FICTICIA
  </span>;
}

function ArticleCard({ entry, onOpen }: { entry: DemoEntry; onOpen: (id: number) => void }) {
  return <button type="button" onClick={() => onOpen(entry.id)}
    className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
    <div className="flex flex-wrap items-center gap-2">
      <SourcePill source={entry.source} />
      <span className="text-xs text-slate-500">{readableDate(entry.publishedAt)}</span>
      <span className="ml-auto text-xs text-slate-500">{entry.category}</span>
    </div>
    <div className="mt-3 flex items-start justify-between gap-4">
      <h3 className="text-base font-semibold leading-snug text-slate-900">{entry.title}</h3>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </div>
    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{entry.excerpt}</p>
  </button>;
}

export default function PortfolioDemo() {
  const [view, setView] = useState<View>("dashboard");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<SourceCode | "all">("all");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [orgId, setOrgId] = useState(DEMO_ORGANIZATIONS[0].id);

  const filtered = useMemo(() => filterDemoEntries(DEMO_ENTRIES, { query: search, source, category }), [search, source, category]);
  const summary = sampleSummary(DEMO_ENTRIES);
  const chosenOrg = DEMO_ORGANIZATIONS.find(o => o.id === orgId) ?? DEMO_ORGANIZATIONS[0];
  const matches = relevanceExamples(chosenOrg);
  const selectedEntry = DEMO_ENTRIES.find(e => e.id === selectedId);
  const switchView = (next: View) => { setView(next); setSelectedId(null); };
  const openEntry = (id: number) => { setView("entries"); setSelectedId(id); };

  return <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
    <div className="border-b border-amber-300 bg-amber-50 px-5 py-2.5 text-center text-xs font-medium text-amber-950">
      <span className="font-bold">Portfolio demo — contenido totalmente ficticio.</span> No consulta fuentes oficiales, no usa datos de clientes ni realiza operaciones en el servidor.
    </div>
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-[#10375C] text-white lg:w-64 lg:shrink-0 lg:border-b-0">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="rounded-xl bg-white/15 p-2.5"><Layers3 className="h-7 w-7 text-amber-300" /></div>
          <div><div className="font-bold leading-tight">Gestoría Canarias</div><div className="mt-0.5 text-xs tracking-wider text-blue-100">BOLETINES OFICIALES</div></div>
        </div>
        <nav aria-label="Secciones de demostración" className="flex flex-wrap gap-1 px-3 pb-4 lg:block lg:space-y-1 lg:px-4">
          {NAV.map(item => <button type="button" key={item.key} onClick={() => switchView(item.key)}
            aria-current={view === item.key ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${view === item.key ? "bg-white text-blue-950" : "text-blue-100 hover:bg-white/10"}`}>
            <item.icon className="h-4 w-4 shrink-0" />{item.label}
          </button>)}
        </nav>
        <div className="hidden border-t border-white/15 px-6 py-5 text-xs leading-relaxed text-blue-100 lg:block">
          <LockKeyhole className="mb-2 h-4 w-4" /> Demo de solo lectura. Las rutas de escritura, sincronización y gestión de clientes no están conectadas.
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-medium text-slate-500">Producto / Demo interactiva</div>
          <DemoBadge />
        </header>

        {selectedEntry && view === "entries" ? <section className="max-w-3xl">
          <button type="button" onClick={() => setSelectedId(null)} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Volver a publicaciones</button>
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex flex-wrap items-center gap-3"><SourcePill source={selectedEntry.source} /><span className="text-sm text-slate-500">{readableDate(selectedEntry.publishedAt)}</span></div>
            <h1 className="mt-5 text-2xl font-bold leading-tight sm:text-3xl">{selectedEntry.title}</h1>
            <p className="mt-3 text-sm font-semibold text-slate-500">Categoría: {selectedEntry.category}</p>
            <p className="mt-6 text-base leading-8 text-slate-700">{selectedEntry.excerpt}</p>
            <div className="mt-7 flex flex-wrap gap-2">{selectedEntry.tags.map(tag => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">#{tag}</span>)}</div>
            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950"><strong>Ejemplo inventado.</strong> Esta ficha no corresponde a una disposición publicada y no contiene enlaces externos, plazos u obligaciones reales.</div>
          </div>
        </section> : null}

        {!selectedEntry && view === "dashboard" && <section>
          <div className="mb-8 max-w-3xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-700"><Globe2 className="h-4 w-4" /> Visión de producto</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Boletines que se convierten en trabajo útil.</h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">Una muestra interactiva del recorrido: recopilar publicaciones, encontrarlas fácilmente y explicar por qué una noticia puede interesar a una asesoría.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Publicaciones de muestra", value: summary.count, icon: FileText },
              { label: "Fuentes representadas", value: summary.sources, icon: Globe2 },
              { label: "Categorías de ejemplo", value: summary.categories, icon: Layers3 },
            ].map(card => <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <card.icon className="h-5 w-5 text-blue-700" /><div className="mt-4 text-3xl font-bold">{card.value}</div>
              <p className="mt-1 text-sm text-slate-500">{card.label}</p>
            </div>)}
          </div>
          <div className="mt-8 grid gap-6 xl:grid-cols-5">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <h2 className="text-lg font-bold">Cobertura ilustrativa</h2>
              <p className="mt-1 text-sm text-slate-500">Distribución del conjunto ficticio</p>
              <div className="mt-6 space-y-4">{sources.map(s => {
                const count = DEMO_ENTRIES.filter(e => e.source === s).length;
                return <div key={s}><div className="mb-2 flex justify-between text-xs"><span className="font-medium">{SOURCE_LABELS[s]}</span><span>{count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-700" style={{ width: `${count / DEMO_ENTRIES.length * 100}%` }} /></div></div>;
              })}</div>
            </section>
            <section className="xl:col-span-3">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Publicaciones de ejemplo</h2><button type="button" onClick={() => switchView("entries")} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">Ver todas <ArrowRight className="h-4 w-4" /></button></div>
              <div className="space-y-3">{DEMO_ENTRIES.slice(0, 3).map(entry => <ArticleCard key={entry.id} entry={entry} onOpen={openEntry} />)}</div>
            </section>
          </div>
          <button type="button" onClick={() => switchView("relevance")} className="mt-6 flex w-full items-center justify-between rounded-xl bg-[#10375C] p-6 text-left text-white transition hover:bg-[#184a7b]">
            <span><span className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-amber-300" /> Ver relevancia para clientes ficticios</span><span className="mt-2 block text-sm text-blue-100">Ejemplo explicable por intereses y etiquetas, sin procesar datos de nadie.</span></span><ArrowRight className="h-5 w-5 shrink-0" />
          </button>
        </section>}

        {!selectedEntry && view === "entries" && <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="text-3xl font-bold tracking-tight">Registro de publicaciones</h1><p className="mt-2 text-slate-600">Exploración y filtrado de anuncios totalmente ficticios.</p></div>
            <button type="button" onClick={() => downloadDemoCsv(filtered)} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Download className="h-4 w-4" /> Exportar CSV ficticio</button>
          </div>
          <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
            <label className="text-xs font-semibold text-slate-600"><span className="mb-2 block">Buscar por texto o etiqueta</span><span className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ej. comercio, digitalización…" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-normal text-slate-900 focus:outline-2 focus:outline-blue-600" /></span></label>
            <label className="text-xs font-semibold text-slate-600"><span className="mb-2 block">Fuente</span><select value={source} onChange={e => setSource(e.target.value as SourceCode | "all")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:outline-2 focus:outline-blue-600"><option value="all">Todas las fuentes</option>{sources.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-600"><span className="mb-2 block">Categoría</span><select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:outline-2 focus:outline-blue-600"><option value="all">Todas las categorías</option>{CATEGORIES.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
          </div>
          <p role="status" className="my-5 text-sm text-slate-500">{filtered.length} publicaciones ficticias encontradas</p>
          {filtered.length ? <div className="grid gap-3 lg:grid-cols-2">{filtered.map(entry => <ArticleCard key={entry.id} entry={entry} onOpen={openEntry} />)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><FileSearch className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 font-semibold">Sin resultados</h2><p className="mt-2 text-sm text-slate-500">Probá otra búsqueda o cambiá los filtros.</p><button type="button" onClick={() => { setSearch(""); setSource("all"); setCategory("all"); }} className="mt-4 text-sm font-bold text-blue-700 hover:underline">Restablecer filtros</button></div>}
        </section>}

        {!selectedEntry && view === "relevance" && <section>
          <div className="max-w-3xl"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-700"><Sparkles className="h-4 w-4" /> Caso de uso</p><h1 className="mt-3 text-3xl font-bold">De publicaciones a relevancia</h1><p className="mt-3 leading-relaxed text-slate-600">Seleccioná una organización ficticia para ver qué publicaciones de muestra coinciden con sus intereses. Las etiquetas, coincidencias y puntuaciones son <strong>ilustrativas</strong>; no ejecutan el algoritmo real de producción.</p></div>
          <div className="mt-7 rounded-xl border border-slate-200 bg-white p-5">
            <label className="block text-sm font-bold text-slate-700" htmlFor="demo-organization">Organización de muestra</label>
            <select id="demo-organization" value={orgId} onChange={e => setOrgId(e.target.value)} className="mt-2 w-full max-w-xl rounded-lg border border-slate-300 bg-white p-3 text-sm">{DEMO_ORGANIZATIONS.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select>
            <p className="mt-4 text-sm text-slate-600"><strong>Intereses de ejemplo:</strong> {chosenOrg.interests.join(" · ")}</p>
            <p className="mt-1 text-sm text-slate-600"><strong>Ámbito:</strong> {chosenOrg.area}</p>
          </div>
          <div className="mt-6 flex items-baseline justify-between gap-3"><h2 className="text-lg font-bold">Coincidencias explicadas</h2><span className="text-sm text-slate-500">{matches.length} avisos ficticios</span></div>
          <div className="mt-4 space-y-3">{matches.map(({ entry, matchingTags, sampleScore }) => <button type="button" onClick={() => openEntry(entry.id)} key={entry.id} className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-sm sm:flex-row sm:items-start sm:justify-between">
            <div><div className="mb-2 flex flex-wrap items-center gap-2"><SourcePill source={entry.source} /><span className="text-xs text-slate-500">{readableDate(entry.publishedAt)}</span></div><p className="font-semibold">{entry.title}</p><p className="mt-2 text-sm text-slate-500">Motivo de ejemplo: coincidencia de {matchingTags.join(", ")}</p></div><div className="shrink-0 text-sm font-semibold text-blue-700">{sampleScore} pts. demo <ChevronRight className="inline h-4 w-4" /></div>
          </button>)}</div>
        </section>}

        {!selectedEntry && view === "about" && <section className="max-w-3xl">
          <h1 className="text-3xl font-bold">Sobre esta demostración</h1>
          <p className="mt-4 leading-8 text-slate-700">Esta vista pública es una muestra de interfaz del proyecto Gestoría Canarias. Todo el contenido se genera a partir de datos ficticios incluidos en el código fuente; no contiene cuentas, NIF, personas identificables ni publicaciones oficiales reales.</p>
          <div className="mt-7 grid gap-4">
            {[
              { title: "Exploración segura", desc: "Búsqueda, filtros, fichas y exportación CSV de ejemplos. No existe conexión con API o base de datos.", icon: Search },
              { title: "Arquitectura real en el repositorio", desc: "El código completo también ilustra Express, PostgreSQL/Drizzle, OpenAPI, sincronización y reglas de negocio. Estas partes no se ejecutan en esta demo.", icon: BookOpen },
              { title: "Acciones desactivadas", desc: "No se ofrecen escritura, sincronización, notas, alertas privadas ni administración de clientes.", icon: LockKeyhole },
            ].map(info => <div key={info.title} className="rounded-xl border border-slate-200 bg-white p-5"><info.icon className="mb-3 h-5 w-5 text-blue-700" /><h2 className="font-bold">{info.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{info.desc}</p></div>)}
          </div>
          <a href="https://github.com/Maria79/boletines-oficiales" rel="noreferrer" target="_blank" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline">Ver código del proyecto <ArrowRight className="h-4 w-4" /></a>
        </section>}
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500"><span>Gestoría Canarias · Demo técnica de portfolio</span><span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-700" /> Sin API de negocio ni datos privados</span></footer>
      </main>
    </div>
  </div>;
}
