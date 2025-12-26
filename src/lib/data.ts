// Types for the TOI-700 Micronational Simulator

export type GovernmentType = 
  | 'Monarquia Absoluta'
  | 'Monarquia Constitucional'
  | 'República Presidencialista'
  | 'República Parlamentarista'
  | 'Teocracia'
  | 'Oligarquia'
  | 'Ditadura';

export type TerritoryStyle = 
  | 'Cultural'
  | 'Comercial'
  | 'Tecnológico'
  | 'Militar';

export type TerritoryStatus = 
  | 'Em Análise'
  | 'Ativo'
  | 'Inativo'
  | 'Suspenso';

export type CityStatus = 
  | 'Livre'
  | 'Ocupada'
  | 'Neutra';

export type TerritoryLevel = 
  | 'Colônia'
  | 'Território Autônomo'
  | 'Estado Reconhecido'
  | 'Reino/República'
  | 'Potência Planetária';

export interface City {
  id: string;
  name: string;
  region: string;
  status: CityStatus;
  ownerId: string | null;
  ownerName: string | null;
  population: number;
}

export interface Territory {
  id: string;
  name: string;
  region: string;
  capital: string;
  governmentType: GovernmentType;
  style: TerritoryStyle;
  lore: string;
  status: TerritoryStatus;
  level: TerritoryLevel;
  levelNumber: number;
  governorName: string;
  governorId: string;
  flagUrl?: string;
  cities: string[];
  cityTokens: number;
  landTokens: number;
  stateTokens: number;
  developmentPoints: number;
  influencePoints: number;
  createdAt: string;
  events: TerritoryEvent[];
}

export interface TerritoryEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'global' | 'regional' | 'crisis' | 'conference' | 'war';
  pointsGained?: number;
  tokensGained?: { type: string; amount: number }[];
}

export interface PlanetaryEvent {
  id: string;
  title: string;
  description: string;
  type: 'global' | 'regional' | 'crisis' | 'conference' | 'war';
  startDate: string;
  endDate?: string;
  affectedRegions: string[];
  rewards: {
    developmentPoints?: number;
    influencePoints?: number;
    tokens?: { type: string; amount: number }[];
  };
  isActive: boolean;
}

// Mock data
export const regions = [
  'Planície Celestial',
  'Cordilheira Aurora',
  'Arquipélago Estelar',
  'Deserto Crepuscular',
  'Floresta Nebulosa',
  'Costa Lunar',
  'Vale Cósmico',
  'Terras Polares Norte',
  'Terras Polares Sul',
];

export const mockCities: City[] = [
  { id: 'city-1', name: 'Nova Esperança', region: 'Planície Celestial', status: 'Ocupada', ownerId: 'terr-1', ownerName: 'República de Aethon', population: 125000 },
  { id: 'city-2', name: 'Porto Aurora', region: 'Cordilheira Aurora', status: 'Ocupada', ownerId: 'terr-1', ownerName: 'República de Aethon', population: 89000 },
  { id: 'city-3', name: 'Cidade das Estrelas', region: 'Arquipélago Estelar', status: 'Ocupada', ownerId: 'terr-1', ownerName: 'República de Aethon', population: 156000 },
  { id: 'city-4', name: 'Oásis Solar', region: 'Deserto Crepuscular', status: 'Ocupada', ownerId: 'terr-2', ownerName: 'Reino de Solaris', population: 67000 },
  { id: 'city-5', name: 'Fortaleza Dourada', region: 'Deserto Crepuscular', status: 'Ocupada', ownerId: 'terr-2', ownerName: 'Reino de Solaris', population: 112000 },
  { id: 'city-6', name: 'Sylvana', region: 'Floresta Nebulosa', status: 'Ocupada', ownerId: 'terr-3', ownerName: 'Federação Verdante', population: 78000 },
  { id: 'city-7', name: 'Raiz Ancestral', region: 'Floresta Nebulosa', status: 'Ocupada', ownerId: 'terr-3', ownerName: 'Federação Verdante', population: 45000 },
  { id: 'city-8', name: 'Copas Eternas', region: 'Floresta Nebulosa', status: 'Ocupada', ownerId: 'terr-3', ownerName: 'Federação Verdante', population: 52000 },
  { id: 'city-9', name: 'Maré Alta', region: 'Costa Lunar', status: 'Livre', ownerId: null, ownerName: null, population: 0 },
  { id: 'city-10', name: 'Baía Prateada', region: 'Costa Lunar', status: 'Livre', ownerId: null, ownerName: null, population: 0 },
  { id: 'city-11', name: 'Zenith Central', region: 'Vale Cósmico', status: 'Neutra', ownerId: 'admin', ownerName: 'Administração Planetária', population: 500000 },
  { id: 'city-12', name: 'Glacial Norte', region: 'Terras Polares Norte', status: 'Livre', ownerId: null, ownerName: null, population: 0 },
  { id: 'city-13', name: 'Cristal Sul', region: 'Terras Polares Sul', status: 'Livre', ownerId: null, ownerName: null, population: 0 },
  { id: 'city-14', name: 'Nebula Prime', region: 'Vale Cósmico', status: 'Ocupada', ownerId: 'terr-4', ownerName: 'Tecnocracia de Nexus', population: 234000 },
  { id: 'city-15', name: 'Circuito Alpha', region: 'Vale Cósmico', status: 'Ocupada', ownerId: 'terr-4', ownerName: 'Tecnocracia de Nexus', population: 189000 },
];

export const mockTerritories: Territory[] = [
  {
    id: 'terr-1',
    name: 'República de Aethon',
    region: 'Planície Celestial',
    capital: 'Cidade das Estrelas',
    governmentType: 'República Presidencialista',
    style: 'Comercial',
    lore: 'Fundada pelos primeiros colonizadores de TOI-700, Aethon é conhecida por seu espírito empreendedor e rotas comerciais que conectam todo o planeta.',
    status: 'Ativo',
    level: 'Estado Reconhecido',
    levelNumber: 3,
    governorName: 'Marcus Stellaris',
    governorId: 'user-1',
    cities: ['city-1', 'city-2', 'city-3'],
    cityTokens: 2,
    landTokens: 5,
    stateTokens: 0,
    developmentPoints: 1250,
    influencePoints: 890,
    createdAt: '2024-01-15',
    events: [
      { id: 'evt-1', date: '2024-06-01', title: 'Feira Comercial Galáctica', description: 'Aethon sediou a maior feira comercial do planeta.', type: 'regional', pointsGained: 150 },
      { id: 'evt-2', date: '2024-08-15', title: 'Tratado de Cooperação', description: 'Assinatura de tratado com Reino de Solaris.', type: 'conference', pointsGained: 75 },
    ],
  },
  {
    id: 'terr-2',
    name: 'Reino de Solaris',
    region: 'Deserto Crepuscular',
    capital: 'Fortaleza Dourada',
    governmentType: 'Monarquia Constitucional',
    style: 'Militar',
    lore: 'Erguido sobre as areias douradas do deserto, o Reino de Solaris é governado por uma linhagem de guerreiros nobres que protegem as fronteiras planetárias.',
    status: 'Ativo',
    level: 'Reino/República',
    levelNumber: 4,
    governorName: 'Rainha Aurelia III',
    governorId: 'user-2',
    cities: ['city-4', 'city-5'],
    cityTokens: 3,
    landTokens: 8,
    stateTokens: 1,
    developmentPoints: 980,
    influencePoints: 1450,
    createdAt: '2023-11-20',
    events: [
      { id: 'evt-3', date: '2024-03-10', title: 'Manobras Militares', description: 'Exercícios de defesa planetária realizados com sucesso.', type: 'regional', pointsGained: 200 },
    ],
  },
  {
    id: 'terr-3',
    name: 'Federação Verdante',
    region: 'Floresta Nebulosa',
    capital: 'Sylvana',
    governmentType: 'República Parlamentarista',
    style: 'Cultural',
    lore: 'Uma confederação de cidades-floresta que preserva as tradições ancestrais e a harmonia com a natureza exótica de TOI-700.',
    status: 'Ativo',
    level: 'Território Autônomo',
    levelNumber: 2,
    governorName: 'Conselho Verde',
    governorId: 'user-3',
    cities: ['city-6', 'city-7', 'city-8'],
    cityTokens: 1,
    landTokens: 3,
    stateTokens: 0,
    developmentPoints: 670,
    influencePoints: 520,
    createdAt: '2024-03-01',
    events: [],
  },
  {
    id: 'terr-4',
    name: 'Tecnocracia de Nexus',
    region: 'Vale Cósmico',
    capital: 'Nebula Prime',
    governmentType: 'Oligarquia',
    style: 'Tecnológico',
    lore: 'Centro de inovação e pesquisa avançada, Nexus lidera o desenvolvimento tecnológico planetário sob a direção de um conselho de cientistas.',
    status: 'Ativo',
    level: 'Potência Planetária',
    levelNumber: 5,
    governorName: 'Dr. Quantum',
    governorId: 'user-4',
    cities: ['city-14', 'city-15'],
    cityTokens: 5,
    landTokens: 12,
    stateTokens: 2,
    developmentPoints: 2100,
    influencePoints: 1890,
    createdAt: '2023-08-10',
    events: [
      { id: 'evt-4', date: '2024-07-20', title: 'Descoberta Científica', description: 'Novo método de geração de energia descoberto.', type: 'global', pointsGained: 500 },
    ],
  },
];

export const mockEvents: PlanetaryEvent[] = [
  {
    id: 'pevt-1',
    title: 'Conferência Planetária de Unidade',
    description: 'Todos os territórios são convidados a participar da conferência anual para discutir o futuro de TOI-700.',
    type: 'conference',
    startDate: '2024-12-01',
    endDate: '2024-12-15',
    affectedRegions: regions,
    rewards: {
      developmentPoints: 100,
      influencePoints: 150,
    },
    isActive: true,
  },
  {
    id: 'pevt-2',
    title: 'Crise de Recursos na Costa Lunar',
    description: 'Uma escassez de recursos ameaça a estabilidade da região. Territórios podem enviar ajuda.',
    type: 'crisis',
    startDate: '2024-11-15',
    affectedRegions: ['Costa Lunar'],
    rewards: {
      influencePoints: 200,
      tokens: [{ type: 'Land Token', amount: 1 }],
    },
    isActive: true,
  },
];

export const levelRequirements = {
  1: { name: 'Colônia', minCities: 1, minPoints: 0 },
  2: { name: 'Território Autônomo', minCities: 2, minPoints: 300 },
  3: { name: 'Estado Reconhecido', minCities: 3, minPoints: 800 },
  4: { name: 'Reino/República', minCities: 4, minPoints: 1500 },
  5: { name: 'Potência Planetária', minCities: 5, minPoints: 3000 },
};

export const tokenDescriptions = {
  cityToken: {
    name: 'City Token (CT)',
    description: 'Permite adquirir 1 cidade livre no planeta.',
    color: 'token-city',
  },
  landToken: {
    name: 'Land Token (LT)',
    description: 'Permite expandir território com área rural abstrata.',
    color: 'token-land',
  },
  stateToken: {
    name: 'State Token (ST)',
    description: 'Permite formar oficialmente um país reconhecido.',
    color: 'token-state',
  },
};
