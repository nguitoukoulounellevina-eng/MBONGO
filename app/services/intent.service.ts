export interface IntentResult {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
}

interface IntentPattern {
  keywords: string[];
  exclude?: string[];
  weight: number;
}

interface IntentDefinition {
  intent: string;
  patterns: IntentPattern[];
  extract?: (text: string, words: string[]) => Record<string, any>;
}

const INTENTS: IntentDefinition[] = [
  {
    intent: 'greeting',
    patterns: [
      { keywords: ['bonjour'], weight: 0.95 },
      { keywords: ['bonsoir'], weight: 0.95 },
      { keywords: ['salut'], weight: 0.95 },
      { keywords: ['hello'], weight: 0.9 },
      { keywords: ['coucou'], weight: 0.9 },
      { keywords: ['bonne', 'nuit'], weight: 0.9 },
      { keywords: ['bonne', 'journée'], weight: 0.85 },
      { keywords: ['bonne', 'soirée'], weight: 0.85 },
      { keywords: ['hey'], weight: 0.85 },
      { keywords: ['re'], weight: 0.8 },
      { keywords: ['yo'], weight: 0.7 },
    ],
  },
  {
    intent: 'sentiment_positive',
    patterns: [
      { keywords: ['merci'], weight: 0.95 },
      { keywords: ['merci', 'beaucoup'], weight: 0.98 },
      { keywords: ['super'], weight: 0.85 },
      { keywords: ['génial'], weight: 0.85 },
      { keywords: ['genial'], weight: 0.85 },
      { keywords: ['parfait'], weight: 0.85 },
      { keywords: ['cool'], weight: 0.8 },
      { keywords: ['nickel'], weight: 0.85 },
      { keywords: ['top'], weight: 0.8 },
      { keywords: ['bravo'], weight: 0.9 },
      { keywords: ['bien', 'joué'], weight: 0.9 },
      { keywords: ['bien', 'joue'], weight: 0.9 },
      { keywords: ['merci', 'motéma'], weight: 0.98 },
      { keywords: ['merci', 'motema'], weight: 0.98 },
      { keywords: ['parfait', 'merci'], weight: 0.95 },
    ],
  },
  {
    intent: 'sentiment_negative',
    patterns: [
      { keywords: ['stress'], weight: 0.9 },
      { keywords: ['stressé'], weight: 0.9 },
      { keywords: ['stresse'], weight: 0.9 },
      { keywords: ['inquiet'], weight: 0.85 },
      { keywords: ['inquiète'], weight: 0.85 },
      { keywords: ['inquiete'], weight: 0.85 },
      { keywords: ['ça', 'va', 'pas'], weight: 0.85 },
      { keywords: ['difficile'], weight: 0.8 },
      { keywords: ['trop', 'cher'], weight: 0.7 },
      { keywords: ['compliqué'], weight: 0.7 },
      { keywords: ['complique'], weight: 0.7 },
      { keywords: ['pas', 'facile'], weight: 0.8 },
      { keywords: ['dure'], weight: 0.7 },
      { keywords: ['aide', 'moi'], weight: 0.85 },
      { keywords: ['besoin', 'aide'], weight: 0.85 },
      { keywords: ['galère'], weight: 0.8 },
      { keywords: ['galere'], weight: 0.8 },
      { keywords: ['découragé'], weight: 0.85 },
      { keywords: ['decourage'], weight: 0.85 },
      { keywords: ['décourage'], weight: 0.85 },
      { keywords: ['perdu'], weight: 0.8 },
      { keywords: ['pas', 'comprends'], weight: 0.7 },
    ],
  },
  {
    intent: 'faq_motema',
    patterns: [
      { keywords: ['c\'est', 'quoi', 'motéma'], weight: 0.98 },
      { keywords: ['c\'est', 'quoi', 'motema'], weight: 0.98 },
      { keywords: ['qui', 'es', 'tu'], weight: 0.95 },
      { keywords: ['qui', 'est', 'tu'], weight: 0.95 },
      { keywords: ['c\'est', 'quoi', 'tu'], weight: 0.9 },
      { keywords: ['tu', 'es', 'qui'], weight: 0.95 },
      { keywords: ['à', 'quoi', 'sers', 'tu'], weight: 0.9 },
      { keywords: ['a', 'quoi', 'sers', 'tu'], weight: 0.9 },
      { keywords: ['présente', 'toi'], weight: 0.9 },
      { keywords: ['presente', 'toi'], weight: 0.9 },
      { keywords: ['raconte', 'toi'], weight: 0.85 },
      { keywords: ['motéma', 'c\'est'], weight: 0.85 },
      { keywords: ['motema', 'c\'est'], weight: 0.85 },
    ],
  },
  {
    intent: 'budget',
    patterns: [
      { keywords: ['budget', 'mois'], weight: 0.9 },
      { keywords: ['mon', 'budget'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.85 },
      { keywords: ['mes', 'budgets'], weight: 0.85 },
      { keywords: ['reste', 'budget'], weight: 0.95 },
      { keywords: ['voir', 'budget'], weight: 0.85 },
      { keywords: ['montre', 'budget'], weight: 0.85 },
      { keywords: ['combien', 'budget'], weight: 0.85 },
      { keywords: ['budget'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.6 },
    ],
    extract: (text, words) => {
      const knownCategories = ['alimentation', 'transport', 'logement', 'loisir', 'santé', 'sante', 'éducation', 'education', 'abonnement', 'courses', 'essence', 'électricité', 'electricite', 'eau', 'internet', 'téléphone', 'telephone', 'assurance', 'vêtements', 'vetements', 'restaurant', 'sport', 'culture', 'animaux', 'beauté', 'beaute', 'enfant', 'scolarité', 'scolarite'];
      for (const cat of knownCategories) {
        if (words.includes(cat)) return { categorie: cat };
      }
      return {};
    },
  },
  {
    intent: 'depenses',
    patterns: [
      { keywords: ['où', 'passe', 'mon', 'argent'], weight: 0.95 },
      { keywords: ['où', 'va', 'mon', 'argent'], weight: 0.95 },
      { keywords: ['mes', 'dépenses'], weight: 0.9 },
      { keywords: ['mes', 'depenses'], weight: 0.9 },
      { keywords: ['voir', 'dépenses'], weight: 0.85 },
      { keywords: ['voir', 'depenses'], weight: 0.85 },
      { keywords: ['dépenses', 'mois'], weight: 0.85 },
      { keywords: ['depenses', 'mois'], weight: 0.85 },
      { keywords: ['argent'], weight: 0.4 },
      { keywords: ['dépenses'], weight: 0.6 },
      { keywords: ['depenses'], weight: 0.6 },
      { keywords: ['dépense'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.5 },
      { keywords: ['depense'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.5 },
    ],
  },
  {
    intent: 'revenus',
    patterns: [
      { keywords: ['mes', 'revenus'], weight: 0.9 },
      { keywords: ['mes', 'revenues'], weight: 0.85 },
      { keywords: ['voir', 'revenus'], weight: 0.85 },
      { keywords: ['revenus', 'mois'], weight: 0.85 },
      { keywords: ['mon', 'revenu'], weight: 0.85 },
      { keywords: ['combien', 'gagne'], weight: 0.8 },
      { keywords: ['salaire'], weight: 0.7 },
      { keywords: ['revenus'], weight: 0.6 },
      { keywords: ['revenues'], weight: 0.55 },
    ],
  },
  {
    intent: 'comptes',
    patterns: [
      { keywords: ['mes', 'comptes'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.9 },
      { keywords: ['solde', 'comptes'], weight: 0.95 },
      { keywords: ['solde', 'compte'], weight: 0.95 },
      { keywords: ['combien', 'compte'], weight: 0.85 },
      { keywords: ['voir', 'comptes'], weight: 0.85 },
      { keywords: ['mon', 'compte'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.8 },
      { keywords: ['comptes'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.6 },
      { keywords: ['compte'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.5 },
    ],
  },
  {
    intent: 'objectifs',
    patterns: [
      { keywords: ['mes', 'objectifs'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.9 },
      { keywords: ['mes', 'objectifs', 'épargne'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.95 },
      { keywords: ['mon', 'objectif'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.85 },
      { keywords: ['voir', 'objectifs'], weight: 0.85 },
      { keywords: ['objectif', 'voiture'], weight: 0.9 },
      { keywords: ['objectif', 'voyage'], weight: 0.9 },
      { keywords: ['projet', 'épargne'], weight: 0.85 },
      { keywords: ['objectifs'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.6 },
      { keywords: ['objectif'], exclude: ['créer', 'nouveau', 'ajouter'], weight: 0.5 },
    ],
    extract: (text, words) => {
      const result: Record<string, any> = {};
      const known = ['voiture', 'voyage', 'maison', 'projet', 'vacances', 'retraite', 'étude', 'études', 'scolarité', 'sante'];
      for (const kw of known) {
        if (words.includes(kw)) { result.nom = kw; break; }
      }
      if (!result.nom) {
        for (let i = 0; i < words.length - 1; i++) {
          if ((words[i] === 'objectif' || words[i] === 'objectifs' || words[i] === 'mon' || words[i] === 'mes') && words[i + 1]) {
            const candidate = words[i + 1];
            if (!['moi', 'est', 'sont', 'voir', 'de', 'a', 'un', 'une', 'pour', 'par'].includes(candidate)) {
              result.nom = candidate; break;
            }
          }
        }
      }
      const montant = words.find(w => /^\d+$/.test(w));
      if (montant) result.montant = parseInt(montant);
      return result;
    },
  },
  {
    intent: 'analyse',
    patterns: [
      { keywords: ['analyse', 'finances'], weight: 0.95 },
      { keywords: ['bilan', 'financier'], weight: 0.9 },
      { keywords: ['résumé', 'mois'], weight: 0.9 },
      { keywords: ['resume', 'mois'], weight: 0.9 },
      { keywords: ['fais', 'bilan'], weight: 0.9 },
      { keywords: ['bilan'], weight: 0.7 },
      { keywords: ['analyse'], weight: 0.6 },
      { keywords: ['comment', 'vont', 'finances'], weight: 0.95 },
      { keywords: ['état', 'lieux', 'financier'], weight: 0.85 },
      { keywords: ['rapport', 'financier'], weight: 0.85 },
      { keywords: ['journée'], weight: 0.8 },
      { keywords: ['aujourd', 'hui'], weight: 0.7 },
      { keywords: ['jour'], weight: 0.6 },
    ],
    extract: (normalized, words) => {
      const hasJour = normalized.includes('jour') || normalized.includes('hier');
      const hasSemaine = normalized.includes('semaine');
      const hasMois = normalized.includes('mois');
      if (hasJour && !hasMois && !hasSemaine) return { periodeType: 'quotidien' };
      if (hasSemaine && !hasMois) return { periodeType: 'hebdomadaire' };
      return { periodeType: 'mensuel' };
    },
  },
  {
    intent: 'create_budget',
    patterns: [
      { keywords: ['créer', 'budget'], weight: 0.95 },
      { keywords: ['creer', 'budget'], weight: 0.95 },
      { keywords: ['nouveau', 'budget'], weight: 0.9 },
      { keywords: ['ajouter', 'budget'], weight: 0.9 },
      { keywords: ['veux', 'budget'], weight: 0.85 },
    ],
  },
  {
    intent: 'create_objectif',
    patterns: [
      { keywords: ['créer', 'objectif'], weight: 0.95 },
      { keywords: ['creer', 'objectif'], weight: 0.95 },
      { keywords: ['nouveau', 'projet', 'épargne'], weight: 0.9 },
      { keywords: ['nouveau', 'projet', 'epargne'], weight: 0.9 },
      { keywords: ['ajouter', 'objectif'], weight: 0.9 },
      { keywords: ['veux', 'épargner'], weight: 0.85 },
      { keywords: ['veux', 'epargner'], weight: 0.85 },
      { keywords: ['créer', 'épargne'], weight: 0.85 },
      { keywords: ['créer', 'epargne'], weight: 0.85 },
    ],
  },
  {
    intent: 'economiser',
    patterns: [
      { keywords: ['economiser'], weight: 0.85 },
      { keywords: ['epargner'], weight: 0.85 },
      { keywords: ['epargne'], weight: 0.85 },
      { keywords: ['epargner', 'objectif'], weight: 0.95 },
      { keywords: ['epargner', 'objectifs'], weight: 0.95 },
      { keywords: ['economiser', 'objectif'], weight: 0.95 },
      { keywords: ['economiser', 'objectifs'], weight: 0.95 },
      { keywords: ['reduire', 'depenses'], weight: 0.9 },
      { keywords: ['reduire', 'dépenses'], weight: 0.9 },
      { keywords: ['mettre', 'cote'], weight: 0.85 },
      { keywords: ['mettre', 'ct'], weight: 0.85 },
      { keywords: ['comment', 'economiser', 'argent'], weight: 0.95 },
      { keywords: ['comment', 'epargner'], weight: 0.95 },
      { keywords: ['conseil', 'epargne'], weight: 0.9 },
      { keywords: ['conseil', 'epargner'], weight: 0.85 },
    ],
    extract: (text, words) => {
      const objMatch = words.findIndex(w => w === 'objectif' || w === 'objectifs');
      if (objMatch >= 0) {
        const montant = words.find(w => /^\d+$/.test(w));
        const nom = words[objMatch + 1];
        const result: Record<string, any> = { withGoal: true };
        if (nom && !['de', 'a', 'un', 'une', 'mon', 'mes', 'moi', 'est', 'sont', 'voir', 'pour', 'par'].includes(nom)) {
          result.nom = nom;
        }
        if (montant) result.montant = parseInt(montant);
        return result;
      }
      return {};
    },
  },
  {
    intent: 'sante_financiere',
    patterns: [
      { keywords: ['sant', 'financire'], weight: 0.95 },
      { keywords: ['sante', 'financiere'], weight: 0.95 },
      { keywords: ['note', 'financire'], weight: 0.9 },
      { keywords: ['note', 'financiere'], weight: 0.9 },
      { keywords: ['score'], weight: 0.5 },
      { keywords: ['bien', 'dbrouille'], weight: 0.8 },
      { keywords: ['bien', 'debrouille'], weight: 0.8 },
      { keywords: ['valuation'], weight: 0.8 },
      { keywords: ['evaluation'], weight: 0.8 },
      { keywords: ['comment', 'vont', 'mes', 'finances'], weight: 0.9 },
    ],
  },
  {
    intent: 'prevision',
    patterns: [
      { keywords: ['prvoir', 'fin', 'mois'], weight: 0.95 },
      { keywords: ['prevoir', 'fin', 'mois'], weight: 0.95 },
      { keywords: ['projection'], weight: 0.85 },
      { keywords: ['vais', 'je', 'tenir'], weight: 0.85 },
      { keywords: ['prvision'], weight: 0.85 },
      { keywords: ['prevision'], weight: 0.85 },
      { keywords: ['estimation'], weight: 0.7 },
      { keywords: ['prdire'], weight: 0.6 },
      { keywords: ['predire'], weight: 0.6 },
    ],
  },
  {
    intent: 'acceleration',
    patterns: [
      { keywords: ['acclr'], weight: 0.9 },
      { keywords: ['acceler'], weight: 0.9 },
      { keywords: ['accélérer', 'objectif'], weight: 0.95 },
      { keywords: ['accelerer', 'objectif'], weight: 0.95 },
      { keywords: ['plus', 'vite'], weight: 0.6 },
      { keywords: ['atteindre', 'plus', 'tt'], weight: 0.85 },
      { keywords: ['atteindre', 'plus', 'tot'], weight: 0.85 },
      { keywords: ['booster'], weight: 0.8 },
      { keywords: ['avancer', 'objectif'], weight: 0.85 },
    ],
  },
  {
    intent: 'comparaison',
    patterns: [
      { keywords: ['compar'], weight: 0.8 },
      { keywords: ['comparation'], weight: 0.85 },
      { keywords: ['volution'], weight: 0.8 },
      { keywords: ['evolution'], weight: 0.8 },
      { keywords: ['mieux', 'qu', 'avant'], weight: 0.85 },
      { keywords: ['mois', 'dernier'], weight: 0.7 },
      { keywords: ['diffrence'], weight: 0.7 },
      { keywords: ['difference'], weight: 0.7 },
      { keywords: ['progrs'], weight: 0.7 },
      { keywords: ['progres'], weight: 0.7 },
      { keywords: ['hier'], weight: 0.85 },
    ],
  },
  {
    intent: 'conseil',
    patterns: [
      { keywords: ['conseil'], exclude: ['pargne', 'epargne', 'conomiser', 'economiser'], weight: 0.7 },
      { keywords: ['recommande'], weight: 0.8 },
      { keywords: ['que', 'faire'], weight: 0.7 },
      { keywords: ['suggestion'], weight: 0.75 },
      { keywords: ['astuce'], weight: 0.75 },
      { keywords: ['conseille', 'moi'], weight: 0.9 },
    ],
  },
  {
    intent: 'tendance',
    patterns: [
      { keywords: ['tendance'], weight: 0.85 },
      { keywords: ['tendances'], weight: 0.85 },
      { keywords: ['volution', 'dépenses'], weight: 0.9 },
      { keywords: ['volution', 'depenses'], weight: 0.9 },
      { keywords: ['volution', 'finances'], weight: 0.85 },
      { keywords: ['comment', 'volue'], weight: 0.8 },
      { keywords: ['comment', 'evolue'], weight: 0.8 },
      { keywords: ['augment', 'dépenses'], weight: 0.8 },
      { keywords: ['augment', 'depenses'], weight: 0.8 },
      { keywords: ['baiss', 'dépenses'], weight: 0.8 },
      { keywords: ['baiss', 'depenses'], weight: 0.8 },
    ],
  },
  {
    intent: 'tendance_categorie',
    patterns: [
      { keywords: ['tendance', 'catgorie'], weight: 0.9 },
      { keywords: ['tendance', 'categorie'], weight: 0.9 },
      { keywords: ['volution', 'catgorie'], weight: 0.9 },
      { keywords: ['volution', 'categorie'], weight: 0.9 },
      { keywords: ['comment', 'catgorie'], weight: 0.7 },
      { keywords: ['par', 'catgorie', 'volution'], weight: 0.9 },
      { keywords: ['par', 'categorie', 'evolution'], weight: 0.9 },
      { keywords: ['combien', 'catgorie'], weight: 0.5 },
    ],
    extract: (text, words) => {
      const knownCategories = ['alimentation', 'transport', 'logement', 'loisir', 'sant', 'ducation', 'abonnement', 'courses', 'essence', 'lectricit', 'eau', 'internet', 'tlphone', 'assurance'];
      for (const cat of knownCategories) {
        if (words.includes(cat)) return { categorie: cat };
      }
      return {};
    },
  },
  {
    intent: 'reduire_tendance',
    patterns: [
      { keywords: ['reduire', 'tendance'], weight: 0.95 },
      { keywords: ['reduire', 'hausse'], weight: 0.9 },
      { keywords: ['comment', 'reduire', 'depenses'], weight: 0.95 },
      { keywords: ['comment', 'reduire', 'dépenses'], weight: 0.95 },
      { keywords: ['comment', 'faire', 'baisser'], weight: 0.85 },
      { keywords: ['diminuer', 'depenses'], weight: 0.9 },
      { keywords: ['diminuer', 'dépenses'], weight: 0.9 },
      { keywords: ['conseil', 'reduire'], weight: 0.9 },
      { keywords: ['comment', 'economiser', 'catgorie'], weight: 0.9 },
      { keywords: ['comment', 'economiser', 'categorie'], weight: 0.9 },
      { keywords: ['baisser', 'depenses'], weight: 0.85 },
      { keywords: ['baisser', 'dépenses'], weight: 0.85 },
      { keywords: ['moins', 'depenser'], weight: 0.85 },
      { keywords: ['moins', 'dépenser'], weight: 0.85 },
      { keywords: ['comment', 'reduire'], weight: 0.7 },
      { keywords: ['reduire'], weight: 0.5 },
    ],
    extract: (text, words) => {
      const knownCategories: Record<string, string> = {
        'alimentation': 'alimentation', 'transport': 'transport', 'logement': 'logement',
        'loisir': 'loisirs', 'sant': 'santé', 'sante': 'santé', 'ducation': 'éducation',
        'education': 'éducation', 'abonnement': 'abonnements', 'courses': 'courses',
        'essence': 'transport', 'lectricit': 'logement', 'electricite': 'logement',
        'eau': 'logement', 'internet': 'logement', 'tlphone': 'logement',
        'telephone': 'logement', 'assurance': 'assurance',
      };
      for (const [key, cat] of Object.entries(knownCategories)) {
        if (words.includes(key)) return { categorie: cat };
      }
      return {};
    },
  },
  {
    intent: 'depenses_categorie',
    patterns: [
      { keywords: ['catgorie'], weight: 0.8 },
      { keywords: ['categorie'], weight: 0.8 },
      { keywords: ['catgories'], weight: 0.8 },
      { keywords: ['categories'], weight: 0.8 },
      { keywords: ['combien', 'en'], weight: 0.4 },
      { keywords: ['dpenses', 'par'], weight: 0.7 },
      { keywords: ['depenses', 'par'], weight: 0.7 },
      { keywords: ['poste', 'dpense'], weight: 0.8 },
      { keywords: ['poste', 'depense'], weight: 0.8 },
      { keywords: ['par', 'catgorie'], weight: 0.85 },
      { keywords: ['par', 'categorie'], weight: 0.85 },
    ],
    extract: (text, words) => {
      const knownCategories = ['alimentation', 'transport', 'logement', 'loisir', 'sant', 'ducation', 'abonnement', 'courses', 'essence', 'lectricit', 'eau', 'internet', 'tlphone', 'assurance'];
      for (const cat of knownCategories) {
        if (words.includes(cat)) return { categorie: cat };
      }
      return {};
    },
  },
  {
    intent: 'defi',
    patterns: [
      { keywords: ['dfi'], weight: 0.85 },
      { keywords: ['defi'], weight: 0.85 },
      { keywords: ['challenge'], weight: 0.8 },
      { keywords: ['propose', 'dfi'], weight: 0.9 },
      { keywords: ['propose', 'defi'], weight: 0.9 },
      { keywords: ['lancer', 'dfi'], weight: 0.85 },
      { keywords: ['lancer', 'defi'], weight: 0.85 },
      { keywords: ['motiver'], weight: 0.6 },
    ],
  },
  {
    intent: 'defis_actifs',
    patterns: [
      { keywords: ['mes', 'dfis'], weight: 0.9 },
      { keywords: ['mes', 'defis'], weight: 0.9 },
      { keywords: ['o', 'j\'en', 'suis', 'dfi'], weight: 0.9 },
      { keywords: ['ou', 'j\'en', 'suis', 'defi'], weight: 0.9 },
      { keywords: ['progrès', 'dfi'], weight: 0.85 },
      { keywords: ['progres', 'defi'], weight: 0.85 },
    ],
  },
  {
    intent: 'explication_budget',
    patterns: [
      { keywords: ['explique', 'dpassement'], weight: 0.95 },
      { keywords: ['explique', 'depassement'], weight: 0.95 },
      { keywords: ['pourquoi', 'dpass'], weight: 0.9 },
      { keywords: ['pourquoi', 'depass'], weight: 0.9 },
      { keywords: ['explique', 'budget'], weight: 0.85 },
      { keywords: ['dpassement', 'budget'], weight: 0.9 },
      { keywords: ['depassement', 'budget'], weight: 0.9 },
      { keywords: ['détail', 'budget'], weight: 0.8 },
      { keywords: ['detail', 'budget'], weight: 0.8 },
      { keywords: ['comment', 'ça', 'marche', 'budget'], weight: 0.8 },
      { keywords: ['analyse', 'dpassement'], weight: 0.85 },
      { keywords: ['analyse', 'depassement'], weight: 0.85 },
      { keywords: ['pourquoi', 'j\'ai', 'dpass'], weight: 0.9 },
      { keywords: ['pourquoi', 'j\'ai', 'depass'], weight: 0.9 },
      { keywords: ['je', 'comprends', 'pas', 'budget'], weight: 0.85 },
    ],
  },
  {
    intent: 'seuils',
    patterns: [
      { keywords: ['seuil'], weight: 0.85 },
      { keywords: ['seuils'], weight: 0.85 },
      { keywords: ['limite', 'catgorie'], weight: 0.9 },
      { keywords: ['limite', 'categorie'], weight: 0.9 },
      { keywords: ['fixer', 'limite'], weight: 0.85 },
      { keywords: ['fixer', 'seuil'], weight: 0.9 },
      { keywords: ['creer', 'seuil'], weight: 0.85 },
      { keywords: ['creer', 'limite'], weight: 0.8 },
      { keywords: ['mes', 'seuils'], weight: 0.9 },
      { keywords: ['voir', 'seuils'], weight: 0.85 },
    ],
  },
  {
    intent: 'abonnements',
    patterns: [
      { keywords: ['abonnement'], weight: 0.9 },
      { keywords: ['abonnements'], weight: 0.9 },
      { keywords: ['mes', 'abonnements'], weight: 0.95 },
      { keywords: ['voir', 'abonnements'], weight: 0.9 },
      { keywords: ['rcurrent'], weight: 0.8 },
      { keywords: ['recurrent'], weight: 0.8 },
      { keywords: ['rccurrence'], weight: 0.75 },
      { keywords: ['recurrence'], weight: 0.75 },
      { keywords: ['quoi', 'abonn'], weight: 0.85 },
      { keywords: ['quels', 'abonnements'], weight: 0.9 },
    ],
  },
  {
    intent: 'alerte_seuil',
    patterns: [
      { keywords: ['seuil', 'dpass'], weight: 0.95 },
      { keywords: ['seuil', 'depasse'], weight: 0.95 },
      { keywords: ['limite', 'dpass'], weight: 0.9 },
      { keywords: ['limite', 'depasse'], weight: 0.9 },
      { keywords: ['quoi', 'dpasse'], weight: 0.7 },
      { keywords: ['quoi', 'depasse'], weight: 0.7 },
      { keywords: ['seuil', 'alerte'], weight: 0.85 },
      { keywords: ['limite', 'atteinte'], weight: 0.85 },
    ],
  },
  {
    intent: 'alerte',
    patterns: [
      { keywords: ['alerte'], weight: 0.85 },
      { keywords: ['alertes'], weight: 0.85 },
      { keywords: ['urgence'], weight: 0.7 },
      { keywords: ['problme'], weight: 0.5 },
      { keywords: ['probleme'], weight: 0.5 },
      { keywords: ['inquitant'], weight: 0.7 },
      { keywords: ['inquietant'], weight: 0.7 },
      { keywords: ['surveiller'], weight: 0.65 },
      { keywords: ['quoi', 'surveiller'], weight: 0.85 },
    ],
  },
  {
    intent: 'aide',
    patterns: [
      { keywords: ['aide'], weight: 0.7 },
      { keywords: ['que', 'peux', 'tu', 'faire'], weight: 0.95 },
      { keywords: ['que', 'peux-tu', 'faire'], weight: 0.95 },
      { keywords: ['commandes'], weight: 0.75 },
      { keywords: ['peux', 'tu', 'faire'], weight: 0.85 },
      { keywords: ['quoi', 'sers', 'tu'], weight: 0.9 },
      { keywords: ['comment', 'tu', 'marches'], weight: 0.85 },
      { keywords: ['capable'], weight: 0.5 },
      { keywords: ['que', 'sais', 'faire'], weight: 0.85 },
    ],
  },
  {
    intent: 'guide',
    patterns: [
      { keywords: ['commencer'], weight: 0.7 },
      { keywords: ['par', 'quoi', 'commencer'], weight: 0.95 },
      { keywords: ['premiere', 'etape'], weight: 0.95 },
      { keywords: ['premieres', 'etapes'], weight: 0.95 },
      { keywords: ['guide'], weight: 0.7 },
      { keywords: ['debuter'], weight: 0.7 },
      { keywords: ['debut'], weight: 0.5 },
      { keywords: ['pas', 'a', 'pas'], weight: 0.85 },
      { keywords: ['demarrer'], weight: 0.7 },
      { keywords: ['premiers', 'pas'], weight: 0.9 },
    ],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?,.!;:(){}[\]"'«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Index mot-clé → intentions candidates (évite de parcourir les 540 patterns)
const keywordIndex = new Map<string, Set<IntentDefinition>>();
for (const def of INTENTS) {
  for (const pattern of def.patterns) {
    for (const kw of pattern.keywords) {
      if (!keywordIndex.has(kw)) keywordIndex.set(kw, new Set());
      keywordIndex.get(kw)!.add(def);
    }
  }
}

export function analyzeIntent(text: string): IntentResult {
  const normalized = normalize(text);
  const words = normalized.split(/\s+/).filter(Boolean);

  // Trouver rapidement les intentions candidates (celles qui partagent au moins un mot-clé)
  const candidates = new Set<IntentDefinition>();
  for (const word of words) {
    const matches = keywordIndex.get(word);
    if (matches) {
      for (const def of matches) candidates.add(def);
    }
  }

  if (candidates.size === 0) {
    return { intent: 'unknown', confidence: 0, parameters: {} };
  }

  let bestIntent = 'unknown';
  let bestConfidence = 0;
  let bestParams: Record<string, any> = {};

  const THRESHOLD = 0.35;

  for (const def of candidates) {
    let maxConfidence = 0;

    for (const pattern of def.patterns) {
      const allMatch = pattern.keywords.every(kw => normalized.includes(kw));
      if (!allMatch) continue;

      const excluded = (pattern.exclude || []).some(kw => normalized.includes(kw));
      if (excluded) continue;

      maxConfidence = Math.max(maxConfidence, pattern.weight);
    }

    if (maxConfidence > bestConfidence) {
      bestConfidence = maxConfidence;
      bestIntent = def.intent;
      bestParams = def.extract ? def.extract(normalized, words) : {};
    }
  }

  if (bestConfidence < THRESHOLD) {
    return { intent: 'unknown', confidence: 0, parameters: {} };
  }

  return { intent: bestIntent, confidence: bestConfidence, parameters: bestParams };
}
