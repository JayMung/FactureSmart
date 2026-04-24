import { useState } from "react";
import { Download, Calendar, FileText, DollarSign, ArrowLeftRight, TrendingUp } from "lucide-react";

const mockTVAData = [
  { periode: "Janvier 2026", caHT: 38200000, tvaCollectee: 6876000, tvaRecuperable: 2100000, tvaNette: 4776000, status: "Déclaré" },
  { periode: "Février 2026", caHT: 45600000, tvaCollectee: 8208000, tvaRecuperable: 2800000, tvaNette: 5408000, status: "Déclaré" },
  { periode: "Mars 2026", caHT: 52100000, tvaCollectee: 9378000, tvaRecuperable: 3400000, tvaNette: 5978000, status: "Déclaré" },
  { periode: "Avril 2026", caHT: 20500000, tvaCollectee: 3690000, tvaRecuperable: 0, tvaNette: 3690000, status: "En attente" },
];

const clients = [
  { name: "Congo Freight", pct: 37, color: "#10B981" },
  { name: "Minexco", pct: 28, color: "#10B981" },
  { name: "Africaplast", pct: 19, color: "#F59E0B" },
  { name: "Solveris", pct: 10, color: "#8B5CF6" },
  { name: "Autres", pct: 6, color: "#EF4444" },
];

const monthlyTVA = [
  { month: "Jan", collected: 35, recoverable: 15 },
  { month: "Fév", collected: 42, recoverable: 18 },
  { month: "Mar", collected: 48, recoverable: 20 },
  { month: "Avr", collected: 100, recoverable: 35 },
];

function formatCDF(n: number) {
  if (n >= 1000000) return `CDF ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `CDF ${(n / 1000).toFixed(0)}K`;
  return `CDF ${n}`;
}

function formatCDFRaw(n: number) {
  return n.toLocaleString("fr-FR");
}

export default function Rapports() {
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-04-23");

  const totalCA = mockTVAData.reduce((s, r) => s + r.caHT, 0);
  const totalTVAC = mockTVAData.reduce((s, r) => s + r.tvaCollectee, 0);
  const totalTVAR = mockTVAData.reduce((s, r) => s + r.tvaRecuperable, 0);
  const totalTVAN = mockTVAData.reduce((s, r) => s + r.tvaNette, 0);

  const maxBar = Math.max(...monthlyTVA.map((m) => m.collected));

  const pieData = [
    { ...clients[0], dash: 200, offset: 0 },
    { ...clients[1], dash: 150, offset: -200 },
    { ...clients[2], dash: 100, offset: -350 },
    { ...clients[3], dash: 53, offset: -450 },
    { ...clients[4], dash: 0, offset: -503 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-20">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="ri-file-paper-2-line text-white text-base" />
            </div>
            <div>
              <span className="text-gray-900 text-base font-bold">Facture Smart</span>
              <span className="block text-[10px] text-gray-400 font-medium -mt-0.5">DGI — RDC</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Navigation</span>
          </div>
          {[
            { icon: "ri-dashboard-line", label: "Dashboard", href: "/" },
            { icon: "ri-file-list-3-line", label: "Factures", href: "/factures" },
            { icon: "ri-user-line", label: "Clients", href: "/clients" },
            { icon: "ri-bar-chart-2-line", label: "Rapports", href: "/rapports", active: true },
            { icon: "ri-settings-3-line", label: "Paramètres", href: "/settings" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                item.active
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <i className={`${item.icon} text-lg ${item.active ? "text-green-600" : "text-gray-500"}`} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-700 text-sm font-bold">JP</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Jean Pambu</p>
              <p className="text-xs text-gray-400 truncate">Administrateur</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rapports fiscaux</h1>
            <p className="text-sm text-gray-500">TVA collectée, récupérable et déclarations DGI</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm text-gray-700 border-none outline-none bg-transparent"
              />
              <span className="text-gray-400 text-sm">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm text-gray-700 border-none outline-none bg-transparent"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Exporter XML/PDF
            </button>
          </div>
        </header>

        <main className="flex-1 p-8">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-5 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Factures émises</p>
              <p className="text-2xl font-bold text-gray-900">142</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">CA total HT</p>
              <p className="text-2xl font-bold text-gray-900">{formatCDF(totalCA)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">TVA collectée</p>
              <p className="text-2xl font-bold text-gray-900">{formatCDF(totalTVAC)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">TVA récupérable</p>
              <p className="text-2xl font-bold text-gray-900">{formatCDF(totalTVAR)}</p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-3 gap-5 mb-6">
            {/* Pie chart */}
            <div className="col-span-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Répartition CA par client</h3>
              <div className="flex items-center justify-center mb-4">
                <svg viewBox="0 0 200 200" className="w-40 h-40">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#10B981" strokeWidth="40" strokeDasharray="200 503" strokeDashoffset="0" transform="rotate(-90 100 100)" className="pie-segment" opacity="0.9" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#10B981" strokeWidth="40" strokeDasharray="150 503" strokeDashoffset="-200" transform="rotate(-90 100 100)" className="pie-segment" opacity="0.7" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#F59E0B" strokeWidth="40" strokeDasharray="100 503" strokeDashoffset="-350" transform="rotate(-90 100 100)" className="pie-segment" opacity="0.9" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#8B5CF6" strokeWidth="40" strokeDasharray="53 503" strokeDashoffset="-450" transform="rotate(-90 100 100)" className="pie-segment" opacity="0.9" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#EF4444" strokeWidth="40" strokeDasharray="0 503" strokeDashoffset="-503" transform="rotate(-90 100 100)" className="pie-segment" opacity="0.9" />
                  <circle cx="100" cy="100" r="52" fill="white" />
                  <text x="100" y="95" textAnchor="middle" className="text-xs font-bold fill-gray-700">CDF</text>
                  <text x="100" y="112" textAnchor="middle" className="text-xs font-bold fill-gray-900">184.5M</text>
                </svg>
              </div>
              <div className="space-y-2">
                {clients.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-semibold text-gray-700">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar chart */}
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-gray-900">TVA mensuelle collectée (CDF)</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-green-600" />
                    TVA collectée
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-400" />
                    TVA récupérable
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-4 h-36">
                {monthlyTVA.map((m, i) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-1 items-end h-full">
                      <div
                        className="flex-1 bg-green-600 rounded-t-md transition-all"
                        style={{ height: `${(m.collected / 100) * 100}%` }}
                      />
                      <div
                        className="flex-1 bg-red-400 rounded-t-md transition-all"
                        style={{ height: `${(m.recoverable / 100) * 100}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${i === 3 ? "text-green-700 font-bold" : "text-gray-400"}`}>
                      {m.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TVA Table */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">Détail TVA collectée par période</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                <Download className="w-4 h-4 text-gray-500" />
                Exporter pour DGI
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Période</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">CA HT (CDF)</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">TVA collectée</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">TVA récupérable</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">TVA nette</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mockTVAData.map((row) => (
                    <tr key={row.periode} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-gray-900">{row.periode}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-medium text-gray-700 font-mono">{formatCDFRaw(row.caHT)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold text-green-600 font-mono">{formatCDFRaw(row.tvaCollectee)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-gray-500 font-mono">{formatCDFRaw(row.tvaRecuperable)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-bold text-gray-900 font-mono">{formatCDFRaw(row.tvaNette)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                          row.status === "Déclaré"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${row.status === "Déclaré" ? "bg-green-500" : "bg-amber-500"}`} />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="py-3 px-4"><span className="text-sm font-bold text-gray-900">TOTAL</span></td>
                    <td className="py-3 px-4 text-right"><span className="text-sm font-bold text-gray-900 font-mono">{formatCDFRaw(totalCA)}</span></td>
                    <td className="py-3 px-4 text-right"><span className="text-sm font-bold text-green-700 font-mono">{formatCDFRaw(totalTVAC)}</span></td>
                    <td className="py-3 px-4 text-right"><span className="text-sm font-medium text-gray-700 font-mono">{formatCDFRaw(totalTVAR)}</span></td>
                    <td className="py-3 px-4 text-right"><span className="text-base font-bold text-green-700 font-mono">{formatCDFRaw(totalTVAN)}</span></td>
                    <td className="py-3 px-4 text-center" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
