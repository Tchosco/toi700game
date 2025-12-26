import { ReactNode, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  MapPin, 
  Coins, 
  CalendarDays, 
  Users,
  LogOut,
  Loader2,
  Shield,
  Building2,
  Globe,
  Grid3X3,
  Clock,
  Compass,
  Settings,
  TrendingUp,
  Swords,
  FlaskConical
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/tick-engine', label: 'Motor de Turnos', icon: Clock },
  { href: '/admin/territories', label: 'Territórios', icon: MapPin },
  { href: '/admin/regions', label: 'Regiões', icon: Globe },
  { href: '/admin/cities', label: 'Cidades', icon: Building2 },
  { href: '/admin/city-profiles', label: 'Perfis de Cidade', icon: Building2 },
  { href: '/admin/cells', label: 'Células', icon: Grid3X3 },
  { href: '/admin/eras', label: 'Eras', icon: Clock },
  { href: '/admin/projects', label: 'Projetos de Exploração', icon: Compass },
  { href: '/admin/research-projects', label: 'Projetos de Pesquisa', icon: FlaskConical },
  { href: '/admin/market', label: 'Mercado de Recursos', icon: TrendingUp },
  { href: '/admin/market-listings', label: 'Listagens do Mercado', icon: Coins },
  { href: '/admin/trade-deals', label: 'Acordos Comerciais', icon: Swords },
  { href: '/admin/diplomacy', label: 'Diplomacia', icon: Shield },
  { href: '/admin/world-config', label: 'Config. do Mundo', icon: Settings },
  { href: '/admin/config', label: 'Config. Planetária', icon: Settings },
  { href: '/admin/tokens', label: 'Tokens', icon: Coins },
  { href: '/admin/events', label: 'Eventos', icon: CalendarDays },
  { href: '/admin/users', label: 'Usuários', icon: Users },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-status-warning" />
            <span className="font-display text-lg text-glow">Admin Panel</span>
          </Link>
        </div>
        
        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-primary/20 text-primary border border-primary/30" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
