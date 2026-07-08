export interface RemarqueItem {
  emoji: string;
  color: string;
  text: string;
}

export interface BriefingAction {
  label: string;
  type: 'navigate' | 'message';
  route?: string;
  text?: string;
  action?: string;
}

export interface BriefingData {
  salutationIntro: string;
  salutationPrompt: string;
  remarques: RemarqueItem[];
  conseil: Array<{
    icon: string;
    title: string;
    text: string;
  }>;
  actions: BriefingAction[];
  suggestions: string[];
  guide?: { text: string };
}

export const BRIEFING: BriefingData = {
  salutationIntro: "J'ai terminé l'analyse de vos finances.",
  salutationPrompt: "Voici ce que j'ai retenu",
  remarques: [
    {
      emoji: '🟢',
      color: '#22D3A5',
      text: 'Vous avez économisé davantage que le mois dernier.',
    },
    {
      emoji: '🟡',
      color: '#F59E0B',
      text: 'Votre budget Transport atteint 82 %.',
    },
    {
      emoji: '🔵',
      color: '#3B82F6',
      text: 'Votre objectif "Ordinateur" progresse bien.',
    },
  ],
  conseil: [
    { icon: '🌟', title: 'Santé financière', text: 'Vous maîtrisez bien vos dépenses. Continuez à suivre votre budget mensuel.' },
    { icon: '💰', title: 'Épargne', text: 'Augmentez votre épargne en visant au moins 20% de vos revenus chaque mois.' },
    { icon: '📊', title: 'Budget', text: 'Revoyez vos abonnements et dépenses récurrentes pour dégager des économies.' },
  ],
  actions: [
    { label: '📊 Comprendre mon analyse', type: 'navigate', route: 'analyse_financiere' },
    { label: '🎯 Voir mes objectifs', type: 'navigate', route: 'objectifs_epargne' },
    { label: '💰 Optimiser mon budget', type: 'navigate', route: 'budget' },
    { label: '📅 Prévoir la fin du mois', type: 'message', text: 'Prévoir la fin du mois' },
  ],
  suggestions: [],
  guide: {
    text: 'Souhaitez-vous quʼon approfondisse un point en particulier ?',
  },
};
