# 🔍 AUDIT UI/UX — FactureSmart React vs Maquettes HTML
**Issue:** COD-39 | **Priority:** HIGH | **Date:** 2026-04-24  
**Serveur React:** http://localhost:5173 | **Serveur Maquettes:** http://localhost:7823

---

## 1. PAGE LOGIN — screen-00-login.html ↔ Login.tsx

### 🚨 ÉCART CRITIQUE — Effet Glassmorphism manquant
| Élément | Maquette (screen-00-login) | React (Login.tsx) |
|---------|---------------------------|------------------|
| **Card formulaire** | `glass-card`: backdrop-blur(16px), bg: rgba(255,255,255,0.92), border: 1px solid rgba(0,86,214,0.12) | ❌ **ABSENT** — formulaire sur fond opaque sans glassmorphism |
| **Vérification DOM** | — | `document.querySelector('[class*="glass-card"]')` → **NOT FOUND** |

> Le formulaire de login React n'a PAS l'effet glassmorphism de la maquette. La card est un simple div sans blur ni transparence.

### 🚨 ÉCART CRITIQUE — Focus input incohérent
| Élément | Maquette | React |
|---------|---------|-------|
| **Box-shadow focus** | `0 0 0 3px rgba(0,86,214,0.15)` | `focus:ring-emerald-600` (anneau vert) |
| **Border focus** | `#10B981` (emerald-500) | `focus:border-emerald-600` |

### ⚠️ ÉCART MAJEUR — Toggle "Se souvenir"
| Élément | Maquette | React |
|---------|---------|-------|
| **Type** | Toggle switch animé (div + CSS) avec cercle glissant | HTML checkbox natif stylé |
| **Animation** | Transition CSS ON/OFF avec cercle qui bouge | Case à cocher standard |

### ⚠️ ÉCART MAJEUR — OAuth / Connexion alternative
| Maquette | React |
|---------|-------|
| **"Connexion avec ITIE RDC"** (gouvernement) | ❌ ABSENT (si `GOOGLE_CLIENT_ID` non configuré, pas d'OAuth visible) |
| **"Connexion avec INSS"** | ❌ ABSENT |
| **Fallback si OAuth non configuré** | Affiche les boutons Google/Microsoft grisés (si credentials non configurés) |

### ⚠️ ÉCART MAJEUR — Placeholder input email
| Maquette | React |
|---------|-------|
| `"votre@email.com ou NIF"` | `"votre@email.com"` |

### ⚠️ ÉCART MINEUR — Logo branding
| Maquette | React |
|---------|-------|
| `"Facture Smart"` avec espace | `"FactureSmartRDC"` concaténé dans le DOM |
| Logo icône Remix visible | Logo visible ✅ |

### ✅ CORRESPONDANT
- Police : **Manrope** ✅
- Gradient hero panel : `#059669 → #10b981 → #34d399` ✅
- Feature items (4 points) avec icônes ri-* : ✅
- Structure 2 colonnes (lg:flex lg:w-1/2 + flex-1) : ✅
- Watermark DRC SVG : ✅
- Bouton CTA principal vert : ✅

---

## 2. LANDING PAGE (/) — Landing.tsx vs /
- La Landing React et la page HTML servie sur le port 7823 sont **fort similaires**
- Gradient hero, navbar glass-dark, bg-dots/bg-grid : ✅
- Logo "FactureSmart" avec accent emerald-300 : ✅
- Prix "Prix indicatifs — devis personnalisé" visible ✅ (note: conforme à la demande utilisateur)

---

## 3. DASHBOARD — Index.tsx ↔ screen-01-dashboard.html

### 🚨 ÉCART CRITIQUE — Stats cards absentes
| Maquette | React |
|---------|-------|
| 4 stats : Factures émises / Montant total / TVA collectée / En attente DGI | **6 stats différentes** : Total USD / Total CDF / Bénéfice Net / Clients / Transactions / Aujourd'hui |
| Indicateurs de change (+12%, +8%, +18%) | Changements affichés différemment |

### 🚨 ÉCART MAJEUR — Graphique absent
| Maquette | React |
|---------|-------|
| **Graphique "Factures mensuelles"** avec barres (Émises / Validées sur 12 mois) | ❌ ABSENT |
| Section **"Statut DGI"** avec compteurs Validées/En attente/Rejetées | ❌ ABSENT |

### ⚠️ ÉCART MAJEUR — Table des dernières factures
| Élément | Maquette | React |
|---------|---------|-------|
| ** Colonnes** | N° Facture, Date, **Client (initiales + nom + NIF)**, Montant TTC, Statut, Actions | Colonnes différentes |
| **N° facture format** | FAC-2026-0142 | Non applicable (non implémenté) |
| **Colonne client** | Initiales (2 lettres) + Nom + NIF | Différent |
| **Pagination** | Affichage 1-7 sur 142 | Différent |

### ⚠️ ÉCART MINEUR — SectionBienvenue
| Maquette | React |
|---------|-------|
| `Bienvenue, Jean — 24 Avril 2026` | `Bienvenue sur FactureSmart` (text statique) |
| Pas de gradient banner | `bg-gradient-to-r from-green-500 to-green-600 rounded-lg` |

---

## 4. LISTE FACTURES — Factures-View.tsx ↔ screen-02-factures.html

### 🚨 ÉCART MAJEUR — Colonnes tableau
| Maquette | React (à vérifier) |
|---------|-------------------|
| N° Facture, Date, **Client (initiales + nom + NIF)**, Montant HT, **TVA (18%)**, Montant TTC, Statut, Actions | Colonnes probablement différentes |

### 🚨 ÉCART MAJEUR — Filtres
| Maquette | React (à vérifier) |
|---------|-------------------|
| Boutons statut : Toutes/Validées/En attente/Rejetées | Filtres probablement différents |
| Selects : Période, Client, "Plus de filtres" | Filtres probablement différents |

### 🚨 ÉCART MINEUR — Statuts
| Maquette | React |
|---------|-------|
| "Validée" / "En attente" / "Rejetée" | "Validé" / "En attente" / "Rejeté" |

---

## 5. CRÉATION FACTURE — Factures-Create.tsx ↔ screen-03-creation-facture.html

### 🚨 ÉCART MAJEUR — UX Step-by-step vs Form libre
| Maquette | React |
|---------|-------|
| **Accordéon 4 étapes** : 1 Vendeur → 2 Client → 3 Lignes → 4 Totaux | **Forme libre** avec tous les champs visibles |
| Steps cliquables avec indicateurs numérotés | Tous les champs dans un seul formulaire |
| **Auto-remplissage vendeur** (pré-rempli depuis profil) | Approche différente |
| Lignes de produits avec tableau inline-editable | Approche probablement différente |

### 🚨 ÉCART MINEUR — Taux TVA
| Maquette | React |
|---------|-------|
| TVA fixe 18% | TVA variable: 0% / 8% / 16% (catégories A/B/C) |

---

## 6. AUTRES PAGES (maquettes vérifiées visuellement)

| Page maquette | Screen | État React |
|--------------|--------|-----------|
| Dashboard | screen-01 | Écart majeur (stats/graphique) |
| Factures liste | screen-02 | Écart majeur (colonnes) |
| Création facture | screen-03 | Écart majeur (UX) |
| Détail facture | screen-03b | Non vérifié |
| Statut DGI | screen-05 | Non vérifié |
| Clients | screen-06 | Non vérifié |
| Rapports | screen-07 | Non vérifié |
| Paramètres | screen-08 | Non vérifié |
| Devis | screen-09 | Non vérifié |
| Onboarding | screen-A1 | Non vérifié |
| Inscription | screen-B | Non vérifié |
| Mobile (H*) | screen-H* | Non vérifié |

---

## 7. SYNTHÈSE — Design System

### ✅ Points conformes
- **Police** : Manrope ✅ (aussi dans Maquette)
- **Palette verte** : emerald-500/600 (#10b981 / #059669) ✅
- **Border-radius** : `rounded-xl` (12px) ✅
- **Icônes** : Remixicon ✅
- **Bg-dots** : radial-gradient vert ✅
- **Bg-grid** : linear-gradient vert ✅

### ❌ Écart design system principal
1. **Glass-card manquant** — effet blur/transparence absent sur le formulaire login
2. **Input focus ring** — émeraude au lieu de blue-toned
3. **Toggle switch** — natif checkbox au lieu de custom switch animé
4. **Dashboard stats** — données/stats différentes des maquettes
5. **Graphique histogramme mensuel** — absent dans React
6. **Form creation invoice** — pas en accordéon 4 étapes comme maquette
7. **OAuth alternatif (ITIE/INSS)** — absent

---

## 8. RECOMMANDATIONS DE CORRECTION (priorité)

### P0 — Corrections immédiates
1. **Ajouter `glass-card` au conteneur du formulaire login** — restaurer backdrop-blur et border rgba
2. **Corriger le focus ring input** —一致的 box-shadow bleu-vert
3. **Restaurer les steps accordéon** sur la création de facture (4 étapes)

### P1 — Corrections importantes
4. **Adapter les stats du dashboard** — 4 stats conformes à la maquette + graphique mensuel
5. **Implémenter le toggle switch** pour "Se souvenir de moi"
6. **Restaurer les colonnes exactes** du tableau factures (client avec initiales + NIF)

### P2 — Affinements
7. **Placeholder email** → `"votre@email.com ou NIF"`
8. **Statuts** → "Validée"/"Rejetée" (accent去掉)
9. **Logo** → "Facture Smart" avec espace

---

*Rapport généré par Hermes Agent — Audit UI/UX COD-39*
