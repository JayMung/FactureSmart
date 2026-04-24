import { useState } from "react";
import { Search, Download, Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface Account {
  code: string;
  label: string;
  classe: number;
  nature: "Actif" | "Passif" | "Charge" | "Produit";
  type: string;
  solde: number;
  colorClass: string;
}

const allAccounts: Account[] = [
  // Classe 1 — Capitaux propres
  { code: "1011", label: "Capital social", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 500000, colorClass: "border-l-blue-500" },
  { code: "1012", label: "Capital appelé, non versé", classe: 1, nature: "Actif", type: "Capitaux propres", solde: 0, colorClass: "border-l-blue-500" },
  { code: "1021", label: "Apporteurs — capital non amorti", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 0, colorClass: "border-l-blue-500" },
  { code: "1041", label: "Primes liées au capital social", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 0, colorClass: "border-l-blue-500" },
  { code: "1051", label: "Écarts de réévaluation", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 0, colorClass: "border-l-blue-500" },
  { code: "1061", label: "Réserves légales", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 25000, colorClass: "border-l-blue-500" },
  { code: "1062", label: "Réserves statutaires ou contractuelles", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 0, colorClass: "border-l-blue-500" },
  { code: "1063", label: "Réserves réglementées", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 0, colorClass: "border-l-blue-500" },
  { code: "1068", label: "Autres réserves", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 0, colorClass: "border-l-blue-500" },
  { code: "1201", label: "Résultat net de l'exercice", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 124750, colorClass: "border-l-blue-500" },
  { code: "1200", label: "Résultat en instance d'affectation", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 0, colorClass: "border-l-blue-500" },
  { code: "1290", label: "Dividendes à payer", classe: 1, nature: "Passif", type: "Capitaux propres", solde: 0, colorClass: "border-l-blue-500" },

  // Classe 2 — Immobilisations
  { code: "2111", label: "Terrains nus", classe: 2, nature: "Actif", type: "Immobilisations", solde: 0, colorClass: "border-l-green-500" },
  { code: "2112", label: "Terrains bâtis", classe: 2, nature: "Actif", type: "Immobilisations", solde: 0, colorClass: "border-l-green-500" },
  { code: "2121", label: "Bâtiments", classe: 2, nature: "Actif", type: "Immobilisations", solde: 0, colorClass: "border-l-green-500" },
  { code: "2131", label: "Travaux de voirie", classe: 2, nature: "Actif", type: "Immobilisations", solde: 0, colorClass: "border-l-green-500" },
  { code: "2151", label: "Installations techniques", classe: 2, nature: "Actif", type: "Immobilisations", solde: 0, colorClass: "border-l-green-500" },
  { code: "2181", label: "Matériel informatique", classe: 2, nature: "Actif", type: "Immobilisations", solde: 18500, colorClass: "border-l-green-500" },
  { code: "2182", label: "Mobilier de bureau", classe: 2, nature: "Actif", type: "Immobilisations", solde: 7200, colorClass: "border-l-green-500" },
  { code: "2183", label: "Matériel roulant", classe: 2, nature: "Actif", type: "Immobilisations", solde: 35000, colorClass: "border-l-green-500" },
  { code: "2191", label: "Avances et acomptes sur immobilisations", classe: 2, nature: "Actif", type: "Immobilisations", solde: 0, colorClass: "border-l-green-500" },
  { code: "2220", label: "Immobilisations en cours", classe: 2, nature: "Actif", type: "Immobilisations", solde: 0, colorClass: "border-l-green-500" },
  { code: "2451", label: "Participations", classe: 2, nature: "Actif", type: "Immobilisations financières", solde: 0, colorClass: "border-l-green-500" },
  { code: "2461", label: "Prêts", classe: 2, nature: "Actif", type: "Immobilisations financières", solde: 0, colorClass: "border-l-green-500" },
  { code: "2481", label: "Dépôts et cautionnements versés", classe: 2, nature: "Actif", type: "Immobilisations financières", solde: 500, colorClass: "border-l-green-500" },

  // Classe 3 — Stocks
  { code: "3111", label: "Marchandises en stock", classe: 3, nature: "Actif", type: "Stocks", solde: 125000, colorClass: "border-l-yellow-500" },
  { code: "3118", label: "Autres marchandises", classe: 3, nature: "Actif", type: "Stocks", solde: 0, colorClass: "border-l-yellow-500" },
  { code: "3211", label: "Matières premières", classe: 3, nature: "Actif", type: "Stocks", solde: 0, colorClass: "border-l-yellow-500" },
  { code: "3221", label: "Matières consommables", classe: 3, nature: "Actif", type: "Stocks", solde: 0, colorClass: "border-l-yellow-500" },
  { code: "3311", label: "Produits finis", classe: 3, nature: "Actif", type: "Stocks", solde: 0, colorClass: "border-l-yellow-500" },
  { code: "3411", label: "Produits en cours", classe: 3, nature: "Actif", type: "Stocks", solde: 0, colorClass: "border-l-yellow-500" },
  { code: "3511", label: "Encours de services", classe: 3, nature: "Actif", type: "Stocks", solde: 0, colorClass: "border-l-yellow-500" },
  { code: "3701", label: "Stock minimal — alerte", classe: 3, nature: "Actif", type: "Stocks", solde: 0, colorClass: "border-l-yellow-500" },

  // Classe 4 — Tiers (créances et dettes)
  { code: "4011", label: "Fournisseurs — nationaux", classe: 4, nature: "Passif", type: "Dettes tiers", solde: -45200, colorClass: "border-l-purple-500" },
  { code: "4012", label: "Fournisseurs — étranger", classe: 4, nature: "Passif", type: "Dettes tiers", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4081", label: "Fournisseurs — factures non parvenues", classe: 4, nature: "Passif", type: "Dettes tiers", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4111", label: "Clients — facturas en cours", classe: 4, nature: "Actif", type: "Créances tiers", solde: 89450, colorClass: "border-l-purple-500" },
  { code: "4112", label: "Clients — étranger", classe: 4, nature: "Actif", type: "Créances tiers", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4161", label: "Clients — créances douteuses", classe: 4, nature: "Actif", type: "Créances tiers", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4181", label: "Clients — produits à recevoir", classe: 4, nature: "Actif", type: "Créances tiers", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4211", label: "Personnel — rémunérations dues", classe: 4, nature: "Passif", type: "Dettes personnel", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4251", label: " Personnel — avances", classe: 4, nature: "Actif", type: "Créances personnel", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4311", label: "Sécurité sociale", classe: 4, nature: "Passif", type: "Dettes sociales", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4371", label: "Caisse nationale de retraite", classe: 4, nature: "Passif", type: "Dettes sociales", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4381", label: "Organismes sociaux — charges à payer", classe: 4, nature: "Passif", type: "Dettes sociales", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4411", label: "État — TVA due", classe: 4, nature: "Passif", type: "Dettes fiscales", solde: -28152, colorClass: "border-l-purple-500" },
  { code: "4412", label: "État — TVA récupérable", classe: 4, nature: "Actif", type: "Dettes fiscales", solde: 12400, colorClass: "border-l-purple-500" },
  { code: "4452", label: "État — TVA due", classe: 4, nature: "Passif", type: "Dettes fiscales", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4456", label: "État — droits d'accises", classe: 4, nature: "Passif", type: "Dettes fiscales", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4471", label: "État — retenue à la source", classe: 4, nature: "Passif", type: "Dettes fiscales", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4491", label: "État — charges à payer", classe: 4, nature: "Passif", type: "Dettes fiscales", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4611", label: "Dividendes à payer", classe: 4, nature: "Passif", type: "Dettes associées", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4641", label: "Dettes liées à des participations", classe: 4, nature: "Passif", type: "Dettes associées", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4811", label: "Charges constées d'avance", classe: 4, nature: "Actif", type: "Comptes de régularisation", solde: 0, colorClass: "border-l-purple-500" },
  { code: "4861", label: "Produits constés d'avance", classe: 4, nature: "Passif", type: "Comptes de régularisation", solde: 0, colorClass: "border-l-purple-500" },

  // Classe 5 — Disponibilités
  { code: "5211", label: "Banque Rawbank", classe: 5, nature: "Actif", type: "Disponibilités", solde: 234100, colorClass: "border-l-red-500" },
  { code: "5221", label: "Banque TMB", classe: 5, nature: "Actif", type: "Disponibilités", solde: 0, colorClass: "border-l-red-500" },
  { code: "5231", label: "Banque Equity BCDC", classe: 5, nature: "Actif", type: "Disponibilités", solde: 0, colorClass: "border-l-red-500" },
  { code: "5711", label: "Caisse principale", classe: 5, nature: "Actif", type: "Disponibilités", solde: 12450, colorClass: "border-l-red-500" },
  { code: "5712", label: "Caisse annexe", classe: 5, nature: "Actif", type: "Disponibilités", solde: 0, colorClass: "border-l-red-500" },
  { code: "5751", label: "Caisse mobile — recouvrements", classe: 5, nature: "Actif", type: "Disponibilités", solde: 0, colorClass: "border-l-red-500" },
  { code: "5811", label: "Virements internes", classe: 5, nature: "Actif", type: "Virements", solde: 0, colorClass: "border-l-red-500" },

  // Classe 6 — Charges
  { code: "6011", label: "Achats stockés — Marchandises", classe: 6, nature: "Charge", type: "Achats", solde: 87500, colorClass: "border-l-cyan-500" },
  { code: "6021", label: "Achats stockés — Matières premières", classe: 6, nature: "Charge", type: "Achats", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6041", label: "Achats de prestations de services", classe: 6, nature: "Charge", type: "Achats", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6081", label: "Achats de matériaux divers", classe: 6, nature: "Charge", type: "Achats", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6111", label: "Transports", classe: 6, nature: "Charge", type: "Services extérieurs", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6121", label: "Location", classe: 6, nature: "Charge", type: "Services extérieurs", solde: 12000, colorClass: "border-l-cyan-500" },
  { code: "6131", label: "Entretien et réparation", classe: 6, nature: "Charge", type: "Services extérieurs", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6141", label: "Assurances", classe: 6, nature: "Charge", type: "Services extérieurs", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6151", label: "Électricité et énergie", classe: 6, nature: "Charge", type: "Services extérieurs", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6161", label: "Eau", classe: 6, nature: "Charge", type: "Services extérieurs", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6181", label: "Documentation", classe: 6, nature: "Charge", type: "Services extérieurs", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6211", label: "Salaires et appointements", classe: 6, nature: "Charge", type: "Charges de personnel", solde: 96000, colorClass: "border-l-cyan-500" },
  { code: "6221", label: "Charges sociales", classe: 6, nature: "Charge", type: "Charges de personnel", solde: 28800, colorClass: "border-l-cyan-500" },
  { code: "6231", label: "Fournitures de bureau", classe: 6, nature: "Charge", type: "Charges de personnel", solde: 8750, colorClass: "border-l-cyan-500" },
  { code: "6241", label: "Voyages et déplacements", classe: 6, nature: "Charge", type: "Charges de personnel", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6251", label: "Frais de mission", classe: 6, nature: "Charge", type: "Charges de personnel", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6261", label: "Émission de documents de transport", classe: 6, nature: "Charge", type: "Charges de personnel", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6271", label: "Pub, réclame, communication", classe: 6, nature: "Charge", type: "Autres charges", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6281", label: "Frais postaux et frais de télécommunication", classe: 6, nature: "Charge", type: "Autres charges", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6311", label: "Impôts et taxes directs", classe: 6, nature: "Charge", type: "Charges fiscales", solde: 12450, colorClass: "border-l-cyan-500" },
  { code: "6351", label: "Impôts et taxes indirects", classe: 6, nature: "Charge", type: "Charges fiscales", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6371", label: "Droits d'accises et taxes analogues", classe: 6, nature: "Charge", type: "Charges fiscales", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6411", label: "Pertes sur créances douteuses", classe: 6, nature: "Charge", type: "Dotations", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6511", label: "Dotations aux amortissements — Immobilisations", classe: 6, nature: "Charge", type: "Dotations", solde: 5600, colorClass: "border-l-cyan-500" },
  { code: "6591", label: "Autres dotations aux provisions", classe: 6, nature: "Charge", type: "Dotations", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6611", label: "Intérêts des emprunts", classe: 6, nature: "Charge", type: "Charges financières", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6661", label: "Pertes de change", classe: 6, nature: "Charge", type: "Charges financières", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6711", label: "Pénalités et教学内容", classe: 6, nature: "Charge", type: "Charges exceptionelles", solde: 0, colorClass: "border-l-cyan-500" },
  { code: "6811", label: "Impôts sur le résultat", classe: 6, nature: "Charge", type: "Charges exceptionelles", solde: 0, colorClass: "border-l-cyan-500" },

  // Classe 7 — Produits
  { code: "7011", label: "Ventes de marchandises", classe: 7, nature: "Produit", type: "Ventes", solde: 487200, colorClass: "border-l-lime-500" },
  { code: "7012", label: "Ventes de prestations de services", classe: 7, nature: "Produit", type: "Ventes", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7021", label: "Ventes de produits finis", classe: 7, nature: "Produit", type: "Ventes", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7071", label: "Ventes de matières premières", classe: 7, nature: "Produit", type: "Ventes", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7061", label: "Prestations de services", classe: 7, nature: "Produit", type: "Prestations", solde: 89000, colorClass: "border-l-lime-500" },
  { code: "7081", label: "Locations", classe: 7, nature: "Produit", type: "Prestations", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7085", label: "Ports et frais accessoires", classe: 7, nature: "Produit", type: "Prestations", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7111", label: "Variation de stocks — marchandises", classe: 7, nature: "Produit", type: "Variation stocks", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7131", label: "Variation de stocks — produits finis", classe: 7, nature: "Produit", type: "Variation stocks", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7211", label: "Production immobilisée", classe: 7, nature: "Produit", type: "Production", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7311", label: "Redevances", classe: 7, nature: "Produit", type: "Revenus financiers", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7381", label: "Intérêts des prêts", classe: 7, nature: "Produit", type: "Revenus financiers", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7411", label: "Dividendes", classe: 7, nature: "Produit", type: "Revenus financiers", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7461", label: "Gains de change", classe: 7, nature: "Produit", type: "Revenus financiers", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7511", label: "Pénalités perçues", classe: 7, nature: "Produit", type: "Produits exceptionels", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7551", label: "Rabais, remises et ristournes obtenus", classe: 7, nature: "Produit", type: "Autres produits", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7571", label: "Subsides reçus", classe: 7, nature: "Produit", type: "Autres produits", solde: 0, colorClass: "border-l-lime-500" },
  { code: "7581", label: "Transferts de charges", classe: 7, nature: "Produit", type: "Autres produits", solde: 0, colorClass: "border-l-lime-500" },

  // Classe 8 — Charges et produits hors activités
  { code: "8111", label: "Charges hors activités ordinaires", classe: 8, nature: "Charge", type: "Hors activités", solde: 0, colorClass: "border-l-gray-400" },
  { code: "8211", label: "Dotations aux amortissements hors activités", classe: 8, nature: "Charge", type: "Hors activités", solde: 5600, colorClass: "border-l-gray-400" },
  { code: "8511", label: "Charges sur exercices antérieurs", classe: 8, nature: "Charge", type: "Exercices antérieurs", solde: 0, colorClass: "border-l-gray-400" },
  { code: "8711", label: "Participation des travailleurs", classe: 8, nature: "Charge", type: "Résultat", solde: 0, colorClass: "border-l-gray-400" },
  { code: "8811", label: "Détection et impairment", classe: 8, nature: "Charge", type: "Résultat", solde: 0, colorClass: "border-l-gray-400" },
  { code: "8911", label: "Impôts sur le résultat", classe: 8, nature: "Charge", type: "Résultat", solde: 0, colorClass: "border-l-gray-400" },
  { code: "8112", label: "Produits hors activités ordinaires", classe: 8, nature: "Produit", type: "Hors activités", solde: 0, colorClass: "border-l-gray-400" },
  { code: "8212", label: "Reprises sur dépréciations", classe: 8, nature: "Produit", type: "Hors activités", solde: 0, colorClass: "border-l-gray-400" },
  { code: "8512", label: "Produits sur exercices antérieurs", classe: 8, nature: "Produit", type: "Exercices antérieurs", solde: 0, colorClass: "border-l-gray-400" },
  { code: "8712", label: "Reprises sur provisions réglementées", classe: 8, nature: "Produit", type: "Résultat", solde: 0, colorClass: "border-l-gray-400" },
];

const PAGE_SIZE = 10;

const classeColors: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-500" },
  2: { bg: "bg-green-50", text: "text-green-700", border: "border-green-500" },
  3: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-500" },
  4: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-500" },
  5: { bg: "bg-red-50", text: "text-red-700", border: "border-red-500" },
  6: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-500" },
  7: { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-500" },
  8: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-400" },
};

const natureColors: Record<string, { bg: string; text: string }> = {
  Actif: { bg: "bg-blue-50", text: "text-blue-700" },
  Passif: { bg: "bg-red-50", text: "text-red-700" },
  Charge: { bg: "bg-gray-100", text: "text-gray-700" },
  Produit: { bg: "bg-lime-100", text: "text-lime-700" },
};

function formatSolde(n: number) {
  const abs = Math.abs(n);
  const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(0)} ${abs >= 1000000 ? "M" : "K"} $` : `${abs} $`;
  return n >= 0 ? formatted : `-${formatted}`;
}

export default function ComptaPlanComptable() {
  const [search, setSearch] = useState("");
  const [classeFilter, setClasseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = allAccounts.filter((a) => {
    const matchSearch =
      !search ||
      a.code.includes(search) ||
      a.label.toLowerCase().includes(search.toLowerCase());
    const matchClasse = classeFilter === "all" || a.classe === parseInt(classeFilter);
    const matchType = typeFilter === "all" || a.nature === typeFilter;
    return matchSearch && matchClasse && matchType;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-sm">
                <i className="ri-file-chart-line text-white text-sm" />
              </div>
              <span className="text-base font-extrabold text-gray-900">Facture<span className="text-green-600">Smart</span></span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Comptabilité</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              <i className="ri-shield-check-line text-indigo-500" />
              <span className="font-semibold">Conforme SYSCOHADA</span>
            </div>
            <button className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm">
              <i className="ri-add-line" />
              Nouveau compte
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total comptes", value: allAccounts.length, mono: true },
            { label: "Classes actives", value: 8, mono: false },
            { label: "Classe 4 — Tiers", value: allAccounts.filter(a => a.classe === 4).length, mono: true },
            { label: "Dernière mise à jour", value: new Date().toLocaleDateString('fr-FR'), mono: false },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className={`text-2xl font-extrabold text-gray-900 ${s.mono ? "font-mono" : ""}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par code ou libellé..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 bg-white"
              />
            </div>
            <select
              value={classeFilter}
              onChange={(e) => { setClasseFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-100 bg-white"
            >
              <option value="all">Toutes les classes</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                <option key={c} value={c}>Classe {c}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-100 bg-white"
            >
              <option value="all">Tous les types</option>
              <option>Actif</option>
              <option>Passif</option>
              <option>Charge</option>
              <option>Produit</option>
            </select>
            <button className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>

        {/* OHADA Classes reference */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Classes OHADA :</span>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
            <span
              key={c}
              className={`px-2 py-0.5 rounded text-xs font-semibold border-l-2 ${classeColors[c].bg} ${classeColors[c].text} ${classeColors[c].border}`}
            >
              Cl.{c}
            </span>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="text-left px-4 py-3">Classe</th>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Libellé</th>
                  <th className="text-center px-4 py-3">Nature</th>
                  <th className="text-center px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Solde</th>
                  <th className="text-center px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((a) => (
                  <tr key={a.code} className={`hover:bg-gray-50 transition-colors ${a.colorClass} border-l-[3px]`}>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${classeColors[a.classe].bg} ${classeColors[a.classe].text}`}>
                        Cl.{a.classe}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{a.code}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{a.label}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${natureColors[a.nature].bg} ${natureColors[a.nature].text}`}>
                        {a.nature}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{a.type}</td>
                    <td className={`px-4 py-3 text-right font-mono font-extrabold ${a.solde >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {a.solde >= 0 ? formatSolde(a.solde) : `(${formatSolde(a.solde)})`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-gray-400 hover:text-green-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                      Aucun compte trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Affichage {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length} comptes
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-semibold disabled:cursor-not-allowed hover:bg-gray-200"
              >
                Préc.
              </button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${p === page ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 3 && (
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold disabled:cursor-not-allowed hover:bg-gray-200"
                >
                  Suiv.
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
