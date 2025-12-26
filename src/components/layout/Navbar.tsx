import { Link, useLocation } from 'react-router-dom';
import { Globe, Map, BookOpen, PlusCircle, Building2, Menu, X, Shield, LogIn, LogOut, TrendingUp, User, Grid3X3, Swords, Users, Scale, Gavel, Globe2, Crown, History, MessageCircle, Handshake, Lock, Scroll, Palette } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const navLinks = [
  { to: '/', label: 'Início', icon: Globe },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/celulas', label: 'Células', icon: Grid3X3 },
  { to: '/populacao', label: 'População', icon: Users },
  { to: '/mercado', label: 'Mercado', icon: TrendingUp },
];

const legalLinks = [
  { to: '/constituicao', label: 'Constituição', icon: Scale },
  { to: '/parlamento', label: 'Parlamento', icon: Gavel },
  { to: '/blocos', label: 'Blocos', icon: Globe2 },
  { to: '/leis', label: 'Minhas Leis', icon: Crown },
  { to: '/historico-legal', label: 'Histórico', icon: History },
];

const diplomacyLinks = [
  { to: '/conselho-planetario', label: 'Conselho Planetário', icon: Globe2 },
  { to: '/camara-comercio', label: 'Câmara de Comércio', icon: Handshake },
  { to: '/salas-diplomaticas', label: 'Salas Privadas', icon: Lock },
  { to: '/historico-diplomatico', label: 'Histórico Diplomático', icon: Scroll },
];

const stateLinks = [
  { to: '/customizacao', label: 'Customização', icon: Palette },
  { to: '/territorios', label: 'Territórios', icon: Building2 },
];

export function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center glow-primary">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-lg tracking-wider text-gradient hidden sm:block">
              TOI-700
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/20 text-primary glow-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}

            {/* State Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                    stateLinks.some(l => location.pathname === l.to)
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Estado
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {stateLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <DropdownMenuItem key={link.to} asChild>
                      <Link to={link.to} className="flex items-center gap-2 cursor-pointer">
                        <Icon className="w-4 h-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Diplomacy Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                    diplomacyLinks.some(l => location.pathname === l.to) || location.pathname === '/diplomacia'
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  Diplomacia
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/diplomacia" className="flex items-center gap-2 cursor-pointer">
                    <Swords className="w-4 h-4" />
                    Relações Diplomáticas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {diplomacyLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <DropdownMenuItem key={link.to} asChild>
                      <Link to={link.to} className="flex items-center gap-2 cursor-pointer">
                        <Icon className="w-4 h-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Legal Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                    legalLinks.some(l => location.pathname === l.to)
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  Jurídico
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {legalLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <DropdownMenuItem key={link.to} asChild>
                      <Link to={link.to} className="flex items-center gap-2 cursor-pointer">
                        <Icon className="w-4 h-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link to="/perfil">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    Perfil
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Entrar
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}

              {/* State Links - Mobile */}
              <div className="border-t border-border/50 mt-2 pt-2">
                <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Estado</p>
                {stateLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Diplomacy Links - Mobile */}
              <div className="border-t border-border/50 mt-2 pt-2">
                <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Diplomacia</p>
                <Link
                  to="/diplomacia"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location.pathname === '/diplomacia'
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Swords className="w-5 h-5" />
                  Relações Diplomáticas
                </Link>
                {diplomacyLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Legal Links - Mobile */}
              <div className="border-t border-border/50 mt-2 pt-2">
                <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Sistema Jurídico</p>
                {legalLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Auth Links - Mobile */}
              <div className="border-t border-border/50 mt-2 pt-2">
                {user ? (
                  <>
                    <Link
                      to="/perfil"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary hover:bg-muted/50"
                    >
                      <User className="w-5 h-5" />
                      Meu Perfil
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-status-warning hover:bg-muted/50"
                      >
                        <Shield className="w-5 h-5" />
                        Painel Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      Sair
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary hover:bg-muted/50"
                  >
                    <LogIn className="w-5 h-5" />
                    Entrar
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
