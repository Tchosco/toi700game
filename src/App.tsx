import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import MapPage from "./pages/MapPage";
import HowToPlayPage from "./pages/HowToPlayPage";
import CreateTerritoryPage from "./pages/CreateTerritoryPage";
import TerritoriesPage from "./pages/TerritoriesPage";
import TerritoryDetailPage from "./pages/TerritoryDetailPage";
import MarketPage from "./pages/MarketPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTerritories from "./pages/admin/AdminTerritories";
import AdminTokens from "./pages/admin/AdminTokens";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCities from "./pages/admin/AdminCities";
import AdminRegions from "./pages/admin/AdminRegions";
import AdminCells from "./pages/admin/AdminCells";
import AdminEras from "./pages/admin/AdminEras";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminMarket from "./pages/admin/AdminMarket";
import AdminResearch from "./pages/admin/AdminResearch";
import AdminDiplomacy from "./pages/admin/AdminDiplomacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/mapa" element={<MapPage />} />
            <Route path="/como-jogar" element={<HowToPlayPage />} />
            <Route path="/criar-territorio" element={<CreateTerritoryPage />} />
            <Route path="/territorios" element={<TerritoriesPage />} />
            <Route path="/territorio/:id" element={<TerritoryDetailPage />} />
            <Route path="/mercado" element={<MarketPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/territories" element={<AdminTerritories />} />
            <Route path="/admin/tokens" element={<AdminTokens />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/cities" element={<AdminCities />} />
            <Route path="/admin/regions" element={<AdminRegions />} />
            <Route path="/admin/cells" element={<AdminCells />} />
            <Route path="/admin/eras" element={<AdminEras />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/config" element={<AdminConfig />} />
            <Route path="/admin/market" element={<AdminMarket />} />
            <Route path="/admin/research" element={<AdminResearch />} />
            <Route path="/admin/diplomacy" element={<AdminDiplomacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
