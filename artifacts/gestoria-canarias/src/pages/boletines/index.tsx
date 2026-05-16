import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { 
  useListEntries, 
  useMarkEntryRead, 
  useToggleBookmark,
  getListEntriesQueryKey,
  getGetStatsSummaryQueryKey,
  getGetRecentEntriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { SourceBadge } from "@/components/source-badge";
import { formatDate } from "@/lib/format";
import { Bookmark, BookmarkCheck, CheckCircle2, Circle, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function BoletinesList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [source, setSource] = useState<string>("all");
  const [search, setSearch] = useState("");
  
  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setPage(1);
    }, 500);
  };

  const limit = 20;

  const params = {
    page,
    limit,
    ...(source !== "all" ? { source } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {})
  };

  const { data, isLoading } = useListEntries(params, { 
    query: { 
      queryKey: getListEntriesQueryKey(params) 
    } 
  });

  const markRead = useMarkEntryRead();
  const toggleBookmark = useToggleBookmark();

  const handleMarkRead = useCallback((id: number, currentRead: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentRead) return; // Only allow marking AS read for now based on API spec
    
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey(params) });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentEntriesQueryKey() });
      }
    });
  }, [markRead, queryClient, params]);

  const handleToggleBookmark = useCallback((id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    toggleBookmark.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey(params) });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
      }
    });
  }, [toggleBookmark, queryClient, params]);

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Header & Filters */}
      <div className="bg-background border-b sticky top-0 z-10 px-8 py-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary">Registro de Boletines</h1>
              <p className="text-sm text-muted-foreground">Explora y filtra las publicaciones oficiales.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar en título o resumen..."
                  className="pl-9 bg-muted/50"
                  value={search}
                  onChange={handleSearch}
                />
              </div>
              <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fuentes</SelectItem>
                  <SelectItem value="BOE">BOE (Estado)</SelectItem>
                  <SelectItem value="BOC">BOC (Canarias)</SelectItem>
                  <SelectItem value="BOP_LPA">BOP Las Palmas</SelectItem>
                  <SelectItem value="BOP_TFE">BOP Tenerife</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 h-24 bg-muted/20" />
                </Card>
              ))}
            </div>
          ) : data?.entries && data.entries.length > 0 ? (
            <>
              <div className="space-y-3">
                {data.entries.map((entry, index) => (
                  <Link key={entry.id} href={`/boletines/${entry.id}`}>
                    <Card 
                      className={cn(
                        "hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2",
                        !entry.isRead && "border-l-4 border-l-accent"
                      )}
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
                    >
                      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        
                        <div className="flex-1 min-w-0 order-2 sm:order-1">
                          <div className="flex items-center gap-3 mb-2">
                            <SourceBadge source={entry.source} />
                            <span className="text-xs text-muted-foreground font-medium">
                              {formatDate(entry.publishedAt)}
                            </span>
                            {entry.category && (
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground truncate max-w-[200px]">
                                {entry.category}
                              </span>
                            )}
                          </div>
                          <h3 className={cn(
                            "text-base font-semibold leading-snug line-clamp-2",
                            !entry.isRead ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {entry.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 order-1 sm:order-2 self-end sm:self-center ml-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-9 w-9 rounded-full",
                              entry.isRead ? "text-primary" : "text-muted-foreground hover:text-primary"
                            )}
                            onClick={(e) => handleMarkRead(entry.id, entry.isRead, e)}
                            title={entry.isRead ? "Leído" : "Marcar como leído"}
                          >
                            {entry.isRead ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-9 w-9 rounded-full",
                              entry.isBookmarked ? "text-amber-500 hover:text-amber-600 bg-amber-50" : "text-muted-foreground hover:text-amber-500"
                            )}
                            onClick={(e) => handleToggleBookmark(entry.id, e)}
                            title={entry.isBookmarked ? "Quitar marcador" : "Guardar marcador"}
                          >
                            {entry.isBookmarked ? <BookmarkCheck className="h-5 w-5 fill-current" /> : <Bookmark className="h-5 w-5" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {data.total > limit && (
                <div className="flex items-center justify-between mt-8 bg-background p-4 rounded-lg border shadow-sm">
                  <span className="text-sm text-muted-foreground">
                    Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, data.total)} de {data.total}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                    <span className="text-sm font-medium px-4 py-1 bg-muted rounded-md">{page}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * limit >= data.total}
                    >
                      Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-12 bg-background border rounded-lg border-dashed">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground">No se encontraron resultados</h3>
              <p className="text-muted-foreground mt-1">Prueba a cambiar los filtros o el término de búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
