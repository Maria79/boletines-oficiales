import { useState } from "wouter";
import { useGetStatsSummary, useGetRecentEntries, useGetCategoryBreakdown } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceBadge } from "@/components/source-badge";
import { formatDate } from "@/lib/format";
import { Link } from "wouter";
import { FileText, Bell, Bookmark, ArrowRight, Activity } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: recent, isLoading: recentLoading } = useGetRecentEntries({ limit: 10 });
  const { data: categories, isLoading: categoriesLoading } = useGetCategoryBreakdown();

  const COLORS = ['#1e40af', '#047857', '#b91c1c', '#6d28d9', '#c2410c', '#0f766e', '#1d4ed8', '#be123c'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Panel de Control</h1>
          <p className="text-muted-foreground mt-1">Resumen de la actividad regulatoria reciente.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-xs uppercase tracking-wider">Total Entradas</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {statsLoading ? "..." : stats?.totalEntries.toLocaleString("es-ES")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" /> Registradas en el sistema
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-accent shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-xs uppercase tracking-wider">Nuevas Hoy</CardDescription>
            <CardTitle className="text-3xl font-bold text-accent-foreground">
              {statsLoading ? "..." : stats?.todayCount.toLocaleString("es-ES")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" /> Actualizadas esta mañana
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-xs uppercase tracking-wider">No Leídas</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {statsLoading ? "..." : stats?.unreadCount.toLocaleString("es-ES")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Bell className="w-3 h-3" /> Pendientes de revisión
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-xs uppercase tracking-wider">Guardadas</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {statsLoading ? "..." : stats?.bookmarkedCount.toLocaleString("es-ES")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Bookmark className="w-3 h-3" /> Marcadas como importantes
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle>Actualización de Hoy</CardTitle>
              <CardDescription>Las publicaciones más recientes extraídas de los boletines.</CardDescription>
            </div>
            <Link href="/boletines" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {recentLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando entradas...</div>
            ) : recent && recent.length > 0 ? (
              <div className="divide-y">
                {recent.map((entry) => (
                  <Link key={entry.id} href={`/boletines/${entry.id}`} className="block hover:bg-muted/50 p-4 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <SourceBadge source={entry.source} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground line-clamp-2 mb-1">
                          {entry.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDate(entry.publishedAt)}</span>
                          {entry.category && (
                            <>
                              <span>•</span>
                              <span className="truncate">{entry.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {!entry.isRead && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex h-2 w-2 rounded-full bg-accent"></span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No hay entradas recientes.</div>
            )}
          </CardContent>
        </Card>

        {/* Categories Chart */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b">
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>Clasificación de los boletines procesados.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-4">
            {categoriesLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">Cargando gráfico...</div>
            ) : categories && categories.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="category"
                    >
                      {categories.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [`${value} entradas`, 'Cantidad']}
                      contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">Sin datos de categorías.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
