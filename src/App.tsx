import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import MapPage from "./pages/MapPage";
import HowToPlayPage from "./pages/HowToPlayPage";
import CreateTerritoryPage from "./pages/CreateTerritoryPage";
import TerritoriesPage from "./pages/TerritoriesPage";
import TerritoryDetailPage from "./pages/TerritoryDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/como-jogar" element={<HowToPlayPage />} />
          <Route path="/criar-territorio" element={<CreateTerritoryPage />} />
          <Route path="/territorios" element={<TerritoriesPage />} />
          <Route path="/territorio/:id" element={<TerritoryDetailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
