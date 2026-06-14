import { Category, Candidate, CategoryGroup } from './types';

export const CATEGORY_EVOLUTION_NOTE =
  "Les catégories évoluent au fil de l'événement. De nouveaux prix peuvent être ajoutés à tout moment (exemple : Meilleure Auto-École). Revenez régulièrement pour découvrir les nouvelles catégories.";

export const DEFAULT_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: '1',
    title: 'CATÉGORIE 1 — LES CHAMPIONS DU TAXI',
    explanation:
      "Le taxi est le pilier invisible de la mobilité gabonaise. Chaque matin, des milliers de chauffeurs prennent la route avant l'aube pour assurer les déplacements des Gabonais. Cette catégorie célèbre les meilleurs d'entre eux — ceux qui exercent avec excellence, avec sérieux et avec la fierté du travail bien fait.",
    imageUrl: '',
  },
  {
    id: '2',
    title: 'CATÉGORIE 2 — VTC ET TRANSPORT INTERURBAIN',
    explanation:
      "Le transport moderne au Gabon, c'est aussi les VTC qui sillonnent Libreville, les agences interurbaines qui relient les villes entre elles et les entreprises de transport scolaire qui assurent chaque jour la sécurité des enfants. Cette catégorie récompense les acteurs qui modernisent et structurent le transport gabonais.",
    imageUrl: '',
    subcategoryVoteBlocks: true,
    featuredSubcategoryIds: ['9', '10', '13', '14', '11', '15'],
  },
  {
    id: '3',
    title: "CATÉGORIE 3 — PARTENAIRES DE L'ÉCOSYSTÈME DU TRANSPORT",
    explanation:
      "Derrière chaque chauffeur qui prend la route, il y a un garagiste qui entretient le véhicule, un assureur qui couvre le risque, une station-service qui ravitaille le moteur, un concessionnaire qui fournit la flotte. Cette catégorie honore ceux qui, sans conduire eux-mêmes, rendent possible la mobilité gabonaise.",
    imageUrl: '',
  },
  {
    id: '4',
    title: 'CATÉGORIE 4 — RÉCOMPENSES EXCEPTIONNELLES',
    explanation:
      "Certains parcours méritent une reconnaissance particulière. Cette catégorie est réservée aux distinctions honorifiques et exceptionnelles — pour ceux qui ont marqué le secteur du transport gabonais par leur engagement, leur courage ou leur contribution durable.",
    imageUrl: '',
  },
];

export const CATEGORIES: Category[] = [
  // Group 1: LES CHAMPIONS DU TAXI
  { id: '1', number: '01', name: "Le Taxi de l'Année", group: '1', groupLabel: 'CATÉGORIE 1 - LES CHAMPIONS DU TAXI', hasStar: true },
  { id: '2', number: '02', name: "La Femme Taxi de l'Année", group: '1', groupLabel: 'CATÉGORIE 1 - LES CHAMPIONS DU TAXI', hasStar: true },
  { id: '3', number: '03', name: 'Le Taxi Innovant', group: '1', groupLabel: 'CATÉGORIE 1 - LES CHAMPIONS DU TAXI' },
  { id: '4', number: '04', name: 'Le Choix du Public', group: '1', groupLabel: 'CATÉGORIE 1 - LES CHAMPIONS DU TAXI', hasStar: true },
  { id: '5', number: '05', name: "Le Prix d'Honneur et d'Intégrité", group: '1', groupLabel: 'CATÉGORIE 1 - LES CHAMPIONS DU TAXI' },
  { id: '6', number: '06', name: "La Révélation de l'Année", group: '1', groupLabel: 'CATÉGORIE 1 - LES CHAMPIONS DU TAXI' },
  { id: '7', number: '07', name: 'Le Taxi le Plus Propre', group: '1', groupLabel: 'CATÉGORIE 1 - LES CHAMPIONS DU TAXI', hasStar: true },
  { id: '8', number: '08', name: 'Le Chauffeur le Plus Engagé', group: '1', groupLabel: 'CATÉGORIE 1 - LES CHAMPIONS DU TAXI' },
  
  // Group 2: VTC ET TRANSPORT INTERURBAIN
  { id: '9', number: '09', name: 'Meilleure Agence de Transport Interurbain', group: '2', groupLabel: 'CATÉGORIE 2 - VTC & TRANSPORT INTERURBAIN' },
  { id: '10', number: '10', name: 'Meilleure Entreprise VTC', group: '2', groupLabel: 'CATÉGORIE 2 - VTC & TRANSPORT INTERURBAIN' },
  { id: '11', number: '11', name: 'Meilleure Entreprise de Transport Scolaire', group: '2', groupLabel: 'CATÉGORIE 2 - VTC & TRANSPORT INTERURBAIN' },
  { id: '12', number: '12', name: 'Meilleur Bus de la Capitale', group: '2', groupLabel: 'CATÉGORIE 2 - VTC & TRANSPORT INTERURBAIN' },
  { id: '13', number: '13', name: 'Meilleur Chauffeur VTC', group: '2', groupLabel: 'CATÉGORIE 2 - VTC & TRANSPORT INTERURBAIN', hasStar: true },
  { id: '14', number: '14', name: 'Chauffeur VTC le Mieux Noté', group: '2', groupLabel: 'CATÉGORIE 2 - VTC & TRANSPORT INTERURBAIN' },
  { id: '15', number: '15', name: 'Meilleure Entreprise VTC la Plus Innovante', group: '2', groupLabel: 'CATÉGORIE 2 - VTC & TRANSPORT INTERURBAIN' },
  
  // Group 3: PARTENAIRES DE L'ECOSYSTÈME DU TRANSPORT
  { id: '16', number: '16', name: "Meilleure Compagnie d'Assurance", group: '3', groupLabel: 'CATÉGORIE 3 - PARTENAIRES DE L\'ÉCOSYSTÈME' },
  { id: '17', number: '17', name: 'Meilleure Station Service', group: '3', groupLabel: 'CATÉGORIE 3 - PARTENAIRES DE L\'ÉCOSYSTÈME' },
  { id: '18', number: '18', name: 'Meilleure Entreprise Extincteurs', group: '3', groupLabel: 'CATÉGORIE 3 - PARTENAIRES DE L\'ÉCOSYSTÈME' },
  { id: '19', number: '19', name: 'Meilleure Entreprise de Pièces Détachées', group: '3', groupLabel: 'CATÉGORIE 3 - PARTENAIRES DE L\'ÉCOSYSTÈME' },
  { id: '20', number: '20', name: "Meilleure Entreprise d'Entretien de Véhicules", group: '3', groupLabel: 'CATÉGORIE 3 - PARTENAIRES DE L\'ÉCOSYSTÈME' },
  { id: '21', number: '21', name: 'Meilleur Garagiste', group: '3', groupLabel: 'CATÉGORIE 3 - PARTENAIRES DE L\'ÉCOSYSTÈME' },
  { id: '22', number: '22', name: 'Meilleure Concessionnaire Automobile', group: '3', groupLabel: 'CATÉGORIE 3 - PARTENAIRES DE L\'ÉCOSYSTÈME' },
  
  // Group 4: RÉCOMPENSES EXCEPTIONNELLES
  { id: '23', number: '23', name: 'Décernée au Ministère des Transports et de la Marine Marchande', group: '4', groupLabel: 'CATÉGORIE 4 - RÉCOMPENSES EXCEPTIONNELLES' },
  { id: '24', number: '24', name: 'Décernée au Syndicat des Taxis (SYNPAA, FEGASTA ou SYNATTEG)', group: '4', groupLabel: 'CATÉGORIE 4 - RÉCOMPENSES EXCEPTIONNELLES' },
  { id: '25', number: '25', name: 'Chauffeur de taxi le plus ancien encore en activité au Gabon', group: '4', groupLabel: 'CATÉGORIE 4 - RÉCOMPENSES EXCEPTIONNELLES', hasStar: true },
  { id: '26', number: '26', name: "Décernée à un acteur majeur dans l'histoire du taxi gabonais", group: '4', groupLabel: 'CATÉGORIE 4 - RÉCOMPENSES EXCEPTIONNELLES' }
];

export const INITIAL_CANDIDATES: Candidate[] = [
  // Taxi de l'année (Category 1)
  {
    id: 'cand-1',
    prenom: 'Jean-Baptiste',
    nom: 'Ondo',
    taxiNo: 'TX-4521',
    experience: '12 ans',
    quartier: 'Ancien Sobraga',
    vehicleModel: 'Toyota Corolla 2015 - Gab+',
    categoryId: '1',
    categoryName: "LE TAXI DE L'ANNÉE",
    votesCount: 512,
    initials: 'JO'
  },
  {
    id: 'cand-2',
    prenom: 'Parfait',
    nom: 'Nguema',
    taxiNo: 'TX-9875',
    experience: '8 ans',
    quartier: 'Nzeng-Ayong',
    vehicleModel: 'Toyota Yaris 2016',
    categoryId: '1',
    categoryName: "LE TAXI DE L'ANNÉE",
    votesCount: 615,
    initials: 'PN'
  },
  {
    id: 'cand-3',
    prenom: 'Rodrigue',
    nom: 'Moussavou',
    taxiNo: 'TX-2144',
    experience: '15 ans',
    quartier: 'Akébé Ville',
    vehicleModel: 'Toyota Starlet 2012',
    categoryId: '1',
    categoryName: "LE TAXI DE L'ANNÉE",
    votesCount: 104,
    initials: 'RM'
  },

  // Femme taxi de l'année (Category 2)
  {
    id: 'cand-11',
    prenom: 'Sandrine',
    nom: 'Mbigou',
    taxiNo: 'TX-2210',
    experience: '5 ans',
    quartier: 'Glass',
    vehicleModel: 'Toyota Yaris 2018',
    categoryId: '2',
    categoryName: "LA FEMME TAXI DE L'ANNÉE",
    votesCount: 382,
    initials: 'SM'
  },
  {
    id: 'cand-12',
    prenom: 'Bernice',
    nom: 'Ndong',
    taxiNo: 'TX-8822',
    experience: '7 ans',
    quartier: 'Nzeng-Ayong',
    vehicleModel: 'Honda Fit 2016',
    categoryId: '2',
    categoryName: "LA FEMME TAXI DE L'ANNÉE",
    votesCount: 295,
    initials: 'BN'
  },
  
  // Le plus propre (Category 7)
  {
    id: 'cand-4',
    prenom: 'Christian',
    nom: 'Obama',
    taxiNo: 'TX-8833',
    experience: '6 ans',
    quartier: 'Angondjé',
    vehicleModel: 'Hyundai Elantra 2018',
    categoryId: '7',
    categoryName: 'LE TAXI LE PLUS PROPRE',
    votesCount: 192,
    initials: 'CO'
  },
  {
    id: 'cand-5',
    prenom: 'Théophile',
    nom: 'Mba',
    taxiNo: 'TX-1055',
    experience: '4 ans',
    quartier: "Okala d'Avorbam",
    vehicleModel: 'Toyota Corolla 2017 - Gab+',
    categoryId: '7',
    categoryName: 'LE TAXI LE PLUS PROPRE',
    votesCount: 261,
    initials: 'TM'
  },
  {
    id: 'cand-6',
    prenom: 'Sylvain',
    nom: 'Essono',
    taxiNo: 'TX-3377',
    experience: '10 ans',
    quartier: 'Glass',
    vehicleModel: 'Kia Picanto 2019',
    categoryId: '7',
    categoryName: 'LE TAXI LE PLUS PROPRE',
    votesCount: 241,
    initials: 'SE'
  },

  // Choix du Public (Category 4)
  {
    id: 'cand-7',
    prenom: 'Anicet',
    nom: 'Byogho',
    taxiNo: 'TX-3312',
    experience: '5 ans',
    quartier: 'Nkembo',
    vehicleModel: 'Toyota Belta 2016',
    categoryId: '4',
    categoryName: 'LE CHOIX DU PUBLIC',
    votesCount: 185,
    initials: 'AB'
  },
  {
    id: 'cand-8',
    prenom: 'Fabrice',
    nom: 'Koumba',
    taxiNo: 'TX-7241',
    experience: '11 ans',
    quartier: 'Akébé Plaine',
    vehicleModel: 'Toyota Corolla 2014',
    categoryId: '4',
    categoryName: 'LE CHOIX DU PUBLIC',
    votesCount: 345,
    initials: 'FK'
  },

  // VTC (Category 13)
  {
    id: 'cand-9',
    prenom: 'Médard',
    nom: 'Nzemba',
    taxiNo: 'VTC-9911',
    experience: '3 ans',
    quartier: 'Sotéga',
    vehicleModel: 'Suzuki Dzire 2021',
    categoryId: '13',
    categoryName: 'MEILLEUR CHAUFFEUR VTC',
    votesCount: 178,
    initials: 'MN'
  },
  {
    id: 'cand-10',
    prenom: 'Cédric',
    nom: 'Mihindou',
    taxiNo: 'VTC-4400',
    experience: '7 ans',
    quartier: 'Charbonnages',
    vehicleModel: 'Toyota Camry 2019',
    categoryId: '13',
    categoryName: 'MEILLEUR CHAUFFEUR VTC',
    votesCount: 415,
    initials: 'CM'
  }
];

export const EXPERIENCE_OPTIONS = [
  { value: 'Moins de 2 ans', label: 'Moins de 2 ans' },
  { value: '2 à 5 ans', label: '2 à 5 ans' },
  { value: '5 à 10 ans', label: '5 à 10 ans' },
  { value: 'Plus de 10 ans', label: 'Plus de 10 ans' }
];

export const VEHICLE_STATUS_OPTIONS = [
  { value: 'Neuf (moins de 2 ans)', label: 'Neuf (moins de 2 ans)' },
  { value: 'Récent (2 à 5 ans)', label: 'Récent (2 à 5 ans)' },
  { value: 'Ancien (plus de 5 ans)', label: 'Ancien (plus de 5 ans)' },
  { value: 'Ancien (plus de 10 ans)', label: 'Ancien (plus de 10 ans)' }
];
