import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import BoletinesList from "@/pages/boletines/index";
import BoletinDetail from "@/pages/boletines/[id]";
import SyncPage from "@/pages/sync";
import AlertasPage from "@/pages/alertas";
import NotFound from "@/pages/not-found";
import PortfolioDemo from "@/demo/PortfolioDemo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/boletines" component={BoletinesList} />
        <Route path="/boletines/:id" component={BoletinDetail} />
        <Route path="/alertas" component={AlertasPage} />
        <Route path="/sincronizacion" component={SyncPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  // The public portfolio demo is an entirely client-side, read-only app.
  // It does not mount API hooks or authenticated operational screens.
  if (import.meta.env.VITE_PORTFOLIO_DEMO === "true") return <PortfolioDemo />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
