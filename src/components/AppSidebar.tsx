import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Archive, 
  Shuffle, 
  Settings, 
  LogOut,
  BarChart3,
  GraduationCap,
  Key,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { GerenciarArmariosDialog } from "./GerenciarArmariosDialog";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: GraduationCap, label: "Turmas", path: "/turmas" },
  { icon: Users, label: "Alunos", path: "/alunos" },
  { icon: Archive, label: "Armários", path: "/armarios" },
  { icon: Key, label: "Chaves", path: "/chaves", showKeyAlerts: true },
  { icon: Shuffle, label: "Sorteio", path: "/sorteio" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const { data: alertasChaves } = useQuery({
    queryKey: ["chavesAlertas"],
    queryFn: api.getAlertasChaves,
    refetchInterval: 60000,
  });

  const handleLogout = () => {
    logout();
    toast.info("Você saiu da sua conta.");
    navigate("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "CP";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const atrasadasCount = alertasChaves?.atrasadasCount ?? 0;

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* User Profile */}
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {getInitials(user?.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="truncate">
            <p className="font-semibold text-sidebar-foreground text-sm truncate">
              {user?.nome || "Coordenador"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role || "Administrador"}
            </p>
          </div>
        </div>

        {/* Modo Escuro / Claro Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          className="rounded-xl text-muted-foreground hover:text-foreground shrink-0"
        >
          {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "sidebar-item flex items-center justify-between",
                isActive && "sidebar-item-active"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>

              {item.showKeyAlerts && atrasadasCount > 0 && (
                <span className="bg-rose-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {atrasadasCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="w-full">
          <GerenciarArmariosDialog />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full sidebar-item text-destructive hover:bg-destructive/10 hover:text-destructive text-left transition-colors cursor-pointer"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
}
