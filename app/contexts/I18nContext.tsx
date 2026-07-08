import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';

type Lang = 'fr' | 'en';

const STORAGE_KEY = 'app_lang';

type TranslationMap = Record<string, string>;

const fr: TranslationMap = {
  'tabs.home': 'Accueil',
  'tabs.transactions': 'Transactions',
  'tabs.stats': 'Statistiques',
  'tabs.plus': 'Plus',

  'plus.personalization': 'Personnalisation',
  'plus.darkMode': 'Mode sombre',
  'plus.language': 'Langue',
  'plus.themeColor': 'Couleur du thème',
  'plus.tools': 'Outils',
  'plus.stats': 'Statistiques',
  'plus.export': 'Exporter les données',
  'plus.backup': 'Sauvegarde',
  'plus.mbongo': 'MBONGO',
  'plus.guide': 'Guide utilisateur',
  'plus.faq': 'FAQ',
  'plus.support': 'Support',
  'plus.rate': "Noter l'application",
  'plus.share': 'Partager MBONGO',
  'plus.comingSoon': 'Fonctionnalités à venir',
  'plus.comingSoonDesc': 'Découvrez les fonctionnalités prévues pour MBONGO.',
  'plus.vision': 'Notre vision',
  'plus.visionText': "MBONGO a pour vision de permettre à chaque Africain de gérer sereinement ses finances personnelles depuis son mobile, avec des outils adaptés à son quotidien. L'application grandit avec vous.",
  'plus.version': 'Version',

  'fr': 'Français',
  'en': 'English',

  'common.loading': 'Chargement...',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.delete': 'Supprimer',
  'common.close': 'Fermer',
  'common.confirm': 'Confirmer',
  'plus.about': 'À propos',
  'plus.vision': 'Notre vision',
  'plus.comingSoon': 'Prochainement',
};

const en: TranslationMap = {
  'tabs.home': 'Home',
  'tabs.transactions': 'Transactions',
  'tabs.stats': 'Statistics',
  'tabs.plus': 'More',

  'plus.personalization': 'Personalization',
  'plus.darkMode': 'Dark mode',
  'plus.language': 'Language',
  'plus.themeColor': 'Theme color',
  'plus.tools': 'Tools',
  'plus.stats': 'Statistics',
  'plus.export': 'Export data',
  'plus.backup': 'Backup',
  'plus.mbongo': 'MBONGO',
  'plus.guide': 'User guide',
  'plus.faq': 'FAQ',
  'plus.support': 'Support',
  'plus.rate': 'Rate the app',
  'plus.share': 'Share MBONGO',
  'plus.comingSoon': 'Coming soon',
  'plus.comingSoonDesc': 'Discover upcoming features for MBONGO.',
  'plus.vision': 'Our vision',
  'plus.visionText': "MBONGO's vision is to enable every African to manage their personal finances serenely from their mobile, with tools adapted to their daily life. The app grows with you.",
  'plus.version': 'Version',

  'fr': 'French',
  'en': 'English',

  'common.loading': 'Loading...',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.close': 'Close',
  'common.confirm': 'Confirm',
  'plus.about': 'About',
  'plus.vision': 'Our vision',
  'plus.comingSoon': 'Coming soon',
};

const all: Record<Lang, TranslationMap> = { fr, en };

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((saved) => {
      if (saved === 'fr' || saved === 'en') setLangState(saved);
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    SecureStore.setItemAsync(STORAGE_KEY, newLang).catch(() => {});
  }, []);

  const t = useCallback((key: string): string => {
    return all[lang][key] ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  if (!loaded) return null;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
