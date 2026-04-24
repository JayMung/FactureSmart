import { useState } from "react";
import { Download, ChevronLeft, Shield } from "lucide-react";

interface BalanceAccount {
  code: string;
  label: string;
  classe: number;
  soldef: { debit: number; credit: number };
  mvt: { debit: number; credit: number };
  soldefFinal: { debit: number; credit: number };
}

const accounts: BalanceAccount[] = [
  { code: "1011", label: "Capital social", classe: 1, soldef: { debit: 0, credit: 500000 }, mvt: { debit: 0, credit: 0 }, soldefFinal: { debit: 0, credit: 500000 } },
  { code: "1201", label: "Résultat net de l'exercice", classe: 1, soldef: { debit: 0, credit: 124750 }, mvt: { debit: 0, credit: 0 }, soldefFinal: { debit: 0, credit: 124750 } },
  { code: "2451", label: "Matériel informatique", classe: 2, soldef: { debit: 18500, credit: 0 }, mvt: { debit: 48000, credit: 0 }, soldefFinal: { debit: 66500, credit: 0 } },
  { code: "2481", label: "Mobilier de bureau", classe: 2, soldef: { debit: 7200, credit: 0 }, mvt: { debit: 0, credit: 0 }, soldefFinal: { debit: 7200, credit: 0 } },
  { code: "3111", label: "Marchandises en stock", classe: 3, soldef: { debit: 125000, credit: 0 }, mvt: { debit: 0, credit: 35000 }, soldefFinal: { debit: 90000, credit: 0 } },
  { code: "4011", label: "Fournisseurs — nationaux", classe: 4, soldef: { debit: 0, credit: 45200 }, mvt: { debit: 8500, credit: 41250 }, soldefFinal: { debit: 0, credit: 77950 } },
  { code: "4111", label: "Clients — facturas en cours", classe: 4, soldef: { debit: 89450, credit: 0 }, mvt: { debit: 59883, credit: 23420 }, soldefFinal: { debit: 125913, credit: 0 } },
  { code: "4452", label: "TVA due", classe: 4, soldef: { debit: 0, credit: 28152 }, mvt: { debit: 9378, credit: 3690 }, soldefFinal: { debit: 0, credit: 22464 } },
  { code: "5211", label: "Banque Rawbank", classe: 5, soldef: { debit: 234100, credit: 0 }, mvt: { debit: 248000, credit: 13900 }, soldefFinal: { debit: 468200, credit: 0 } },
  { code: "5711", label: "Caisse principale", classe: 5, soldef: { debit: 12450, credit: 0 }, mvt: { debit: 24850, credit: 12400 }, soldefFinal: { debit: 24900, credit: 0 } },
  { code: "6011", label: "Achats stockés", classe: 6, soldef: { debit: 87500, credit: 0 }, mvt: { debit: 125000, credit: 0 }, soldefFinal: { debit: 212500, credit: 0 } },
  { code: "6221", label: "Fournitures de bureau", classe: 6, soldef: { debit: 8750, credit: 0 }, mvt: { debit: 3200, credit: 0 }, soldefFinal: { debit: 11950, credit: 0 } },
  { code: "6351", label: "Impôts et taxes", classe: 6, soldef: { debit: 12450, credit: 0 }, mvt: { debit: 12450, credit: 0 }, soldefFinal: { debit: 24900, credit: 0 } },
  { code: "7011", label: "Ventes de marchandises", classe: 7, soldef: { debit: 0, credit: 487200 }, mvt: { debit: 0, credit: 184383 }, soldefFinal: { debit: 0, credit: 671583 } },
  { code: "7061", label: "Prestations de services", classe: 7, soldef: { debit: 0, credit: 89000 }, mvt: { debit: 0, credit: 125000 }, soldefFinal: { debit: 0, credit: 214000 } },
];

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

export default function ComptaBalance() {
  const [period, setPeriod] = useState("Avril 2026");

  const totalInitDebit = accounts.reduce((s, a) => s + a.soldef.debit, 0);
  const totalInitCredit = accounts.reduce((s, a) => s + a.soldef.credit, 0);
  const totalMvtDebit = accounts.reduce((s, a) => s + a.mvt.debit, 0);
  const totalMvtCredit = accounts.reduce((s, a) => s + a.mvt.credit, 0);
  const totalFinalDebit = accounts.reduce((s, a) => s + a.soldefFinal.debit, 0);
  const totalFinalCredit = accounts.reduce((s, a) => s + a.soldefFinal.credit, 0);

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
              <Shield className="w-3 h-3 text-indigo-500" />
              <span className="font-semibold">Conforme SYSCOHADA</span>
            </div>
            <button className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <i className="ri-filter-3-line text-green-600" />
              Filtres
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 bg-white"
            >
              {["Janvier 2026", "Février 2026", "Mars 2026", "Avril 2026"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400 ml-2">Exercice 2026 — Congo, RDC</span>
          </div>
        </div>

        {/* Balance table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="text-left px-4 py-3 w-8">N°</th>
                  <th className="text-left px-4 py-3">Compte</th>
                  <th className="text-center px-3 py-3" colSpan={2}>Solde initial</th>
                  <th className="text-center px-3 py-3 border-l border-gray-100" colSpan={2}>Mouvements</th>
                  <th className="text-center px-3 py-3 border-l border-gray-100" colSpan={2}>Solde final</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="px-4 py-2" />
                  <th className="px-4 py-2" />
                  <th className="text-right px-3 py-2">Débit</th>
                  <th className="text-right px-3 py-2">Crédit</th>
                  <th className="text-right px-3 py-2 border-l border-gray-100">Débit</th>
                  <th className="text-right px-3 py-2">Crédit</th>
                  <th className="text-right px-3 py-2 border-l border-gray-100">Débit</th>
                  <th className="text-right px-3 py-2">Crédit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {accounts.map((a, idx) => (
                  <tr key={a.code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-mono font-bold text-gray-900">{a.code}</div>
                      <div className="text-[10px] text-gray-400">{a.label}</div>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${a.soldef.debit > 0 ? "font-semibold text-gray-900" : "text-gray-300"}`}>
                      {a.soldef.debit > 0 ? fmt(a.soldef.debit) : "—"}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${a.soldef.credit > 0 ? "font-semibold text-gray-900" : "text-gray-300"}`}>
                      {a.soldef.credit > 0 ? fmt(a.soldef.credit) : "—"}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono border-l border-gray-100 ${a.mvt.debit > 0 ? "font-semibold text-gray-900" : "text-gray-300"}`}>
                      {a.mvt.debit > 0 ? fmt(a.mvt.debit) : "—"}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${a.mvt.credit > 0 ? "font-semibold text-gray-900" : "text-gray-300"}`}>
                      {a.mvt.credit > 0 ? fmt(a.mvt.credit) : "—"}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono border-l border-gray-100 font-bold ${a.soldefFinal.debit > 0 ? "text-green-700" : "text-gray-300"}`}>
                      {a.soldefFinal.debit > 0 ? fmt(a.soldefFinal.debit) : "—"}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${a.soldefFinal.credit > 0 ? "text-red-700" : "text-gray-300"}`}>
                      {a.soldefFinal.credit > 0 ? fmt(a.soldefFinal.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-50 border-t-2 border-green-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-xs font-extrabold text-gray-900">TOTAUX</td>
                  <td className="px-3 py-3 text-right font-mono font-extrabold text-gray-900">{fmt(totalInitDebit)}</td>
                  <td className="px-3 py-3 text-right font-mono font-extrabold text-gray-900">{fmt(totalInitCredit)}</td>
                  <td className="px-3 py-3 text-right font-mono font-extrabold text-gray-900 border-l border-gray-100">{fmt(totalMvtDebit)}</td>
                  <td className="px-3 py-3 text-right font-mono font-extrabold text-gray-900">{fmt(totalMvtCredit)}</td>
                  <td className="px-3 py-3 text-right font-mono font-extrabold text-green-700 border-l border-gray-100">{fmt(totalFinalDebit)}</td>
                  <td className="px-3 py-3 text-right font-mono font-extrabold text-red-700">{fmt(totalFinalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-600" />
              Soldes débiteurs en vert
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              Soldes créditeurs en rouge
            </div>
            <div className="ml-auto text-xs text-gray-400">
              Balance conforme SYSCOHADA — {accounts.length} comptes affichés
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
