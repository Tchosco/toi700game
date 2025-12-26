import { Link, useLocation } from 'react-router-dom';
import { Globe, Map, BookOpen, PlusCircle, Building2, Menu, X, Shield, LogIn, LogOut, TrendingUp, User, Grid3X3, Swords, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { to: '/', label: 'Início', icon: Globe },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/celulas', label: 'Células', icon: Grid3X3 },
  { to: '/populacao', label: 'População', icon: Users },
  { to: '/mercado', label: 'Mercado', icon: TrendingUp },
  { to: '/diplomacia', label: 'Diplomacia', icon: Swords },
  { to: '/como-jogar', label: 'Como Jogar', icon: BookOpen },
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
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
