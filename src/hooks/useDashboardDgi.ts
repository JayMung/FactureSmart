import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  // Ventes du jour
  ventesJourUsd: number;
  ventesJourCdf: number;
  objectifMensuel: number;
  progressMensuel: number;

  // Factures
  totalFactures: number;
  facturesValidees: number;
  facturesEnAttente: number;
  facturesAnnulees: number;
  montantEnAttente: number;

  // Caisse
  balanceCaisse: number;
  totalEspeces: number;
  totalBancaire: number;

  // DGI
  conformiteDgi: boolean;
  nonConformites: number;
  DerniereDeclaration?: {
    mois: number;
    annee: number;
    statut: string;
  };
}

export interface ChartDataPoint {
  month: string;
  htv: number;
  tva: number;
  ttc: number;
}

export interface TopArticle {
  description: string;
  totalVentes: number;
  count: number;
}

export interface RecentFacture {
  id: string;
  facture_number: string;
  client_nom: string;
  total_general: number;
  devise: string;
  statut: string;
  date_emission: string;
}

export const useDashboardDgi = () => {
  const [stats, setStats] = useState<DashboardStats>({
    ventesJourUsd: 0,
    ventesJourCdf: 0,
    objectifMensuel: 10000000,
    progressMensuel: 0,
    totalFactures: 0,
    facturesValidees: 0,
    facturesEnAttente: 0,
    facturesAnnulees: 0,
    montantEnAttente: 0,
    balanceCaisse: 0,
    totalEspeces: 0,
    totalBancaire: 0,
    conformiteDgi: true,
    nonConformites: 0,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
  const [recentFactures, setRecentFactures] = useState<RecentFacture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

      // Parallel queries
      const [
        todaySales,
        monthSales,
        facturesByStatut,
        CaisseSessions,
        last6MonthsChart,
        topArts,
        recentFact
      ] = await Promise.all([
        // Today's sales
        supabase
          .from('factures')
          .select('total_general, devise')
          .eq('statut', 'payee')
          .gte('date_emission', startOfDay)
          .lte('date_emission', endOfDay),

        // Month's sales
        supabase
          .from('factures')
          .select('total_general, devise')
          .eq('statut', 'payee')
          .gte('date_emission', startOfMonth)
          .lte('date_emission', endOfMonth),

        // Factures count by statut
        supabase
          .from('factures')
          .select('statut, total_general, devise', { count: 'exact' }),

        // Active caisse sessions
        supabase
          .from('caisse_sessions')
          .select('total_ventes, total_especes, total_carte')
          .eq('statut', 'ouverte')
          .order('opened_at', { ascending: false })
          .limit(1),

        // Last 6 months chart data
        (async () => {
          const months: ChartDataPoint[] = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
            const monthLabel = d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });

            const { data } = await supabase
              .from('factures')
              .select('subtotal, total_general, devise')
              .eq('statut', 'payee')
              .gte('date_emission', start)
              .lte('date_emission', end);

            let htv = 0;
            let ttc = 0;
            (data || []).forEach((f: any) => {
              if (f.devise === 'USD') {
                htv += f.subtotal || 0;
                ttc += f.total_general || 0;
              }
            });
            const tva = ttc - htv;
            months.push({ month: monthLabel, htv, tva, ttc });
          }
          return months;
        })(),

        // Top 5 articles by sales
        (async () => {
          const { data } = await supabase
            .from('facture_items')
            .select('description, montant_total')
            .order('montant_total', { ascending: false })
            .limit(20);

          const map = new Map<string, { totalVentes: number; count: number }>();
          (data || []).forEach((item: any) => {
            const existing = map.get(item.description) || { totalVentes: 0, count: 0 };
            map.set(item.description, {
              totalVentes: existing.totalVentes + (item.montant_total || 0),
              count: existing.count + 1,
            });
          });

          return Array.from(map.entries())
            .sort((a, b) => b[1].totalVentes - a[1].totalVentes)
            .slice(0, 5)
            .map(([description, v]) => ({ description, ...v }));
        })(),

        // Recent 5 factures
        supabase
          .from('factures')
          .select('id, facture_number, total_general, devise, statut, date_emission, clients(nom)')
          .order('date_emission', { ascending: false })
          .limit(5),
      ]);

      // Process today's sales
      let ventesJourUsd = 0;
      let ventesJourCdf = 0;
      (todaySales.data || []).forEach((f: any) => {
        if (f.devise === 'USD') ventesJourUsd += f.total_general || 0;
        else if (f.devise === 'CDF') ventesJourCdf += f.total_general || 0;
      });

      // Process month sales for progress
      let monthTotalUsd = 0;
      (monthSales.data || []).forEach((f: any) => {
        if (f.devise === 'USD') monthTotalUsd += f.total_general || 0;
      });
      const progressMensuel = Math.min(100, Math.round((monthTotalUsd / stats.objectifMensuel) * 100));

      // Process factures by statut
      const statutCounts = { validee: 0, en_attente: 0, annulee: 0, payee: 0 };
      let montantEnAttente = 0;
      (facturesByStatut.data || []).forEach((f: any) => {
        if (f.statut in statutCounts) {
          statutCounts[f.statut as keyof typeof statutCounts]++;
        }
        if (f.statut === 'en_attente' && f.devise === 'USD') {
          montantEnAttente += f.total_general || 0;
        }
      });

      // Process caisse session
      const session = CaisseSessions.data?.[0];
      const balanceCaisse = session ? (session.total_ventes || 0) : 0;
      const totalEspeces = session ? (session.total_especes || 0) : 0;
      const totalBancaire = session ? (session.total_carte || 0) : 0;

      // Recent factures
      const recent: RecentFacture[] = (recentFact.data || []).map((f: any) => ({
        id: f.id,
        facture_number: f.facture_number,
        client_nom: f.clients?.nom || 'Client anonyme',
        total_general: f.total_general,
        devise: f.devise,
        statut: f.statut,
        date_emission: f.date_emission,
      }));

      setStats({
        ventesJourUsd,
        ventesJourCdf,
        objectifMensuel: stats.objectifMensuel,
        progressMensuel,
        totalFactures: facturesByStatut.count || 0,
        facturesValidees: statutCounts.validee,
        facturesEnAttente: statutCounts.en_attente,
        facturesAnnulees: statutCounts.annulee,
        montantEnAttente,
        balanceCaisse,
        totalEspeces,
        totalBancaire,
        conformiteDgi: true,
        nonConformites: 0,
      });

      setChartData(last6MonthsChart as ChartDataPoint[]);
      setTopArticles(topArts as TopArticle[]);
      setRecentFactures(recent);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { stats, chartData, topArticles, recentFactures, isLoading, refetch: fetchDashboardData };
};
