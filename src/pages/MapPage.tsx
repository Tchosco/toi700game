import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockCities, mockTerritories, regions } from '@/lib/data';
import { Map, Building2, Users, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import toi700Map from '@/assets/toi-700-map.png';

export default function MapPage() {
  const mapVersion = 'v1.0';
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const regionStats = regions.map(region => {
    const citiesInRegion = mockCities.filter(c => c.region === region);
    const territoriesInRegion = mockTerritories.filter(t => t.region === region);
    return {
      name: region,
      totalCities: citiesInRegion.length,
      freeCities: citiesInRegion.filter(c => c.status === 'Livre').length,
      occupiedCities: citiesInRegion.filter(c => c.status === 'Ocupada').length,
      neutralCities: citiesInRegion.filter(c => c.status === 'Neutra').length,
      territories: territoriesInRegion,
    };
  });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Map className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Mapa Oficial</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Mapa de <span className="text-gradient">TOI-700</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Visualize as regiões, territórios e cidades do planeta. O mapa é atualizado conforme novos territórios são formados.
          </p>
          <Badge variant="outline" className="mt-4">
            Versão do Mapa: {mapVersion}
          </Badge>
        </div>

        {/* Map Display */}
        <Card className={`glass-card mb-12 ${isFullscreen ? 'fixed inset-4 z-50 m-0' : ''}`}>
          <CardContent className="p-0 relative">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button size="icon" variant="secondary" onClick={handleZoomOut} className="h-8 w-8">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" onClick={handleZoomIn} className="h-8 w-8">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" onClick={toggleFullscreen} className="h-8 w-8">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Map Container */}
            <div className={`overflow-auto rounded-lg border border-border/50 bg-[#4a4a8a] ${isFullscreen ? 'h-full' : 'max-h-[70vh]'}`}>
              <div 
                className="transition-transform duration-200 origin-top-left"
                style={{ transform: `scale(${zoom})`, minWidth: 'fit-content' }}
              >
                <img 
                  src={toi700Map} 
                  alt="Mapa Oficial de TOI-700" 
                  className="w-full h-auto"
                  draggable={false}
                />
              </div>
            </div>
            
            {/* Zoom indicator */}
            <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
              Zoom: {Math.round(zoom * 100)}%
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mb-12">
          <h2 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Legenda de Status
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <StatusBadge status="Livre" />
              <span className="text-sm text-muted-foreground">Cidades disponíveis para aquisição</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="Ocupada" />
              <span className="text-sm text-muted-foreground">Cidades pertencentes a territórios</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="Neutra" />
              <span className="text-sm text-muted-foreground">Administração Planetária</span>
            </div>
          </div>
        </div>

        {/* Regions Grid */}
        <div>
          <h2 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            Regiões do Planeta
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regionStats.map((region) => (
              <Card key={region.name} className="glass-card hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg">{region.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{region.totalCities} cidades</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {region.freeCities > 0 && (
                      <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">
                        {region.freeCities} livres
                      </Badge>
                    )}
                    {region.occupiedCities > 0 && (
                      <Badge variant="outline" className="bg-status-pending/10 text-status-pending border-status-pending/30">
                        {region.occupiedCities} ocupadas
                      </Badge>
                    )}
                    {region.neutralCities > 0 && (
                      <Badge variant="outline" className="bg-status-neutral/10 text-status-neutral border-status-neutral/30">
                        {region.neutralCities} neutras
                      </Badge>
                    )}
                  </div>

                  {region.territories.length > 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Territórios na região:</p>
                      <div className="space-y-1">
                        {region.territories.map(t => (
                          <p key={t.id} className="text-sm text-primary hover:text-primary/80 cursor-pointer">
                            {t.name}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
