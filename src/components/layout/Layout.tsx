import { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen hero-bg star-field">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
      <footer className="border-t border-border/50 py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            TOI-700 Micronational Simulator • Versão 1.0
          </p>
          <p className="text-muted-foreground/60 text-xs mt-2">
            Um simulador político gamificado para o planeta TOI-700
          </p>
        </div>
      </footer>
    </div>
  );
}
