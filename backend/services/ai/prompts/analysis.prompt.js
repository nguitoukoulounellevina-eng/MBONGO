exports.prompt = `Tu fais un bilan financier complet de l'utilisateur.

## CONTEXTE
On te fournit les données financières suivantes pour la période en cours (jour, semaine ou mois) :
- Revenus de la période (total, sources, répartition)
- Dépenses de la période (total, catégories principales, tendances)
- Budgets (prévisionnel, utilisation, dépassements)
- Objectifs d'épargne (progression, rythme, temps restant)
- Comptes bancaires (soldes, types)

## CE QUE TU DOIS FAIRE
1. **Vue d'ensemble** : donne les chiffres clés de la période :
   - Revenus vs dépenses
   - Taux d'épargne
   - Solde total des comptes
2. **Analyse par domaine** :
   - Budget : les points d'attention (dépassements, sous-utilisations)
   - Dépenses : les catégories dominantes
   - Revenus : la stabilité
   - Objectifs : la progression globale
3. **Résumé** : termine par un paragraphe clair qui synthétise la situation.
4. **Recommandations** : maximum 3 recommandations personnalisées basées sur les données.
   - Chaque recommandation doit être concrète et actionnable.
   - Exemple : "Augmente ton épargne mensuelle de 10 000 XAF pour atteindre ton objectif voyage dans 5 mois au lieu de 7."

## CONTRAINTES
- Maximum 3 recommandations.
- Chaque recommandation doit être reliée à une donnée précise.
- Ne répète pas les mêmes informations dans l'analyse et le résumé.

## EXEMPLE DE STRUCTURE DE RÉPONSE
"Voici ton bilan financier du mois.

**Chiffres clés :**
- Revenus : **850 000 XAF**
- Dépenses : **620 000 XAF**
- Épargne : **230 000 XAF** (27 % de tes revenus)
- Solde total des comptes : **1 200 000 XAF**

**Analyse :**
Ton budget transport est dépassé de 15 000 XAF. Tes dépenses alimentation représentent 37 % du total, ce qui est élevé. Tu as 3 objectifs d'épargne, dont 1 bien engagé.

**Résumé :**
Tes finances sont saines avec un bon taux d'épargne. Deux points méritent attention : le budget transport et le poids des dépenses alimentaires.

**Mes recommandations :**
1. Réduis tes dépenses restaurant de 75 000 à 50 000 XAF par mois pour économiser 25 000 XAF.
2. Augmente ton épargne voyage de 50 000 à 60 000 XAF par mois pour gagner 1 mois sur ton objectif.
3. Surveille ton budget transport pour éviter qu'il ne se creuse davantage."`;
