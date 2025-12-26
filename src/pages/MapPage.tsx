import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockCities, mockTerritories, regions } from '@/lib/data';
import { Map, Globe, Building2, Users } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function MapPage() {
  const mapVersion = 'v1.0';

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

        {/* Map Placeholder */}
        <Card className="glass-card mb-12">
          <CardContent className="p-0">
            <div className="aspect-video md:aspect-[21/9] rounded-lg bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 flex flex-col items-center justify-center border border-border/50 relative overflow-hidden">
              <div className="absolute inset-0 star-field opacity-30" />
              <Globe className="w-20 h-20 text-primary/30 mb-4 animate-float" />
              <p className="text-muted-foreground text-center px-4">
                O mapa do planeta será exibido aqui após upload da imagem oficial (Azgaar)
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2">
                Formatos aceitos: PNG, JPG, SVG
              </p>
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
