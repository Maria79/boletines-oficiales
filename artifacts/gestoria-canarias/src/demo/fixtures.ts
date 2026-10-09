/**
 * Completely fictional sample publications. The source codes represent sample
 * categories, not actual BOE/BOC/BOP/BORME notices. No person, NIF, client,
 * real feed, API key, or production data is included.
 */
export const SOURCE_LABELS = {
  BOE: "BOE · Estado",
  BOC: "BOC · Canarias",
  BOP_TFE: "BOP · Tenerife",
  BOP_LPA: "BOP · Las Palmas",
  BORME: "BORME · Mercantil",
} as const;

export type SourceCode = keyof typeof SOURCE_LABELS;

export type DemoEntry = {
  id: number;
  source: SourceCode;
  title: string;
  category: string;
  publishedAt: string;
  excerpt: string;
  tags: string[];
};

export const DEMO_ENTRIES: DemoEntry[] = [
  { id: 101, source: "BOE", title: "Ejemplo ficticio: actualización de un procedimiento administrativo", category: "Administración", publishedAt: "2026-10-07", excerpt: "Noticia inventada para mostrar cómo una asesoría revisaría un cambio de procedimiento, comprobaría su vigencia y documentaría a quién afecta.", tags: ["procedimientos","pymes"] },
  { id: 102, source: "BOC", title: "Ejemplo ficticio: convocatoria de apoyo a pequeños comercios", category: "Subvenciones", publishedAt: "2026-10-06", excerpt: "Convocatoria hipotética utilizada únicamente para demostrar clasificación, filtros y relevancia de publicaciones autonómicas.", tags: ["comercio","ayudas"] },
  { id: 103, source: "BOP_TFE", title: "Ejemplo ficticio: anuncio municipal sobre actividades económicas", category: "Actividad económica", publishedAt: "2026-10-05", excerpt: "Anuncio inventado de ámbito local. No contiene requisitos ni plazos reales.", tags: ["tenerife","comercio"] },
  { id: 104, source: "BORME", title: "Ejemplo ficticio: modificación societaria de Empresa Atlántico Demo", category: "Mercantil", publishedAt: "2026-10-05", excerpt: "Asiento registral ficticio para enseñar cómo el sistema podría destacar un cambio mercantil relevante.", tags: ["sociedades","mercantil"] },
  { id: 105, source: "BOP_LPA", title: "Ejemplo ficticio: apertura de plazo para trámites locales", category: "Administración", publishedAt: "2026-10-04", excerpt: "Publicación simulada para distinguir procedencias y permitir búsquedas por categoría.", tags: ["las palmas","procedimientos"] },
  { id: 106, source: "BOE", title: "Ejemplo ficticio: recordatorio de presentación documental", category: "Obligaciones", publishedAt: "2026-10-03", excerpt: "Modelo de aviso de seguimiento, sin efectos jurídicos ni calendario fiscal real.", tags: ["documentación","pymes"] },
  { id: 107, source: "BOC", title: "Ejemplo ficticio: programa formativo de digitalización", category: "Formación", publishedAt: "2026-10-02", excerpt: "Programa hipotético usado para ejemplificar la clasificación de oportunidades.", tags: ["formación","digitalización"] },
  { id: 108, source: "BORME", title: "Ejemplo ficticio: nombramiento en una sociedad de servicios", category: "Mercantil", publishedAt: "2026-10-02", excerpt: "Registro mercantil inventado. No corresponde a ninguna empresa existente.", tags: ["sociedades","servicios"] },
  { id: 109, source: "BOP_TFE", title: "Ejemplo ficticio: norma municipal de gestión de espacios", category: "Normativa local", publishedAt: "2026-10-01", excerpt: "Entrada de muestra para ilustrar un seguimiento temático de avisos locales.", tags: ["tenerife","normativa"] },
  { id: 110, source: "BOE", title: "Ejemplo ficticio: guía para interoperabilidad documental", category: "Tecnología", publishedAt: "2026-09-30", excerpt: "Documento hipotético para un área de transformación digital y archivo.", tags: ["digitalización","procedimientos"] },
  { id: 111, source: "BOC", title: "Ejemplo ficticio: iniciativa de sostenibilidad empresarial", category: "Sostenibilidad", publishedAt: "2026-09-29", excerpt: "Publicación totalmente simulada de un programa sectorial.", tags: ["pymes","comercio"] },
  { id: 112, source: "BOP_LPA", title: "Ejemplo ficticio: nueva ventanilla de atención municipal", category: "Administración", publishedAt: "2026-09-28", excerpt: "Ejemplo inventado sobre gestión de trámites en el ámbito municipal.", tags: ["las palmas","procedimientos"] },
  { id: 113, source: "BORME", title: "Ejemplo ficticio: depósito de cuentas de compañía simulada", category: "Mercantil", publishedAt: "2026-09-27", excerpt: "Entrada sintética de flujo mercantil. No contiene datos societarios reales.", tags: ["sociedades","contabilidad"] },
  { id: 114, source: "BOP_TFE", title: "Ejemplo ficticio: taller municipal para emprendedores", category: "Formación", publishedAt: "2026-09-26", excerpt: "Muestra de anuncio sobre formación. Ningún curso ni fecha es una oferta real.", tags: ["tenerife","formación"] },
  { id: 115, source: "BOE", title: "Ejemplo ficticio: buenas prácticas de registro digital", category: "Tecnología", publishedAt: "2026-09-25", excerpt: "Entrada de demostración para probar filtros, búsqueda y diseño de fichas.", tags: ["digitalización","documentación"] },
  { id: 116, source: "BOC", title: "Ejemplo ficticio: reconocimiento sectorial a pymes", category: "Actividad económica", publishedAt: "2026-09-24", excerpt: "Texto inventado que permite mostrar una segunda familia de avisos empresariales.", tags: ["comercio","pymes"] },
];

export type DemoOrganization = {
  id: string;
  name: string;
  interests: string[];
  area: string;
};

export const DEMO_ORGANIZATIONS: DemoOrganization[] = [
  { id: "fictional-retail", name: "Comercio Atlántico — ejemplo ficticio", interests: ["comercio","ayudas","pymes"], area: "Tenerife" },
  { id: "fictional-agency", name: "Gestión Digital — ejemplo ficticio", interests: ["digitalización","documentación","procedimientos"], area: "Canarias" },
  { id: "fictional-services", name: "Servicios Mar — ejemplo ficticio", interests: ["sociedades","mercantil","contabilidad"], area: "Canarias" },
];

export function filterDemoEntries(
  entries: readonly DemoEntry[],
  filters: { query?: string; source?: SourceCode | "all"; category?: string },
): DemoEntry[] {
  const query = (filters.query ?? "").trim().toLocaleLowerCase("es");
  return entries.filter((entry) => {
    const matchesSearch = !query || [entry.title, entry.excerpt, entry.category, ...entry.tags]
      .some((item) => item.toLocaleLowerCase("es").includes(query));
    return matchesSearch
      && (!filters.source || filters.source === "all" || entry.source === filters.source)
      && (!filters.category || filters.category === "all" || entry.category === filters.category);
  });
}

export function relevanceExamples(
  org: DemoOrganization,
  entries: readonly DemoEntry[] = DEMO_ENTRIES,
) {
  return entries.map((entry) => {
    const matches = entry.tags.filter((tag) => org.interests.includes(tag));
    return { entry, matchingTags: matches, sampleScore: matches.length * 35 };
  }).filter((item) => item.matchingTags.length > 0)
    .sort((a, b) => b.sampleScore - a.sampleScore || a.entry.id - b.entry.id);
}

export function sampleSummary(entries: readonly DemoEntry[]) {
  return {
    count: entries.length,
    sources: new Set(entries.map((entry) => entry.source)).size,
    categories: new Set(entries.map((entry) => entry.category)).size,
  };
}
