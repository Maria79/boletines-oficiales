import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListAlerts, 
  useCreateAlert, 
  useDeleteAlert, 
  getListAlertsQueryKey,
  getGetAlertMatchesQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, BellRing, Plus, AlertCircle } from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const POPULAR_CATEGORIES = [
  "Hacienda y Finanzas", 
  "Fiscalidad Canaria", 
  "Seguridad Social", 
  "Empleo y Formación", 
  "Contratación Pública", 
  "Vivienda", 
  "Tributos Locales", 
  "Turismo y Empresa", 
  "Empleo Público"
];

const SOURCES = [
  { value: "all", label: "Todos los boletines" },
  { value: "BOE", label: "BOE" },
  { value: "BOC", label: "BOC" },
  { value: "BOP Las Palmas", label: "BOP Las Palmas" },
  { value: "BOP Tenerife", label: "BOP Tenerife" },
];

export default function AlertasPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("all");

  const { data: alerts, isLoading } = useListAlerts();

  const createAlert = useCreateAlert({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAlertMatchesQueryKey() });
        setCategory("");
        setSource("all");
        toast({
          title: "Alerta creada",
          description: "La alerta se ha configurado correctamente.",
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo crear la alerta.",
        });
      }
    }
  });

  const deleteAlert = useDeleteAlert({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAlertMatchesQueryKey() });
        toast({
          title: "Alerta eliminada",
          description: "La alerta ha sido eliminada.",
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo eliminar la alerta.",
        });
      }
    }
  });

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;
    
    createAlert.mutate({
      data: {
        category: category.trim(),
        source: source === "all" ? undefined : source
      }
    });
  };

  const handleQuickAdd = (cat: string) => {
    setCategory(cat);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <BellRing className="w-8 h-8" />
          Alertas
        </h1>
        <p className="text-muted-foreground mt-1">Configura avisos para las categorías que más te importan.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva Alerta</CardTitle>
          <CardDescription>
            Las alertas te avisan en el panel cuando se publica normativa nueva en la categoría seleccionada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAddAlert} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 w-full">
              <label htmlFor="category" className="text-sm font-medium">Categoría</label>
              <Input 
                id="category"
                placeholder="Ej. Hacienda y Finanzas" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2 w-full md:w-64">
              <label htmlFor="source" className="text-sm font-medium">Fuente (Opcional)</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="Todos los boletines" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={!category.trim() || createAlert.isPending} className="w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Añadir alerta
            </Button>
          </form>

          <div className="space-y-3 pt-2">
            <span className="text-sm text-muted-foreground font-medium">Sugerencias:</span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CATEGORIES.map(cat => (
                <Badge 
                  key={cat} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80 text-xs px-3 py-1 font-normal transition-colors"
                  onClick={() => handleQuickAdd(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">Tus Alertas Configuradas</h3>
        
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando alertas...</div>
        ) : alerts && alerts.length > 0 ? (
          <div className="grid gap-3">
            {alerts.map(alert => (
              <Card key={alert.id} className="shadow-sm">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{alert.category}</h4>
                      {alert.source && (
                        <Badge variant="outline" className="mt-1 font-normal text-xs text-muted-foreground">
                          Solo en {alert.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar alerta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Dejarás de recibir avisos destacados en el panel para la categoría "{alert.category}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteAlert.mutate({ id: alert.id })}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed shadow-none bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h4 className="font-semibold text-lg mb-1">Sin alertas configuradas</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                No tienes ninguna alerta activa. Añade categorías arriba para destacar las novedades que te interesan en el panel de control.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
