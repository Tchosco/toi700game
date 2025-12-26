import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, Building2, Map, Flag, Coins, TrendingUp, Sparkles, 
  Users, Globe, Zap, Award, Shield, Wallet, FlaskConical, Compass,
  Swords, Handshake, Clock, Grid3X3, MapPin, Wheat, Cpu, Gem
} from 'lucide-react';
import { TokenDisplay } from '@/components/ui/TokenDisplay';
import { levelRequirements, tokenDescriptions } from '@/lib/data';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const sections = [
  {
    id: 'conceito',
    title: 'Conceito do Jogo',
    icon: Globe,
    content: `TOI-700 é um simulador micronacional gamificado de longo prazo onde você assume o papel de governante de um território em um planeta fictício. O sistema é focado em exploração planetária, colonização, administração territorial, economia, diplomacia e guerra.

**O planeta TOI-700:**
- Superfície total: 1,3× a área da Terra (~663 milhões km²)
- Área terrestre total: ~269 milhões km²
- População planetária: ~10 bilhões de habitantes
- Todo o planeta está LIBERADO desde o início

O planeta é dividido em ~35.900 células territoriais de 7.500 km² cada. Toda célula possui população e recursos desde o início.`
  },
  {
    id: 'celulas',
    title: 'Sistema de Células',
    icon: Grid3X3,
    content: `O território do planeta é dividido em ~35.900 células. Cada célula representa uma área de 7.500 km² com população e recursos.

**Tipos de células:**
- **Urbana (~20%):** ~766.000 hab/célula, 3 cidades, alto em tecnologia e influência
- **Rural (~80%):** ~157.000 hab/célula, 1 cidade pequena, alto em alimentos e minerais

**Status das células:**
- **Explorada:** Visível para todos, mas sem dono
- **Colonizada:** Possui um território controlador

**População e Ativação:**
- Toda célula possui população latente desde o início
- Ao colonizar, a população se torna ATIVA (tributável, produtiva)
- Células sem dono possuem população latente`
  },
  {
    id: 'economia',
    title: 'Economia e Moeda',
    icon: Wallet,
    content: `O planeta possui uma economia interna com moeda única (₮) e mercado AUTOMÁTICO de recursos.

**Moeda do jogo (₮):**
- Novos jogadores recebem ₮1.000 iniciais
- Usada para comprar tokens, recursos e financiar operações
- NÃO é conversível em dinheiro real

**Recursos básicos (todas as células possuem):**
- 🌾 Alimentos - Produzidos principalmente por células rurais
- ⚡ Energia - Distribuída equilibradamente pelo planeta
- 💎 Minerais - Produzidos por células rurais
- 💻 Tecnologia - Produzida por células urbanas
- 👥 Influência - Gerada por população urbana

**Mercado Automático:**
- Compras e vendas são executadas IMEDIATAMENTE
- Não há aprovação humana para transações
- Preços variam conforme oferta e demanda global`
  },
  {
    id: 'tokens',
    title: 'Sistema de Tokens',
    icon: Coins,
    content: `Tokens são itens especiais usados para expansão territorial. Eles são COMPRADOS no mercado usando a moeda do jogo.`
  },
  {
    id: 'pesquisa',
    title: 'Pesquisa Científica',
    icon: FlaskConical,
    content: `O sistema de pesquisa permite desbloquear novas regiões e tecnologias.

**Pontos de Pesquisa (PP):**
- Gerados automaticamente por cidades
- Aumentados por estabilidade territorial
- Usados para explorar novas regiões

**O que a pesquisa permite:**
- Revelar células bloqueadas
- Reduzir custo de colonização
- Explorar regiões difíceis
- Desbloquear tecnologias

A pesquisa é um esforço coletivo: quando uma região é explorada, ela fica visível para TODOS os jogadores.`
  },
  {
    id: 'exploracao',
    title: 'Exploração e Colonização',
    icon: Compass,
    content: `Exploração e colonização são mecânicas distintas e fundamentais.

**Exploração 🧭**
- Consome Pontos de Pesquisa
- Revela células bloqueadas
- Torna regiões visíveis a todos
- NÃO concede posse territorial
- É gradual, planetária e permanente

**Colonização 🏗️**
- Só ocorre em células já exploradas
- Concede posse territorial
- Cria célula rural ou urbana
- Consome tokens (Land ou City)

**Projetos de Exploração:**
Jogadores podem participar de projetos cooperativos para explorar novas regiões do planeta.`
  },
  {
    id: 'territorios',
    title: 'Territórios e Cidades',
    icon: Building2,
    content: `Territórios são formados pela união de células colonizadas.

**Cidades:**
- Apenas ~20% das células podem ser urbanas
- Fundar cidade requer 1 City Token
- Cidades geram recursos, moeda e pesquisa
- Cada cidade tem status: livre, ocupada ou neutra

**Células rurais:**
- Colonizar requer 1 Land Token
- Produzem recursos básicos
- Expandem o território

**Cidade Neutra (Capital Planetária):**
- Controlada pela administração
- Centro de eventos globais
- Não pode ser conquistada`
  },
  {
    id: 'formacao',
    title: 'Formação de País',
    icon: Flag,
    content: `Para formar oficialmente um país reconhecido, você precisa atender aos requisitos.

**PRIMEIRO TERRITÓRIO = APROVAÇÃO AUTOMÁTICA:**
- Seu primeiro território é aprovado IMEDIATAMENTE
- Não depende de votação ou análise administrativa
- Você recebe automaticamente 1 célula inicial com população ativa

**Requisitos para País Oficial:**
- 3 cidades adquiridas
- 1 State Token
- Capital definida
- Nome oficial
- Tipo de governo escolhido

Após formação, o território se torna um "Estado Reconhecido" com acesso a privilégios especiais no ranking planetário.`
  },
  {
    id: 'diplomacia',
    title: 'Diplomacia e Tratados',
    icon: Handshake,
    content: `Territórios podem estabelecer relações diplomáticas entre si.

**Status diplomáticos:**
- Paz - Estado neutro padrão
- Tensão - Relações deterioradas
- Guerra Fria - Hostilidade sem conflito aberto
- Guerra - Conflito ativo
- Aliança - Parceria militar
- Parceiro Comercial - Benefícios econômicos

**Tipos de Tratados:**
- 🕊️ Paz - Encerra conflitos
- 📦 Comércio - Benefícios econômicos mútuos
- ⚔️ Aliança - Defesa mútua
- 🛡️ Não-Agressão - Compromisso de paz
- 🔬 Pesquisa - Compartilhamento científico
- 🗺️ Territorial - Acordos de fronteira`
  },
  {
    id: 'guerra',
    title: 'Sistema de Guerra',
    icon: Swords,
    content: `Territórios podem mudar de dono através de conflitos simulados.

**Como funciona:**
- Guerras são baseadas em pontos, recursos e estabilidade
- NÃO são em tempo real
- Resolvem-se por ciclos automáticos
- Cada ciclo calcula forças e resolve batalhas

**Formas de transferência territorial:**
- Venda direta (negociação)
- Troca negociada
- Tratados diplomáticos
- Conquista militar

**Resultado da guerra:**
- Território pode mudar de dono
- Recursos são gastos
- Pontos de guerra determinam vencedor`
  },
  {
    id: 'administracao',
    title: 'Administração Territorial',
    icon: Shield,
    content: `A administração é o coração do jogo. Cada território deve gerenciar suas cidades, células, economia e estabilidade.

**O que administrar:**
- Cidades e zonas rurais
- Produção e consumo de recursos
- Estabilidade política
- Pesquisa e tecnologia
- Expansão territorial

**Má administração gera:**
- Crise e instabilidade
- Perda de células
- Rebeliões internas
- Falência econômica

**Boa administração gera:**
- Bônus econômicos
- Mais pontos de pesquisa
- Colonização mais barata
- Vantagem diplomática`
  },
  {
    id: 'eras',
    title: 'Eras Planetárias',
    icon: Clock,
    content: `O planeta evolui através de eras que liberam mais território.

**Era da Cartografia (atual):**
~4.000 células disponíveis
Fase inicial de mapeamento

**Era da Exploração:**
Expansão gradual do território jogável
Novos recursos disponíveis

**Era da Colonização:**
Novos continentes liberados
Maior complexidade política

**Era Planetária:**
Totalidade da terra disponível
Conflitos em larga escala

Cada era aumenta a complexidade do jogo e adiciona novos recursos e mecânicas.`
  },
  {
    id: 'niveis',
    title: 'Sistema de Níveis',
    icon: TrendingUp,
    content: `Territórios evoluem através de 5 níveis políticos. Cada nível desbloqueia novas possibilidades e maior influência planetária.`
  },
  {
    id: 'pontos',
    title: 'Pontuação',
    icon: Award,
    content: `Existem dois tipos de pontos que determinam sua evolução:

**PD (Pontos de Desenvolvimento)**
Ganhos através de construção, administração e eventos. Afetam evolução de nível e capacidade de expansão.

**PI (Pontos de Influência)**
Ganhos através de diplomacia, eventos e destaques. Afetam privilégios especiais e posição no ranking.

**PP (Pontos de Pesquisa)**
Gerados por cidades e estabilidade. Usados para exploração e desbloqueio de tecnologias.

Todos os tipos de pontos contribuem para a evolução do território.`
  },
  {
    id: 'eventos',
    title: 'Eventos Planetários',
    icon: Zap,
    content: `O planeta possui eventos dinâmicos que afetam territórios.

**Tipos de Eventos:**
- **Globais:** Afetam todo o planeta
- **Regionais:** Afetam regiões específicas
- **Crises:** Desafios com recompensas
- **Conferências:** Encontros diplomáticos
- **Projetos:** Esforços cooperativos

Participar de eventos gera pontos, moeda, tokens e pode alterar o status do território.`
  },
];

export default function HowToPlayPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Guia do Jogador</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Como Jogar
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Aprenda as regras e mecânicas do simulador micronacional de TOI-700
          </p>
        </div>

        {/* Quick Start */}
        <Card className="glass-card border-primary/30 mb-12 max-w-4xl mx-auto">
          <CardContent className="py-6">
            <h3 className="font-display font-bold text-lg mb-4 text-center">Início Rápido</h3>
            <div className="grid md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">1</span>
                </div>
                <p className="text-sm text-muted-foreground">Crie uma conta e receba ₮1.000 iniciais</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">2</span>
                </div>
                <p className="text-sm text-muted-foreground">Compre tokens no Mercado para expandir</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">3</span>
                </div>
                <p className="text-sm text-muted-foreground">Crie seu território com 1 cidade</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">4</span>
                </div>
                <p className="text-sm text-muted-foreground">Administre, expanda e forme um país</p>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <Link to="/mercado">
                <Button variant="outline" className="gap-2">
                  <Wallet className="w-4 h-4" />
                  Ir ao Mercado
                </Button>
              </Link>
              <Link to="/criar-territorio">
                <Button className="gap-2">
                  <Flag className="w-4 h-4" />
                  Criar Território
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Nav */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon className="w-4 h-4" />
                {section.title}
              </a>
            );
          })}
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} id={section.id} className="glass-card scroll-mt-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-display">{section.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-invert prose-sm max-w-none">
                  {section.content.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-muted-foreground whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}

                  {/* Special content for tokens section */}
                  {section.id === 'tokens' && (
                    <div className="mt-6 space-y-4 not-prose">
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <h4 className="font-display font-bold text-foreground mb-4">Tipos de Tokens</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-5 h-5 text-blue-400" />
                              <span className="font-medium text-blue-400">City Token</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Permite fundar 1 cidade</p>
                            <p className="text-xs text-blue-400 mt-2">Preço: ₮10.000</p>
                          </div>
                          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-5 h-5 text-green-400" />
                              <span className="font-medium text-green-400">Land Token</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Coloniza 1 célula rural</p>
                            <p className="text-xs text-green-400 mt-2">Preço: ₮2.500</p>
                          </div>
                          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Flag className="w-5 h-5 text-purple-400" />
                              <span className="font-medium text-purple-400">State Token</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Cria oficialmente um país</p>
                            <p className="text-xs text-purple-400 mt-2">Preço: ₮50.000</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <h4 className="font-display font-bold text-foreground mb-3">Seus Tokens</h4>
                        <TokenDisplay cityTokens={0} landTokens={0} stateTokens={0} />
                        <Link to="/mercado" className="block mt-4">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Wallet className="w-4 h-4" />
                            Comprar no Mercado
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Special content for economy section */}
                  {section.id === 'economia' && (
                    <div className="mt-6 not-prose">
                      <div className="grid grid-cols-5 gap-2">
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                          <Wheat className="w-6 h-6 text-green-400 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Alimentos</p>
                        </div>
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                          <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Energia</p>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                          <Gem className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Minerais</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                          <Cpu className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Tecnologia</p>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                          <Users className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Influência</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Special content for levels section */}
                  {section.id === 'niveis' && (
                    <div className="mt-6 not-prose">
                      <div className="grid gap-3">
                        {Object.entries(levelRequirements).map(([level, req]) => (
                          <div 
                            key={level} 
                            className={`p-4 rounded-lg border flex items-center justify-between bg-level-${level}/5 border-level-${level}/20`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full bg-level-${level}/20 text-level-${level} flex items-center justify-center font-bold`}>
                                {level}
                              </span>
                              <span className="font-medium">{req.name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {req.minCities}+ cidades • {req.minPoints}+ pontos
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Card className="glass-card border-primary/30 max-w-2xl mx-auto">
            <CardContent className="py-8">
              <h3 className="font-display font-bold text-xl mb-2">Pronto para começar?</h3>
              <p className="text-muted-foreground mb-6">
                Crie seu território e comece sua jornada em TOI-700
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/auth">
                  <Button size="lg" className="gap-2">
                    <Users className="w-5 h-5" />
                    Criar Conta
                  </Button>
                </Link>
                <Link to="/territorios">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Globe className="w-5 h-5" />
                    Ver Territórios
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}