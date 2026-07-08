export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface CompteItem {
  id: number;
  nom: string;
  solde: number;
  type: string;
  devise: string;
}

export interface RevenuItem {
  id: number;
  libelle: string;
  montant: number;
  date: string;
  categorie: string;
}

export interface DepenseItem {
  id: number;
  libelle: string;
  montant: number;
  categorie: string;
  icone: string;
  date: string;
  compte: string | null;
}

export interface BudgetItem {
  id: number;
  categorie: string;
  icone: string;
  prevu: number;
  utilise: number;
  restant: number;
  depasse: boolean;
}

export interface ObjectifItem {
  id: number;
  icone: string;
  titre: string;
  cible: number;
  actuel: number;
  restant: number;
  progression: number;
  statut: string;
}

export interface StatsData {
  revenus: number;
  depenses: number;
  budgetUtilise: number;
  epargne: number;
  ratioDepenses: number;
  countObjectifs: number;
  countComptes: number;
}

export interface ActionData {
  action: string;
  disponible: boolean;
  description: string;
}
