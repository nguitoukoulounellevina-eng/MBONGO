import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, withSequence, SharedValue } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/spacing';
import { Fonts } from '@/constants/theme';
import { fmt } from '@/app/utils/format';
import api, { getUser } from '@/app/services/api';
import { analyzeIntent } from '@/app/services/intent.service';
import { setAnalyseRapport } from '@/app/services/analyseCache';
import { getBriefingData, generateSuggestions } from '@/app/services/motema.service';
import type { BriefingData } from '@/app/services/motemaMockData';
import { getMotemaBriefing } from '@/app/services/motema';
import type { MotemaBriefing as MotemaBriefingData, AnalysisContext } from '@/app/services/motema';
import PeriodSelector from '@/app/components/PeriodSelector';
import { formatMonthYear } from '@/app/services/periodService';

function periodFromParams(params?: Record<string, any>): { debut: string; fin: string; mois: number; annee: number; periodeType?: string } {
  const periodeType = params?.periodeType ?? 'mensuel';
  if (params?.debut && params?.fin) {
    const d = new Date(params.debut);
    return { debut: params.debut, fin: params.fin, mois: d.getMonth() + 1, annee: d.getFullYear(), periodeType };
  }
  const now = new Date();
  const mois = params?.mois ?? now.getMonth() + 1;
  const annee = params?.annee ?? now.getFullYear();
  const debut = `${annee}-${String(mois).padStart(2, '0')}-01`;
  const fin = new Date(annee, mois, 0).toISOString().split('T')[0];
  return { debut, fin, mois, annee, periodeType };
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computePeriodForType(type: string): { debut: string; fin: string } {
  const now = new Date();
  if (type === 'quotidien') {
    const s = fmtDate(now);
    return { debut: s, fin: s };
  }
  if (type === 'hebdomadaire') {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { debut: fmtDate(mon), fin: fmtDate(sun) };
  }
  return {
    debut: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    fin: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}




type ActionType = 'navigate' | 'message';

interface BlockAction {
  label: string;
  type?: ActionType;
  route?: string;
  text?: string;
  params?: Record<string, any>;
  action?: string;
}

const PROGRESS_STEPS = [
  { key: 'revenus', label: 'Vos revenus', ico: '💰' },
  { key: 'depenses', label: 'Vos dépenses', ico: '💳' },
  { key: 'budgets', label: 'Vos budgets', ico: '📊' },
  { key: 'objectifs', label: 'Vos objectifs', ico: '🎯' },
  { key: 'comptes', label: 'Vos comptes', ico: '🏦' },
  { key: 'recommandations', label: 'Vos conseils', ico: '💡' },
];

interface BudgetData {
  categorie: string;
  icone: string;
  prevu: number;
  utilise: number;
  restant: number;
  depasse: boolean;
}

interface DepenseData {
  libelle: string;
  montant: number;
  categorie: string;
  icone: string;
  date: string;
}

interface ObjectifData {
  icone: string;
  titre: string;
  cible: number;
  actuel: number;
  restant: number;
  progression: number;
}

interface CompteData {
  icone: string;
  nom: string;
  solde: number;
  type: string;
  devise?: string;
}

interface StatistiqueData {
  revenus: number;
  depenses: number;
  budgetUtilise: number;
  epargne: number;
}

/* ── Helper icônes (Ionicons → emoji pour le texte, rendu conditionnel) ── */

const IONICON_TO_EMOJI: Record<string, string> = {
  'bullseye-outline':'🎯','car-outline':'🚗','home-outline':'🏠','airplane-outline':'✈️',
  'laptop-outline':'💻','school-outline':'🎓','briefcase-outline':'💼','diamond-outline':'💍',
  'wallet-outline':'💰','cash-outline':'💵','umbrella-outline':'🏖️','book-outline':'📚',
  'medkit-outline':'🏥','happy-outline':'👶','gift-outline':'🎁','shirt-outline':'👕',
};

const isIonicon = (s: string) => s.includes('-');
const toEmoji = (s: string) => IONICON_TO_EMOJI[s] || s;

function IconRenderer({ icone, size, color, style }: { icone: string; size?: number; color?: string; style?: any }) {
  if (isIonicon(icone)) {
    return <Ionicons name={icone as any} size={size ?? 17} color={color} style={style} />;
  }
  return <Text style={[{ fontSize: size ?? 17 }, style]}>{icone}</Text>;
}

interface Block {
  type: 'text' | 'budget' | 'depense' | 'objectif' | 'compte' | 'statistique' | 'actions' | 'bienvenue' | 'remarques' | 'conseil' | 'guide' | 'priorite' | 'score';
  data: any;
}

interface PrioriteData {
  severity: string;
  label: string;
  detail: string;
  priorityScore: number;
}

interface ScoreData {
  total: number;
  label: string;
  color: string;
  emoji: string;
  bons: string[];
  aAmeliorer: string[];
}

interface RichMessage {
  id: string;
  sender: 'user' | 'motema';
  blocks: Block[];
  timestamp: Date;
}

async function buildGoalSavingBlocks(params: Record<string, any> = {}): Promise<Block[]> {
  try {
    const objectifs = await api.objectifs.list();
    const list = Array.isArray(objectifs) ? objectifs : [];
    if (list.length === 0) {
      return [
        { type: 'text', data: { text: 'Vous n\'avez pas encore d\'objectif d\'épargne. Créez-en un pour que je puisse vous aider à calculer combien épargner chaque mois !' } },
        { type: 'actions', data: { actions: [{ label: 'Créer un objectif', route: 'objectifs_epargne' }] } },
      ];
    }

    const nomRecherche = params.nom || '';
    const montantMessage = params.montant ? parseInt(params.montant) : 0;
    let objectif = null;
    if (nomRecherche) objectif = list.find((o: any) => (o.titre || '').toLowerCase().includes(nomRecherche));
    if (!objectif && montantMessage > 0) objectif = list.find((o: any) => parseFloat(o.montant_cible || 0) === montantMessage);
    if (!objectif) objectif = list[0];

    const montantCible = montantMessage > 0 ? montantMessage : parseFloat(objectif.montant_cible || 0);
    const actuel = parseFloat(objectif.montant_actuel || 0);
    const restant = Math.max(0, montantCible - actuel);

    if (restant <= 0) {
      return [{ type: 'text', data: { text: `🎯 L'objectif "${objectif.titre}" est déjà atteint ! Félicitations !` } }];
    }

    const dateLimite = objectif.date_limite;
    let joursRestants = 30;
    let moisRestants = 1;
    if (dateLimite) {
      const fin = new Date(dateLimite);
      const maintenant = new Date();
      joursRestants = Math.max(1, Math.ceil((fin.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)));
      moisRestants = Math.max(1, Math.ceil(joursRestants / 30));
    }

    const parJour = Math.ceil(restant / joursRestants);
    const parSemaine = Math.ceil(restant / Math.max(1, Math.round(joursRestants / 7)));
    const parMois = Math.max(parJour * 30, Math.ceil(restant / moisRestants));

    const blocks: Block[] = [
      { type: 'text', data: { text: `💰 Pour **${objectif.titre}**, il vous reste **${fmt(restant)}** à épargner.` } },
      {
        type: 'text',
        data: {
          text: `📊 Voici ce que vous devez épargner :\n\n`
            + `• **${fmt(parJour)}** par jour\n`
            + `• **${fmt(parSemaine)}** par semaine\n`
            + `• **${fmt(parMois)}** par mois\n\n`
            + (dateLimite
              ? `📅 Avant le ${new Date(dateLimite).toLocaleDateString('fr-FR')} (${joursRestants > 30 ? `${Math.floor(joursRestants / 30)} mois` : `${joursRestants} jours`})\n\n`
              : `📅 Estimation sur 1 mois\n\n`)
            + `💪 Vous pouvez y arriver, je crois en vous !`
        },
      },
      {
        type: 'objectif',
        data: {
          icone: objectif.icone || '🎯',
          titre: objectif.titre || 'Objectif',
          cible: montantCible,
          actuel,
          restant,
          progression: montantCible > 0 ? Math.round((actuel / montantCible) * 100) : 0,
        },
      },
    ];
    blocks.push({ type: 'actions', data: { actions: [{ label: '🎯 Voir mes objectifs', route: 'objectifs_epargne' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu calculer votre épargne. Réessayez plus tard.' } },
    ];
  }
}

async function buildBudgetBlocks(params: Record<string, any> = {}): Promise<Block[]> {
  try {
    const budgets = await api.budgets.list();
    const list = Array.isArray(budgets) ? budgets : [];
    const now = new Date();
    const currentMois = params.mois ?? now.getMonth() + 1;
    const currentAnnee = params.annee ?? now.getFullYear();
    const actifs = list.filter((b: any) => b.mois === currentMois && b.annee === currentAnnee);
    const categorieNom = params.categorie ? params.categorie.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';

    // Si une catégorie spécifique est demandée, filtrer et afficher en détail
    if (categorieNom) {
      const trouve = actifs.find((b: any) => {
        const nom = (b.categorie_libelle || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nom.includes(categorieNom);
      });
      if (!trouve) {
        return [
          { type: 'text', data: { text: `Je n'ai pas trouvé de budget pour "${params.categorie}".` } },
          { type: 'actions', data: { actions: [{ label: '📊 Voir tous les budgets', route: 'budget' }] } },
        ];
      }
      const utilise = parseFloat(trouve.montant_utilise || 0);
      const reserve = parseFloat(trouve.montant_reserve || 0);
      const effectif = utilise + reserve;
      const prevu = parseFloat(trouve.montant_prevu || 0);
      const pct = prevu > 0 ? Math.round((effectif / prevu) * 100) : 0;
      const depassement = effectif - prevu;
      const joursDansMois = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const joursRestants = joursDansMois - now.getDate();
      const depMoyenne = now.getDate() > 0 ? Math.round(utilise / now.getDate()) : 0;
      const projection = depMoyenne * joursRestants;
      const nom = trouve.categorie_libelle || params.categorie;
      const icone = trouve.categorie_icone || '📊';
      const reste = Math.max(0, prevu - effectif);

      const blocks: Block[] = [
        { type: 'text', data: { text: `📊 **${toEmoji(icone)} Budget ${nom}**` } },
        {
          type: 'budget',
          data: { categorie: nom, icone, prevu, utilise, restant: reste, depasse: utilise > prevu },
        },
        {
          type: 'text',
          data: {
            text: utilise > prevu
              ? `📊 **Analyse :** Vous avez déjà utilisé **${fmt(utilise)} F** sur **${fmt(prevu)} F**, soit **${pct}%** de votre budget. Vous avez dépassé de **${fmt(depassement)} F**.\n\n📊 Il reste **${joursRestants} jours** dans le mois (nous sommes le ${now.getDate()}/${currentMois}). Actuellement, vous dépensez **${fmt(depMoyenne)} F/jour** dans cette catégorie.\n\n💡 **Conseil :** Pour finir le mois sans creuser davantage, essayez de limiter vos dépenses à **${fmt(Math.round(reste / Math.max(1, joursRestants)))} F/jour** pour le reste du mois. Vous pouvez aussi ajuster ce budget si ce niveau est normal.`
              : `📊 **Analyse :** Vous avez utilisé **${fmt(utilise)} F** sur **${fmt(prevu)} F**, soit **${pct}%** de votre budget. Il reste **${fmt(reste)} F** disponible.\n\n📊 Nous sommes le ${now.getDate()}/${currentMois}, il reste **${joursRestants} jours**. À votre rythme actuel (${fmt(depMoyenne)} F/jour), vous devriez ${projection > prevu ? `dépasser d'environ **${fmt(projection - prevu)} F**` : `terminer avec environ **${fmt(prevu - projection)} F** d'avance`}.`
          }
        },
      ];
      blocks.push({ type: 'actions', data: { actions: [{ label: '📊 Voir tous les budgets', route: 'budget' }, { label: '📊 Voir les dépenses', route: 'depenses' }] } });
      return blocks;
    }

    // Comportement par défaut : tous les budgets
    const blocks: Block[] = [
      { type: 'text', data: { text: actifs.length > 0
        ? `📊 Voici vos **${actifs.length}** budget(s) pour ce mois. Je vous aide à les respecter !`
        : 'Vous n\'avez pas encore de budget pour ce mois. Voulez-vous en créer un ?' } },
    ];
    for (const b of actifs.slice(0, 5)) {
      const utilise = parseFloat(b.montant_utilise || 0);
      const reserve = parseFloat(b.montant_reserve || 0);
      const prevu = parseFloat(b.montant_prevu || 0);
      blocks.push({
        type: 'budget',
        data: {
          categorie: b.categorie_libelle || 'Budget',
          icone: b.categorie_icone || '📊',
          prevu,
          utilise,
          restant: prevu - utilise,
          depasse: utilise > prevu,
        },
      });
    }
    blocks.push({ type: 'actions', data: { actions: [{ label: '📊 Voir tous les budgets', route: 'budget' }, { label: '? Créer un budget', route: 'budget' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu charger vos budgets pour le moment. Réessayez dans un instant.' } },
      { type: 'actions', data: { actions: [{ label: '📊 Voir les budgets', route: 'budget' }] } },
    ];
  }
}

async function buildDepensesBlocks(params: Record<string, any> = {}): Promise<Block[]> {
  try {
    const { debut, fin } = periodFromParams(params);
    const depenses = await api.depenses.list({ debut, fin });
    const list = Array.isArray(depenses) ? depenses : [];
    const recentes = list.slice(0, 5);
    const total = recentes.reduce((s: number, d: any) => s + parseFloat(d.montant || 0), 0);
    const blocks: Block[] = [
      { type: 'text', data: { text: list.length > 0
        ? `📊 Voici vos ${Math.min(list.length, 5)} dernières dépenses. Total affiché : **${fmt(total)}**.`
        : 'Vous n\'avez pas encore de dépenses enregistrées.' } },
    ];
    for (const d of recentes) {
      blocks.push({
        type: 'depense',
        data: {
          libelle: d.libelle || d.description || 'Dépense',
          montant: parseFloat(d.montant || 0),
          categorie: d.categorie_libelle || 'Non catégorisé',
          icone: d.categorie_icone || '📌',
          date: d.date_depense ? new Date(d.date_depense).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date inconnue',
        },
      });
    }
    blocks.push({ type: 'actions', data: { actions: [{ label: '📋 Voir toutes les dépenses', route: 'depenses' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu charger vos dépenses. Réessayez plus tard.' } },
      { type: 'actions', data: { actions: [{ label: 'Voir les dépenses', route: 'depenses' }] } },
    ];
  }
}

async function buildRevenusBlocks(params: Record<string, any> = {}): Promise<Block[]> {
  try {
    const { debut, fin } = periodFromParams(params);
    const revenus = await api.revenus.list({ debut, fin });
    const list = Array.isArray(revenus) ? revenus : [];
    if (list.length === 0) {
      return [
        { type: 'text', data: { text: 'Vous n\'avez pas encore enregistré de revenus.' } },
        { type: 'actions', data: { actions: [{ label: 'Ajouter un revenu', route: 'revenus' }] } },
      ];
    }
    const total = list.reduce((s: number, r: any) => s + parseFloat(r.montant || 0), 0);
    const blocks: Block[] = [
      { type: 'text', data: { text: `💰 Vous avez **${list.length}** source(s) de revenus pour un total de **${fmt(total)}**.` } },
    ];
    for (const r of list.slice(0, 5)) {
      blocks.push({
        type: 'text',
        data: { text: '💰 **' + (r.libelle || r.source || 'Revenu') + '** é ' + fmt(r.montant || 0) + (r.date ? ' (' + new Date(r.date).toLocaleDateString('fr-FR') + ')' : '') },
      });
    }
    blocks.push({ type: 'actions', data: { actions: [{ label: '📊 Voir tous les revenus', route: 'revenus' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu charger vos revenus. Réessayez plus tard.' } },
      { type: 'actions', data: { actions: [{ label: 'Voir les revenus', route: 'revenus' }] } },
    ];
  }
}

async function buildComptesBlocks(): Promise<Block[]> {
  try {
    const comptes = await api.comptes.list();
    const list = Array.isArray(comptes) ? comptes : [];
    if (list.length === 0) {
      return [
        { type: 'text', data: { text: 'Vous n\'avez pas encore de compte.' } },
        { type: 'actions', data: { actions: [{ label: 'Ajouter un compte', route: 'comptes' }] } },
      ];
    }
    const total = list.reduce((s: number, c: any) => s + parseFloat(c.solde_actuel || 0), 0);
    const blocks: Block[] = [
      { type: 'text', data: { text: `🏦 Vous avez **${list.length}** compte(s) pour un solde total de **${fmt(total)}**.` } },
    ];
    const icones: Record<string, string> = { 'courant': '💳', 'épargne': '🐖', 'epargne': '🐖', 'espèces': '💵', 'especes': '💵', 'mobile': '📱' };
    for (const c of list) {
      blocks.push({
        type: 'compte',
        data: {
          icone: icones[(c.type_compte || '').toLowerCase()] || '💳',
          nom: c.nom_compte || 'Compte',
          solde: parseFloat(c.solde_actuel || 0),
          type: c.type_compte || 'Compte',
        },
      });
    }
    blocks.push({ type: 'actions', data: { actions: [{ label: 'Voir tous les comptes', route: 'comptes' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu charger vos comptes. Réessayez plus tard.' } },
      { type: 'actions', data: { actions: [{ label: 'Voir les comptes', route: 'comptes' }] } },
    ];
  }
}

async function buildObjectifsBlocks(params: Record<string, any>): Promise<Block[]> {
  try {
    const objectifs = await api.objectifs.list();
    const list = Array.isArray(objectifs) ? objectifs : [];
    if (list.length === 0) {
      return [
        { type: 'text', data: { text: 'Vous n\'avez pas encore d\'objectif financier.' } },
        { type: 'actions', data: { actions: [{ label: 'Créer un objectif', route: 'objectifs_epargne' }] } },
      ];
    }
    const filtre = params.nom ? list.filter((o: any) => (o.titre || '').toLowerCase().includes(params.nom)) : list;
    const affiches = filtre.length > 0 ? filtre : list;
    const blocks: Block[] = [
      { type: 'text', data: { text: `🎯 Voici ${affiches.length === 1 ? 'votre objectif' : 'vos objectifs'}. Continuez comme ça !` } },
    ];
    for (const o of affiches.slice(0, 5)) {
      const cible = parseFloat(o.montant_cible || 0);
      const actuel = parseFloat(o.montant_actuel || 0);
      const progression = cible > 0 ? Math.round((actuel / cible) * 100) : 0;
      blocks.push({
        type: 'objectif',
        data: {
          icone: o.icone || '🎯',
          titre: o.titre || 'Objectif',
          cible,
          actuel,
          restant: Math.max(0, cible - actuel),
          progression,
        },
      });
    }
    blocks.push({ type: 'actions', data: { actions: [{ label: 'Voir tous les objectifs', route: 'objectifs_epargne' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu charger vos objectifs. Réessayez plus tard.' } },
      { type: 'actions', data: { actions: [{ label: 'Voir les objectifs', route: 'objectifs_epargne' }] } },
    ];
  }
}

async function buildAnalyseBlocks(params?: Record<string, any>): Promise<Block[]> {
  try {
    const { debut, fin, mois: m, annee: a, periodeType } = periodFromParams(params);
    const pt = periodeType || 'mensuel';

    const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const fmtD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const now = new Date();

    // Période précédente selon le type
    let prevParams: Record<string, any>;
    let compareLabel: string;
    if (pt === 'quotidien') {
      const viewedDate = new Date(debut);
      const prev = addDays(viewedDate, -1);
      prevParams = { debut: fmtD(prev), fin: fmtD(prev) };
      compareLabel = debut === fmtD(now) ? 'hier' : 'la veille';
    } else if (pt === 'hebdomadaire') {
      const lundi = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() || 7) - 1)); return r; };
      const viewedStart = new Date(debut);
      const lun = lundi(addDays(viewedStart, -7));
      const dim = addDays(lun, 6);
      prevParams = { debut: fmtD(lun), fin: fmtD(dim) };
      compareLabel = 'la semaine précédente';
    } else {
      const prevM = m === 1 ? 12 : m - 1;
      const prevA = m === 1 ? a - 1 : a;
      prevParams = { mois: prevM, annee: prevA };
      compareLabel = 'le mois dernier';
    }

    const [resume, resumePrev, depenses, budgets, objectifs] = await Promise.all([
      api.stats.resume({ debut, fin }).catch(() => null),
      api.stats.resume(prevParams).catch(() => null),
      api.depenses.list({ debut, fin }).catch(() => []),
      api.budgets.list().catch(() => []),
      api.objectifs.list().catch(() => []),
    ]);
    const dList = Array.isArray(depenses) ? depenses : [];
    const bList = Array.isArray(budgets) ? budgets : [];
    const oList = Array.isArray(objectifs) ? objectifs : [];
    const totalDep = dList.reduce((s: number, d: any) => s + parseFloat(d.montant || 0), 0);
    const totalBud = bList.reduce((s: number, b: any) => s + parseFloat(b.montant_utilise || 0) + parseFloat(b.montant_reserve || 0), 0);
    const totalObjCible = oList.reduce((s: number, o: any) => s + parseFloat(o.montant_cible || 0), 0);
    const totalObjActuel = oList.reduce((s: number, o: any) => s + parseFloat(o.montant_actuel || 0), 0);
    const rev = resume?.revenus || 0;
    const dep = resume?.depenses || totalDep;
    const bud = resume?.budget?.utilise ?? totalBud;
    const epargne = resume?.epargne ?? totalObjActuel ?? 0;
    const ratioDep = rev > 0 ? Math.round((dep / rev) * 100) : 0;

    // Calculs comparaison
    const revPrev = resumePrev?.revenus || 0;
    const depPrev = resumePrev?.depenses || 0;
    const epargnePrev = resumePrev?.epargne || 0;
    const pctRev = revPrev > 0 ? ((rev - revPrev) / revPrev * 100).toFixed(1) : null;
    const pctDep = depPrev > 0 ? ((dep - depPrev) / depPrev * 100).toFixed(1) : null;
    const pctEpargne = epargnePrev > 0 ? ((epargne - epargnePrev) / epargnePrev * 100).toFixed(1) : null;

    const isCurrentMonth = m === now.getMonth() + 1 && a === now.getFullYear();

    const blocks: Block[] = [];

    // ---- NOUVEAU MOIS : uniquement en mensuel ----
    if (pt === 'mensuel') {
      const joursDansMois = new Date(a, m, 0).getDate();
      const jourActuel = now.getDate();
      const isNewMonth = isCurrentMonth && jourActuel <= 5;
      const nomMois = new Date(a, m - 1).toLocaleDateString('fr-FR', { month: 'long' });

      if (isNewMonth) {
        const intro = `👋 **Votre mois de ${nomMois} ${a}**\n\nLe mois vient tout juste de commencer (jour ${jourActuel}/${joursDansMois}). Je n'ai pas encore assez de données pour une analyse complète.`;

        const body: string[] = [];
        if (rev > 0 || dep > 0) {
          if (rev > 0) body.push(`💰 **Revenus** : ${fmt(rev)} déjà ajoutés`);
          if (dep > 0) body.push(`📊 **Dépenses** : ${fmt(dep)} déjà ajoutées`);
        } else {
          body.push('📋 Commençons par enregistrer vos premières données du mois !');
        }

        const budgetCount = bList.filter((b: any) => b.mois === m && b.annee === a).length;
        if (budgetCount === 0) {
          body.push('\n💡 **Suggestions pour bien démarrer :**\n• Créez vos budgets pour ce mois\n• Définissez vos objectifs d\'épargne\n• Ajoutez vos dépenses au fur et à mesure');
        } else {
          body.push(`\n💡 Vous avez déjà ${budgetCount} budget(s) en place. Continuez à suivre vos dépenses régulièrement !`);
        }

        const actionText: string[] = [];
        if (budgetCount === 0) actionText.push('Créer un budget');
        if (oList.length === 0) actionText.push('Créer un objectif');
        actionText.push('Voir mes dépenses');
        body.push(`\n💡 ${actionText.join('  ·  ')}`);

        blocks.push({ type: 'text', data: { text: [intro, ...body].join('\n') } });
        return blocks;
      }
    }

    // ---- BILAN NORMAL ----

    const lines: string[] = [];

    if (pt === 'quotidien') {
      const dateStr = new Date(debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      lines.push(`👋 **Votre journée du ${dateStr}**\n\nVoici le résumé de votre journée. Comparons avec ${compareLabel} :\n`);
    } else if (pt === 'hebdomadaire') {
      const d = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      lines.push(`👋 **Votre semaine du ${d(debut)} au ${d(fin)}**\n\nComparons avec ${compareLabel} :\n`);
    } else if (isCurrentMonth) {
      lines.push(`👋 **Votre mois en cours**\n\nJe compare ce mois avec ${compareLabel}. Voici ce qui a changé :\n`);
    } else {
      const nomMois = new Date(a, m - 1).toLocaleDateString('fr-FR', { month: 'long' });
      lines.push(`👋 **Votre mois de ${nomMois} ${a} (terminé)**\n\nVoici le résumé complet. Comparons avec ${compareLabel} :\n`);
    }

    if (rev > 0 || dep > 0) {
      const solde = rev - dep;
      lines.push(`💰 **Revenus** : ${fmt(rev)}  ·  **Dépenses** : ${fmt(dep)}  ·  **Solde** : ${fmt(Math.abs(solde))} ${solde >= 0 ? '✅' : '🔴'}\n`);
    }

    if (pctRev) {
      const dir = rev > revPrev ? '📈 augmenté' : '📉 diminué';
      const sign = rev > revPrev ? '+' : '';
      lines.push(`**Revenus** : ${dir} de **${sign}${pctRev}%** (${fmt(rev)} vs ${fmt(revPrev)})`);
    }

    if (pctDep) {
      const dir = dep > depPrev ? '📈 augmenté' : '📉 diminué';
      const sign = dep > depPrev ? '+' : '';
      lines.push(`**Dépenses** : ${dir} de **${sign}${pctDep}%** (${fmt(dep)} vs ${fmt(depPrev)})`);
    }

    if (resume?.budget?.prevu && resume.budget.prevu > 0) {
      const budPct = Math.round((resume.budget.utilise / resume.budget.prevu) * 100);
      if (isCurrentMonth) {
        lines.push(`**Budget** : ${fmt(resume.budget.utilise)} utilisé sur ${fmt(resume.budget.prevu)} (${budPct}%)`);
        if (budPct > 100) lines.push('⚠️ Vous avez dépassé votre budget global.');
        else if (budPct > 80) lines.push('⚡ Vous approchez de la limite de votre budget.');
      } else {
        const depassement = resume.budget.utilise - resume.budget.prevu;
        if (depassement > 0) {
          lines.push(`**Budget** : **dépassé de ${fmt(depassement)}** — ${fmt(resume.budget.utilise)} utilisé sur ${fmt(resume.budget.prevu)} (${budPct}%)`);
        } else {
          lines.push(`**Budget** : **${fmt(resume.budget.prevu - resume.budget.utilise)} d'économie** — ${fmt(resume.budget.utilise)} utilisé sur ${fmt(resume.budget.prevu)} (${budPct}%)`);
        }
      }
    }

    if (pctEpargne) {
      const dir = epargne > epargnePrev ? '📈 augmenté' : '📉 diminué';
      const sign = epargne > epargnePrev ? '+' : '';
      lines.push(`**Épargne** : ${dir} de **${sign}${pctEpargne}%** (${fmt(epargne)} vs ${fmt(epargnePrev)})`);
    }

    if (oList.length > 0) {
      lines.push(`**Objectifs** : ${oList.length} objectif(s) · ${fmt(totalObjActuel)} épargné sur ${fmt(totalObjCible)}`);
    }

    if (dList.length > 0) {
      const recentes = dList.slice(0, 5);
      lines.push('\n**Dépenses de la période :**');
      for (const d of recentes) {
        const ic = d.categorie_icone || '📌';
        const cat = d.categorie_libelle || 'Non catégorisé';
        lines.push(`• ${fmt(parseFloat(d.montant || 0))} — ${cat}`);
      }
    }

    // Interprétation
    const interps: string[] = [];
    if (pctDep && parseFloat(pctDep) < -5) interps.push('✓ Vos dépenses ont baissé, c\'est une bonne maîtrise de votre budget.');
    if (pctDep && parseFloat(pctDep) > 5) interps.push('⚠️ Vos dépenses ont augmenté. Identifions ensemble les postes à ajuster.');
    if (pctRev && parseFloat(pctRev) < -5) interps.push('⚠️ Vos revenus ont baissé. C\'est peut-être le moment de revoir votre budget.');
    if (ratioDep < 50) interps.push('✅ Vous dépensez moins que vos revenus, c\'est bien ! Continuez ainsi !');
    if (ratioDep > 80) interps.push('💡 Vous dépensez beaucoup par rapport à vos revenus. Essayez de réduire certaines dépenses.');

    if (interps.length > 0) {
      lines.push('\n**Ce que ça signifie :**');
      lines.push(...interps);
    }

    // Recommandation
    if (pt === 'mensuel' && isCurrentMonth) {
      lines.push('\n**Que vous conseillé-je ?**');
      if (dep > rev) {
        lines.push('🔴 Vos dépenses dépassent vos revenus. Priorité : réduire vos dépenses du quotidien.');
      } else if (epargne > 0 && (!pctEpargne || parseFloat(pctEpargne) > 0)) {
        lines.push('🟢 Continuez à épargner comme vous le faites. Vous êtes sur la bonne voie !');
      } else {
        lines.push('💡 Essayez de mettre de côté au moins 10% de vos revenus chaque mois.');
      }
    } else if (pt === 'mensuel') {
      lines.push(`\n📌 **Ce mois est terminé.** Que voulez-vous faire pour ${new Date().toLocaleDateString('fr-FR', { month: 'long' })} ${now.getFullYear()} ?`);
    } else {
      const termMsg = pt === 'quotidien' ? 'Cette journée est terminée.' : 'Cette semaine est terminée.';
      lines.push(`\n📌 **${termMsg}** Que voulez-vous faire ensuite ?`);
    }

    lines.push(`\n💡 **Voir mes dépenses**  ·  **Voir mon budget**  ·  **Voir les statistiques**`);

    blocks.push({ type: 'text', data: { text: lines.join('\n') } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu analyser vos finances. Réessayez plus tard.\n\n💡 **Voir les statistiques**' } },
    ];
  }
}

// -- Nouveaux blocs d'intention --

async function buildEconomiserBlocks(params: Record<string, any> = {}): Promise<Block[]> {
  try {
    const { debut, fin } = periodFromParams(params);
    const [revenus, depenses, budgets, abonnements, tendances] = await Promise.all([
      api.revenus.list({ debut, fin }).catch(() => []),
      api.depenses.list({ debut, fin }).catch(() => []),
      api.budgets.list().catch(() => []),
      api.abonnements.list().catch(() => []),
      api.stats.tendancesCategories(3).catch(() => []),
    ]);
    const rList = Array.isArray(revenus) ? revenus : [];
    const dList = Array.isArray(depenses) ? depenses : [];
    const bList = Array.isArray(budgets) ? budgets : [];
    const aboList = Array.isArray(abonnements) ? abonnements : [];
    const catTendances = Array.isArray(tendances) ? tendances : [];

    const totalRev = rList.reduce((s, r) => s + parseFloat(r.montant || 0), 0);
    const totalDep = dList.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
    const marge = totalRev - totalDep;

    const blocks: Block[] = [];

    if (totalRev <= 0) {
      blocks.push({ type: 'text', data: { text: '💡 Pour commencer à économiser, commençons par enregistrer vos revenus et dépenses.\n\nJe pourrai ensuite vous donner des conseils personnalisés !' } });
      blocks.push({ type: 'actions', data: { actions: [{ label: 'Ajouter un revenu', route: 'revenus' }, { label: 'Ajouter une dépense', route: 'depenses' }] } });
      return blocks;
    }

    if (marge > 0) {
      blocks.push({
        type: 'text',
        data: {
          text: `🎉 Bonne nouvelle ! Il vous reste **${fmt(marge)}** chaque mois.\n\nC'est une excellente base. Voici comment l'utiliser au mieux :`
        }
      });
    } else {
      blocks.push({
        type: 'text',
        data: {
          text: `⚠️ Vos dépenses (${fmt(totalDep)}) dépassent vos revenus (${fmt(totalRev)}).\n\nPas de panique, c'est l'occasion de faire le point. Voici des pistes concrètes :`
        }
      });
    }

    const conseils: string[] = [];

    // économies potentielles sur les abonnements
    const aboActifs = aboList.filter((a: any) => a.actif);
    const totalAbo = aboActifs.reduce((s: number, a: any) => s + parseFloat(a.montant || 0), 0);
    if (totalAbo > 0) {
      conseils.push(`💡 Vous dépensez **${fmt(totalAbo)} F/mois** en abonnements. Supprimez ceux que vous n'utilisez plus pour économiser **${fmt(totalAbo * 12)} F/an**.`);
    }

    // Catégorie la plus dépensiére avec tendance haussiére
    const plusGourmande = catTendances.filter((c: any) => c.tendance === 'hausse').sort((a: any, b: any) => b.total - a.total)[0];
    if (plusGourmande) {
      const reduction = Math.round(plusGourmande.moyenne * 0.15);
      conseils.push(`💡 **"${plusGourmande.libelle}"** est en hausse (${plusGourmande.variation > 0 ? '+' : ''}${plusGourmande.variation}%). Réduire de 15% = **${fmt(reduction)} F** d'économies par mois.`);
    }

    // Budget le plus sollicité
    const maxBudget = bList.reduce((max, b) => {
      const effectif = parseFloat(b.montant_utilise || 0) + parseFloat(b.montant_reserve || 0);
      const pct = parseFloat(b.montant_prevu || 0) > 0 ? (effectif / parseFloat(b.montant_prevu || 1)) : 0;
      return pct > max.pct ? { pct, name: b.categorie_libelle || 'Catégorie' } : max;
    }, { pct: 0, name: '' });
    if (maxBudget.pct > 0.7 && maxBudget.name) {
      conseils.push(`💡 Votre budget **"${maxBudget.name}"** est à ${Math.round(maxBudget.pct * 100)}% d'utilisation. Essayez de le réduire de 10% pour économiser **${fmt(Math.round(maxBudget.pct * 0.1 * (bList.find((b: any) => (b.categorie_libelle || 'Catégorie') === maxBudget.name)?.montant_prevu || 0)))} F**.`);
    }

    // Marge fine
    if (marge > 0 && marge < totalRev * 0.15) {
      conseils.push(`💡 Ce qu'il vous reste (${Math.round((marge / totalRev) * 100)}% de vos revenus) est limité. Chaque petite réduction compte !`);
    }

    // Objectif concret
    const epargnePossible = Math.max(5000, Math.round(marge * 0.3));
    if (marge > 0) {
      conseils.push(`💡 Si vous épargnez **${fmt(epargnePossible)} F/mois**, vous aurez **${fmt(epargnePossible * 12)} F** dans un an. Créez un objectif d'épargne pour suivre votre progression !`);
    } else {
      conseils.push(`💡 Commencez par réduire vos dépenses de **${fmt(Math.abs(Math.round(totalDep * 0.05)))} F** ce mois-ci (5% de vos dépenses). C'est un bon premier objectif !`);
    }

    blocks.push({ type: 'text', data: { text: `**Mes recommandations personnalisées :**\n\n${conseils.join('\n\n')}` } });
    blocks.push({ type: 'actions', data: { actions: [{ label: '📋 Voir mes dépenses', route: 'depenses' }, { label: '🎯 Créer un objectif', route: 'objectifs_epargne' }, { label: '📱 Mes abonnements', type: 'message', text: 'Mes abonnements' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: '💡 Pour économiser : suivez vos dépenses, réduisez les postes non essentiels et fixez-vous des objectifs réalisables.\n\nJe suis là pour vous accompagner pas é pas !' } },
      { type: 'actions', data: { actions: [{ label: '🎯 Créer un objectif', route: 'objectifs_epargne' }, { label: '📋 Voir mes dépenses', route: 'depenses' }] } },
    ];
  }
}

async function buildSanteFinanciereBlocks(params: Record<string, any> = {}): Promise<Block[]> {
  try {
    const { debut, fin } = periodFromParams(params);
    const [resume, budgets, objectifs] = await Promise.all([
      api.stats.resume({ debut, fin }).catch(() => null),
      api.budgets.list().catch(() => []),
      api.objectifs.list().catch(() => []),
    ]);
    const rev = resume?.revenus || 0;
    const dep = resume?.depenses || 0;
    const ratio = rev > 0 ? Math.round((dep / rev) * 100) : 0;
    const bList = Array.isArray(budgets) ? budgets : [];
    const oList = Array.isArray(objectifs) ? objectifs : [];

    const note = ratio < 50 ? 85 : ratio < 80 ? 65 : 40;
    const etoiles = ratio < 50 ? '⭐⭐⭐⭐' : ratio < 80 ? '⭐⭐⭐' : '⭐⭐';
    const niveau = ratio < 50 ? 'Bonne' : ratio < 80 ? 'Correcte' : 'é améliorer';

    const blocks: Block[] = [
      { type: 'text', data: { text: `💚 **Votre santé financière**\n\nFaisons le point ensemble sur votre situation du moment.` } },
      {
        type: 'statistique',
        data: { revenus: rev, depenses: dep, budgetUtilise: resume?.budget?.utilise || 0, epargne: resume?.epargne || 0 },
      },
      {
        type: 'text',
        data: { text: `Note : **${note}/100**\n${etoiles}\nNiveau : **${niveau}**\n\nRépartition revenus/dépenses : **${ratio}%** en dépenses` },
      },
    ];

    if (ratio > 80) {
      blocks.push({ type: 'text', data: { text: '💪 Ne vous inquiétez pas, ce n\'est qu\'une étape. Avec quelques ajustements ensemble, nous pouvons améliorer votre situation. Je suis là pour vous.' } });
    } else if (ratio < 50) {
      blocks.push({ type: 'text', data: { text: '🎉 Bravo ! Vous gérez vos finances avec équilibre. C\'est le moment idéal pour penser à vos projets d\'épargne.' } });
    } else {
      blocks.push({ type: 'text', data: { text: '✅ Situation correcte. Avec un peu d\'attention sur certains postes, vous pouvez encore améliorer votre santé financière.' } });
    }

    const actions: BlockAction[] = [{ label: '📊 Voir mon analyse complète', action: 'analyse' }];
    if (oList.length === 0) actions.push({ label: '🎯 Créer un objectif', route: 'objectifs_epargne' });
    blocks.push({ type: 'actions', data: { actions } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu évaluer votre santé financière pour le moment.' } },
      { type: 'actions', data: { actions: [{ label: 'Voir mes finances', route: 'stats' }] } },
    ];
  }
}

async function buildPrevisionBlocks(params: Record<string, any> = {}): Promise<Block[]> {
  try {
    const { debut, fin } = periodFromParams(params);
    const mois = params.mois ?? new Date().getMonth() + 1;
    const annee = params.annee ?? new Date().getFullYear();
    const now = new Date();
    const isCurrentMonth = mois === now.getMonth() + 1 && annee === now.getFullYear();

    // Si c'est un ancien mois, impossible de projeter
    if (!isCurrentMonth) {
      const nomMois = new Date(annee, mois - 1).toLocaleDateString('fr-FR', { month: 'long' });
      return [
        { type: 'text', data: { text: `📊 **Projection**\n\nLe mois de **${nomMois} ${annee}** est déjà terminé. Je ne peux pas faire de projection pour une période passée.\n\n📌 Je peux analyser ce mois ou faire une projection pour le mois en cours.` } },
        { type: 'actions', data: { actions: [
          { label: '📊 Analyser ce mois', action: 'analyse' },
          { label: '📊 Projection mois en cours', type: 'message', text: 'Prévision fin de mois' },
        ] } },
      ];
    }

    const [revenus, depenses] = await Promise.all([
      api.revenus.list({ debut, fin }).catch(() => []),
      api.depenses.list({ debut, fin }).catch(() => []),
    ]);
    const rList = Array.isArray(revenus) ? revenus : [];
    const dList = Array.isArray(depenses) ? depenses : [];
    const joursDansMois = new Date(annee, mois, 0).getDate();
    const jourActuel = now.getDate();
    const joursRestants = joursDansMois - jourActuel;

    const totalRev = rList.reduce((s, r) => s + parseFloat(r.montant || 0), 0);
    const totalDep = dList.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
    const depMoyenne = jourActuel > 0 ? totalDep / jourActuel : 0;

    const blocks: Block[] = [];

    if (depMoyenne <= 0) {
      blocks.push({ type: 'text', data: { text: 'Je n\'ai pas encore assez de données pour faire une projection.\n\nAjoutez quelques dépenses et revenez me voir !' } });
      blocks.push({ type: 'actions', data: { actions: [{ label: 'Ajouter une dépense', route: 'depenses' }] } });
      return blocks;
    }

    const depTotale = totalDep + depMoyenne * joursRestants;
    const restant = totalRev - depTotale;

    if (restant >= 0) {
      blocks.push({
        type: 'text',
        data: {
          text: `🎉 Bonne nouvelle !\n\nSi vous gardez ce rythme, vous devriez terminer le mois avec environ **${fmt(restant)}** d'avance.\n\nVous êtes dans une situation confortable, mais restons vigilants ensemble.`
        },
      });
    } else if (restant < 0 && restant >= -totalRev * 0.2) {
      blocks.push({
        type: 'text',
        data: {
          text: `⚠️ Attention, ça va être un peu juste ce mois-ci.\n\nVous risquez de manquer d'environ **${fmt(Math.abs(restant))}** d'ici la fin du mois.\n\nNe vous inquiétez pas, on peut trouver des solutions ensemble. Réduisons certaines dépenses non essentielles pour tenir.`
        },
      });
    } else {
      blocks.push({
        type: 'text',
        data: {
          text: `⚠️ La situation est tendue pour ce mois.\n\nSi rien ne change, vous pourriez manquer d'environ **${fmt(Math.abs(restant))}**.\n\nMais ce n'est pas une fatalité ! Je peux vous aider à identifier les dépenses à réduire ou à reporter.`
        },
      });
    }

    blocks.push({
      type: 'text',
      data: { text: `📊 En résumé :\né Revenus : **${fmt(totalRev)}**\né Dépenses estimées : **${fmt(depTotale)}**\né Il reste **${joursRestants} jours** avant la fin du mois.` },
    });

    const actions = restant >= 0
      ? [{ label: '📋 Voir mes dépenses', route: 'depenses' }, { label: '📊 Voir mon budget', route: 'budget' }]
      : [{ label: '🔍 Identifier les dépenses é réduire', route: 'depenses' }, { label: '💡 Conseils pour économiser', type: 'message' as const, text: 'Conseils pour économiser' }];
    blocks.push({ type: 'actions', data: { actions } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu calculer de projection pour le moment.' } },
    ];
  }
}

async function buildAccelerationBlocks(): Promise<Block[]> {
  try {
    const objectifs = await api.objectifs.list();
    const list = Array.isArray(objectifs) ? objectifs : [];
    if (list.length === 0) {
      return [
        { type: 'text', data: { text: '🎯 Vous n\'avez pas encore d\'objectif d\'épargne. C\'est le moment d\'en créer un, je vous guiderai pas à pas !' } },
        { type: 'actions', data: { actions: [{ label: 'Créer un objectif', route: 'objectifs_epargne' }] } },
      ];
    }
    const blocks: Block[] = [];
    for (const o of list.slice(0, 3)) {
      const cible = parseFloat(o.montant_cible || 0);
      const actuel = parseFloat(o.montant_actuel || 0);
      const restant = Math.max(0, cible - actuel);
      const pct = cible > 0 ? Math.round((actuel / cible) * 100) : 0;

      if (pct >= 100) {
        blocks.push({ type: 'text', data: { text: `🎯 ${toEmoji(o.icone || '🎯')} "${o.titre}" est déjà atteint ! Félicitations, vous avez réussi !` } });
      } else {
        const mensualite = Math.max(Math.ceil(restant / 180), Math.round(restant / 6));
        const parJour = Math.ceil(restant / 180);
        blocks.push({
          type: 'objectif',
          data: { icone: o.icone || '🎯', titre: o.titre, cible, actuel, restant, progression: pct },
        });
        blocks.push({
          type: 'text',
          data: {
            text: `🎯 Objectif "${o.titre}" : **${fmt(restant)}** restants.\n\n`
              + (parJour >= 1 ? `📆 **${fmt(parJour)}/jour** (soit **${fmt(mensualite)}/mois**)` : `📆 **${fmt(mensualite)}/mois**`)
              + `\n\n💪 Vous pouvez y arriver, continuez comme ça !`
          },
        });
      }
    }
    blocks.push({ type: 'actions', data: { actions: [{ label: '🎯 Voir mes objectifs', route: 'objectifs_epargne' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu analyser vos objectifs.' } },
    ];
  }
}

async function buildComparaisonBlocks(params?: Record<string, any>): Promise<Block[]> {
  const pt = params?.periodeType || 'mensuel';
  const compareLabel =
    pt === 'quotidien' ? 'hier' :
    pt === 'hebdomadaire' ? 'la semaine dernière' :
    'le mois dernier';
  const compareTitle =
    pt === 'quotidien' ? 'Comparaison avec hier' :
    pt === 'hebdomadaire' ? 'Comparaison avec la semaine dernière' :
    'Comparaison avec le mois dernier';
  try {
    const evolution = await api.stats.evolution(2).catch(() => null);
    if (!evolution || !Array.isArray(evolution) || evolution.length < 2) {
      return [
        { type: 'text', data: { text: `Je n'ai pas encore assez de données pour comparer avec ${compareLabel}.\n\nContinuez à enregistrer vos finances, les comparaisons viendront bientôt !` } },
      ];
    }
    const moisPrec = evolution[evolution.length - 2] || { depenses: 0, revenus: 0 };
    const moisActuel = evolution[evolution.length - 1] || { depenses: 0, revenus: 0 };
    const diffDep = moisActuel.depenses - moisPrec.depenses;
    const diffRev = moisActuel.revenus - moisPrec.revenus;
    const pctDep = moisPrec.depenses > 0 ? Math.round((diffDep / moisPrec.depenses) * 100) : 0;
    const pctRev = moisPrec.revenus > 0 ? Math.round((diffRev / moisPrec.revenus) * 100) : 0;

    const blocks: Block[] = [
      { type: 'text', data: { text: `📊 **${compareTitle}**` } },
    ];

    if (pctDep > 5) {
      blocks.push({ type: 'text', data: { text: `🔔 Vos dépenses ont augmenté de **${pctDep}%** par rapport à ${compareLabel}.\n\nRegardons ensemble ce qui a changé pour ajuster le tir.` } });
    } else if (pctDep < -5) {
      blocks.push({ type: 'text', data: { text: `🎉 Bravo ! Vos dépenses ont baissé de **${Math.abs(pctDep)}%** par rapport à ${compareLabel}. Vous êtes sur la bonne voie !` } });
    } else if (pctDep < 0) {
      blocks.push({ type: 'text', data: { text: `📊 Légère baisse des dépenses (${Math.abs(pctDep)}%). C'est un bon début, continuez !` } });
    } else {
      blocks.push({ type: 'text', data: { text: `📊 Vos dépenses sont stables par rapport à ${compareLabel} (${pctDep}% de variation).` } });
    }

    if (diffRev !== 0) {
      const emoji = diffRev > 0 ? '📈' : '📉';
      blocks.push({ type: 'text', data: { text: `${emoji} Vos revenus ont ${diffRev > 0 ? 'augmenté' : 'diminué'} de **${fmt(Math.abs(diffRev))}** (${pctRev >= 0 ? '+' : ''}${pctRev}%).` } });
    }

    blocks.push({ type: 'actions', data: { actions: [{ label: '📊 Voir les statistiques', route: 'stats' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu comparer vos données.' } },
    ];
  }
}

async function buildConseilBlocks(params: Record<string, any> = {}): Promise<Block[]> {
  try {
    const { debut, fin } = periodFromParams(params);
    const [resume, budgets, objectifs] = await Promise.all([
      api.stats.resume({ debut, fin }).catch(() => null),
      api.budgets.list().catch(() => []),
      api.objectifs.list().catch(() => []),
    ]);
    const rev = resume?.revenus || 0;
    const dep = resume?.depenses || 0;
    const ratio = rev > 0 ? Math.round((dep / rev) * 100) : 0;
    const bList = Array.isArray(budgets) ? budgets : [];
    const oList = Array.isArray(objectifs) ? objectifs : [];

    const blocks: Block[] = [
      { type: 'text', data: { text: '💡 **Mes conseils personnalisés**\n\nVoici ce que je vous recommande pour améliorer votre situation :' } },
    ];

    if (ratio > 80) {
      blocks.push({ type: 'text', data: { text: '🎯 Priorité numéro un : réduire vos dépenses. Identifions ensemble les dépenses les plus importantes.' } });
      blocks.push({ type: 'actions', data: { actions: [{ label: '📋 Voir mes dépenses', route: 'depenses' }] } });
    } else if (oList.length === 0) {
      blocks.push({ type: 'text', data: { text: '💡 Je vous conseille de créer un objectif d\'épargne. C\'est le meilleur moyen d\'économiser réguliérement et de rester motivé !' } });
      blocks.push({ type: 'actions', data: { actions: [{ label: '🎯 Créer un objectif', route: 'objectifs_epargne' }] } });
    } else {
      const totalEpargne = oList.reduce((s, o) => s + parseFloat(o.montant_actuel || 0), 0);
      blocks.push({ type: 'text', data: { text: `💰 Vous avez déjà épargné **${fmt(totalEpargne)}**. Continuez à alimenter régulièrement vos objectifs, vous êtes sur la bonne voie !` } });
    }

    const alerte = bList.find((b: any) => {
      const p = parseFloat(b.montant_prevu || 0);
      const effectif = parseFloat(b.montant_utilise || 0) + parseFloat(b.montant_reserve || 0);
      return p > 0 && effectif >= p * 0.8;
    });
    if (alerte) {
      const effectif = parseFloat(alerte.montant_utilise || 0) + parseFloat(alerte.montant_reserve || 0);
      const pct = Math.round((effectif / parseFloat(alerte.montant_prevu || 1)) * 100);
      blocks.push({ type: 'text', data: { text: `🔔 Surveillez votre budget **"${alerte.categorie_libelle || 'Catégorie'}"** qui est à ${pct}% de sa limite. Je vous tiens au courant !` } });
    }

    blocks.push({ type: 'text', data: { text: '⏰ Prenez 5 minutes chaque semaine pour faire le point. C\'est le meilleur moyen de garder le contréle !' } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: '💡 Conseil : suivez vos dépenses, fixez-vous des limites et épargnez réguliérement, méme un petit montant.' } },
    ];
  }
}

async function buildTendancesBlocks(params: Record<string, any>): Promise<Block[]> {
  try {
    const categories = await api.stats.tendancesCategories(3);
    const list = Array.isArray(categories) ? categories : [];
    const blocks: Block[] = [
      { type: 'text', data: { text: '📊 **Évolution de vos dépenses**\n\nVoici l\'évolution de vos catégories sur les 3 derniers mois :' } },
    ];

    if (list.length === 0) {
      blocks.push({ type: 'text', data: { text: 'Je n\'ai pas encore assez de données pour calculer les tendances. Continuez é enregistrer vos dépenses !' } });
      return blocks;
    }

    for (const cat of list.slice(0, 5)) {
      const emoji = cat.tendance === 'hausse' ? '📈' : cat.tendance === 'baisse' ? '📉' : '➡️';
      const signe = cat.variation > 0 ? '+' : '';
      const seriesText = cat.series.map((s: any) => `${s.mois} ${s.annee}: ${fmt(s.total)} F`).join(' ? ');
      blocks.push({
        type: 'text',
        data: {
           text: `${toEmoji(cat.icone || '📊')} **${cat.libelle}** ${emoji} ${signe}${cat.variation > 0 ? '+' : ''}${cat.variation}%\n   ${seriesText}\n   Moyenne : **${fmt(cat.moyenne)} F/mois**`
        }
      });
    }

    const enHausse = list.filter((c: any) => c.tendance === 'hausse');
    const enBaisse = list.filter((c: any) => c.tendance === 'baisse');

    if (enHausse.length > 0) {
      const noms = enHausse.map((c: any) => c.libelle).join(', ');
      blocks.push({ type: 'text', data: { text: `🔔 **À surveiller :** ${noms} ${enHausse.length > 1 ? 'sont' : 'est'} en hausse. Je vous conseille d'analyser ces postes pour éviter les mauvaises surprises.` } });
    }
    if (enBaisse.length > 0) {
      const noms = enBaisse.map((c: any) => c.libelle).join(', ');
      blocks.push({ type: 'text', data: { text: `✅ **Bon point :** ${noms} ${enBaisse.length > 1 ? 'sont' : 'est'} en baisse. Continuez comme ça !` } });
    }

    blocks.push({ type: 'actions', data: { actions: [{ label: '📊 Voir les statistiques', route: 'stats' }, { label: '📂 Détail par catégorie', type: 'message', text: 'Mes dépenses par catégorie' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu calculer les tendances pour le moment.' } },
      { type: 'actions', data: { actions: [{ label: '📊 Voir les statistiques', route: 'stats' }] } },
    ];
  }
}

async function buildDepensesCategorieBlocks(params: Record<string, any>): Promise<Block[]> {
  try {
    const { debut, fin } = periodFromParams(params);
    const depenses = await api.depenses.list({ debut, fin });
    const list = Array.isArray(depenses) ? depenses : [];
    const cat = params.categorie || '';

    const filtered = cat
      ? list.filter((d: any) => (d.categorie_libelle || '').toLowerCase().includes(cat))
      : list;

    if (filtered.length === 0) {
      const allCats = [...new Set(list.map((d: any) => d.categorie_libelle).filter(Boolean))];
      return [
        { type: 'text', data: { text: cat ? `Je n'ai pas trouvé de dépenses pour "${cat}".` : 'Voici la répartition par catégorie.' } },
        { type: 'text', data: { text: allCats.length > 0 ? `Catégories disponibles : ${allCats.join(', ')}` : 'Aucune catégorie trouvée.' } },
      ];
    }

    const total = filtered.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
    const blocks: Block[] = [
      { type: 'text', data: { text: cat
        ? `📊 Pour la catégorie "${cat}" : **${filtered.length}** transaction(s), total **${fmt(total)}**.`
        : `📊 **${filtered.length}** transaction(s) réparties dans vos catégories.`
      } },
    ];
    for (const d of filtered.slice(0, 5)) {
      blocks.push({
        type: 'depense',
        data: {
          libelle: d.libelle || 'Dépense',
          montant: parseFloat(d.montant || 0),
          categorie: d.categorie_libelle || 'Non catégorisé',
          icone: d.categorie_icone || '📌',
          date: d.date_depense ? new Date(d.date_depense).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '',
        },
      });
    }
    return blocks;
  } catch {
    return [{ type: 'text', data: { text: 'Je n\'ai pas pu charger les dépenses.' } }];
  }
}

async function buildDefisBlocks(params: Record<string, any> = {}): Promise<Block[]> {
  try {
    const { debut, fin } = periodFromParams(params);
    const [objectifs, resume] = await Promise.all([
      api.objectifs.list().catch(() => []),
      api.stats.resume({ debut, fin }).catch(() => null),
    ]);
    const oList = Array.isArray(objectifs) ? objectifs : [];
    const rev = resume?.revenus || 0;
    const dep = resume?.depenses || 0;
    const marge = rev - dep;

    const blocks: Block[] = [
      { type: 'text', data: { text: '🎯 **Défis personnalisés**\n\nJe vous propose des challenges pour booster votre épargne et améliorer vos finances !' } },
    ];

    const defis: { emoji: string; titre: string; desc: string; action?: string }[] = [];

    if (marge > 0) {
      const epargneObj = Math.round(marge * 0.3);
      defis.push({
        emoji: '🔔',
        titre: `Défi épargne : ${fmt(epargneObj)} F ce mois-ci`,
        desc: `Vous dégagez ${fmt(marge)} F de marge. Essayez d'en épargner 30% (${fmt(epargneObj)} F).`,
        action: '🎯 Créer un objectif',
      });
    } else {
      const reducObj = Math.round(Math.abs(marge) * 0.2) || 5000;
      defis.push({
        emoji: '🔔',
        titre: `Défi réduction : ${fmt(reducObj)} F en moins`,
        desc: `Identifiez ${fmt(reducObj)} F de dépenses é réduire ce mois-ci pour équilibrer votre budget.`,
        action: '📊 Voir mes dépenses',
      });
    }

    defis.push({
      emoji: '🔔',
      titre: 'Défi 7 jours sans dépense superflue',
      desc: 'Pendant 7 jours, notez chaque dépense et évitez les achats impulsifs (café, snacks, etc.).',
    });

    if (oList.length > 0) {
      const enRetard = oList.filter((o: any) => {
        const pct = o.montant_cible > 0 ? (o.montant_actuel / o.montant_cible) * 100 : 0;
        return pct < 50;
      });
      if (enRetard.length > 0) {
        const obj = enRetard[0];
        const mensualite = Math.max(5000, Math.round((obj.montant_cible - obj.montant_actuel) / 6));
        defis.push({
          emoji: '🔔',
          titre: `Booster "${obj.titre}"`,
          desc: `Alimentez ${fmt(mensualite)} F/mois sur cet objectif pour l'atteindre en 6 mois.`,
          action: '🎯 Voir mes objectifs',
        });
      }
    }

    for (const d of defis) {
      const actionText = d.action ? `\n\n📊 *${d.action}*` : '';
      blocks.push({
        type: 'text',
        data: { text: `${d.emoji} **${d.titre}**\n${d.desc}${actionText}` }
      });
    }

    blocks.push({ type: 'actions', data: { actions: [
      { label: '🎯 Voir mes objectifs', route: 'objectifs_epargne' },
      { label: '💡 Économiser', type: 'message', text: 'Comment économiser ?' },
    ] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: '🎯 **Défis**\n\nJe n\'ai pas pu générer de défis pour le moment. Réessayez plus tard !' } },
      { type: 'actions', data: { actions: [{ label: '🎯 Voir mes objectifs', route: 'objectifs_epargne' }] } },
    ];
  }
}

async function buildExplicationDepassement(params: Record<string, any>): Promise<Block[]> {
  try {
    const { debut, fin, mois, annee } = periodFromParams(params);
    const [budgets, resume] = await Promise.all([
      api.budgets.list().catch(() => []),
      api.stats.resume({ debut, fin }).catch(() => null),
    ]);
    const bList = Array.isArray(budgets) ? budgets : [];
    const now = new Date();
    const joursDansMois = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const jourActuel = now.getDate();
    const joursRestants = joursDansMois - jourActuel;

    const depasses = bList.filter((b: any) => {
      if (b.mois !== mois || b.annee !== annee) return false;
      const p = parseFloat(b.montant_prevu || 0);
      const effectif = parseFloat(b.montant_utilise || 0) + parseFloat(b.montant_reserve || 0);
      return p > 0 && effectif > p;
    });

    const blocks: Block[] = [
      { type: 'text', data: { text: '📖 **Explication détaillée de votre budget**\n\nJe vais vous expliquer en détail où vous en êtes et ce que cela signifie concrètement.' } },
    ];

    if (depasses.length === 0) {
      blocks.push({ type: 'text', data: { text: '? **Bonne nouvelle :** aucun budget n\'est dépassé pour le moment !\n\nToutes vos catégories sont dans le vert. Continuez à bien gérer vos finances.' } });
      blocks.push({ type: 'actions', data: { actions: [{ label: '📊 Voir mon budget', route: 'budget' }] } });
      return blocks;
    }

    for (const d of depasses) {
      const prevu = parseFloat(d.montant_prevu || 0);
      const utilise = parseFloat(d.montant_utilise || 0);
      const reserve = parseFloat(d.montant_reserve || 0);
      const effectif = utilise + reserve;
      const depassement = effectif - prevu;
      const pct = prevu > 0 ? Math.round((effectif / prevu) * 100) : 0;
      const icone = d.categorie_icone || '📌';
      const nom = d.categorie_libelle || 'Budget';

      // Phrase explicative détaillée
      let explication: string;
      if (pct > 150) {
        explication = `⚠️ **Situation critique.** Votre budget **"${nom}"** a été bien dépassé : vous avez dépensé **${fmt(utilise)} F** alors que vous aviez prévu **${fmt(prevu)} F**, soit **${pct}%** de votre budget.\n\nConcrètement, vous êtes à **${fmt(depassement)} F** au-dessus de votre limite. Cela représente **${Math.round((depassement / prevu) * 100)}%** de dépassement.`;
      } else if (pct > 120) {
        explication = `⚠️ **Dépassement important.** Le budget **"${nom}"** affiche **${pct}%** d'utilisation (${fmt(utilise)} F utilisés sur ${fmt(prevu)} F prévus). Vous avez dépassé de **${fmt(depassement)} F**.\n\nCela signifie que vos dépenses dans cette catégorie sont **${Math.round((pct / 100 - 1) * 100)}%** au-dessus de votre objectif.`;
      } else {
        explication = `⚠️ **Petit dépassement.** Le budget **"${nom}"** est à **${pct}%** d'utilisation. Vous l'avez dépassé de **${fmt(depassement)} F**.\n\nCe n'est pas grave, mais il faut surveiller pour que cela ne s'aggrave pas.`;
      }

      // Ajouter le contexte temporel
      const depMoyenne = jourActuel > 0 ? Math.round(utilise / jourActuel) : 0;
      const projection = depMoyenne * joursDansMois;
      const infoTemporelle = `\n\n📊 Nous sommes au **${jourActuel}/${now.getMonth() + 1}** (jour ${jourActuel}/${joursDansMois}). Il reste **${joursRestants} jours** dans le mois.`;
      const projectionText = projection > prevu
        ? ` Si vous continuez sur ce rythme (${fmt(depMoyenne)} F/jour), vous finirez le mois é environ **${fmt(projection)} F**, soit **${fmt(projection - prevu)} F** au-dessus du budget.`
        : ` Si vous continuez sur ce rythme (${fmt(depMoyenne)} F/jour), vous resterez dans les limites.`;

      blocks.push({
        type: 'text',
        data: { text: `${toEmoji(icone)} **${nom}**\n\n${explication}${infoTemporelle}${projectionText}` }
      });

      // Suggestion
      const suggestionMontant = Math.round(depassement * 0.5);
      blocks.push({
        type: 'text',
        data: { text: `💡 **Ce que je vous suggère :**\n\n• Réduisez de **${fmt(suggestionMontant)} F** vos dépenses dans cette catégorie pour le reste du mois (soit ${fmt(Math.round(suggestionMontant / Math.max(1, joursRestants)))} F/jour d'économie).\n• Regardez vos dernières transactions dans "${nom}" pour identifier ce qui a causé le dépassement.\n• Ajustez votre budget pour le mois prochain si ce niveau de dépense est normal.` }
      });
    }

    blocks.push({ type: 'actions', data: { actions: [
      { label: '📊 Voir mon budget', route: 'budget' },
      { label: '📋 Voir mes dépenses', route: 'depenses' },
      { label: '🚧 Créer un seuil', route: 'seuils' },
    ] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu analyser votre budget en détail pour le moment.' } },
      { type: 'actions', data: { actions: [{ label: '📊 Voir mon budget', route: 'budget' }] } },
    ];
  }
}

async function buildSeuilsBlocks(params: Record<string, any>): Promise<Block[]> {
  try {
    const resultats = await api.seuils.check();
    const list = Array.isArray(resultats) ? resultats : [];
    const blocks: Block[] = [
      { type: 'text', data: { text: '🚧 **Mes seuils de dépenses**\n\nJe surveille vos catégories pour vous alerter si une limite est atteinte.' } },
    ];

    if (list.length === 0) {
      blocks.push({ type: 'text', data: { text: 'Vous n\'avez pas encore de seuils. Créez-en un pour mieux maétriser vos dépenses !' } });
      blocks.push({ type: 'actions', data: { actions: [{ label: '? Créer un seuil', route: 'seuils' }] } });
      return blocks;
    }

    const depasses = list.filter(r => r.depasse);
    const ok = list.filter(r => !r.depasse);

    if (depasses.length > 0) {
      blocks.push({ type: 'text', data: { text: `⚠️ **${depasses.length} seuil(s) dépassé(s) !**` } });
      for (const r of depasses) {
        const icone = r.categorie_icone || '🚧';
        blocks.push({
          type: 'text',
          data: {
             text: `${toEmoji(icone)} **${r.categorie_libelle || 'Catégorie'}** : **${r.pourcentage}%** utilisé (${r.total_actuel} F / ${r.montant_seuil} F)\n   Vous avez dépassé de **${Math.max(0, r.total_actuel - r.montant_seuil)} F**. Je vous conseille de réduire vos dépenses dans cette catégorie.`
          }
        });
      }
    }

    if (ok.length > 0) {
      for (const r of ok) {
        const icone = r.categorie_icone || '🚧';
        const etat = r.pourcentage >= 80 ? '🔴' : '🟢';
        blocks.push({
          type: 'text',
          data: {
             text: `${etat} ${toEmoji(icone)} **${r.categorie_libelle || 'Catégorie'}** : ${r.pourcentage}% utilisé (${r.total_actuel} F / ${r.montant_seuil} F)`
          }
        });
      }
    }

    blocks.push({ type: 'actions', data: { actions: [{ label: '⚙️ Gérer mes seuils', route: 'seuils' }, { label: '? Ajouter un seuil', route: 'seuils' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu vérifier vos seuils pour le moment.' } },
      { type: 'actions', data: { actions: [{ label: '⚙️ Gérer mes seuils', route: 'seuils' }] } },
    ];
  }
}

async function buildAbonnementsBlocks(): Promise<Block[]> {
  try {
    const list = await api.abonnements.list();
    const abos = Array.isArray(list) ? list : [];
    const totalMois = abos.reduce((s, a) => s + parseFloat(a.montant || 0), 0);
    const actifs = abos.filter((a: any) => a.actif);
    const inactifs = abos.filter((a: any) => !a.actif);

    const blocks: Block[] = [
      { type: 'text', data: { text: actifs.length > 0
        ? `📋 **Vos abonnements**\n\nJ'ai trouvé **${actifs.length}** abonnement(s) actif(s) pour un total de **${fmt(totalMois)} F/mois** (${fmt(totalMois * 12)} F/an).`
        : '📋 **Abonnements**\n\nJe n\'ai pas trouvé d\'abonnement récurrent pour le moment. Ajoutez des dépenses réguliéres et je les reconnaétrai automatiquement.' }
      },
    ];

    for (const a of actifs.slice(0, 8)) {
      const icone = a.icone || '📋';
      blocks.push({
        type: 'text',
        data: {
           text: `${toEmoji(icone)} **${a.libelle}** é **${fmt(a.montant)} F/mois**\n   ${a.nb_mois} mois consécutifs é Dernier prélévement : ${a.derniere_date ? new Date(a.derniere_date).toLocaleDateString('fr-FR') : 'inconnu'}`
        }
      });
    }

    if (inactifs.length > 0) {
      blocks.push({ type: 'text', data: { text: `📋 **${inactifs.length}** abonnement(s) inactif(s) (plus de 45 jours sans paiement).` } });
    }

    if (totalMois > 0) {
      blocks.push({
        type: 'text',
        data: { text: `💡 **Astuce :** Si vous supprimez les abonnements que vous n'utilisez plus, vous pourriez économiser **${fmt(totalMois * 12)} F** par an.` }
      });
    }

    blocks.push({ type: 'actions', data: { actions: [{ label: '📋 Voir mes dépenses', route: 'depenses' }, { label: '📊 Gérer mon budget', route: 'budget' }] } });
    return blocks;
  } catch {
    return [
      { type: 'text', data: { text: 'Je n\'ai pas pu analyser vos abonnements pour le moment.' } },
      { type: 'actions', data: { actions: [{ label: '📋 Voir mes dépenses', route: 'depenses' }] } },
    ];
  }
}

async function buildAlerteBlocks(mois?: number, annee?: number): Promise<Block[]> {
  try {
    const { debut, fin } = periodFromParams({ mois, annee });
    const [budgets, resume] = await Promise.all([
      api.budgets.list({ debut, fin }).catch(() => []),
      api.stats.resume({ debut, fin }).catch(() => null),
    ]);
    const bList = Array.isArray(budgets) ? budgets : [];
    const blocks: Block[] = [
      { type: 'text', data: { text: '🔔 **Points d\'attention du moment**\n\nJe surveille vos finances pour vous alerter en cas de besoin.' } },
    ];

    const depasses = bList.filter((b: any) => {
      const p = parseFloat(b.montant_prevu || 0);
      const effectif = parseFloat(b.montant_utilise || 0) + parseFloat(b.montant_reserve || 0);
      return p > 0 && effectif >= p;
    });
    const limites = bList.filter((b: any) => {
      const p = parseFloat(b.montant_prevu || 0);
      const effectif = parseFloat(b.montant_utilise || 0) + parseFloat(b.montant_reserve || 0);
      return p > 0 && effectif >= p * 0.8 && effectif < p;
    });

    if (depasses.length > 0) {
      blocks.push({ type: 'text', data: { text: '📋 **Budgets dépassés**' } });
      for (const d of depasses) {
        blocks.push({
          type: 'budget',
          data: {
            categorie: d.categorie_libelle || 'Budget',
            icone: d.categorie_icone || '📌',
            prevu: parseFloat(d.montant_prevu || 0),
            utilise: parseFloat(d.montant_utilise || 0) + parseFloat(d.montant_reserve || 0),
            restant: Math.max(0, parseFloat(d.montant_prevu || 0) - parseFloat(d.montant_utilise || 0) - parseFloat(d.montant_reserve || 0)),
            depasse: true,
          },
        });
      }
    }
    if (limites.length > 0) {
      for (const l of limites) {
        const effectif = parseFloat(l.montant_utilise || 0) + parseFloat(l.montant_reserve || 0);
        const pct = Math.round((effectif / parseFloat(l.montant_prevu || 1)) * 100);
        blocks.push({ type: 'text', data: { text: `🔔 **"${l.categorie_libelle || 'Budget'}"** est à ${pct}% de sa limite. Faites attention aux prochaines dépenses.` } });
      }
    }
    if (depasses.length === 0 && limites.length === 0) {
      blocks.push({ type: 'text', data: { text: '? Tout va bien ! Aucune alerte pour le moment. Vos finances sont sous contréle.' } });
    }
    blocks.push({ type: 'actions', data: { actions: [{ label: 'Voir les budgets', route: 'budget' }] } });
    return blocks;
  } catch {
    return [{ type: 'text', data: { text: 'Je n\'ai pas pu vérifier les alertes.' } }];
  }
}

async function buildAideBlocks(): Promise<Block[]> {
  return [
    {
      type: 'text',
      data: {
        text: `🤖 **Je suis Motéma, votre conseiller financier personnel !**

Je suis là pour vous accompagner dans la gestion de vos finances, avec bienveillance et sans jugement.

**Voici ce que je peux faire pour vous :**

📋 **Budget** → Voir, créer ou ajuster vos budgets
📊 **Analyse** → Bilan complet de vos finances
💡 **Conseils** → Recommandations personnalisées
🎯 **Objectifs** → Suivi et accélération de vos projets
📊 **Prévision** → Projection de fin de mois
📊 **Comparaison** → évolution dans le temps
🔔 **Alertes** → Points d'attention

N'hésitez pas à me poser une question en langage naturel, je suis là pour vous !`
      },
    },
    {
      type: 'actions',
      data: {
        actions: [
          { label: '📊 Analyser mes finances', action: 'analyse' },
          { label: '💡 Conseils personnalisés', type: 'message', text: 'Conseille-moi' },
          { label: '📊 Voir mon budget', route: 'budget' },
        ],
      },
    },
  ];
}

function buildGuideBlocks(): Block[] {
  return [
    {
      type: 'text',
      data: {
        text: `🤖 **Motéma vous guide pas à pas**

Voici les étapes pour bien démarrer sur **MBONGO** :

**1️⃣ Ajoutez vos revenus**
Enregistrez votre salaire, missions, aides... C'est la base de tout.

**2️⃣ Créez un budget**
Fixez des limites par catégorie : alimentation, transport, loisirs.

**3️⃣ Définissez vos objectifs**
Épargnez pour un projet ! Même un petit montant chaque mois suffit.

**4️⃣ Suivez et échangez**
Ajoutez vos dépenses au quotidien et posez-moi toutes vos questions.

💡 *Commencez par l'étape 1, puis avancez à votre rythme. Je suis là pour vous accompagner !*`,
      },
    },
    {
      type: 'actions',
      data: {
        actions: [
          { label: '💰 Ajouter un revenu', route: 'revenus' },
          { label: '📊 Voir mon budget', route: 'budget' },
          { label: '🎯 Créer un objectif', route: 'objectifs_epargne' },
          { label: '📋 Voir mes dépenses', route: 'depenses' },
        ],
      },
    },
  ];
}

function buildGreetingBlocks(): Block[] {
  const user = getUser();
  const prenom = user?.prenom || '';
  const h = new Date().getHours();
  const period = h >= 6 && h < 12 ? 'matinée'
    : h >= 12 && h < 17 ? 'après-midi'
    : h >= 17 && h < 22 ? 'soirée'
    : 'nuit';
  const emoji = h >= 6 && h < 17 ? '☀️' : '🌙';
  return [
    { type: 'text', data: { text: `${getGreeting()} ${prenom} ! ${emoji}\n\nComment puis-je vous aider avec vos finances aujourd'hui ?` } },
    { type: 'actions', data: { actions: [
      { label: '📊 Analyser mes finances', action: 'analyse' },
      { label: '📊 Voir mon budget', route: 'budget' },
      { label: '💡 Conseils', type: 'message', text: 'Conseille-moi' },
    ] } },
  ];
}

function buildSentimentPositiveBlocks(): Block[] {
  const user = getUser();
  const prenom = user?.prenom || '';
  const responses = [
    `Avec plaisir ${prenom} ! 😊 N'hésitez pas si vous avez d'autres questions.`,
    `Je suis content de pouvoir vous aider ${prenom} ! 😊\n\nQue voulez-vous faire ensuite ?`,
    `De rien ${prenom} ! 😊 Je suis là pour ça. Dites-moi si je peux faire autre chose.`,
    `Merci à vous ${prenom} ! 😊 C'est un plaisir de vous accompagner.`,
  ];
  const text = responses[Math.floor(Math.random() * responses.length)];
  return [
    { type: 'text', data: { text } },
    { type: 'actions', data: { actions: [
      { label: '📊 Analyse', action: 'analyse' },
      { label: '📊 Budget', route: 'budget' },
      { label: '💡 Conseil', type: 'message', text: 'Conseille-moi' },
    ] } },
  ];
}

function buildSentimentNegativeBlocks(): Block[] {
  const user = getUser();
  const prenom = user?.prenom || '';
  return [
    { type: 'text', data: { text: `Je comprends ${prenom}, la gestion financière peut être stressante. 💪\n\nSachez que je suis là pour vous aider, pas pour vous juger. Prenons les choses une par une.` } },
    { type: 'text', data: { text: '**Par quoi voulez-vous commencer ?**\n\n📊 **Analyse globale** → Je vous fais un bilan complet\n📊 **Voir mon budget** → On regarde où vous en êtes\n💡 **Conseils** → Des pistes adaptées à votre situation' } },
    { type: 'actions', data: { actions: [
      { label: '📊 Analyser mes finances', action: 'analyse' },
      { label: '💡 Conseils personnalisés', type: 'message', text: 'Conseille-moi' },
    ] } },
  ];
}

function buildFaqMotemaBlocks(): Block[] {
  const user = getUser();
  const prenom = user?.prenom || '';
  return [
    {
      type: 'text',
      data: {
        text: `🤖 **Moi, c'est Motéma${prenom ? ' ' + prenom.trim() : ''} !**

Je suis votre conseiller financier personnel, créé pour vous aider à mieux gérer votre argent de façon simple et bienveillante.

**Ce que je peux faire pour vous :**

📋 **Budget** → Visualiser, créer et suivre vos budgets
📊 **Analyse** → Un bilan complet de votre santé financière
📊 **Suivi** → Tendances, comparaisons, évolutions
🎯 **Objectifs** → Définir et accélérer vos projets d'épargne
💡 **Conseils** → Recommandations personnalisées
🔔 **Alertes** → être averti des dépassements
🎯 **Défis** → Relever des challenges pour économiser

Je comprends le langage naturel : posez-moi une question comme vous parleriez à un ami !`
      },
    },
    { type: 'actions', data: { actions: [
      { label: '📊 Analyser mes finances', action: 'analyse' },
      { label: '📊 Voir mon budget', route: 'budget' },
      { label: '💡 Conseils', type: 'message', text: 'Conseille-moi' },
    ] } },
  ];
}

async function buildIntentResponse(intent: string, params: Record<string, any>, lastIntent?: { intent: string; params: Record<string, any> } | null): Promise<Block[]> {
  switch (intent) {
    case 'greeting':
      return buildGreetingBlocks();
    case 'sentiment_positive':
      return buildSentimentPositiveBlocks();
    case 'sentiment_negative':
      return buildSentimentNegativeBlocks();
    case 'faq_motema':
      return buildFaqMotemaBlocks();
    case 'budget':
      return buildBudgetBlocks(params);
    case 'depenses':
      return buildDepensesBlocks();
    case 'revenus':
      return buildRevenusBlocks();
    case 'comptes':
      return buildComptesBlocks();
    case 'objectifs':
      return buildObjectifsBlocks(params);
    case 'analyse':
      return buildAnalyseBlocks(params);
    case 'create_budget':
      return [
        { type: 'text', data: { text: 'Je vais vous guider pour créer un budget. Cliquez sur le bouton ci-dessous.' } },
        { type: 'actions', data: { actions: [{ label: 'Créer un budget', route: 'budget' }] } },
      ];
    case 'create_objectif':
      return [
        { type: 'text', data: { text: 'Je vais vous guider pour créer un objectif d\'épargne.' } },
        { type: 'actions', data: { actions: [{ label: 'Créer un objectif', route: 'objectifs_epargne' }] } },
      ];
    case 'economiser':
      if (params.withGoal) {
        return buildGoalSavingBlocks(params);
      }
      return buildEconomiserBlocks();
    case 'sante_financiere':
      return buildSanteFinanciereBlocks();
    case 'prevision':
      return buildPrevisionBlocks();
    case 'acceleration':
      return buildAccelerationBlocks();
    case 'comparaison':
      return buildComparaisonBlocks(params);
    case 'conseil':
      return buildConseilBlocks();
    case 'tendance':
      return buildTendancesBlocks(params);
    case 'tendance_categorie':
      return buildTendancesBlocks(params);
    case 'depenses_categorie':
      return buildDepensesCategorieBlocks(params);
    case 'abonnements':
      return buildAbonnementsBlocks();
    case 'seuils':
      return buildSeuilsBlocks(params);
    case 'alerte_seuil':
      return buildSeuilsBlocks(params);
    case 'defi':
      return buildDefisBlocks();
    case 'defis_actifs':
      return buildDefisBlocks();
    case 'explication_budget':
      return buildExplicationDepassement(params);
    case 'alerte':
      return buildAlerteBlocks(params.mois, params.annee);
    case 'guide':
      return buildGuideBlocks();
    case 'aide':
      return buildAideBlocks();
    default:
      const hasContext = lastIntent !== null && lastIntent !== undefined;
      if (hasContext) {
        const prev = lastIntent!;
        if (prev.intent === 'conseil' || prev.intent === 'analyse') {
          return [
            { type: 'text', data: { text: 'Je n\'ai pas bien compris. Voulez-vous que je précise quelque chose par rapport é ce que je viens de vous dire ?' } },
            { type: 'actions', data: { actions: [
              { label: '📊 Relancer une analyse', action: 'analyse' },
              { label: '💡 Nouveau conseil', type: 'message', text: 'Conseille-moi' },
              { label: '❓ Autre question', type: 'message', text: 'Aide' },
            ] } },
          ];
        }
      }
      return [
        { type: 'text', data: { text: 'Je n\'ai pas bien compris votre demande.\n\nEssayez par exemple :' } },
        { type: 'text', data: { text: '📊 "Analyse mes finances"\n📊 "Voir mon budget"\n📊 "Mes dépenses"\n🎯 "Mes objectifs"\n💡 "Conseille-moi"' } },
        { type: 'actions', data: { actions: [{ label: '📊 Analyser mes finances', action: 'analyse' }, { label: '📊 Voir mon budget', route: 'budget' }] } },
      ];
  }
}

// -- Contexte temporel --

const LAST_VISIT_KEY = 'motema_last_visit';
const LAST_PRIORITIES_KEY = 'motema_last_priority_ids';
const VISIT_COUNT_KEY = 'motema_visit_count';
const LAST_TOPIC_KEY = 'motema_last_topic';
const isWeb = Platform.OS === 'web';

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Bonjour';
  if (h >= 12 && h < 17) return 'Bon après-midi';
  if (h >= 17 && h < 22) return 'Bonsoir';
  return 'Bonne nuit';
};

const formatTimeAgo = (iso: string): string => {
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);
  const hh = then.getHours().toString().padStart(2, '0');
  const mm = then.getMinutes().toString().padStart(2, '0');
  if (diffHours < 1) return 'il y a quelques minutes';
  if (diffHours < 24) return `aujourd'hui à ${hh}h${mm}`;
  if (diffDays === 1) return `hier à ${hh}h${mm}`;
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  return `le ${then.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
};

const loadLastVisit = async (): Promise<string | null> => {
  try {
    if (isWeb) return localStorage.getItem(LAST_VISIT_KEY);
    return await SecureStore.getItemAsync(LAST_VISIT_KEY);
  } catch { return null; }
};

const saveLastVisit = async (iso: string): Promise<void> => {
  try {
    if (isWeb) localStorage.setItem(LAST_VISIT_KEY, iso);
    else await SecureStore.setItemAsync(LAST_VISIT_KEY, iso);
  } catch { /* ignore */ }
};

const loadLastPriorityIds = async (): Promise<string[]> => {
  try {
    const raw = isWeb
      ? localStorage.getItem(LAST_PRIORITIES_KEY)
      : await SecureStore.getItemAsync(LAST_PRIORITIES_KEY);
    return raw ? raw.split(',').filter(Boolean) : [];
  } catch { return []; }
};

const saveLastPriorityIds = async (ids: string[]): Promise<void> => {
  try {
    const val = ids.join(',');
    if (isWeb) localStorage.setItem(LAST_PRIORITIES_KEY, val);
    else await SecureStore.setItemAsync(LAST_PRIORITIES_KEY, val);
  } catch { /* ignore */ }
};

const loadVisitCount = async (): Promise<number> => {
  try {
    const raw = isWeb
      ? localStorage.getItem(VISIT_COUNT_KEY)
      : await SecureStore.getItemAsync(VISIT_COUNT_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
};

const saveVisitCount = async (n: number): Promise<void> => {
  try {
    const val = String(n);
    if (isWeb) localStorage.setItem(VISIT_COUNT_KEY, val);
    else await SecureStore.setItemAsync(VISIT_COUNT_KEY, val);
  } catch { /* ignore */ }
};

// -- Briefing --

const createBriefing = (user: any, lastVisit: string | null, lastTopic: string | null, greeting: string, data: BriefingData): RichMessage[] => {
  const prenom = user?.prenom || 'Utilisateur';
  let salutation = `${greeting} ${prenom} 😊`;
  if (lastVisit) {
    salutation += `\n\nRavi de vous revoir ! ${data.salutationIntro}\n${data.salutationPrompt} aujourd'hui :`;
  } else {
    salutation += `\n\n${data.salutationIntro}\n${data.salutationPrompt} aujourd'hui.`;
  }
  const now = new Date();
  const msgs: RichMessage[] = [
    {
      id: 'briefing-1',
      sender: 'motema',
      blocks: [{ type: 'bienvenue', data: { text: salutation } }],
      timestamp: now,
    },
  ];

  const alerteItems = (data.remarques || []).filter(r => r.color === '#F59E0B');
  if (alerteItems.length > 0) {
    const alerteText = alerteItems.map(r => `🔔 **${r.text}**`).join('\n\n');
    msgs.push({
      id: 'briefing-alerte',
      sender: 'motema',
      blocks: [{
        type: 'text',
        data: { text: `🔔 **Petite vigilance**\n\n${alerteText}\n\nJe suis là pour vous aider à y remédier !` }
      }],
      timestamp: now,
    });
  }

  msgs.push({
    id: 'briefing-2',
    sender: 'motema',
    blocks: [{ type: 'remarques', data: { items: data.remarques } }],
    timestamp: now,
  });

  if (Array.isArray(data.conseil)) {
    data.conseil.forEach((c, i) => {
      msgs.push({
        id: `briefing-3-${i}`,
        sender: 'motema' as const,
        blocks: [{ type: 'conseil' as const, data: c }],
        timestamp: now,
      });
    });
  } else {
    msgs.push({
      id: 'briefing-3',
      sender: 'motema' as const,
      blocks: [{ type: 'conseil' as const, data: data.conseil }],
      timestamp: now,
    });
  }

  msgs.push({
    id: 'briefing-4',
    sender: 'motema',
    blocks: [{ type: 'actions', data: { actions: data.actions } }],
    timestamp: now,
  });

  if (data.guide) {
    msgs.push({
      id: 'briefing-5',
      sender: 'motema',
      blocks: [{ type: 'guide', data: data.guide }],
      timestamp: now,
    });
  }
  return msgs;
};

/* -- Nouveau briefing intelligent (Sprint 1) -- */

function createSmartBriefing(context: { userName?: string; lastVisit?: string | null; periodeType?: string; isNewUser?: boolean }, brief: MotemaBriefingData): RichMessage[] {
  const prenom = context.userName || 'Utilisateur';
  const now = new Date();
  const pt = context.periodeType || 'mensuel';

  const lines: string[] = [];
  lines.push(brief.salutation || `👋 Bonjour ${prenom} !`);

  if (brief.revenus > 0 || brief.depenses > 0) {
    const solde = brief.revenus - brief.depenses;
    lines.push(`\n💰 **Revenus** : ${fmt(brief.revenus)}  ·  **Dépenses** : ${fmt(brief.depenses)}  ·  **Solde** : ${fmt(Math.abs(solde))} ${solde >= 0 ? '✅' : '🔴'}`);
  }

  const hasData = brief.revenus > 0 || brief.depenses > 0 || brief.goals.length > 0;

  const bons = brief.allFindings.filter(f => f.severity === 'success').slice(0, 2);
  if (bons.length > 0) {
    lines.push('\n✅ **Ce qui va bien :**');
    bons.forEach(f => lines.push(`• ${f.label}`));
  }

  const aAmeliorer = brief.allFindings.filter(f => f.severity === 'warning' || f.severity === 'critical').slice(0, 2);
  if (aAmeliorer.length > 0) {
    lines.push('\n⚠️ **À améliorer :**');
    aAmeliorer.forEach(f => lines.push(`• ${f.label}`));
  }

  if (brief.goals.length > 0) {
    lines.push('\n🎯 **Objectifs d\'épargne :**');
    for (const g of brief.goals) {
      const pct = g.montant_cible > 0 ? Math.round((g.montant_actuel / g.montant_cible) * 100) : 0;
      lines.push(`• **${g.titre}** : ${fmt(g.montant_actuel)} / ${fmt(g.montant_cible)} (${pct}%)`);
    }
  }

  if (brief.topPriorities.length > 0) {
    const p = brief.topPriorities[0];
    const icons: Record<string, string> = { critical: '🔴', warning: '⚠️', info: 'ℹ️', success: '✅' };
    lines.push(`\n📌 **Priorité** : ${icons[p.severity] ?? ''} ${p.label}`);
    if (p.detail) lines.push(`   ${p.detail}`);
  }

  lines.push(`\n💡 **Voir mon analyse**  ·  **Conseils personnalisés**  ·  **Mes objectifs**`);

  return [{
    id: 'briefing-1',
    sender: 'motema',
    blocks: [{ type: 'text', data: { text: lines.join('\n') } }],
    timestamp: now,
  }];
}

// -- Hook styles partagés --

function useChatStyles() {
  const { colors: C, isDark } = useTheme();
  return useMemo(() => {
    const ACCENT = C.iaPurple;
    const USER_BG = C.purple;
    const BOT_BG = C.iaBg;
    const bv = StyleSheet.create({
      card: {
        backgroundColor: C.white, borderRadius: 14,
        paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1, borderColor: C.border,
        shadowColor: C.dark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
      },
      greeting: {
        fontSize: 16, fontWeight: '800', color: C.text,
        fontFamily: Fonts.rounded, letterSpacing: -0.2,
      },
      text: {
        fontSize: 13, lineHeight: 19, fontWeight: '500', color: C.muted,
        fontFamily: Fonts.rounded, marginTop: Spacing.sm,
      },
    });
    const rm = StyleSheet.create({
      card: {
        backgroundColor: C.white, borderRadius: 16,
        padding: Spacing.md, marginBottom: Spacing.sm,
        borderWidth: 1, borderColor: C.border,
        shadowColor: C.dark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
      },
      headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
      headerBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: C.blue + '18',
        alignItems: 'center', justifyContent: 'center',
      },
      headerIcon: { fontSize: 14 },
      headerText: { fontSize: 13, fontWeight: '700', color: C.text, fontFamily: Fonts.rounded },
      row: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
        marginBottom: Spacing.sm, paddingLeft: Spacing.sm,
      },
      emojiWrap: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
      },
      emoji: { fontSize: 14 },
      text: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19, fontFamily: Fonts.rounded },
    });
    const cs = StyleSheet.create({
      card: {
        borderRadius: 14, padding: Spacing.md, marginBottom: Spacing.sm,
        borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
      },
      header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
      iconWrap: {
        width: 28, height: 28, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
      },
      icon: { fontSize: 14 },
      title: { fontSize: 14, fontWeight: '800', fontFamily: Fonts.rounded },
      text: { fontSize: 13, fontWeight: '500', lineHeight: 19, paddingLeft: 36, fontFamily: Fonts.rounded },
    });
    const sug = StyleSheet.create({
      wrap: {
        flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
        paddingTop: Spacing.sm, paddingHorizontal: Spacing.xs,
      },
      chip: {
        backgroundColor: ACCENT + '0F', borderRadius: Radius.full,
        paddingVertical: 6, paddingHorizontal: Spacing.md,
        borderWidth: 1, borderColor: ACCENT + '26',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
      },
      chipText: { fontSize: 12, fontWeight: '600', color: ACCENT, fontFamily: Fonts.rounded },
    });
    const s = StyleSheet.create({
      root: { flex: 1, backgroundColor: C.bg },

      header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: isDark ? C.bg : C.dark, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
        position: 'relative', overflow: 'hidden',
      },
      headerRing1: { position:'absolute', width:180, height:180, borderRadius:90, borderWidth:1, borderColor:C.purple + '18', top:-50, right:-30 },
      headerRing2: { position:'absolute', width:100, height:100, borderRadius:50, borderWidth:1, borderColor:C.purple + '0F', top:10, right:Spacing.sm },
      headerBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
      headerCenter: { flex: 1, alignItems: 'center' },
      headerTitle: { fontSize: 18, fontWeight: '800', color: isDark ? C.text : C.white, letterSpacing: -0.3, fontFamily: Fonts.rounded },
      headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontFamily: Fonts.rounded },

      listPad: { padding: Spacing.lg, paddingBottom: Spacing.sm },
      msgGroup: { marginBottom: Spacing.md },
      msgGroupUser: { alignItems: 'flex-end' },
      msgTimeRight: { fontSize: 10, fontWeight: '600', color: C.hint, marginTop: 2, marginRight: 4 },
      msgTimeLeft: { fontSize: 10, fontWeight: '600', color: C.hint, marginTop: 2, marginLeft: 2 },
      msgRow: { flexDirection: 'row', alignItems: 'flex-start' },
      botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT + '18', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm, marginTop: 2 },
      msgBlocks: { flex: 1 },

      bubbleBase: { maxWidth: '88%', borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 10, marginBottom: Spacing.xs },
      bubbleUser: { backgroundColor: USER_BG, borderBottomRightRadius: Radius.sm, shadowColor: C.dark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
      bubbleBot: { backgroundColor: BOT_BG, borderBottomLeftRadius: Radius.sm, borderWidth: 1, borderColor: C.border, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
      bText: { fontSize: 15, lineHeight: 22, fontWeight: '500', fontFamily: Fonts.rounded },
      bTextUser: { color: isDark ? C.text : C.white },
      bTextBot: { color: C.text },

      card: {
        backgroundColor: C.white, borderRadius: Radius.md,
        padding: Spacing.md, borderWidth: 1, borderColor: C.border,
        marginBottom: Spacing.sm,
        shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
      },
      cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
      cardIcon: { fontSize: 17, marginRight: Spacing.sm },
      cardTitle: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, fontFamily: Fonts.rounded },
      badge: { backgroundColor: C.danger, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
      badgeText: { fontSize: 9, fontWeight: '800', color: C.white, textTransform: 'uppercase' },
      cardRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.xs },
      cardAmount: { fontSize: 15, fontWeight: '800', color: C.text },
      cardSep: { fontSize: 13, color: C.muted, marginHorizontal: 4 },
      cardAmountMuted: { fontSize: 13, fontWeight: '600', color: C.muted },
      barOuter: { height: 4, backgroundColor: C.surface, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.sm },
      barFill: { height: 4, borderRadius: 2 },
      cardFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
      cardFooterLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },
      cardFooterVal: { fontSize: 12, fontWeight: '700', color: C.text },

      depCard: {
        backgroundColor: C.white, borderRadius: Radius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: C.border,
        marginBottom: Spacing.sm,
        shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
      },
      depRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
      depBadge: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
      depBadgeIco: { fontSize: 19 },
      depInfo: { flex: 1, marginLeft: Spacing.md },
      depLabel: { fontSize: 14, fontWeight: '700', color: C.text },
      depCateg: { fontSize: 11, color: C.muted, marginTop: 1 },
      depRight: { alignItems: 'flex-end' },
      depDate: { fontSize: 10, color: C.hint, marginBottom: 2 },
      depMontant: { fontSize: 14, fontWeight: '800', color: C.danger },

      compteCard: {
        backgroundColor: C.white, borderRadius: Radius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: C.border,
        marginBottom: Spacing.sm,
        shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
      },
      compteTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
      compteIco: { fontSize: 21, marginRight: Spacing.md },
      compteInfo: { flex: 1 },
      compteNom: { fontSize: 14, fontWeight: '700', color: C.text },
      compteType: { fontSize: 11, color: C.muted, marginTop: 1 },
      compteSolde: { fontSize: 15, fontWeight: '800', color: C.text },

      statsGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
      statItem: { flex: 1, alignItems: 'center', gap: 2 },
      statDivider: { width: 1, height: 28, backgroundColor: C.border, marginHorizontal: Spacing.sm },
      statLabel: { fontSize: 9, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginTop: 2 },
      statVal: { fontSize: 14, fontWeight: '800' },
      statExtra: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: Spacing.sm, marginBottom: Spacing.sm },
      statExtraText: { fontSize: 12, color: C.muted, textAlign: 'center', fontWeight: '600' },

      actRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: C.border, paddingTop: Spacing.sm },
      actChip: { backgroundColor: ACCENT + '14', borderRadius: Radius.full, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
      actChipText: { fontSize: 11, fontWeight: '700', color: ACCENT },

      actBar: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.sm },
      actBarBtn: { backgroundColor: ACCENT, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
      actBarBtnSecondary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
      actBarText: { fontSize: 12, fontWeight: '700', color: C.white },
      actBarTextSecondary: { fontSize: 12, fontWeight: '700', color: C.muted },

      inputBar: {
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
        backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border,
        shadowColor: C.dark, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 4,
      },
      inputBanner: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 10, paddingLeft: 2,
      },
      inputBannerIcon: { fontSize: 18, marginRight: 10 },
      inputBannerText: {
        fontSize: 17, fontWeight: '800', color: C.text,
        fontFamily: Fonts.rounded,
      },
      inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
      input: {
        flex: 1, backgroundColor: C.surface, borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        fontSize: 15, fontWeight: '500', color: C.text, fontFamily: Fonts.rounded,
        borderWidth: 1.5, borderColor: C.border, maxHeight: 100,
      },
      inputFocused: { borderColor: ACCENT },
      sendBtn: {
        width: 44, height: 44, borderRadius: Radius.full, backgroundColor: ACCENT,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: ACCENT, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
      },
      sendBtnDisabled: { backgroundColor: C.border, shadowOpacity: 0 },
      inputDisabled: { opacity: 0.5 },

      tRow: { alignItems: 'flex-start', marginBottom: Spacing.md, paddingLeft: Spacing.lg },
      tBubble: {
        backgroundColor: BOT_BG, borderRadius: Radius.lg, borderBottomLeftRadius: Radius.sm,
        borderWidth: 1, borderColor: C.border,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      },
      tDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
      dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: ACCENT },
      tText: { fontSize: 14, fontWeight: '600', color: C.muted, fontFamily: Fonts.rounded },

      overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
      progressCard: { backgroundColor: C.white, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', maxWidth: 320, shadowColor: C.dark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
      progressHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xs },
      progressTitle: { fontSize: 16, fontWeight: '700', color: C.text, flex: 1, fontFamily: Fonts.rounded },
      progressSub: { fontSize: 12, color: C.muted, marginBottom: Spacing.lg, marginLeft: 36, fontFamily: Fonts.rounded },
      stepsWrap: { gap: Spacing.sm },
      stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: Radius.md },
      stepRowCurrent: { backgroundColor: ACCENT + '0F' },
      stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
      stepDotDone: { backgroundColor: C.green, borderColor: C.green },
      stepDotCurrent: { backgroundColor: C.white, borderColor: ACCENT },
      stepDotEmpty: { fontSize: 11 },
      stepLabel: { fontSize: 13, fontWeight: '500', color: C.muted, fontFamily: Fonts.rounded },
      stepLabelDone: { color: C.green, fontWeight: '600' },
      stepLabelCurrent: { color: ACCENT, fontWeight: '700' },

      discussionHeader: {
        flexDirection: 'row', alignItems: 'center',
        marginVertical: 16, paddingHorizontal: 16,
      },
      discussionLine: {
        flex: 1, height: 1, backgroundColor: C.border,
      },
      discussionLabel: {
        fontSize: 12, fontWeight: '700', color: C.text,
        fontFamily: Fonts.rounded, marginHorizontal: 12,
        textTransform: 'uppercase', letterSpacing: 0.5,
      },
    });

    return {
      s, bv, rm, cs, sug, ACCENT, USER_BG, BOT_BG, colors: C, isDark,
      csTheme: {
        sante: { bg: C.green + '18', border: C.green + '40', iconBg: C.green + '26', text: C.green },
        epargne: { bg: C.blue + '18', border: C.blue + '40', iconBg: C.blue + '26', text: C.blue },
        budget: { bg: C.warning + '18', border: C.warning + '40', iconBg: C.warning + '26', text: C.warning },
        recommandation: { bg: C.purple + '18', border: C.purple + '40', iconBg: C.purple + '26', text: C.purple },
        default: { bg: C.warning + '10', border: C.warning + '30', iconBg: C.warning + '20', text: C.warning },
      },
    };
  }, [C, isDark]);
}

// -- Sous-composants extraits (références stables) --

const FormattedText = React.memo(function FormattedText({ text, style, isUser }: { text: string; style?: any; isUser?: boolean }) {
  const { s, ACCENT } = useChatStyles();
  if (isUser) return <Text style={style}>{text}</Text>;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const children: (string | React.ReactElement)[] = parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} style={{ color: ACCENT, fontWeight: '800' }}>{part.slice(2, -2)}</Text>;
    }
    return part;
  });
  return <Text style={style}>{children}</Text>;
});

const BienvenueBlock = React.memo(function BienvenueBlock({ text }: { text: string }) {
  const { bv } = useChatStyles();
  const entry = useSharedValue(0);
  useEffect(() => { entry.value = withSpring(1, { damping: 14, stiffness: 100 }); }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: (1 - entry.value) * 16 }],
  }));
  const firstLine = text.split('\n')[0] || '';
  const rest = text.split('\n').slice(1).join('\n');
  return (
    <Animated.View style={[bv.card, anim]}>
      <FormattedText text={firstLine} style={bv.greeting} />
      {rest ? <FormattedText text={rest} style={bv.text} /> : null}
    </Animated.View>
  );
});

const RemarquesBlock = React.memo(function RemarquesBlock({ items }: { items: { emoji: string; color: string; text: string }[] }) {
  const { rm } = useChatStyles();
  const entry = useSharedValue(0);
  useEffect(() => { entry.value = withSpring(1, { damping: 14, stiffness: 100 }); }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: (1 - entry.value) * 16 }],
  }));
  return (
    <Animated.View style={[rm.card, anim]}>
      <View style={rm.headerRow}>
        <View style={rm.headerBadge}>
          <Text style={rm.headerIcon}>💬</Text>
        </View>
        <Text style={rm.headerText}>Ce que je remarque</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={rm.row}>
          <View style={rm.emojiWrap}>
            <Text style={rm.emoji}>{item.emoji}</Text>
          </View>
          <FormattedText text={item.text} style={[rm.text, { color: item.color }]} />
        </View>
      ))}
    </Animated.View>
  );
});

const ConseilBlock = React.memo(function ConseilBlock({ icon, title, text }: { icon: string; title: string; text: string }) {
  const { cs, csTheme } = useChatStyles();
  const entry = useSharedValue(0);
  useEffect(() => { entry.value = withSpring(1, { damping: 14, stiffness: 100 }); }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: (1 - entry.value) * 16 }],
  }));
  const t = (title || '').toLowerCase();
  const palette = t.includes('sant') ? csTheme.sante
    : t.includes('pargne') || t.includes('epargne') ? csTheme.epargne
    : t.includes('budget') ? csTheme.budget
    : t.includes('commandation') ? csTheme.recommandation
    : csTheme.default;
  return (
    <Animated.View style={[cs.card, { backgroundColor: palette.bg, borderColor: palette.border }, anim]}>
      <View style={cs.header}>
        <View style={[cs.iconWrap, { backgroundColor: palette.iconBg }]}>
          <Text style={cs.icon}>{icon}</Text>
        </View>
        <Text style={[cs.title, { color: palette.text }]}>{title}</Text>
      </View>
      <FormattedText text={text} style={[cs.text, { color: palette.text }]} />
    </Animated.View>
  );
});

const GuideBlock = React.memo(function GuideBlock({ text }: { text: string }) {
  const { s, colors: C } = useChatStyles();
  return (
    <View style={[s.bubbleBase, s.bubbleBot, { backgroundColor: C.primary + '15', borderColor: C.primary + '30' }]}>
      <FormattedText text={text} style={{ fontSize: 13, fontWeight: '500', color: C.primary, lineHeight: 19, fontFamily: Fonts.rounded }} />
    </View>
  );
});

const PriorityBlock = React.memo(function PriorityBlock({ data }: { data: PrioriteData }) {
  const { s, colors: C } = useChatStyles();
  const entry = useSharedValue(0);
  useEffect(() => { entry.value = withSpring(1, { damping: 14, stiffness: 100 }); }, []);
  const anim = useAnimatedStyle(() => ({ opacity: entry.value, transform: [{ translateY: (1 - entry.value) * 16 }] }));

  const colors: Record<string, { bg: string; border: string; text: string }> = {
    critical: { bg: C.danger + '18', border: C.danger + '40', text: C.danger },
    warning: { bg: C.warning + '18', border: C.warning + '40', text: C.warning },
    info: { bg: C.blue + '18', border: C.blue + '40', text: C.blue },
    success: { bg: C.green + '18', border: C.green + '40', text: C.green },
  };
  const theme = colors[data.severity] || colors.info;

  return (
    <Animated.View style={[{ backgroundColor: theme.bg, borderColor: theme.border, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 }, anim]}>
      <FormattedText text={data.label} style={{ fontSize: 14, fontWeight: '800', color: theme.text, marginBottom: 4, fontFamily: Fonts.rounded }} />
      <FormattedText text={data.detail} style={{ fontSize: 13, fontWeight: '500', color: theme.text, lineHeight: 19, fontFamily: Fonts.rounded }} />
    </Animated.View>
  );
});

const ScoreCard = React.memo(function ScoreCard({ data }: { data: ScoreData }) {
  const { s, colors: C } = useChatStyles();
  const entry = useSharedValue(0);
  useEffect(() => { entry.value = withSpring(1, { damping: 14, stiffness: 100 }); }, []);
  const anim = useAnimatedStyle(() => ({ opacity: entry.value, transform: [{ translateY: (1 - entry.value) * 16 }] }));

  const barW = Math.min(data.total, 100);

  return (
    <Animated.View style={[{ backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.border, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 }, anim]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: data.color + '18' }]}>
          <Text style={{ fontSize: 24 }}>{data.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.muted, fontFamily: Fonts.rounded }}>Santé financière</Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: data.color, fontFamily: Fonts.rounded }}>{data.emoji} {data.label}</Text>
        </View>
        <Text style={{ fontSize: 28, fontWeight: '900', color: data.color, fontFamily: Fonts.rounded }}>{data.total}</Text>
      </View>

      <View style={[{ height: 6, borderRadius: 3, backgroundColor: C.surface, marginTop: 12, overflow: 'hidden' }]}>
        <View style={[{ height: '100%', width: `${barW}%`, backgroundColor: data.color, borderRadius: 3 }]} />
      </View>

      {data.bons.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.green, fontFamily: Fonts.rounded, marginBottom: 4 }}>✅ Les points positifs</Text>
          {data.bons.map((b, i) => (
            <Text key={i} style={{ fontSize: 12, fontWeight: '500', color: C.muted, fontFamily: Fonts.rounded, lineHeight: 18 }}>  • {b}</Text>
          ))}
        </View>
      )}

      {data.aAmeliorer.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.warning, fontFamily: Fonts.rounded, marginBottom: 4 }}>⚠️ Ce qui peut aller mieux</Text>
          {data.aAmeliorer.map((a, i) => (
            <Text key={i} style={{ fontSize: 12, fontWeight: '500', color: C.muted, fontFamily: Fonts.rounded, lineHeight: 18 }}>  • {a}</Text>
          ))}
        </View>
      )}
    </Animated.View>
  );
});

const SuggestionsChips = React.memo(function SuggestionsChips({ suggestions, onSelect }: { suggestions: string[]; onSelect: (text: string) => void }) {
  const { sug } = useChatStyles();
  if (suggestions.length === 0) return null;
  return (
    <View style={sug.wrap}>
      {suggestions.map((s, i) => (
        <TouchableOpacity key={i} style={sug.chip} onPress={() => onSelect(s)} activeOpacity={0.7}>
          <Text style={sug.chipText}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const MessageBubbles = React.memo(function MessageBubbles({ msg, formatTime, onAction }: { msg: RichMessage; formatTime: (d: Date) => string; onAction?: (action: BlockAction) => void }) {
  const { s, ACCENT } = useChatStyles();
  const isUser = msg.sender === 'user';
  const entry = useSharedValue(0);
  useEffect(() => {
    entry.value = withSpring(1, { damping: 18, stiffness: 140 });
  }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateX: (1 - entry.value) * (isUser ? 30 : -30) }],
  }));
  return (
    <Animated.View style={[s.msgGroup, isUser && s.msgGroupUser, anim]}>
      {isUser ? (
        <>
          {msg.blocks.map((block, i) => (
            <BlockRenderer key={`${msg.id}-b${i}`} block={block} isUser={isUser} isFirst={i === 0} onAction={onAction} />
          ))}
          <Text style={s.msgTimeRight}>{formatTime(msg.timestamp)}</Text>
        </>
      ) : (
        <View style={s.msgRow}>
          <View style={s.botAvatar}>
            <Ionicons name="chatbubble-ellipses" size={18} color={ACCENT} />
          </View>
          <View style={s.msgBlocks}>
            {msg.blocks.map((block, i) => (
              <BlockRenderer key={`${msg.id}-b${i}`} block={block} isUser={isUser} isFirst={i === 0} onAction={onAction} />
            ))}
            <Text style={s.msgTimeLeft}>{formatTime(msg.timestamp)}</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
});

const BlockRenderer = React.memo(function BlockRenderer({ block, isUser, isFirst, onAction }: { block: Block; isUser: boolean; isFirst: boolean; onAction?: (action: BlockAction) => void }) {
  const { s, colors: C, ACCENT } = useChatStyles();
  const entry = useSharedValue(0);
  useEffect(() => {
    entry.value = withSpring(1, { damping: 16, stiffness: 130 });
  }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: (1 - entry.value) * 16 }],
  }));
  const renderContent = () => {
    switch (block.type) {
      case 'bienvenue':
        return <BienvenueBlock text={block.data.text} />;
      case 'remarques':
        return <RemarquesBlock items={block.data.items} />;
      case 'conseil':
        return <ConseilBlock icon={block.data.icon} title={block.data.title} text={block.data.text} />;
      case 'text':
        return (
          <View style={[s.bubbleBase, isUser ? s.bubbleUser : s.bubbleBot, !isFirst && { marginTop: 0 }]}>
            <FormattedText text={block.data.text} style={[s.bText, isUser ? s.bTextUser : s.bTextBot]} isUser={isUser} />
          </View>
        );
      case 'budget':
        return <BudgetCard data={block.data} />;
      case 'depense':
        return <DepenseCard data={block.data} />;
      case 'objectif':
        return <ObjectifCard data={block.data} />;
      case 'compte':
        return <CompteCard data={block.data} />;
      case 'statistique':
        return <StatsCard data={block.data} />;
      case 'actions':
        return <ActionsBar actions={block.data.actions} onAction={onAction} />;
      case 'guide':
        return <GuideBlock text={block.data.text} />;
      case 'priorite':
        return <PriorityBlock data={block.data} />;
      case 'score':
        return <ScoreCard data={block.data} />;
      default:
        return null;
    }
  };
  if (block.type === 'text' || block.type === 'actions') {
    return <Animated.View style={anim}>{renderContent()}</Animated.View>;
  }
  return <Animated.View style={[{ marginBottom: Spacing.sm }, anim]}>{renderContent()}</Animated.View>;
});

/* -- BudgetCard -- */
const BudgetCard = React.memo(function BudgetCard({ data }: { data: BudgetData }) {
  const { s, colors: C } = useChatStyles();
  const ratio = data.prevu > 0 ? Math.min(data.utilise / data.prevu, 1) : 0;
  const pct = Math.round(ratio * 100);
  const barColor = pct >= 100 ? C.danger : pct > 70 ? C.warning : C.green;
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <IconRenderer icone={data.icone} size={17} style={{ marginRight: Spacing.sm }} />
        <Text style={s.cardTitle}>{data.categorie}</Text>
        {data.depasse && (
          <View style={s.badge}>
            <Text style={s.badgeText}>Budget dépassé</Text>
          </View>
        )}
      </View>
      <View style={s.cardRow}>
        <Text style={s.cardAmount}>{fmt(data.utilise)}</Text>
        <Text style={s.cardSep}>/</Text>
        <Text style={s.cardAmountMuted}>{fmt(data.prevu)}</Text>
      </View>
      <View style={s.barOuter}>
        <View style={[s.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
      </View>
      <View style={s.cardFooter}>
        <Text style={s.cardFooterLabel}>Restant</Text>
        <Text style={[s.cardFooterVal, data.restant < 0 && { color: C.danger }]}>
          {fmt(data.restant)}
        </Text>
      </View>
      <ActionsRow actions={[{ label: 'Voir le budget', route: 'budget' }, { label: 'Modifier', route: 'budget' }]} />
    </View>
  );
});

/* -- DepenseCard -- */
const DepenseCard = React.memo(function DepenseCard({ data }: { data: DepenseData }) {
  const { s, colors: C } = useChatStyles();
  const badgeColors: Record<string, string> = { '🍽️': 'rgba(244,63,94,0.15)', '🚗': 'rgba(245,158,11,0.15)', '🏠': 'rgba(59,130,246,0.15)', '🛍️': 'rgba(34,197,94,0.15)' };
  const bgColor = badgeColors[data.icone] || C.surface;
  return (
    <View style={s.depCard}>
      <View style={s.depRow}>
        <View style={[s.depBadge, { backgroundColor: bgColor }]}>
          <IconRenderer icone={data.icone} size={19} />
        </View>
        <View style={s.depInfo}>
          <Text style={s.depLabel}>{data.libelle}</Text>
          <Text style={s.depCateg}>{data.categorie}</Text>
        </View>
        <View style={s.depRight}>
          <Text style={s.depDate}>{data.date}</Text>
          <Text style={s.depMontant}>{fmt(data.montant)}</Text>
        </View>
      </View>
      <ActionsRow actions={[{ label: 'Voir toutes les dépenses', route: 'depenses' }]} />
    </View>
  );
});

/* -- ObjectifCard -- */
const ObjectifCard = React.memo(function ObjectifCard({ data }: { data: ObjectifData }) {
  const { s, ACCENT, colors: C } = useChatStyles();
  const pct = data.progression;
  const barColor = pct >= 100 ? C.green : pct > 70 ? C.warning : ACCENT;
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <IconRenderer icone={data.icone} size={17} style={{ marginRight: Spacing.sm }} />
        <Text style={s.cardTitle}>{data.titre}</Text>
      </View>
      <View style={s.cardRow}>
        <Text style={[s.cardAmount, { color: C.blue }]}>{fmt(data.actuel)}</Text>
        <Text style={s.cardSep}>/</Text>
        <Text style={s.cardAmountMuted}>{fmt(data.cible)}</Text>
      </View>
      <View style={s.barOuter}>
        <View style={[s.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
      </View>
      <View style={s.cardFooter}>
        <Text style={[s.cardFooterVal, { fontSize: 12, fontWeight: '700', color: barColor }]}>
          {pct}%
        </Text>
        <Text style={s.cardFooterLabel}>Reste {fmt(data.restant)}</Text>
      </View>
      <ActionsRow actions={[{ label: 'Alimenter', route: 'objectifs_epargne' }, { label: 'Voir', route: 'objectifs_epargne' }]} />
    </View>
  );
});

/* -- CompteCard -- */
const CompteCard = React.memo(function CompteCard({ data }: { data: CompteData }) {
  const { s, colors: C } = useChatStyles();
  return (
    <View style={s.compteCard}>
      <View style={s.compteTop}>
        <IconRenderer icone={data.icone} size={21} style={{ marginRight: Spacing.md }} />
        <View style={s.compteInfo}>
          <Text style={s.compteNom}>{data.nom}</Text>
          <Text style={s.compteType}>{data.type}</Text>
        </View>
        <Text style={[s.compteSolde, data.solde < 0 && { color: C.danger }]}>
          {fmt(data.solde)}
        </Text>
      </View>
      <ActionsRow actions={[{ label: 'Voir les comptes', route: 'comptes' }]} />
    </View>
  );
});

/* -- StatsCard -- */
const StatsCard = React.memo(function StatsCard({ data }: { data: StatistiqueData }) {
  const { s, colors: C } = useChatStyles();
  const rev = data.revenus || 0;
  const dep = data.depenses || 0;
  const bud = data.budgetUtilise || 0;
  const epa = data.epargne || 0;
  const ratioDep = rev > 0 ? Math.round((dep / rev) * 100) : 0;
  return (
    <View style={s.card}>
      <View style={s.statsGrid}>
        <View style={s.statItem}>
          <Ionicons name="trending-up" size={14} color={C.green} />
          <Text style={s.statLabel}>Revenus</Text>
          <Text style={[s.statVal, { color: C.green }]}>{fmt(rev)}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Ionicons name="trending-down" size={14} color={C.danger} />
          <Text style={s.statLabel}>Dépenses</Text>
          <Text style={[s.statVal, { color: C.danger }]}>{fmt(dep)}</Text>
        </View>
      </View>
      <View style={s.statsGrid}>
        <View style={s.statItem}>
          <Ionicons name="pie-chart" size={14} color={C.warning} />
          <Text style={s.statLabel}>Budget utilisé</Text>
          <Text style={[s.statVal, { color: C.warning }]}>{fmt(bud)}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Ionicons name="wallet" size={14} color={C.blue} />
          <Text style={s.statLabel}>épargne</Text>
          <Text style={[s.statVal, { color: C.blue }]}>{fmt(epa)}</Text>
        </View>
      </View>
      <View style={s.statExtra}>
        <Text style={s.statExtraText}>
          Vous dépensez {ratioDep}% de vos revenus.
        </Text>
      </View>
      <ActionsRow actions={[{ label: 'Voir les statistiques', route: 'stats' }]} />
    </View>
  );
});

/* -- ActionsRow (inside cards) -- */
const ActionsRow = React.memo(function ActionsRow({ actions }: { actions: BlockAction[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
      {actions.map((a, i) => (
        <TouchableOpacity
          key={i}
          style={{ backgroundColor: '#7C3AED14', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 }}
          onPress={() => router.push(`/${a.route}` as any)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED' }}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

/* -- ActionsBar (standalone) -- */
const ActionsBar = React.memo(function ActionsBar({ actions, onAction }: { actions: BlockAction[]; onAction?: (action: BlockAction) => void }) {
  const { s, colors: C, ACCENT } = useChatStyles();
  const entry = useSharedValue(0);
  useEffect(() => { entry.value = withSpring(1, { damping: 16, stiffness: 130 }); }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: (1 - entry.value) * 12 }],
  }));
  return (
    <Animated.View style={[s.actBar, anim]}>
      {actions.map((a, i) => (
        <TouchableOpacity
          key={i}
          style={[s.actBarBtn, i > 0 && s.actBarBtnSecondary]}
          onPress={() => onAction?.(a)}
          activeOpacity={0.7}
        >
          <Text style={[s.actBarText, i > 0 && s.actBarTextSecondary]}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
});

/* -- Thinking -- */
const Thinking = React.memo(function Thinking({ index, total }: { index: number; total: number }) {
  const { s } = useChatStyles();
  const d1 = useSharedValue(0.3);
  const d2 = useSharedValue(0.3);
  const d3 = useSharedValue(0.3);
  const animate = (v: SharedValue<number>, delay: number) => {
    setTimeout(() => {
      v.value = withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1, true,
      );
    }, delay);
  };
  useEffect(() => {
    animate(d1, 0);
    animate(d2, 200);
    animate(d3, 400);
  }, []);
  const s1 = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ scale: d1.value }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ scale: d2.value }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value, transform: [{ scale: d3.value }] }));
  return (
    <View style={s.tRow}>
      <View style={s.tBubble}>
        <View style={s.tDots}>
          <Animated.View style={[s.dot, s1]} />
          <Animated.View style={[s.dot, s2]} />
          <Animated.View style={[s.dot, s3]} />
        </View>
        <Text style={s.tText}>
          {total > 0 ? `Motéma réfléchit (${index + 1}/${total})` : 'Motéma réfléchit...'}
        </Text>
      </View>
    </View>
  );
});

export default function IA() {
  const { s, colors: C, ACCENT, isDark } = useChatStyles();
  const insets = useSafeAreaInsets();
  const [userState, setUserState] = useState<any>(null);
  const [messages, setMessages] = useState<RichMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [isBriefing, setIsBriefing] = useState(false);
  const [briefingIndex, setBriefingIndex] = useState(0);
  const [briefingCount, setBriefingCount] = useState(0);
  const [progressStep, setProgressStep] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [iaPeriod, setIaPeriod] = useState(() => {
    const m = new Date().getMonth() + 1;
    const a = new Date().getFullYear();
    return { mois: m, annee: a, debut: `${a}-${String(m).padStart(2, '0')}-01`, fin: new Date(a, m, 0).toISOString().split('T')[0] };
  });
  const [iaPeriodType, setIaPeriodType] = useState('mensuel');
  const flatRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastVisitRef = useRef<string | null>(null);
  const lastTopicRef = useRef<string | null>(null);
  const briefingDataRef = useRef<BriefingData | null>(null);
  const cacheRef = useRef<{ resume: any; budgets: any[]; goals: any[] } | null>(null);
  const lastIntentRef = useRef<{ intent: string; params: Record<string, any> } | null>(null);
  const sendMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
  const firstPeriodChangeRef = useRef(true);
  const userRef = useRef<any>(null);
  const lastPriorityIdsRef = useRef<string[] | undefined>(undefined);
  const visitCountRef = useRef(0);

  const scrollToEnd = useCallback((delay = 80) => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), delay);
  }, []);

  const startSmartBriefing = useCallback((briefing: RichMessage[]) => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    setIsBriefing(true);
    setIsThinking(false);
    setBriefingCount(briefing.length);
    setBriefingIndex(0);
    setMessages([briefing[0]]);

    const scheduleNext = (idx: number) => {
      if (idx >= briefing.length) {
        setIsBriefing(false);
        setIsThinking(false);
        return;
      }
      setIsThinking(true);
      scrollToEnd(50);
      const t1 = setTimeout(() => {
        setMessages(prev => [...prev, briefing[idx]]);
        setBriefingIndex(idx);
        setIsThinking(false);
        scrollToEnd(50);
        const t2 = setTimeout(() => scheduleNext(idx + 1), 500);
        timers.push(t2);
      }, 800);
      timers.push(t1);
    };
    const initialDelay = setTimeout(() => scheduleNext(1), 500);
    timers.push(initialDelay);
    timerRef.current = timers;
  }, [scrollToEnd]);

  const refreshSuggestions = useCallback(async () => {
    try {
      const [resume, budgets, goals] = await Promise.all([
        api.stats.resume({ debut: iaPeriod.debut, fin: iaPeriod.fin }).catch(() => null),
        api.budgets.list({ debut: iaPeriod.debut, fin: iaPeriod.fin }).catch(() => []),
        api.objectifs.list().catch(() => []),
      ]);
      cacheRef.current = { resume, budgets: Array.isArray(budgets) ? budgets : [], goals: Array.isArray(goals) ? goals : [] };
      const fresh = generateSuggestions(cacheRef.current.resume, cacheRef.current.budgets, cacheRef.current.goals, []);
      setSuggestions(fresh);
    } catch { /* suggestions restent inchangées */ }
  }, [iaPeriod]);

  const formatTime = useCallback((d: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}h${mm}`;
  }, []);

  const clearConversation = useCallback(async () => {
    setMessages([]);
    setInputText('');
    setConversationStarted(false);
    setIsThinking(false);
    setIsBriefing(false);
    setBriefingIndex(0);
    setBriefingCount(0);
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    const user = getUser();
    const prenom = user?.prenom || '';
    const visitCount = await loadVisitCount();
    const isNew = visitCount < 2;
    const text = isNew
      ? `Bonjour ${prenom} ! 👋 Je suis Motéma, votre assistant financier. Bienvenue dans MBONGO ! Je suis là pour vous aider à gérer votre argent, suivre vos dépenses et atteindre vos objectifs. N'hésitez pas à me poser des questions, je vous guiderai pas à pas.`
      : `${getGreeting()} ${prenom} ! 👋\n\nJe suis Motéma, votre conseiller financier. Posez-moi une question pour commencer !`;
    const actions = isNew
      ? [
          { label: '📝 Comment ajouter une dépense ?', action: 'Comment ajouter une dépense ?' },
          { label: '🎯 Comment créer un objectif ?', action: 'Comment créer un objectif ?' },
          { label: '🤖 Présente-toi', action: 'Présente-toi' },
        ]
      : [
          { label: '📊 Analyser mes finances', action: 'analyse' },
          { label: '📊 Voir mon budget', route: 'budget' },
        ];
    const welcome: RichMessage = {
      id: `welcome-${Date.now()}`,
      sender: 'motema',
      blocks: [
        { type: 'bienvenue', data: { text } },
        { type: 'actions', data: { actions } },
      ],
      timestamp: new Date(),
    };
    setMessages([welcome]);
    refreshSuggestions();
  }, [refreshSuggestions]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking || analysing || isBriefing) return;
    setInputText('');
    setConversationStarted(true);
    const userMsg: RichMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      blocks: [{ type: 'text', data: { text: trimmed } }],
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    scrollToEnd();
    try {
      const { intent, parameters } = analyzeIntent(trimmed);
      const detectedType = parameters.periodeType || iaPeriodType;
      let debut = iaPeriod.debut;
      let fin = iaPeriod.fin;
      if (detectedType !== iaPeriodType) {
        const p = computePeriodForType(detectedType);
        debut = p.debut;
        fin = p.fin;
      }
      const paramsWithPeriod = { ...parameters, debut, fin, periodeType: detectedType };
      lastIntentRef.current = intent !== 'unknown' ? { intent, params: paramsWithPeriod } : null;
      const blocks = await buildIntentResponse(intent, paramsWithPeriod, lastIntentRef.current);
      const reply: RichMessage = {
        id: `motema-${Date.now()}`,
        sender: 'motema',
        blocks,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, reply]);
      setIsThinking(false);
      refreshSuggestions();
    } catch {
      setIsThinking(false);
      const fallback: RichMessage = {
        id: `motema-${Date.now()}`,
        sender: 'motema',
        blocks: [{ type: 'text', data: { text: 'Désolà, je n\'ai pas pu traiter votre demande. Réessayez dans un instant.' } }],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallback]);
    }
    scrollToEnd(100);
  }, [isThinking, analysing, isBriefing, iaPeriod, scrollToEnd, refreshSuggestions]);

  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const handleAction = useCallback((action: BlockAction) => {
    if (action.route) {
      router.push(`/${action.route}` as any);
    } else if (action.text) {
      sendMessageRef.current?.(action.text);
    } else if (action.action) {
      setConversationStarted(true);
      setIsThinking(true);
      const params = { ...(action.params || {}), debut: iaPeriod.debut, fin: iaPeriod.fin, periodeType: iaPeriodType };
      buildIntentResponse(action.action, params, lastIntentRef.current).then(blocks => {
        setIsThinking(false);
        const reply: RichMessage = {
          id: `motema-${Date.now()}`,
          sender: 'motema',
          blocks,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, reply]);
        refreshSuggestions();
      }).catch(() => {
        setIsThinking(false);
      });
    }
  }, [refreshSuggestions, iaPeriod]);

  const startBriefing = useCallback((user: any, lastVisit: string | null, lastTopic: string | null, greeting: string, data: BriefingData) => {
    const briefing = createBriefing(user, lastVisit, lastTopic, greeting, data);
    const timers: ReturnType<typeof setTimeout>[] = [];

    setIsBriefing(true);
    setIsThinking(false);
    setBriefingCount(briefing.length);
    setBriefingIndex(0);
    setMessages([briefing[0]]);

    const scheduleNext = (idx: number) => {
      if (idx >= briefing.length) {
        setIsBriefing(false);
        setIsThinking(false);
        return;
      }

      setIsThinking(true);
      scrollToEnd(50);

      const t1 = setTimeout(() => {
        setMessages(prev => [...prev, briefing[idx]]);
        setBriefingIndex(idx);
        setIsThinking(false);
        scrollToEnd(50);

        const t2 = setTimeout(() => scheduleNext(idx + 1), 500);
        timers.push(t2);
      }, 800);
      timers.push(t1);
    };

    const initialDelay = setTimeout(() => scheduleNext(1), 500);
    timers.push(initialDelay);

    timerRef.current = timers;
  }, [scrollToEnd]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => timerRef.current.forEach(clearTimeout);
  }, []);

  // Navigation entre périodes : message d'accueil + re-briefing Motéma
  useEffect(() => {
    if (firstPeriodChangeRef.current) {
      firstPeriodChangeRef.current = false;
      return;
    }

    const now = new Date();
    const { debut, fin, mois, annee } = iaPeriod;
    const isCurrent = mois === now.getMonth() + 1 && annee === now.getFullYear();
    const joursDansMois = new Date(annee, mois, 0).getDate();
    const jourActuel = now.getDate();
    const isNewMonth = iaPeriodType === 'mensuel' && isCurrent && jourActuel <= 5;
    const nomMois = new Date(annee, mois - 1).toLocaleDateString('fr-FR', { month: 'long' });

    setInputText('');
    setConversationStarted(false);
    setIsThinking(false);
    setIsBriefing(false);
    setBriefingIndex(0);
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];

    if (isNewMonth) {
      setMessages([{
        id: `period-welcome-${Date.now()}`,
        sender: 'motema',
        blocks: [
          { type: 'text', data: { text: `🌱 **Bienvenue dans le mois de ${nomMois} !**\n\nLe mois vient de commencer (jour ${jourActuel}/${joursDansMois}). Laissez-moi analyser vos finances rapidement pour vous donner une vision claire de votre situation.` } },
        ],
        timestamp: new Date(),
      }]);
      setTimeout(() => sendMessageRef.current?.('Analyse mes finances'), 1200);
    } else if (iaPeriodType === 'quotidien') {
      const dateStr = new Date(debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const isToday = debut === todayStr;
      if (isToday) {
        setMessages([{
          id: `period-welcome-${Date.now()}`,
          sender: 'motema',
          blocks: [
            { type: 'text', data: { text: `📊 **Aujourd'hui, ${dateStr}.**\n\nQue voulez-vous analyser pour cette journée ?` } },
            { type: 'actions', data: { actions: [
              { label: '📊 Analyser ma journée', action: 'analyse' },
              { label: '📋 Voir mes dépenses', route: 'depenses' },
              { label: '📊 Voir mon budget', route: 'budget' },
            ] } },
          ],
          timestamp: new Date(),
        }]);
      } else {
        setMessages([{
          id: `period-welcome-${Date.now()}`,
          sender: 'motema',
          blocks: [
            { type: 'text', data: { text: `📁 **${dateStr} (journée terminée)**\n\nJe peux analyser cette journée ou la comparer avec hier.` } },
            { type: 'actions', data: { actions: [
              { label: '📊 Analyser cette journée', action: 'analyse' },
              { label: '📊 Comparer avec hier', type: 'message', text: 'Compare mes finances avec le jour précédent' },
              { label: '📋 Voir les dépenses', route: 'depenses' },
            ] } },
          ],
          timestamp: new Date(),
        }]);
      }
    } else if (iaPeriodType === 'hebdomadaire') {
      const d = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const getMonday = (date: Date) => { const r = new Date(date); r.setDate(r.getDate() - ((r.getDay() || 7) - 1)); return r; };
      const thisMon = getMonday(now);
      const isThisWeek = debut === fmt(thisMon);
      if (isThisWeek) {
        setMessages([{
          id: `period-welcome-${Date.now()}`,
          sender: 'motema',
          blocks: [
            { type: 'text', data: { text: `📊 **Cette semaine (${d(debut)} au ${d(fin)}).**\n\nQue voulez-vous analyser ?` } },
            { type: 'actions', data: { actions: [
              { label: '📊 Analyser ma semaine', action: 'analyse' },
              { label: '📋 Voir mes dépenses', route: 'depenses' },
              { label: '📊 Voir mon budget', route: 'budget' },
            ] } },
          ],
          timestamp: new Date(),
        }]);
      } else {
        setMessages([{
          id: `period-welcome-${Date.now()}`,
          sender: 'motema',
          blocks: [
            { type: 'text', data: { text: `📁 **Semaine du ${d(debut)} au ${d(fin)} (terminée)**\n\nJe peux analyser cette semaine ou la comparer avec la semaine en cours.` } },
            { type: 'actions', data: { actions: [
              { label: '📊 Analyser cette semaine', action: 'analyse' },
              { label: '📊 Comparer avec cette semaine', type: 'message', text: 'Compare mes finances avec la semaine précédente' },
              { label: '📋 Voir les dépenses', route: 'depenses' },
            ] } },
          ],
          timestamp: new Date(),
        }]);
      }
    } else if (isCurrent) {
      setMessages([{
        id: `period-welcome-${Date.now()}`,
        sender: 'motema',
        blocks: [
          { type: 'text', data: { text: `📊 **Nous sommes en ${nomMois} ${annee}.**\n\nQue voulez-vous faire ?` } },
          { type: 'actions', data: { actions: [
            { label: '📊 Analyser mes finances', action: 'analyse' },
            { label: '📊 Voir mon budget', route: 'budget' },
            { label: '📋 Voir mes dépenses', route: 'depenses' },
          ] } },
        ],
        timestamp: new Date(),
      }]);
    } else {
      setMessages([{
        id: `period-welcome-${Date.now()}`,
        sender: 'motema',
        blocks: [
          { type: 'text', data: { text: `📁 **${nomMois} ${annee} (période terminée)**\n\nJe peux analyser cette période ou la comparer avec le mois en cours.` } },
          { type: 'actions', data: { actions: [
            { label: '📊 Analyser cette période', action: 'analyse' },
            { label: '📊 Comparer avec le mois en cours', type: 'message', text: 'Compare mes finances avec le mois précédent' },
            { label: '📋 Voir les dépenses', route: 'depenses' },
          ] } },
        ],
        timestamp: new Date(),
      }]);
    }

    refreshSuggestions();

    // Re-lancer le briefing complet Motéma pour la nouvelle période
    (async () => {
      try {
        const context: AnalysisContext = {
          userName: userRef.current?.prenom || 'Utilisateur',
          lastVisit: lastVisitRef.current,
          lastPriorityIds: lastPriorityIdsRef.current,
          visitCount: visitCountRef.current,
          isNewUser: visitCountRef.current === 0,
          debut,
          fin,
          periodeType: iaPeriodType,
        };
        const brief = await getMotemaBriefing(context);
        briefingDataRef.current = brief as any;
      } catch { /* briefing silencieux en arrière-plan */ }
    })();
  }, [iaPeriod, refreshSuggestions, iaPeriodType]);

  // Initialisation au montage : charger l'utilisateur, lancer Motéma, afficher le briefing
  useEffect(() => {
    (async () => {
      try {
        const user = getUser();
        const lastVisit = await loadLastVisit();
        const lastPriorityIds = await loadLastPriorityIds();
        const visitCount = await loadVisitCount();

        userRef.current = user;
        lastVisitRef.current = lastVisit;
        lastPriorityIdsRef.current = lastPriorityIds;
        visitCountRef.current = visitCount;

        const context: AnalysisContext = {
          userName: user?.prenom || 'Utilisateur',
          lastVisit,
          lastPriorityIds,
          visitCount,
          isNewUser: visitCount === 0,
          debut: iaPeriod.debut,
          fin: iaPeriod.fin,
          periodeType: iaPeriodType,
        };

        const brief = await getMotemaBriefing(context);
        const briefingMsgs = createSmartBriefing(
          { userName: user?.prenom, lastVisit, periodeType: iaPeriodType, isNewUser: visitCount === 0 },
          brief,
        );

        startSmartBriefing(briefingMsgs);
        refreshSuggestions();

        await saveLastVisit(new Date().toISOString());
        await saveVisitCount(visitCount + 1);
        if (brief.topPriorities.length > 0) {
          await saveLastPriorityIds(brief.topPriorities.map(p => p.id));
        }
      } catch {
        // Fallback : message d'accueil simple
        const fallbackUser = getUser();
        const fallbackPrenom = fallbackUser?.prenom || '';
        const fallback: RichMessage = {
          id: 'welcome-fallback',
          sender: 'motema',
          blocks: [
            { type: 'bienvenue', data: { text: `${getGreeting()} ${fallbackPrenom} ! 👋\n\nJe suis Motéma, votre conseiller financier. Posez-moi une question pour commencer !` } },
            { type: 'actions', data: { actions: [{ label: '📊 Analyser mes finances', action: 'analyse' }, { label: '📊 Voir mon budget', route: 'budget' }] } },
          ],
          timestamp: new Date(),
        };
        setMessages([fallback]);
        setIsBriefing(false);
        setIsThinking(false);
        refreshSuggestions();
      }
    })();
  }, []);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'android' ? insets.top : 0}
    >
      <StatusBar style="light" />

      {/* Fixed Header */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <View style={s.headerRing1} />
        <View style={s.headerRing2} />
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>🤖 Motema</Text>
          <Text style={s.headerSub}>Conseiller financier personnel</Text>
          <View style={{ marginTop: 6, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, paddingHorizontal: 4, paddingVertical: 2 }}>
            <PeriodSelector
              selectedMonth={iaPeriod.mois}
              selectedYear={iaPeriod.annee}
              onChange={(mo, yr) => setIaPeriod({ mois: mo, annee: yr, debut: `${yr}-${String(mo).padStart(2, '0')}-01`, fin: new Date(yr, mo, 0).toISOString().split('T')[0] })}
              periodType={iaPeriodType}
              onTypeChange={setIaPeriodType}
              selectedDate={iaPeriod.debut}
              onChangeDate={(d) => {
                const y = d.getFullYear();
                const m = d.getMonth() + 1;
                const day = d.getDate();
                if (iaPeriodType === 'hebdomadaire') {
                  const lundi = new Date(d); lundi.setDate(d.getDate() - d.getDay() + 1);
                  const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
                  setIaPeriod({ debut: lundi.toISOString().split('T')[0], fin: dimanche.toISOString().split('T')[0], mois: m, annee: y });
                } else {
                  setIaPeriod({ debut: d.toISOString().split('T')[0], fin: d.toISOString().split('T')[0], mois: m, annee: y });
                }
              }}
              showCurrentMonthOption={false}
              triggerColor="#1D1D2B"
            />
          </View>
        </View>
        <TouchableOpacity onPress={clearConversation} style={s.headerBtn} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={s.listPad}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <MessageBubbles msg={item} formatTime={formatTime} onAction={handleAction} />}
        ListHeaderComponent={conversationStarted ? (
          <View style={s.discussionHeader}>
            <View style={s.discussionLine} />
            <Text style={s.discussionLabel}>💬 Discussion</Text>
            <View style={s.discussionLine} />
          </View>
        ) : <View />}
        ListFooterComponent={
          isThinking ? <Thinking index={briefingIndex} total={briefingCount} /> : null
        }
        extraData={[isThinking, conversationStarted]}
      />

      {/* Input Bar */}
      <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
        {!isBriefing && (
          <View style={s.inputBanner}>
            <Text style={s.inputBannerIcon}>💡</Text>
            <Text style={s.inputBannerText}>Discutez avec Motema</Text>
          </View>
        )}
        <View style={s.inputRow}>
          <TextInput
            style={[s.input, isBriefing && s.inputDisabled, inputFocused && s.inputFocused]}
            placeholder="Posez une question a Motema..."
            placeholderTextColor={C.hint}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage(inputText)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            multiline
            maxLength={500}
            editable={!isBriefing}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!inputText.trim() || isThinking || analysing || isBriefing) && s.sendBtnDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isThinking || analysing || isBriefing}
            activeOpacity={0.8}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() && !isThinking && !analysing && !isBriefing ? C.white : C.muted}
            />
          </TouchableOpacity>
        </View>
        {!isBriefing && <SuggestionsChips suggestions={suggestions} onSelect={sendMessage} />}
      </View>

      {/* Progress Overlay */}
      <Modal visible={analysing} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={s.progressTitle}>Motema analyse vos finances</Text>
            </View>
            <Text style={s.progressSub}>Veuillez patienter pendant l'analyse...</Text>
            <View style={s.stepsWrap}>
              {PROGRESS_STEPS.map((step, i) => {
                const done = i < progressStep;
                const current = i === progressStep;
                return (
                  <View key={step.key} style={[s.stepRow, current && s.stepRowCurrent]}>
                    <View style={[s.stepDot, done && s.stepDotDone, current && s.stepDotCurrent]}>
                      {done ? (
                        <Ionicons name="checkmark" size={12} color={C.white} />
                      ) : current ? (
                        <ActivityIndicator size="small" color={ACCENT} />
                      ) : (
                        <Text style={s.stepDotEmpty}>{step.ico}</Text>
                      )}
                    </View>
                    <Text style={[s.stepLabel, done && s.stepLabelDone, current && s.stepLabelCurrent]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

