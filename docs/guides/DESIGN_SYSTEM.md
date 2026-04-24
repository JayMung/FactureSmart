# Design System - FactureSmart

## 🎨 Vue d'ensemble

Ce design system utilise **shadcn/ui**, **Tailwind CSS** et la police **Inter** pour créer une interface cohérente avec un thème light par défaut (blanc dominant + accents verts émeraude) et support du dark mode.

---

## 🎯 Configuration

### Tailwind Config
Les tokens de design sont définis dans `tailwind.config.ts` :
- **Police** : Inter (Google Fonts)
- **Couleurs** : Blanc, verts émeraude, gris
- **Espacements** : Scale de 4px
- **Ombres** : sm, md, lg, xl
- **Border radius** : 0.25rem à 0.5rem

### Globals CSS
Variables CSS et police Inter importées dans `src/globals.css`

---

## 🎨 Palette de couleurs

### Light Mode (défaut)
- **Background** : Blanc (#FFFFFF)
- **Primary** : Vert émeraude (#10B981)
- **Text** : Gris foncé (#111827)

### Dark Mode
- **Background** : Gris très foncé (#111827)
- **Primary** : Vert émeraude (#10B981)
- **Text** : Blanc (#F9FAFB)

### Couleurs additionnelles
```css
green-50: #F0FDF4
green-100: #DCFCE7
green-500: #10B981  // Primary
green-600: #059669  // Primary hover
green-700: #047857
green-900: #065F46

gray-50: #F9FAFB
gray-100: #F3F4F6
gray-300: #D1D5DB
gray-500: #6B7280
gray-700: #374151
gray-900: #111827
```

---

## 📝 Typographie

Utilise la police **Inter** partout via `font-sans`.

### Hiérarchie

```tsx
// H1 - Titres principaux
<h1 className="text-3xl md:text-4xl font-bold leading-tight text-gray-900 dark:text-white">
  Titre principal
</h1>

// H2 - Sous-titres
<h2 className="text-2xl md:text-3xl font-semibold leading-snug text-gray-900 dark:text-white">
  Sous-titre
</h2>

// H3 - Sections
<h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
  Section
</h3>

// Body - Texte courant
<p className="text-base md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
  Texte de paragraphe
</p>

// Small - Annotations
<span className="text-sm text-gray-500 dark:text-gray-400">
  Petit texte
</span>
```

---

## 🧩 Composants

### Buttons

```tsx
// Primary Button (vert)
<Button className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium shadow-md hover:shadow-lg">
  Action principale
</Button>

// Secondary Button
<Button variant="outline" className="border-gray-300 hover:bg-gray-50 text-gray-700">
  Action secondaire
</Button>

// Destructive Button
<Button variant="destructive">
  Supprimer
</Button>
```

### Cards

```tsx
<Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg rounded-lg">
  <CardHeader className="p-6">
    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
      Titre de la carte
    </CardTitle>
    <CardDescription className="text-sm text-gray-700 dark:text-gray-300">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent className="p-6 pt-0">
    Contenu de la carte
  </CardContent>
</Card>
```

### Inputs

```tsx
<div className="space-y-2">
  <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
    Label
  </Label>
  <Input 
    className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-md bg-white dark:bg-gray-800"
    placeholder="Entrez une valeur"
  />
</div>
```

---

## 📐 Espacements

Utilise une scale de **4px** :

```tsx
// Padding
p-4   // 1rem (16px)
p-6   // 1.5rem (24px)
p-8   // 2rem (32px)

// Gap
gap-2  // 0.5rem (8px)
gap-4  // 1rem (16px)
gap-6  // 1.5rem (24px)

// Margin
mt-4  // 1rem
mb-6  // 1.5rem
```

---

## 🎭 Ombres

```tsx
shadow-sm      // Légère
shadow-md      // Moyenne (défaut cards)
shadow-lg      // Grande (hover state)
shadow-xl      // Extra large
```

---

## 📱 Responsive

Utilise les breakpoints Tailwind avec préfixes `sm:` et `md:` :

```tsx
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-2xl sm:text-3xl md:text-4xl">
    Titre responsive
  </h1>
</div>
```

---

## ♿ Accessibilité

### Focus rings
Tous les éléments interactifs ont des focus rings verts :

```tsx
focus:ring-2 focus:ring-green-500 focus:ring-offset-2
```

### Contraste
- Light mode : minimum WCAG AA
- Dark mode : minimum WCAG AA

### ARIA labels
Toujours ajouter des labels pour les boutons d'icônes :

```tsx
<button aria-label="Fermer le menu">
  <X className="w-5 h-5" />
</button>
```

---

## 🌙 Dark Mode

Activé via la classe `dark` sur l'élément `<html>` (géré par `next-themes`).

### Utilisation dans les composants

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Contenu avec support dark mode
</div>
```

---

## 🚀 Utilisation

### 1. Importer les styles
Assurez-vous que `src/globals.css` est importé dans votre `main.tsx` ou `App.tsx`.

### 2. Tester la page exemple
```bash
npm run dev
```

Naviguez vers `/login-example` pour voir le design system en action.

### 3. Créer de nouveaux composants
Utilisez les tokens définis dans `tailwind.config.ts` et suivez les patterns de `LoginExample.tsx`.

---

## 📦 Composants shadcn/ui disponibles

Le projet inclut déjà :
- Button, Input, Label
- Card, Dialog, Dropdown Menu
- Select, Switch, Tabs
- Toast, Tooltip
- Et plus...

Tous héritent automatiquement du design system.

---

## 🎯 Best Practices

1. **Toujours utiliser les tokens** : Préférez `bg-green-500` à `bg-[#10B981]`
2. **Mobile-first** : Commencez sans préfixe, ajoutez `md:` pour desktop
3. **Dark mode systématique** : Ajoutez toujours `dark:` pour chaque classe de couleur
4. **Espacements cohérents** : Utilisez la scale 4px (p-4, gap-6, etc.)
5. **Ombres sur hover** : `shadow-md hover:shadow-lg` pour les cards/boutons
6. **Focus visible** : Toujours inclure `focus:ring-green-500`

---

## 🔧 Commandes utiles

```bash
# Lancer le dev server
npm run dev

# Build de production
npm run build

# Lint
npm run lint
```

---

✨ **Design system prêt à l'emploi !**
