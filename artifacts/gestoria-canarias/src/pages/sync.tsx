import { useGetSyncStatus, useTriggerSync, getGetSyncStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function SyncPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Use a shorter refetch interval when sync is running
  const [refetchInterval, setRefetchInterval] = useState<number | false>(false);
  
  const { data: status, isLoading, refetch } = useGetSyncStatus({
    query: {
      queryKey: getGetSyncStatusQueryKey(),
      refetchInterval: refetchInterval
    }
  });

  const triggerSync = useTriggerSync();

  // Adjust polling based on status
  useEffect(() => {
    if (status?.isRunning || triggerSync.isPending) {
      setRefetchInterval(2000); // Poll every 2s while running
    } else {
      setRefetchInterval(false);
    }
  }, [status?.isRunning, triggerSync.isPending]);

  const handleSync = () => {
    triggerSync.mutate(undefined, {
      onSuccess: (result) => {
        toast({
          title: "Sincronización completada",
          description: `Se han encontrado ${result.newEntries} nuevas publicaciones.`,
        });
        refetch();
      },
      onError: () => {
        toast({
          title: "Error de sincronización",
          description: "Hubo un problema al contactar con las fuentes oficiales.",
          variant: "destructive",
        });
        refetch();
      }
    });
  };

  const isRunning = status?.isRunning || triggerSync.isPending;

  let lastResultObj = null;
  if (status?.lastResult) {
    try {
      lastResultObj = JSON.parse(status.lastResult);
    } catch (e) {
      // Ignore parse error
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Sincronización</h1>
        <p className="text-muted-foreground mt-1">
          Gestione la conexión con los boletines oficiales (BOE, BOC, BOP).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-sm border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" /> 
              Estado del Servicio
            </CardTitle>
            <CardDescription>
              El sistema revisa automáticamente los boletines cada mañana.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Estado Actual</span>
                <div className="flex items-center gap-2 mt-1">
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-accent animate-spin" />
                      <span className="font-bold text-foreground">Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-foreground">En espera (Inactivo)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Última sincronización</span>
                <span className="font-medium">
                  {status?.lastSyncAt ? formatDateTime(status.lastSyncAt) : "Desconocido"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Próxima programada</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  Mañana 07:00 AM
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 border-t p-6">
            <Button 
              className="w-full" 
              size="lg"
              disabled={isRunning}
              onClick={handleSync}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Descargando datos...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Ahora
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-muted-foreground" />
              Último Resultado
            </CardTitle>
            <CardDescription>
              Resumen de la última ejecución del scraper.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRunning ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-50" />
                <p className="text-sm text-muted-foreground">El proceso está en curso.<br/>Esto puede tardar unos minutos.</p>
              </div>
            ) : lastResultObj ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  {lastResultObj.success ? (
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{lastResultObj.success ? 'Éxito' : 'Error'}</h3>
                    <p className="text-sm text-muted-foreground">{lastResultObj.message}</p>
                  </div>
                </div>

                {lastResultObj.success && (
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                    <div className="text-center mb-4">
                      <span className="text-4xl font-black text-primary">{lastResultObj.newEntries}</span>
                      <p className="text-sm font-medium text-primary/70 uppercase tracking-wider">Nuevas Entradas</p>
                    </div>
                    
                    {lastResultObj.sources && lastResultObj.sources.length > 0 && (
                      <div className="space-y-2 mt-4 pt-4 border-t border-primary/10">
                        {lastResultObj.sources.map((s: any) => (
                          <div key={s.source} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{s.source}</span>
                            <div className="flex items-center gap-2">
                              {s.success ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Falló</Badge>
                              )}
                              <span className="text-muted-foreground w-12 text-right">+{s.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No hay información de la última sincronización.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
