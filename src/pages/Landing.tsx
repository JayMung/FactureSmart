import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  FileText,
  Users,
  BarChart3,
  ShoppingCart,
  Wallet,
  Settings,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  ChevronRight,
  Receipt,
  TrendingUp,
  Lock,
  Menu,
  X,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <ShoppingCart className="h-6 w-6" />,
    title: 'Caisse POS',
    desc: 'Point de vente intégré avec rapports X, Z et A conformes DGI. Clôture journalière verrouillée.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Factures DGI',
    desc: '6 types de factures (FV, EV, FT, ET, FA, EA) avec numérotation FN-YYYY-NNNNN automatique.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Clients',
    desc: 'Gestion complète avec NIF, RCCM, historique des factures et statistiques financières par client.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Rapports',
    desc: "Rapports financiers mensuels, analyses de performance et exports pour la déclaration DGI.",
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: <Wallet className="h-6 w-6" />,
    title: 'Finances',
    desc: 'Suivi des encaissements, comptes financiers USD/CDF et rapprochement bancaire automatique.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: <Settings className="h-6 w-6" />,
    title: 'Multi-rôles',
    desc: "5 rôles RBAC (admin, opérateur, comptable, déclarant) avec contrôle d'accès granulaire.",
    color: 'bg-gray-50 text-gray-600',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Créez votre compte',
    desc: "Inscription en 2 minutes avec les informations de votre entreprise (NIF, RCCM, raison sociale).",
  },
  {
    num: '02',
    title: 'Configurez votre profil DGI',
    desc: 'Renseignez vos identifiants fiscaux et paramétrez vos types de TVA selon les groupes A, B, C.',
  },
  {
    num: '03',
    title: 'Émettez vos factures',
    desc: 'Créez des factures conformes, gérez vos clients et générez vos rapports en un clic.',
  },
];

const DGI_ITEMS = [
  { label: 'Facture de Vente', code: 'FV', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'Vente Export', code: 'EV', color: 'bg-blue-100 text-blue-700' },
  { label: 'Prestation de Service', code: 'FT', color: 'bg-violet-100 text-violet-700' },
  { label: 'Prestation Export', code: 'ET', color: 'bg-orange-100 text-orange-700' },
  { label: "Facture d'Avoir", code: 'FA', color: 'bg-pink-100 text-pink-700' },
  { label: 'Avoir Export', code: 'EA', color: 'bg-gray-100 text-gray-700' },
];

const STATS = [
  { value: '500+', label: 'PME congolaises', icon: <Users className="h-5 w-5" /> },
  { value: '50 000+', label: 'Factures émises', icon: <Receipt className="h-5 w-5" /> },
  { value: '100%', label: 'Conforme DGI/RDC', icon: <Shield className="h-5 w-5" /> },
];

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/dashboard');
  }, [user, loading, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── NAVBAR ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">FactureSmart</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              {['Fonctionnalités', 'Comment ça marche', 'Conformité DGI'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-').replace(/[éè]/g, 'e').replace(/ç/g, 'c')}`}
                  className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Se connecter
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => navigate('/register')}
              >
                Commencer gratuitement
              </Button>
            </div>

            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            {['Fonctionnalités', 'Comment ça marche', 'Conformité DGI'].map((item) => (
              <a key={item} href="#" className="block text-sm font-medium text-gray-600 py-1">
                {item}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>Se connecter</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => navigate('/register')}>
                Commencer gratuitement
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-50/60 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-5 bg-emerald-100 text-emerald-700 border-0 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              🇨🇩 Conforme DGI / RDC
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              La facturation électronique{' '}
              <span className="text-emerald-600">conforme DGI</span>{' '}
              pour les PME congolaises
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              Émettez vos factures FV, FT, FA en quelques secondes. Gérez vos clients, 
              votre caisse POS et vos rapports fiscaux dans un seul outil.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-base font-semibold rounded-xl shadow-lg shadow-emerald-200"
                onClick={() => navigate('/register')}
              >
                Commencer gratuitement
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-6 text-base font-semibold rounded-xl border-gray-200"
                onClick={() => navigate('/login')}
              >
                Voir la démo
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-400">
              {['Aucune carte requise', 'Données hébergées en sécurité', 'Support en français'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="mt-16 relative mx-auto max-w-5xl">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-4 text-xs text-gray-400 font-mono">facturesmart.app/dashboard</span>
              </div>
              <div className="p-6 bg-gray-50/50">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    { label: 'Revenus du mois', value: '$12 450', trend: '+12%', color: 'text-emerald-600' },
                    { label: 'Factures émises', value: '84', trend: '+5', color: 'text-blue-600' },
                    { label: 'Clients actifs', value: '37', trend: '+3', color: 'text-violet-600' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                      <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-emerald-500 font-medium mt-1">{s.trend} ce mois</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Factures récentes</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">DGI Conforme</Badge>
                  </div>
                  {[
                    { num: 'FN-2025-00084', client: 'SNEL Kinshasa', type: 'FV', montant: '$1 200', statut: 'Payée' },
                    { num: 'FN-2025-00083', client: 'Congo Futur SARL', type: 'FT', montant: '$850', statut: 'En attente' },
                    { num: 'FN-2025-00082', client: 'Rawji Group', type: 'FV', montant: '$3 400', statut: 'Payée' },
                  ].map((f) => (
                    <div key={f.num} className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-400">{f.num}</span>
                        <span className="text-sm font-medium text-gray-700">{f.client}</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">{f.type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-900">{f.montant}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.statut === 'Payée' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {f.statut}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4/5 h-8 bg-emerald-100/30 rounded-full blur-2xl" />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-4 bg-emerald-600">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white mb-1">
                  {s.icon}
                </div>
                <span className="text-4xl font-extrabold text-white">{s.value}</span>
                <span className="text-emerald-100 text-sm font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="fonctionnalites" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-0 text-xs font-semibold uppercase tracking-wide">
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Tout ce dont votre PME a besoin
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Une suite complète d'outils pensée pour les entreprises congolaises, conforme aux exigences de la DGI.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-200 bg-white"
              >
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="comment-ca-marche" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-0 text-xs font-semibold uppercase tracking-wide">
              Démarrage rapide
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Opérationnel en 10 minutes
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Pas de formation longue, pas de configuration complexe. Vous êtes prêt à facturer en quelques étapes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-emerald-200" />
                )}
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-xl font-extrabold mb-5 shadow-lg shadow-emerald-200 relative z-10">
                  {step.num}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DGI COMPLIANCE ── */}
      <section id="conformite-dgi" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-0 text-xs font-semibold uppercase tracking-wide">
                Conformité DGI/RDC
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-5">
                100% conforme aux exigences fiscales congolaises
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                FactureSmart implémente rigoureusement toutes les spécifications techniques de la Direction Générale des Impôts (DGI) de la République Démocratique du Congo.
              </p>
              <div className="space-y-4">
                {[
                  { icon: <FileText className="h-5 w-5" />, title: '6 types de factures DGI', desc: 'FV, EV, FT, ET, FA, EA selon la nomenclature officielle' },
                  { icon: <Shield className="h-5 w-5" />, title: 'Groupes TVA A, B, C', desc: '0% exonéré, 16% standard, 0% non taxable' },
                  { icon: <Zap className="h-5 w-5" />, title: 'Numérotation normalisée', desc: 'Format FN-YYYY-NNNNN imposé par la DGI' },
                  { icon: <TrendingUp className="h-5 w-5" />, title: 'Rapports X, Z et A', desc: 'Session, journalier (verrouillé) et mensuel DGI' },
                  { icon: <Lock className="h-5 w-5" />, title: 'DEF ready', desc: 'Prêt pour l\'intégration du Dispositif Électronique Fiscal' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Types de factures supportés</p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {DGI_ITEMS.map((d) => (
                  <div key={d.code} className={`${d.color} rounded-xl px-4 py-3 flex items-center gap-3`}>
                    <span className="text-lg font-extrabold">{d.code}</span>
                    <span className="text-xs font-medium leading-tight">{d.label}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Groupes TVA</p>
                <div className="space-y-2">
                  {[
                    { group: 'Groupe A', taux: '0%', label: 'Exonéré de TVA', color: 'bg-green-100 text-green-700' },
                    { group: 'Groupe B', taux: '16%', label: 'TVA standard', color: 'bg-blue-100 text-blue-700' },
                    { group: 'Groupe C', taux: '0%', label: 'Non taxable', color: 'bg-gray-100 text-gray-600' },
                  ].map((t) => (
                    <div key={t.group} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.color}`}>{t.group}</span>
                        <span className="text-sm text-gray-600">{t.label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{t.taux}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-3xl mx-auto text-center">
          <Globe className="h-10 w-10 text-emerald-200 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5">
            Prêt à moderniser votre facturation ?
          </h2>
          <p className="text-emerald-100 text-lg mb-10 leading-relaxed">
            Rejoignez les PME congolaises qui font confiance à FactureSmart pour leur conformité DGI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-emerald-700 hover:bg-emerald-50 px-8 py-6 text-base font-bold rounded-xl shadow-lg"
              onClick={() => navigate('/register')}
            >
              Créer mon compte gratuitement
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/40 text-white hover:bg-white/10 px-8 py-6 text-base font-semibold rounded-xl"
              onClick={() => navigate('/login')}
            >
              Se connecter
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-bold text-lg">FactureSmart</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Solution SaaS de facturation électronique conforme DGI/RDC pour les PME et PMI congolaises.
              </p>
            </div>
            <div>
              <p className="text-white text-sm font-semibold mb-4">Produit</p>
              <ul className="space-y-2 text-sm">
                {['Fonctionnalités', 'Conformité DGI', 'Tarifs', 'Démo'].map((l) => (
                  <li key={l}><a href="#" className="hover:text-emerald-400 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white text-sm font-semibold mb-4">Compte</p>
              <ul className="space-y-2 text-sm">
                {[
                  { label: 'Se connecter', path: '/login' },
                  { label: "S'inscrire", path: '/register' },
                  { label: 'Réinitialiser mot de passe', path: '/reset-password' },
                ].map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => navigate(l.path)}
                      className="hover:text-emerald-400 transition-colors text-left"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>© {new Date().getFullYear()} FactureSmart — Tous droits réservés</p>
            <p className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Conforme DGI/RDC · Données sécurisées
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
