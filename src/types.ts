export type ThemeType = 'rouge';

export interface Category {
  id: string;
  number: string;
  name: string;
  group: '1' | '2' | '3' | '4';
  groupLabel: string;
  hasStar?: boolean;
  isActive?: boolean;
}

export interface CategoryGroup {
  id: '1' | '2' | '3' | '4';
  title: string;
  explanation: string;
  imageUrl?: string;
  /** Afficher chaque sous-catégorie comme bloc vote séparé (catégorie 2) */
  subcategoryVoteBlocks?: boolean;
  /** IDs des sous-catégories à afficher en blocs vote (ordre respecté) */
  featuredSubcategoryIds?: string[];
}

export interface AppContentConfig {
  categoryGroups: CategoryGroup[];
  categories: Category[];
  evolutionNote: string;
}

export interface Candidate {
  id: string;
  prenom: string;
  nom: string;
  taxiNo?: string;
  experience?: string;
  quartier?: string;
  vehicleModel?: string;
  categoryId: string;
  categoryName: string;
  votesCount: number;
  initials: string;
  photo?: string;
}

export interface ChauffeurSubmission {
  prenom: string;
  nom: string;
  telephone: string;
  immatriculation: string;
  quartier: string;
  experience: string;
  etatVehicule: string;
  modele: string;
  categorie: string;
  description: string;
  photo?: string;
}

export interface VoterSubmission {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  quartier: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  label: string;
  active: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  active: boolean;
}

export interface PartnerSubmission {
  nomEntreprise: string;
  contactNom: string;
  email: string;
  telephone: string;
  packageSponsor: 'diamant' | 'gold' | 'silver' | 'bronze';
  interetGagnant: string;
}

export interface VoteConfig {
  votingEnabled: boolean;
  votingOpenedAt?: string;
  votingClosedAt?: string;
}

export interface VoteNotificationRequest {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  createdAt?: string;
}
