import { useState } from "react";
import { Eye, Download, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface JournalEntry {
  date: string;
  piece: string;
  compte: string;
  compteLabel: string;
  libelle: string;
  journal: string;
  journalColor: { bg: string; text: string };
  debit: number;
  credit: number;
}

const journalEntries: JournalEntry[] = [
  { date: "23/04/2026", piece: "FAC-2026-0142", compte: "4111", compteLabel: "Clients — facturas", libelle: "Facture n° FAC-2026-0142 — Congo Tech SARL", journal: "Ventes", journalColor: { bg: "bg-blue-50", text: "text-blue-700" }, debit: 1463.20, credit: 0 },
  { date: "23/04/2026", piece: "FAC-2026-0142", compte: "7011", compteLabel: "Ventes de marchandises", libelle: "TVA collectée sur FAC-2026-0142", journal: "Ventes", journalColor: { bg: "bg-blue-50", text: "text-blue-700" }, debit: 0, credit: 1463.20 },
  { date: "23/04/2026", piece: "ACH-2026-0089", compte: "6011", compteLabel: "Achats stockés", libelle: "Achat fournisseur — Congo Distribution", journal: "Achats", journalColor: { bg: "bg-orange-50", text: "text-orange-700" }, debit: 850.00, credit: 0 },
  { date: "23/04/2026", piece: "ACH-2026-0089", compte: "4011", compteLabel: "Fournisseurs", libelle: "TVA récupérable sur ACH-2026-0089", journal: "Achats", journalColor: { bg: "bg-orange-50", text: "text-orange-700" }, debit: 153.00, credit: 0 },
  { date: "23/04/2026", piece: "ACH-2026-0089", compte: "4011", compteLabel: "Fournisseurs", libelle: "Dette fournisseur Congo Distribution", journal: "Achats", journalColor: { bg: "bg-orange-50", text: "text-orange-700" }, debit: 0, credit: 1003.00 },
  { date: "22/04/2026", piece: "OD-2026-0045", compte: "6351", compteLabel: "Impôts et taxes", libelle: "Liquidation TVA mensuelle — Mars 2026", journal: "OD", journalColor: { bg: "bg-indigo-50", text: "text-indigo-700" }, debit: 12450.00, credit: 0 },
  { date: "22/04/2026", piece: "OD-2026-0045", compte: "4452", compteLabel: "TVA due", libelle: "Crédit TVA à reporter — Avril 2026", journal: "OD", journalColor: { bg: "bg-indigo-50", text: "text-indigo-700" }, debit: 0, credit: 12450.00 },
  { date: "21/04/2026", piece: "TRESO-0089", compte: "5711", compteLabel: "Caisse principale", libelle: "Encaissement M-Pesa — Client Kin Import", journal: "Trésorerie", journalColor: { bg: "bg-green-50", text: "text-green-700" }, debit: 14520.00, credit: 0 },
  { date: "21/04/2026", piece: "TRESO-0089", compte: "4111", compteLabel: "Clients", libelle: "Règlement Kin Import SARL — M-Pesa", journal: "Trésorerie", journalColor: { bg: "bg-green-50", text: "text-green-700" }, debit: 0, credit: 14520.00 },
  { date: "20/04/2026", piece: "FAC-2026-0141", compte: "4111", compteLabel: "Clients — facturas", libelle: "Facture n° FAC-2026-0141 — Africaplast SPRL", journal: "Ventes", journalColor: { bg: "bg-blue-50", text: "text-blue-700" }, debit: 8900.00, credit: 0 },
  { date: "20/04/2026", piece: "FAC-2026-0141", compte: "7011", compteLabel: "Ventes de marchandises", libelle: "TVA collectée FAC-2026-0141", journal: "Ventes", journalColor: { bg: "bg-blue-50", text: "text-blue-700" }, debit: 0, credit: 1602.00 },
  { date: "20/04/2026", piece: "FAC-2026-0141", compte: "4451", compteLabel: "TVA collectée", libelle: "TVA collectée FAC-2026-0141", journal: "Ventes", journalColor: { bg: "bg-blue-50", text: "text-blue-700" }, debit: 0, credit: 8900.00 },
];

const PAGE_SIZE = 8;

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ComptaJournal() {
  const [month, setMonth] = useState("Avril 2026");
  const [journalType, setJournalType] = useState("Tous les journaux");
  const [pieceFilter, setPieceFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = journalEntries.filter((e) => {
    const matchPiece = !pieceFilter || e.piece.toLowerCase().includes(pieceFilter.toLowerCase());
    const matchJournal = journalType === "Tous les journaux" || e.journal === journalType;
    return matchPiece && matchJournal;
  });

  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0);
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
              Nouvelle écriture
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total débit", value: `${fmt(totalDebit)} $` },
            { label: "Total crédit", value: `${fmt(totalCredit)} $` },
            { label: "Écritures (exercice)", value: "1 428" },
            { label: "Période", value: "Jan — Déc 2026" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className="text-xl font-extrabold text-gray-900 font-mono">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Filter className="w-4 h-4 text-green-600" />
              Filtres
            </div>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white"
            >
              {["Janvier 2026", "Février 2026", "Mars 2026", "Avril 2026"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select
              value={journalType}
              onChange={(e) => setJournalType(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white"
            >
              {["Tous les journaux", "Journal des ventes", "Journal des achats", "Journal de trésorerie", "Journal OD"].map((j) => (
                <option key={j}>{j}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="N° de pièce..."
              value={pieceFilter}
              onChange={(e) => setPieceFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white w-36"
            />
            <button
              onClick={() => setPage(1)}
              className="px-4 py-2.5 rounded-xl bg-green-50 text-green-700 text-xs font-bold flex items-center gap-2 hover:bg-green-100 transition-colors"
            >
              <Filter className="w-3 h-3" />
              Appliquer
            </button>
            <button className="ml-auto px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>

        {/* Journal table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">N° Pièce</th>
                  <th className="text-left px-4 py-3">Compte</th>
                  <th className="text-left px-4 py-3">Libellé</th>
                  <th className="text-left px-4 py-3">Journal</th>
                  <th className="text-right px-4 py-3">Débit ($)</th>
                  <th className="text-right px-4 py-3">Crédit ($)</th>
                  <th className="text-center px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((entry, idx) => (
                  <tr
                    key={`${entry.piece}-${entry.compte}-${idx}`}
                    className={`hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 whitespace-nowrap">{entry.date}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{entry.piece}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-gray-900">{entry.compte}</div>
                      <div className="text-[10px] text-gray-400">{entry.compteLabel}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{entry.libelle}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${entry.journalColor.bg} ${entry.journalColor.text}`}>
                        {entry.journal}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${entry.debit > 0 ? "text-gray-900" : "text-gray-300"}`}>
                      {entry.debit > 0 ? fmt(entry.debit) : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${entry.credit > 0 ? "text-gray-900" : "text-gray-300"}`}>
                      {entry.credit > 0 ? fmt(entry.credit) : "—"}
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
                    <td colSpan={8} className="py-8 text-center text-gray-400 text-sm">
                      Aucune écriture trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Page {page}/{totalPages} — {filtered.length} écritures affichées
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-semibold disabled:cursor-not-allowed hover:bg-gray-200"
              >
                Préc.
              </button>
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${p === page ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold disabled:cursor-not-allowed hover:bg-gray-200"
              >
                Suiv.
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
