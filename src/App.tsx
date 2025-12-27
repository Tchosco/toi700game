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
import CellMapPage from "./pages/CellMapPage";
import DiplomacyPage from "./pages/DiplomacyPage";
import PopulationPage from "./pages/PopulationPage";
import ConstitutionPage from "./pages/ConstitutionPage";
import ParliamentPage from "./pages/ParliamentPage";
import BlocsPage from "./pages/BlocsPage";
import StateLawsPage from "./pages/StateLawsPage";
import CreateLawPage from "./pages/CreateLawPage";
import LegalHistoryPage from "./pages/LegalHistoryPage";
import StateCustomizationPage from "./pages/StateCustomizationPage";
import CellDetailPage from "./pages/CellDetailPage";
import PlanetaryCouncilPage from "./pages/PlanetaryCouncilPage";
import TradeChamberPage from "./pages/TradeChamberPage";
import PrivateRoomsPage from "./pages/PrivateRoomsPage";
import DiplomaticHistoryPage from "./pages/DiplomaticHistoryPage";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTerritories from "./pages/admin/AdminTerritories";
import AdminTokens from "./pages/admin/AdminTokens";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCities from "./pages/admin/AdminCities";
import AdminCityProfiles from "./pages/admin/AdminCityProfiles";
import AdminRegions from "./pages/admin/AdminRegions";
import AdminCells from "./pages/admin/AdminCells";
import AdminEras from "./pages/admin/AdminEras";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminResearchProjects from "./pages/admin/AdminResearchProjects";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminWorldConfig from "./pages/admin/AdminWorldConfig";
import AdminMarket from "./pages/admin/AdminMarket";
import AdminMarketListings from "./pages/admin/AdminMarketListings";
import AdminTradeDeals from "./pages/admin/AdminTradeDeals";
import AdminDiplomacy from "./pages/admin/AdminDiplomacy";
import AdminTickEngine from "./pages/admin/AdminTickEngine";
import NotFound from "./pages/NotFound";
import AchievementsPage from "./pages/AchievementsPage";
import MissionsPage from "./pages/MissionsPage";
import TechTreePage from "./pages/TechTreePage";
import PlanetPage from "./pages/PlanetPage";
import DynamicMapPage from "./pages/DynamicMapPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/mapa" element={<MapPage />} />
            <Route path="/como-jogar" element={<HowToPlayPage />} />
            <Route path="/criar-territorio" element={<CreateTerritoryPage />} />
            <Route path="/territorios" element={<TerritoriesPage />} />
            <Route path="/territorio/:id" element={<TerritoryDetailPage />} />
            <Route path="/mercado" element={<MarketPage />} />
            <Route path="/celulas" element={<CellMapPage />} />
            <Route path="/diplomacia" element={<DiplomacyPage />} />
            <Route path="/populacao" element={<PopulationPage />} />
            <Route path="/constituicao" element={<ConstitutionPage />} />
            <Route path="/parlamento" element={<ParliamentPage />} />
            <Route path="/blocos" element={<BlocsPage />} />
            <Route path="/leis" element={<StateLawsPage />} />
            <Route path="/leis/criar" element={<CreateLawPage />} />
            <Route path="/historico-legal" element={<LegalHistoryPage />} />
            <Route path="/customizacao" element={<StateCustomizationPage />} />
            <Route path="/celula/:id" element={<CellDetailPage />} />
            <Route path="/conselho-planetario" element={<PlanetaryCouncilPage />} />
            <Route path="/camara-comercio" element={<TradeChamberPage />} />
            <Route path="/salas-diplomaticas" element={<PrivateRoomsPage />} />
            <Route path="/historico-diplomatico" element={<DiplomaticHistoryPage />} />
            <Route path="/conquistas" element={<AchievementsPage />} />
            <Route path="/missoes" element={<MissionsPage />} />
            <Route path="/tecnologia" element={<TechTreePage />} />
            <Route path="/planeta" element={<PlanetPage />} />
            <Route path="/mapa-dinamico" element={<DynamicMapPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/territories" element={<AdminTerritories />} />
            <Route path="/admin/tokens" element={<AdminTokens />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/cities" element={<AdminCities />} />
            <Route path="/admin/city-profiles" element={<AdminCityProfiles />} />
            <Route path="/admin/regions" element={<AdminRegions />} />
            <Route path="/admin/cells" element={<AdminCells />} />
            <Route path="/admin/eras" element={<AdminEras />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/research-projects" element={<AdminResearchProjects />} />
            <Route path="/admin/config" element={<AdminConfig />} />
            <Route path="/admin/world-config" element={<AdminWorldConfig />} />
            <Route path="/admin/market" element={<AdminMarket />} />
            <Route path="/admin/market-listings" element={<AdminMarketListings />} />
            <Route path="/admin/trade-deals" element={<AdminTradeDeals />} />
            <Route path="/admin/diplomacy" element={<AdminDiplomacy />} />
            <Route path="/admin/tick-engine" element={<AdminTickEngine />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;