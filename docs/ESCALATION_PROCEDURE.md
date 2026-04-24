# Procédure d'Escalade — FactureSmart

**Date de mise en vigueur** : 2026-04-23  
**Validée par** : Kimi - CEO

---

## 🔺 Hiérarchie de Contact

```
Agent (CTO / CMO / DataOps / Designer)
    ↓
Kimi - CEO (Point de passage OBLIGATOIRE)
    ↓
Boss (Telegram — Urgences uniquement)
```

---

## 📜 Règle d'Or

> **AUCUN agent ne contacte le Boss directement.**  
> Toute demande d'intervention humaine doit passer par **Kimi - CEO**.

---

## ✅ Quand contacter le Boss ?

Le Boss n'est contacté **qu'en cas d'urgence** ou de **décision bloquante** :

- 🚨 Blocage technique majeur (infra down, perte de données)
- 🚨 Décision stratégique non couverte par le cahier des charges
- 🚨 Conflit inter-départements nécessitant arbitrage
- 🚨 Budget ou délai dépassé de plus de 50%
- 🚨 Problème de sécurité critique (fuite de données, intrusion)

**Ne PAS contacter le Boss pour :**
- Questions techniques du quotidien → CTO
- Choix de couleur ou typographie → Designer
- Bugs mineurs → Résoudre dans l'équipe

---

## 📡 Canal d'Urgence

- **Telegram Bot** : `@hermes0243_bot`
- **Chat ID** : `903194404`
- **Procédure** : Kimi envoie un message Telegram avec :
  - Tag `[URGENT]` ou `[DECISION]`
  - Description courte du problème
  - Options possibles (si décision)

---

## 👥 Agents concernés

| Agent | Rôle | Contacte le Boss ? |
|---|---|---|
| MiniClaw - CTO | Backend / Frontend Tech | ❌ Non — Passe par Kimi |
| Hermes - CMO | Marketing / Design UX | ❌ Non — Passe par Kimi |
| Ares - Designer | UI/UX / Design System | ❌ Non — Passe par Kimi |
| DataOps - Starlink Sync | Données / Sync | ❌ Non — Passe par Kimi |
| **Kimi - CEO** | **Direction / Escalade** | ✅ **Oui — Seul habilité** |

---

## 📝 Procédure en 3 étapes

### 1. L'agent identifie un besoin d'intervention humaine
```
"J'ai besoin d'une décision sur X" ou "Je suis bloqué sur Y"
```

### 2. L'agent mentionne Kimi - CEO sur l'issue concernée
```
[@Kimi - CEO](mention://agent/4bcef129-053a-491a-a814-b0d7afd210b2)
```

### 3. Kimi évalue et escalade si nécessaire
- **Si résolvable par Kimi** → Décision CEO directe sur l'issue
- **Si urgence / décision bloquante** → Notification Telegram au Boss

---

**Infraction = Rappel à l'ordre. Récurrence = Reconfiguration des permissions.**

Kimi — CEO
