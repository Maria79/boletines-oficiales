import { Link } from "wouter";
import { LayoutDashboard, Library, RefreshCw, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import logo from "@assets/logo1_1779010669308.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/boletines", label: "Boletines", icon: Library },
    { href: "/alertas", label: "Alertas", icon: BellRing },
    { href: "/sincronizacion", label: "Sincronización", icon: RefreshCw },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-sidebar-border flex flex-col bg-[#d7e2f2]">
        <div className="p-6 flex items-center gap-3">
          <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight text-sidebar-foreground">Gestoría Canarias</span>
            <span className="text-xs text-sidebar-primary uppercase tracking-wider font-semibold">Boletines Oficiales</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-6">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-sidebar-accent-foreground bg-[#e1eaf7]"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50 text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} Gestoría Canarias
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
