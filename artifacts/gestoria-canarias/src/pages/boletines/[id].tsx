import { useParams, Link } from "wouter";
import { 
  useGetEntry, 
  useMarkEntryRead, 
  useToggleBookmark,
  getGetEntryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SourceBadge } from "@/components/source-badge";
import { formatDate } from "@/lib/format";
import { ArrowLeft, ExternalLink, Bookmark, BookmarkCheck, CheckCircle2, Clock } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BoletinDetail() {
  const { id } = useParams();
  const entryId = Number(id);
  const queryClient = useQueryClient();

  const { data: entry, isLoading, isError } = useGetEntry(entryId, {
    query: {
      enabled: !!entryId && !isNaN(entryId),
      queryKey: getGetEntryQueryKey(entryId)
    }
  });

  const markRead = useMarkEntryRead();
  const toggleBookmark = useToggleBookmark();

  // Auto-mark as read when opening detail
  useEffect(() => {
    if (entry && !entry.isRead) {
      markRead.mutate({ id: entryId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(entryId) });
        }
      });
    }
  }, [entry, entryId, markRead, queryClient]);

  const handleToggleBookmark = () => {
    toggleBookmark.mutate({ id: entryId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(entryId) });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-3/4" />
        <div className="flex gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-[400px] w-full mt-8" />
      </div>
    );
  }

  if (isError || !entry) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Error al cargar la entrada</h2>
          <p>El boletín solicitado no existe o no se pudo cargar.</p>
          <Link href="/boletines" className="mt-4 inline-block underline">Volver al listado</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/10 min-h-full">
      {/* Top Bar */}
      <div className="bg-background border-b sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
        <Link href="/boletines" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al registro
        </Link>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center text-sm text-muted-foreground mr-4">
            <CheckCircle2 className="w-4 h-4 text-primary mr-1" /> Leído
          </div>
          <Button
            variant="outline"
            className={entry.isBookmarked ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800" : ""}
            onClick={handleToggleBookmark}
          >
            {entry.isBookmarked ? (
              <><BookmarkCheck className="w-4 h-4 mr-2 fill-current" /> Guardado</>
            ) : (
              <><Bookmark className="w-4 h-4 mr-2" /> Guardar</>
            )}
          </Button>
          <Button asChild>
            <a href={entry.url} target="_blank" rel="noopener noreferrer">
              Ver documento oficial <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
          <div className="p-8 border-b">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <SourceBadge source={entry.source} className="text-sm px-3 py-1" />
              <div className="flex items-center text-sm text-muted-foreground font-medium">
                <Clock className="w-4 h-4 mr-1.5" />
                Publicado el {formatDate(entry.publishedAt)}
              </div>
              {entry.category && (
                <div className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm font-medium">
                  {entry.category}
                </div>
              )}
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
              {entry.title}
            </h1>
          </div>

          <div className="p-8 bg-zinc-50/50">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Resumen del documento
            </h3>
            {entry.summary ? (
              <div className="prose prose-zinc max-w-none prose-p:leading-relaxed">
                <p className="text-lg text-zinc-700 whitespace-pre-wrap">{entry.summary}</p>
              </div>
            ) : (
              <div className="text-muted-foreground italic py-4">
                No hay un resumen disponible para esta publicación. Consulte el documento oficial para más detalles.
              </div>
            )}
          </div>
          
          <div className="bg-muted/30 p-6 text-xs text-muted-foreground text-center border-t">
            Entrada registrada en el sistema el {formatDate(entry.createdAt)} • ID: {entry.id}
          </div>
        </div>
      </div>
    </div>
  );
}
