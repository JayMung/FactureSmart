import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, X, Menu, Star, Shield, FileText, Users,
  Smartphone, Printer, Lock, CreditCard, Cloud, QrCode,
  Landmark, BarChart2, UserCog, ChevronDown
} from 'lucide-react';

// ─── Font import via style tag ───────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
    * { font-family: 'Plus Jakarta Sans', sans-serif; }
    .bg-dots { background-image: radial-gradient(circle, rgba(16,185,129,0.08) 1.5px, transparent 1.5px); background-size: 28px 28px; }
    .bg-grid { background-image: linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px); background-size: 48px 48px; }
    .gradient-hero { background: linear-gradient(135deg, #059669 0%, #22c55e 40%, #34d399 100%); }
    .gradient-btn { background: linear-gradient(135deg, #22c55e 0%, #059669 100%); }
    .gradient-btn:hover { background: linear-gradient(135deg, #16a34a 0%, #047857 100%); }
    .card-hover { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .card-hover:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(16,185,129,0.15); }
    .pricing-popular { border: 2px solid #22c55e; position: relative; }
    .pricing-popular::before { content: 'Populaire'; position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #22c55e, #059669); color: white; font-size: 11px; font-weight: 700; padding: 4px 16px; border-radius: 9999px; letter-spacing: 0.5px; text-transform: uppercase; }
    .glass-dark { background: rgba(15, 23, 42, 0.80); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.08); }
    .glass-dark.scrolled { background: rgba(15, 23, 42, 0.95); }
    .float { animation: float 3s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
    .fade-up { animation: fadeUp 0.7s ease-out; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    .pulse-dot { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    html { scroll-behavior: smooth; }
  `}</style>
);

// ─── Navbar ─────────────────────────────────────────────────────────────────
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass-dark scrolled' : 'glass-dark'}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
            <FileText className="text-white text-lg" />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">Facture<span className="text-green-300">Smart</span></span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Tarifs</a>
          <a href="#dgi" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Conformité DGI</a>
          <a href="#faq" className="text-sm font-medium text-white/80 hover:text-white transition-colors">FAQ</a>
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-white/90 hover:text-white transition-colors">Connexion</Link>
          <Link to="/register" className="px-5 py-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-white hover:bg-gray-50 transition-all shadow-lg">
            Essai gratuit
          </Link>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900/95 border-t border-white/10 px-6 py-4 space-y-3">
          <a href="#features" className="block text-sm font-medium text-white/80 hover:text-white" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
          <a href="#pricing" className="block text-sm font-medium text-white/80 hover:text-white" onClick={() => setMenuOpen(false)}>Tarifs</a>
          <a href="#dgi" className="block text-sm font-medium text-white/80 hover:text-white" onClick={() => setMenuOpen(false)}>Conformité DGI</a>
          <a href="#faq" className="block text-sm font-medium text-white/80 hover:text-white" onClick={() => setMenuOpen(false)}>FAQ</a>
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            <Link to="/login" className="text-sm font-semibold text-white/80" onClick={() => setMenuOpen(false)}>Connexion</Link>
            <Link to="/register" className="px-5 py-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-white text-center" onClick={() => setMenuOpen(false)}>
              Essai gratuit
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

// ─── Hero ────────────────────────────────────────────────────────────────────
const Hero = () => (
  <section className="relative min-h-screen gradient-hero flex items-center overflow-hidden pt-20">
    <div className="absolute inset-0 bg-dots opacity-60" />
    <div className="absolute top-20 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
    <div className="absolute bottom-20 left-10 w-96 h-96 bg-green-300/10 rounded-full blur-3xl" />

    <div className="relative max-w-7xl mx-auto px-6 py-32 grid md:grid-cols-2 gap-16 items-center">
      {/* Left */}
      <div className="fade-up">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
          <span className="w-2 h-2 bg-green-300 rounded-full pulse-dot" />
          <span className="text-xs font-semibold text-white/90 tracking-wide">Conforme DGI — République Démocratique du Congo</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
          La facturation<br />
          <span className="text-green-200">électronique</span><br />
          nouvelle génération
        </h1>
        <p className="text-lg text-white/80 mb-8 max-w-lg leading-relaxed">
          Créez des factures conformes à la DGI en quelques clics. Transmission automatique, signature numérique RSA-2048, et QR Code pour chaque document.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-emerald-700 font-bold text-base shadow-2xl shadow-emerald-900/20 hover:bg-gray-50 transition-all">
            <FileText className="w-5 h-5" />
            Démarrer gratuitement
          </Link>
          <a href="#features" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all">
            <span className="text-xl">▶</span>
            Voir la démo
          </a>
        </div>
        <div className="flex items-center gap-6 mt-8">
          <div className="flex -space-x-2">
            {['JM', 'PK', 'ML'].map((initials, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-green-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-emerald-800">{initials}</div>
            ))}
          </div>
          <div>
            <div className="text-sm font-bold text-white">+2 400 entreprises</div>
            <div className="text-xs text-white/60">Already trust Facture Smart</div>
          </div>
        </div>
      </div>

      {/* Right — App mockup */}
      <div className="hidden md:block fade-up" style={{ animationDelay: '0.3s' }}>
        <div className="relative float">
          <div className="absolute -inset-4 bg-white/10 rounded-3xl blur-xl" />
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            {/* Browser chrome */}
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4 bg-white rounded-lg px-3 py-1 text-xs text-gray-400 font-mono">app.facturesmart.cd</div>
            </div>
            {/* App content */}
            <div className="flex">
              {/* Sidebar */}
              <div className="w-14 bg-gray-50 border-r border-gray-100 py-3 flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center"><FileText className="text-white text-sm" /></div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400"><BarChart2 className="text-base" /></div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400"><FileText className="text-base" /></div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400"><Users className="text-base" /></div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 mt-auto"><UserCog className="text-base" /></div>
              </div>
              {/* Main */}
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-gray-900">Mes factures</div>
                    <div className="text-xs text-gray-400">Avril 2026</div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center text-white"><span className="text-base">+</span></div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-green-50 rounded-xl p-2">
                    <div className="text-xs text-green-600 font-semibold">Validées</div>
                    <div className="text-lg font-bold text-green-700">142</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-2">
                    <div className="text-xs text-yellow-600 font-semibold">En attente</div>
                    <div className="text-lg font-bold text-yellow-700">18</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2">
                    <div className="text-xs text-gray-500 font-semibold">Brouillons</div>
                    <div className="text-lg font-bold text-gray-700">7</div>
                  </div>
                </div>
                {/* Rows */}
                {[
                  { initials: 'CD', name: 'Congo Tech SARL', num: 'FX-2026-00142', amount: '1 240 $', status: 'green' },
                  { initials: 'AS', name: 'Asbl Lumière', num: 'FX-2026-00141', amount: '890 $', status: 'yellow' },
                  { initials: 'KM', name: 'Kimbélavo Sprl', num: 'FX-2026-00140', amount: '3 450 $', status: 'green' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[8px] font-bold text-green-700">{row.initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{row.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{row.num}</div>
                    </div>
                    <div className={`text-xs font-bold ${row.status === 'green' ? 'text-green-600' : 'text-yellow-600'}`}>{row.amount}</div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${row.status === 'green' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      <CheckCircle2 className={`text-[8px] ${row.status === 'green' ? 'text-green-600' : 'text-yellow-600'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* DGI Badge */}
          <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Shield className="text-green-600 text-lg" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Certifié DGI</div>
              <div className="text-[10px] text-gray-400">Conforme RDC</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Scroll indicator */}
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60">
      <span className="text-xs font-medium tracking-wide">Découvrir</span>
      <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5">
        <div className="w-1.5 h-3 bg-white/70 rounded-full animate-bounce" />
      </div>
    </div>
  </section>
);

// ─── Trust logos ─────────────────────────────────────────────────────────────
const TrustLogos = () => (
  <section className="py-12 bg-gray-50 border-y border-gray-100">
    <div className="max-w-7xl mx-auto px-6">
      <p className="text-center text-sm text-gray-400 font-medium mb-8 tracking-wide uppercase">Adopté par des entreprises de tous les secteurs en RDC</p>
      <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-40">
        {['CongoLogistics', 'KinshasaTech', 'RDCImmo', 'MbujiMayiCorp', 'KatangaGroup'].map((name) => (
          <div key={name} className="text-xl font-extrabold text-gray-700 tracking-tight">
            {name.split(/(?=[A-Z])/).slice(0, 2).map((part, i) => (
              <span key={i}>{i === 1 ? <span className="text-green-600">{part}</span> : part}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── Features ─────────────────────────────────────────────────────────────────
const features = [
  { icon: Landmark, title: 'Transmission DGI automatique', desc: 'Chaque facture est automatiquement transmise à la DGI dès sa création. Plus besoin de manipulations manuelles.' },
  { icon: QrCode, title: 'QR Code & Signature numérique', desc: 'QR Code unique et signature numérique RSA-2048 sur chaque facture. Authenticité garantie par cryptographie.' },
  { icon: BarChart2, title: 'Rapports fiscaux détaillés', desc: 'Générez vos rapports mensuels et annuels en un clic. TVA 18% calculée automatiquement.' },
  { icon: Users, title: 'Multi-utilisateurs & Rôles', desc: 'Attribuez des rôles à votre équipe : comptable, vendeur, admin. Permissions granulaires par fonctionnalité.' },
  { icon: Smartphone, title: 'Application mobile', desc: 'Gérez vos factures depuis votre téléphone. Interface mobile optimisée pour iOS et Android.' },
  { icon: Printer, title: 'Impression & Ticket POS', desc: 'Imprimez vos factures en A4 ou générez des tickets 80mm pour imprimantes thermiques POS.' },
  { icon: Lock, title: 'Sécurité maximale', desc: 'Authentification 2FA, chiffrement AES-256, journal d\'audit complet. Vos données sont protégées.' },
  { icon: CreditCard, title: 'Paiements Mobile Money', desc: 'Acceptez les paiements via Mobile Money (Vodacom, Airtel). Intégration native avec M-Pesa et Airtel Money.' },
  { icon: Cloud, title: 'Synchronisation cloud', desc: 'Toutes vos données sont synchronisées en temps réel. Accessible depuis n\'importe quel appareil, n\'importe où.' },
];

const Features = () => (
  <section id="features" className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-green-50 rounded-full px-4 py-2 mb-4">
          <Star className="text-green-600 text-sm" size={14} />
          <span className="text-xs font-bold text-green-700 tracking-wide uppercase">Fonctionnalités</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Tout ce dont vous avez besoin</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">Une solution complète pour gérer votre facturation électronique en toute conformité avec la réglementation DGI de la RDC.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div key={i} className="card-hover bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
              <f.icon className="text-green-600 text-2xl" size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── DGI Compliance ───────────────────────────────────────────────────────────
const DGISection = () => (
  <section id="dgi" className="py-24 bg-gray-50 border-y border-gray-100">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-green-50 rounded-full px-4 py-2 mb-4">
            <Shield className="text-green-600 text-sm" size={14} />
            <span className="text-xs font-bold text-green-700 tracking-wide uppercase">Conformité DGI</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">100% conforme à la réglementation DGI</h2>
          <p className="text-gray-500 leading-relaxed mb-8">
            Facture Smart est conçu en étroite collaboration avec la Direction Générale des Impôts (DGI) de la République Démocratique du Congo. Chaque fonctionnalité respecte les exigences légales en vigueur.
          </p>
          <div className="space-y-4">
            {[
              { title: 'NIF vendeur & acheteur', desc: 'Validation automatique via l\'API DGI' },
              { title: 'RCCM & Numéro d\'entreprise', desc: 'Vérification automatique en base DGI' },
              { title: 'Code d\'authentification DGI', desc: 'Généré et apposé automatiquement sur chaque facture' },
              { title: 'Signature numérique RSA-2048', desc: 'Cryptographie asymétrique pour intégrité des documents' },
              { title: 'QR Code dynamique', desc: 'Lien direct vers le portail de validation DGI' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="text-green-600 text-sm" size={14} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice mockup */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-green-500/5 to-green-600/15 rounded-3xl blur-xl" />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-bold text-lg">FACTURE</div>
                  <div className="text-green-200 text-xs font-mono">FX-2026-00142</div>
                </div>
                <div className="text-right">
                  <div className="text-white/80 text-xs">Date d'émission</div>
                  <div className="text-white font-semibold text-sm">23 Avril 2026</div>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Vendeur</div>
                  <div className="text-sm font-bold text-gray-900">Ma Société SARL</div>
                  <div className="text-[10px] text-gray-400">NIF: 0123456789</div>
                  <div className="text-[10px] text-gray-400">RCCM: CD/KIN/2024/12345</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Acheteur</div>
                  <div className="text-sm font-bold text-gray-900">Congo Tech SARL</div>
                  <div className="text-[10px] text-gray-400">NIF: 9876543210</div>
                  <div className="text-[10px] text-gray-400">Avenue du Commerce, Kinshasa</div>
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Description</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">Qté</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">P.U.</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      { desc: 'Développement web sur mesure', qty: 1, pu: '800 $', total: '800 $' },
                      { desc: 'Hébergement annuel', qty: 1, pu: '200 $', total: '200 $' },
                      { desc: 'Maintenance mensuelle', qty: 4, pu: '60 $', total: '240 $' },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{row.desc}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{row.qty}</td>
                        <td className="px-3 py-2 text-right text-gray-600 font-mono">{row.pu}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 font-mono">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <div className="w-56 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>HT</span><span className="font-mono">1 240 $</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>TVA 18%</span><span className="font-mono">223.20 $</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                    <span>TTC</span><span className="font-mono text-green-600">1 463.20 $</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] text-gray-400">Code DGI</div>
                  <div className="text-xs font-mono font-bold text-gray-700">DGI-2026-A7X9K2M</div>
                </div>
                {/* QR code placeholder */}
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="w-8 h-8 grid grid-cols-4 gap-px">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={`rounded-sm ${i % 3 === 0 ? 'bg-gray-900' : 'bg-white'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ─── Pricing ──────────────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Starter',
    price: 'Gratuit',
    desc: 'Pour découvrir Facture Smart en toute simplicité.',
    cta: 'Commencer gratuitement',
    ctaHref: '/register',
    features: [
      { text: 'Jusqu\'à 10 factures/mois', included: true },
      { text: '1 utilisateur', included: true },
      { text: 'Transmission DGI', included: true },
      { text: 'QR Code & signature', included: true },
      { text: 'Paiements Mobile Money', included: false },
      { text: 'Multi-utilisateurs', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '49 $',
    period: '/mois',
    desc: 'Pour les PME en pleine croissance.',
    cta: 'Essai gratuit 14 jours',
    ctaHref: '/register',
    popular: true,
    features: [
      { text: 'Factures illimitées', included: true },
      { text: '5 utilisateurs', included: true },
      { text: 'Transmission DGI prioritaire', included: true },
      { text: 'QR Code & signature', included: true },
      { text: 'Paiements Mobile Money', included: true },
      { text: 'Rapports fiscaux avancés', included: true },
      { text: 'Support prioritaire', included: true },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Sur mesure',
    desc: 'Pour les grandes entreprises et groupes.',
    cta: 'Contacter commercial',
    ctaHref: 'mailto:commercial@facturesmart.cd',
    features: [
      { text: 'Tout de Pro', included: true },
      { text: 'Utilisateurs illimités', included: true },
      { text: 'Intégration API personnalisée', included: true },
      { text: 'SSO & LDAP', included: true },
      { text: 'Account manager dédié', included: true },
      { text: 'SLA 99.9%', included: true },
      { text: 'Formation équipe', included: true },
    ],
  },
];

const Pricing = () => (
  <section id="pricing" className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-green-50 rounded-full px-4 py-2 mb-4">
          <CreditCard className="text-green-600 text-sm" size={14} />
          <span className="text-xs font-bold text-green-700 tracking-wide uppercase">Tarifs</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Des tarifs adaptés à votre activité</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">Commencez gratuitement et évoluez selon vos besoins. Aucune carte bancaire requise pour l'essai gratuit.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan, i) => (
          <div key={i} className={`bg-white rounded-2xl border p-8 shadow-sm ${plan.popular ? 'pricing-popular' : 'border-gray-200'}`}>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{plan.name}</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
              {plan.period && <span className="text-gray-400 mb-1.5">{plan.period}</span>}
            </div>
            <p className="text-sm text-gray-400 mb-6">{plan.desc}</p>
            <Link
              to={plan.ctaHref}
              className={`block w-full text-center py-3 rounded-xl font-semibold mb-6 transition-all ${
                plan.popular
                  ? 'gradient-btn text-white shadow-lg shadow-green-500/25 hover:shadow-xl'
                  : 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {plan.cta}
            </Link>
            <ul className="space-y-3">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-center gap-3 text-sm">
                  {f.included
                    ? <CheckCircle2 className="text-green-500 text-base flex-shrink-0" size={16} />
                    : <X className="text-gray-300 text-base flex-shrink-0" size={16} />
                  }
                  <span className={f.included ? 'text-gray-600' : 'text-gray-400'}>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-gray-400 mt-8">Prix indicatifs — devis personnalisé disponible sur demande. TVA 18% applicable.</p>
    </div>
  </section>
);

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  {
    name: 'Jean-Marc Kabamba',
    role: 'Directeur financier, Congo Logistics SARL',
    initials: 'JM',
    bg: 'bg-green-100',
    text: 'text-green-700',
    quote: '"Avant Facture Smart, la transmission à la DGI nous prenait des heures chaque semaine. Maintenant, c\'est automatique. Un gain de temps énorme pour notre équipe comptable."',
  },
  {
    name: 'Patricia Kambole',
    role: 'CEO, KinshasaTech Solutions',
    initials: 'PK',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    quote: '"La conformité DGI était notre plus grande inquiétude. Avec Facture Smart, nous avons la tranquillité d\'esprit totale. Chaque facture est parfaitement en règle."',
  },
  {
    name: 'Micheline Lusamba',
    role: 'Gerante, Mbuji-Mayi Distributors',
    initials: 'ML',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    quote: '"L\'application mobile est exceptionnelle. Je crée mes factures depuis le terrain avec mon téléphone. Mes clients reçoivent tout instantanément par WhatsApp."',
  },
];

const Testimonials = () => (
  <section className="py-24 bg-gray-50 border-y border-gray-100">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Ils nous font confiance</h2>
        <p className="text-gray-500">Des entrepreneurs congolais partagent leur expérience avec Facture Smart</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className="text-yellow-400 fill-yellow-400 text-sm" size={14} />
              ))}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{t.quote}</p>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${t.bg} flex items-center justify-center text-sm font-bold ${t.text}`}>{t.initials}</div>
              <div>
                <div className="text-sm font-bold text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-400">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'Dois-je payer pour utiliser Facture Smart ?',
    a: 'Non, le plan Starter est 100% gratuit avec jusqu\'à 10 factures par mois. Vous pouvez commencer sans carte bancaire.',
  },
  {
    q: 'Facture Smart est-il vraiment conforme à la DGI ?',
    a: 'Oui, Facture Smart a été développé en conformité stricte avec les exigences de la Direction Générale des Impôts (DGI) de la RDC. Chaque facture inclut NIF, RCCM, code DGI, signature RSA-2048 et QR Code.',
  },
  {
    q: 'Comment fonctionne la transmission automatique à la DGI ?',
    a: 'Dès que vous émettez une facture, elle est automatiquement signée numériquement et transmise au serveur DGI via notre API sécurisée. Vous recevez un code d\'authentification en temps réel.',
  },
  {
    q: 'Puis-je utiliser Facture Smart hors connexion ?',
    a: 'L\'application mobile dispose d\'un mode hors ligne. Vous pouvez créer des factures sans connexion internet ; elles seront automatiquement synchronisées dès que vous serez en ligne.',
  },
  {
    q: 'Comment sont protégées mes données ?',
    a: 'Vos données sont chiffrées avec AES-256 au repos et TLS 1.3 en transit. L\'authentification 2FA est disponible. Nos serveurs sont hébergés dans un datacenter sécurisé en Afrique centrale avec redondance géographique.',
  },
];

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 rounded-full px-4 py-2 mb-4">
            <span className="text-green-600 text-sm">?</span>
            <span className="text-xs font-bold text-green-700 tracking-wide uppercase">FAQ</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Questions fréquentes</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
                <ChevronDown className={`text-gray-400 transition-transform flex-shrink-0 ${open === i ? 'rotate-180' : ''}`} size={16} />
              </button>
              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── CTA ──────────────────────────────────────────────────────────────────────
const CTA = () => (
  <section className="py-24 gradient-hero relative overflow-hidden">
    <div className="absolute inset-0 bg-dots opacity-40" />
    <div className="relative max-w-3xl mx-auto px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">Prêt à digitaliser votre facturation ?</h2>
      <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
        Rejoignez plus de 2 400 entreprises congolaises qui font confiance à Facture Smart pour leur conformité DGI.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/register" className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl bg-white text-emerald-700 font-bold text-base shadow-2xl shadow-emerald-900/20 hover:bg-gray-50 transition-all">
          <FileText className="w-5 h-5" />
          Démarrer gratuitement
        </Link>
        <a href="mailto:contact@facturesmart.cd" className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all">
          <span className="text-xl">📅</span>
          Prendre rendez-vous
        </a>
      </div>
      <p className="text-white/50 text-sm mt-6">Sans carte bancaire • Configuration en 5 minutes</p>
    </div>
  </section>
);

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer className="bg-gray-900 py-16">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid md:grid-cols-4 gap-12 mb-12">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <FileText className="text-white text-lg" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">Facture<span className="text-green-400">Smart</span></span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            Logiciel de facturation électronique conforme DGI pour les entreprises de la République Démocratique du Congo.
          </p>
          <div className="flex items-center gap-3 mt-4">
            {['linkedin', 'twitter', 'whatsapp'].map((s) => (
              <a key={s} href="#" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all">
                <span className="text-base">{s === 'linkedin' ? 'in' : s === 'twitter' ? 'X' : 'wa'}</span>
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-bold text-white mb-4">Produit</h4>
          <ul className="space-y-2.5">
            {['Fonctionnalités', 'Tarifs', 'Intégrations', 'Sécurité', 'API'].map((item) => (
              <li key={item}><a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-white mb-4">Entreprise</h4>
          <ul className="space-y-2.5">
            {['À propos', 'Blog', 'Contact', 'CGU', 'Confidentialité'].map((item) => (
              <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500">© 2026 Facture Smart — Tous droits réservés. Conforme DGI/RDC.</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot" />
          <span className="text-xs text-gray-500">Tous les systèmes sont opérationnels</span>
        </div>
      </div>
    </div>
  </footer>
);

// ─── Landing Page ─────────────────────────────────────────────────────────────
const Landing = () => (
  <div className="min-h-screen bg-white">
    <GlobalStyle />
    <Navbar />
    <Hero />
    <TrustLogos />
    <Features />
    <DGISection />
    <Pricing />
    <Testimonials />
    <FAQ />
    <CTA />
    <Footer />
  </div>
);

export default Landing;
