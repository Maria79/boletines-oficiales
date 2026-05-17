import { useParams, Link } from "wouter";
import { 
  useGetEntry, 
  useMarkEntryRead, 
  useToggleBookmark,
  getGetEntryQueryKey,
  useListEntryNotes,
  useCreateEntryNote,
  useUpdateEntryNote,
  useDeleteEntryNote,
  getListEntryNotesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SourceBadge } from "@/components/source-badge";
import { formatDate } from "@/lib/format";
import { ArrowLeft, ExternalLink, Bookmark, BookmarkCheck, CheckCircle2, Clock, StickyNote, Pencil, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

function formatNoteDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return formatDate(dateStr);
}

function NotesSection({ entryId }: { entryId: number }) {
  const queryClient = useQueryClient();
  const { data: notes = [], isLoading } = useListEntryNotes(entryId, {
    query: {
      enabled: !!entryId && !isNaN(entryId),
      queryKey: getListEntryNotesQueryKey(entryId)
    }
  });
  
  const createNote = useCreateEntryNote();
  const updateNote = useUpdateEntryNote();
  const deleteNote = useDeleteEntryNote();

  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleAddNote = () => {
    if (!newContent.trim()) return;
    createNote.mutate({ id: entryId, data: { content: newContent } }, {
      onSuccess: () => {
        setNewContent("");
        queryClient.invalidateQueries({ queryKey: getListEntryNotesQueryKey(entryId) });
      }
    });
  };

  const handleUpdateNote = (noteId: number) => {
    if (!editContent.trim()) return;
    updateNote.mutate({ id: entryId, noteId, data: { content: editContent } }, {
      onSuccess: () => {
        setEditingId(null);
        setEditContent("");
        queryClient.invalidateQueries({ queryKey: getListEntryNotesQueryKey(entryId) });
      }
    });
  };

  const handleDeleteNote = (noteId: number) => {
    if (window.confirm("¿Seguro que deseas eliminar esta nota?")) {
      deleteNote.mutate({ id: entryId, noteId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEntryNotesQueryKey(entryId) });
        }
      });
    }
  };

  return (
    <div className="mt-8 bg-amber-50/30 border-l-4 border-l-amber-400 rounded-r-xl shadow-sm overflow-hidden p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-backwards">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-amber-100 p-2 rounded-md text-amber-600">
          <StickyNote className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-amber-950">Notas privadas</h2>
          <p className="text-sm text-amber-700/80">Anotaciones internas vinculadas a esta publicación</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full bg-amber-100/50" />
            <Skeleton className="h-24 w-full bg-amber-100/50" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-amber-800/60 italic py-6 text-center bg-amber-100/30 rounded-lg border border-amber-200/50 border-dashed">
            Sin notas para esta entrada. Añade la primera nota abajo.
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-white/80 border border-amber-200/50 rounded-lg p-5 shadow-sm">
                {editingId === note.id ? (
                  <div className="space-y-3">
                    <Textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[100px] border-amber-200 focus-visible:ring-amber-400 bg-white"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={updateNote.isPending || !editContent.trim()}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        Guardar cambios
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-zinc-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-100">
                      <span className="text-xs text-amber-700/60 font-medium">
                        {formatNoteDate(note.createdAt)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-amber-700/60 hover:text-amber-700 hover:bg-amber-100/50"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditContent(note.content);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-6 mt-6 border-t border-amber-200/40">
          <div className="space-y-3">
            <Textarea
              placeholder="Escribe una nota sobre el impacto de esta normativa..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[100px] border-amber-200 focus-visible:ring-amber-400 bg-white/60 placeholder:text-amber-800/40"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleAddNote}
                disabled={createNote.isPending || !newContent.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                Añadir nota
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

        {/* Private Notes Section */}
        <NotesSection entryId={entryId} />
      </div>
    </div>
  );
}
