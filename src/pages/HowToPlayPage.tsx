import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, Building2, Map, Flag, Coins, TrendingUp, Sparkles, 
  Users, Globe, Zap, Award, Shield
} from 'lucide-react';
import { TokenDisplay } from '@/components/ui/TokenDisplay';
import { levelRequirements, tokenDescriptions } from '@/lib/data';

const sections = [
  {
    id: 'conceito',
    title: 'Conceito do Jogo',
    icon: Globe,
    content: `TOI-700 é um simulador micronacional gamificado onde você assume o papel de governante de um território em um planeta fictício. Diferente de jogos gráficos, o sistema é baseado em dados, painéis administrativos e progressão narrativa.

Cada jogador pode fundar cidades, formar países, participar de eventos e evoluir seu status político através de um sistema de pontos e tokens.`
  },
  {
    id: 'territorios',
    title: 'Territórios e Cidades',
    icon: Building2,
    content: `O planeta possui um número limitado de cidades jogáveis. Cada cidade ocupa uma célula territorial abstrata e pode ser adquirida usando City Tokens (CT).

**Como funciona:**
- Cidades livres podem ser adquiridas com CT
- Territórios são formados a partir da união de cidades
- Cada cidade possui uma região associada
- A capital é sempre uma das cidades do território`
  },
  {
    id: 'tokens',
    title: 'Sistema de Tokens',
    icon: Coins,
    content: `Tokens são a moeda do jogo, usados para expansão e progressão. Eles NÃO envolvem dinheiro real e são ganhos através de participação ativa.`
  },
  {
    id: 'formacao',
    title: 'Formação de País',
    icon: Flag,
    content: `Para formar oficialmente um país reconhecido, você precisa:

**Requisitos mínimos:**
- 3 cidades adquiridas
- 1 State Token (ST)
- Capital definida
- Nome oficial aprovado
- Tipo de governo escolhido

Após aprovação do Administrador Planetário, seu território muda para "Estado Reconhecido" e ganha acesso a privilégios especiais.`
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
Ganhos através de construção, administração e eventos de desenvolvimento. Afetam a evolução de nível e expansão.

**PI (Pontos de Influência)**
Ganhos através de diplomacia, participação em eventos e destaques. Afetam privilégios especiais e ranking.

Ambos os pontos são necessários para subir de nível e desbloquear funcionalidades avançadas.`
  },
  {
    id: 'eventos',
    title: 'Eventos Planetários',
    icon: Zap,
    content: `O planeta possui eventos dinâmicos que afetam todos os territórios:

**Tipos de Eventos:**
- **Globais:** Afetam todo o planeta
- **Regionais:** Afetam regiões específicas
- **Crises:** Desafios que podem gerar recompensas
- **Conferências:** Encontros diplomáticos
- **Guerras Narrativas:** Conflitos simulados

Participar de eventos gera pontos, tokens e pode alterar o status político do seu território.`
  },
  {
    id: 'administracao',
    title: 'Administração Planetária',
    icon: Shield,
    content: `O Administrador Planetário é responsável por:

- Aprovar novos territórios
- Distribuir tokens em eventos
- Resolver disputas territoriais
- Criar eventos globais
- Manter a ordem do sistema

A cidade neutra "Zenith Central" serve como capital planetária e sede da administração.`
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
                        <div className="space-y-3">
                          {Object.entries(tokenDescriptions).map(([key, token]) => (
                            <div key={key} className="flex items-start gap-3">
                              <div className={`w-3 h-3 rounded-full bg-${token.color} mt-1.5`} />
                              <div>
                                <p className="font-medium text-foreground">{token.name}</p>
                                <p className="text-sm text-muted-foreground">{token.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <h4 className="font-display font-bold text-foreground mb-3">Exemplo de Exibição</h4>
                        <TokenDisplay cityTokens={3} landTokens={5} stateTokens={1} />
                      </div>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <h4 className="font-medium text-primary mb-2">Como ganhar tokens?</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Participação ativa no sistema</li>
                          <li>• Participação em eventos</li>
                          <li>• Produção de conteúdo narrativo</li>
                          <li>• Decisões administrativas aprovadas</li>
                          <li>• Destaques mensais</li>
                        </ul>
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
      </div>
    </Layout>
  );
}
