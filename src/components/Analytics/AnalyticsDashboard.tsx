import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  FileCheck,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
  Calendar,
  Filter,
  ArrowUpRight,
  PieChart as PieChartIcon,
  BarChart3,
  ExternalLink,
  ShieldAlert,
  Percent,
  Download,
  Sparkles,
} from 'lucide-react';
import { InvoiceDocument, Client } from '../../types';
import { formatFCFA } from '../../utils/currency';
import { getStatusInfo } from '../../utils/status';
import {
  computeFinancialMetrics,
  computeMonthlySeries,
  computeRevenue,
  getDocumentTotals,
  isExcludedFromFinancials,
  parseDocumentDate,
  UNPAID_FACTURE_STATUSES,
} from '../../utils/analytics';
import { DateRangePicker, DateRange } from './DateRangePicker';
import { formatDateFR } from '../../utils/date';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface AnalyticsDashboardProps {
  documents: InvoiceDocument[];
  clients: Client[];
  onSelectDocument?: (doc: InvoiceDocument) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  documents,
  clients,
  onSelectDocument,
}) => {
  const [periodPreset, setPeriodPreset] = useState<string>('all');
  const [customRange, setCustomRange] = useState<DateRange>({ startDate: '', endDate: '' });
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'facture' | 'devis'>('all');

  /** Filtre période dédié à la section Chiffre d'affaires */
  const [caPeriod, setCaPeriod] = useState<string>('this_year');
  const [caCustomRange, setCaCustomRange] = useState<DateRange>({ startDate: '', endDate: '' });

  const matchesPeriod = (
    doc: InvoiceDocument,
    preset: string,
    range: DateRange
  ): boolean => {
    if (preset === 'custom') {
      if (range.startDate && (!doc.date || doc.date < range.startDate)) return false;
      if (range.endDate && (!doc.date || doc.date > range.endDate)) return false;
      return true;
    }
    if (preset === 'all') return true;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const docDate = parseDocumentDate(doc.date);
    if (!docDate) return false;

    if (preset === 'this_month') {
      return docDate.getFullYear() === currentYear && docDate.getMonth() === currentMonth;
    }
    if (preset === 'last_month') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return docDate.getFullYear() === lastMonthYear && docDate.getMonth() === lastMonth;
    }
    if (preset === 'this_year') {
      return docDate.getFullYear() === currentYear;
    }
    return true;
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (docTypeFilter !== 'all' && doc.type !== docTypeFilter) return false;
      return matchesPeriod(doc, periodPreset, customRange);
    });
  }, [documents, periodPreset, customRange, docTypeFilter]);

  const caDocuments = useMemo(() => {
    return documents.filter((doc) => matchesPeriod(doc, caPeriod, caCustomRange));
  }, [documents, caPeriod, caCustomRange]);

  const revenue = useMemo(() => computeRevenue(caDocuments), [caDocuments]);

  const caPeriodLabel =
    caPeriod === 'this_month'
      ? 'ce mois'
      : caPeriod === 'last_month'
        ? 'le mois dernier'
        : caPeriod === 'this_year'
          ? 'cette année'
          : caPeriod === 'custom'
            ? 'période personnalisée'
            : 'toutes périodes';

  // KPI + graphique : même moteur que le bandeau Documents
  const stats = useMemo(() => computeFinancialMetrics(filteredDocuments), [filteredDocuments]);
  const monthlyData = useMemo(() => computeMonthlySeries(filteredDocuments), [filteredDocuments]);

  // Contrôle d'intégrité : somme du graphique = KPI (doit toujours coller)
  const chartTotals = useMemo(
    () => ({
      paye: monthlyData.reduce((s, p) => s + p.paye, 0),
      factured: monthlyData.reduce((s, p) => s + p.factured, 0),
    }),
    [monthlyData]
  );

  const statusPieData = useMemo(() => {
    const statusMap: Record<string, number> = {};

    filteredDocuments.forEach((doc) => {
      if (isExcludedFromFinancials(doc.status)) return;
      const totals = getDocumentTotals(doc);
      const label = getStatusInfo(doc.status).label;
      statusMap[label] = (statusMap[label] || 0) + totals.totalTTC;
    });

    const COLORS = ['#2563eb', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#64748b', '#06b6d4'];

    return Object.keys(statusMap).map((key, index) => ({
      name: key,
      value: statusMap[key],
      color: COLORS[index % COLORS.length],
    }));
  }, [filteredDocuments]);

  // Top clients sur le CA facturé (hors annulés / refusés)
  const topClients = useMemo(() => {
    const clientStats = new Map<string, { clientName: string; count: number; totalTTC: number; paidTTC: number }>();

    filteredDocuments.forEach((doc) => {
      if (doc.type !== 'facture' || isExcludedFromFinancials(doc.status)) return;

      const clientName = doc.clientInfo.companyName || doc.clientInfo.name || 'Client Inconnu';
      const totals = getDocumentTotals(doc);

      if (!clientStats.has(clientName)) {
        clientStats.set(clientName, { clientName, count: 0, totalTTC: 0, paidTTC: 0 });
      }

      const current = clientStats.get(clientName)!;
      current.count += 1;
      current.totalTTC += totals.totalTTC;
      if (doc.status === 'payee') {
        current.paidTTC += totals.totalTTC;
      }
    });

    return Array.from(clientStats.values())
      .sort((a, b) => b.totalTTC - a.totalTTC)
      .slice(0, 5);
  }, [filteredDocuments]);

  const pendingInvoicesList = useMemo(() => {
    return filteredDocuments
      .filter(
        (d) =>
          d.type === 'facture' &&
          (UNPAID_FACTURE_STATUSES as readonly string[]).includes(d.status)
      )
      .sort((a, b) => {
        const da = parseDocumentDate(a.dueDate || a.date)?.getTime() ?? 0;
        const db = parseDocumentDate(b.dueDate || b.date)?.getTime() ?? 0;
        return da - db;
      })
      .slice(0, 5);
  }, [filteredDocuments]);

  return (
    <div className="space-y-6 pb-12">
      <div className="glass-nav text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <div className="px-3 py-1 rounded-full bg-white/10 text-brand-glow border border-white/15 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tableau de bord</span>
            </div>
            <span className="text-brand-sand/50 text-xs font-medium">{filteredDocuments.length} document(s)</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-white">Analyse des chiffres</h1>
          <p className="text-xs text-brand-sand/55 mt-1 hidden sm:block">
            Encaissements, impayés et conversion des devis en FCFA.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 w-full md:w-auto backdrop-blur-md">
          <div className="flex items-center gap-1.5 px-2 text-brand-sand/55 text-xs font-bold">
            <Filter className="w-3.5 h-3.5 text-brand-glow" />
            <span>Filtres</span>
          </div>

          <DateRangePicker
            dateRange={customRange}
            onChange={(newRange) => setCustomRange(newRange)}
            preset={periodPreset}
            onPresetChange={(newPreset) => setPeriodPreset(newPreset)}
          />

          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value as any)}
            className="w-full sm:w-auto bg-white/10 text-brand-paper text-xs font-bold rounded-xl px-3 py-2.5 sm:py-2 border border-white/15 focus:outline-none focus:ring-2 focus:ring-brand-glow/40 cursor-pointer"
          >
            <option value="all">Tous les types</option>
            <option value="facture">Factures uniquement</option>
            <option value="devis">Devis uniquement</option>
          </select>
        </div>
      </div>

      {/* ——— Votre chiffre d'affaires (factures statut Payé) ——— */}
      <section className="glass-card rounded-3xl overflow-hidden border border-brand-glow/20">
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-br from-brand-glow/10 via-transparent to-sky-500/5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="page-kicker !text-brand-glow">Performance</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-sand/45 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  Statut Payé uniquement
                </span>
              </div>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-brand-sand tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-glow shrink-0" />
                Votre chiffre d&apos;affaires
              </h2>
              <p className="text-xs text-brand-sand/50 mt-1">
                Somme TTC des factures payées · filtre {caPeriodLabel}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
              <div className="glass-segment !p-0.5">
                {(
                  [
                    ['this_month', 'Ce mois'],
                    ['last_month', 'Mois dern.'],
                    ['this_year', 'Cette année'],
                    ['all', 'Tout'],
                    ['custom', 'Perso.'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setCaPeriod(id);
                      if (id !== 'custom') setCaCustomRange({ startDate: '', endDate: '' });
                    }}
                    className={`glass-segment-btn !px-2.5 !py-1.5 !text-[11px] ${
                      caPeriod === id ? 'is-active' : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {caPeriod === 'custom' && (
                <DateRangePicker
                  dateRange={caCustomRange}
                  onChange={setCaCustomRange}
                  preset="custom"
                  onPresetChange={() => setCaPeriod('custom')}
                />
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 rounded-2xl bg-black/20 border border-white/10 p-4 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-sand/45 mb-1">
                CA encaissé
              </p>
              <p className="kpi-figure font-mono text-2xl sm:text-3xl font-black text-brand-glow tracking-tight">
                {formatFCFA(revenue.totalCA)}
              </p>
            </div>
            <div className="rounded-2xl bg-black/15 border border-white/10 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-sand/45 mb-1">
                Factures payées
              </p>
              <p className="kpi-figure text-2xl font-black text-brand-sand">
                {revenue.countPaid}
              </p>
              <p className="text-[11px] text-brand-sand/45 mt-1">document(s) statut Payé</p>
            </div>
            <div className="rounded-2xl bg-black/15 border border-white/10 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-sand/45 mb-1">
                Ticket moyen
              </p>
              <p className="kpi-figure text-xl sm:text-2xl font-black text-brand-sand">
                {formatFCFA(revenue.averageTicket)}
              </p>
              <p className="text-[11px] text-brand-sand/45 mt-1">par facture payée</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:divide-x divide-white/10">
          <div className="lg:col-span-3 p-5 sm:p-6">
            <h3 className="text-sm font-bold text-brand-sand mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-glow" />
              CA par mois
            </h3>
            <div className="h-52 w-full">
              {revenue.byMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue.byMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number | string) => [formatFCFA(Number(value)), 'CA']}
                      labelFormatter={(label) => String(label)}
                      cursor={{ fill: 'rgba(45, 212, 191, 0.12)', radius: 8 }}
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(8,32,30,0.95)',
                        color: '#e2e8f0',
                      }}
                      itemStyle={{ color: '#5eead4' }}
                      labelStyle={{ color: '#e8dfd2' }}
                    />
                    <Bar
                      dataKey="ca"
                      name="CA"
                      fill="#2dd4bf"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={48}
                      activeBar={{ fill: '#5eead4', stroke: '#99f6e4', strokeWidth: 1 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-brand-sand/40 text-xs gap-2">
                  <DollarSign className="w-8 h-8 opacity-50" />
                  <span>Aucune facture payée sur cette période</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 p-5 sm:p-6 border-t lg:border-t-0 border-white/10">
            <h3 className="text-sm font-bold text-brand-sand mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-brand-glow" />
              Factures payées
            </h3>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {revenue.paidDocuments.length > 0 ? (
                revenue.paidDocuments.slice(0, 8).map((doc) => {
                  const ttc = getDocumentTotals(doc).totalTTC;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onSelectDocument?.(doc)}
                      className="w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] font-bold text-brand-glow truncate">
                          {doc.number}
                        </div>
                        <div className="text-[11px] text-brand-sand/55 truncate">
                          {doc.clientInfo.companyName || doc.clientInfo.name}
                          {doc.date ? ` · ${formatDateFR(doc.date)}` : ''}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-brand-sand">
                          {formatFCFA(ttc)}
                        </span>
                        {onSelectDocument && <ExternalLink className="w-3.5 h-3.5 text-brand-sand/35" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-brand-sand/40 py-6 text-center">
                  Passez des factures en statut « Payé » pour voir le CA ici.
                </p>
              )}
              {revenue.paidDocuments.length > 8 && (
                <p className="text-[10px] text-brand-sand/40 text-center pt-1">
                  +{revenue.paidDocuments.length - 8} autre(s)
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Encaissé */}
        <div className="hover-lift glass-card kpi-card p-5 pl-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-brand-mid/10 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="page-kicker">Encaissements</span>
            <div className="icon-well !w-10 !h-10">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="kpi-figure text-2xl text-brand-sand tracking-tight">
            {formatFCFA(stats.totalPaid)}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">{stats.countPaid} facture(s) payée(s)</span>
            <span className="text-brand-ink font-extrabold bg-brand-mist px-2 py-0.5 rounded-lg border border-brand-mid/25">
              {stats.paymentRate}% récouvré
            </span>
          </div>
        </div>

        {/* Card 2: En Attente / Impayés */}
        <div className="hover-lift glass-card kpi-card kpi-card-amber p-5 pl-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="page-kicker !text-amber-300">À encaisser</span>
            <div className="icon-well icon-well-amber !w-10 !h-10">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="kpi-figure text-2xl text-amber-300 tracking-tight">
            {formatFCFA(stats.totalPending)}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">{stats.countPending} en cours</span>
            {stats.countOverdue > 0 && (
              <span className="text-rose-700 font-extrabold bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {stats.countOverdue} en retard
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Total Facturé */}
        <div className="hover-lift glass-card kpi-card p-5 pl-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-brand-mid/10 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="page-kicker">Volume facturé</span>
            <div className="icon-well !w-10 !h-10">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="kpi-figure text-2xl text-brand-sand tracking-tight">
            {formatFCFA(stats.totalFactured)}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">Hors Taxes : {formatFCFA(stats.totalFacturedHT)}</span>
            <span className="text-slate-500 font-medium">{stats.countFactures} facture(s)</span>
          </div>
        </div>

        {/* Card 4: Volume & Taux Devis */}
        <div className="hover-lift glass-card kpi-card p-5 pl-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-brand-mid/10 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="page-kicker">Devis en cours</span>
            <div className="icon-well !w-10 !h-10">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="kpi-figure text-2xl text-brand-sand tracking-tight">
            {formatFCFA(stats.totalDevisPipeline)}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">{stats.countDevis} devis · encours actif</span>
            <span className="text-brand-ink font-black bg-brand-mist px-2 py-0.5 rounded-lg border border-brand-mid/25">
              {stats.devisConversionRate}% convertis
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue & Invoicing Trend Area Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-mid" />
                <span>Évolution Mensuelle des Revenus (FCFA)</span>
              </h3>
              <p className="text-xs text-slate-500">Comparatif entre le montant facturé et les encaissements réels</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-brand-ink">
                <span className="w-3 h-3 rounded-full bg-blue-700"></span>
                <span>Encaissé</span>
              </span>
              <span className="flex items-center gap-1.5 text-sky-700">
                <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                <span>Total Facturé</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPaye" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorFactured" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatFCFA(Number(value)), '']}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="factured" name="Facturé" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFactured)" />
                  <Area type="monotone" dataKey="paye" name="Encaissé" stroke="#1d4ed8" strokeWidth={3} fillOpacity={1} fill="url(#colorPaye)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <BarChart3 className="w-10 h-10 mb-2 opacity-40" />
                <span>Aucune donnée enregistrée sur cette période</span>
              </div>
            )}
          </div>

          {/* Totaux = KPI (contrôle d'alignement avec les données générales) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-[11px]">
            <div className="flex flex-wrap items-center gap-4 font-semibold">
              <span className="text-brand-ink">
                Σ Encaissé : <span className="font-mono font-black">{formatFCFA(chartTotals.paye)}</span>
              </span>
              <span className="text-brand-ink">
                Σ Facturé : <span className="font-mono font-black">{formatFCFA(chartTotals.factured)}</span>
              </span>
            </div>
            <span
              className={
                chartTotals.paye === stats.totalPaid && chartTotals.factured === stats.totalFactured
                  ? 'text-brand-mid font-bold'
                  : 'text-rose-600 font-bold'
              }
            >
              {chartTotals.paye === stats.totalPaid && chartTotals.factured === stats.totalFactured
                ? 'Aligné avec les KPI'
                : 'Écart détecté — vérifier les dates'}
            </span>
          </div>
        </div>

        {/* Status Distribution Donut/Pie Chart */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
              <span>Répartition par Statut</span>
            </h3>
            <p className="text-xs text-slate-500">Poids financier par étape de traitement</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [formatFCFA(Number(val)), 'Montant']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs text-center">
                <span>Pas de documents à afficher</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span>{item.name}</span>
                </span>
                <span className="font-mono font-bold text-slate-900">{formatFCFA(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Clients & Overdue Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients Leaderboard */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-mid" />
                <span>Top Clients par Chiffre d'Affaires</span>
              </h3>
              <p className="text-xs text-slate-500">Les 5 clients les plus importants en volume</p>
            </div>
            <span className="text-[10px] font-extrabold uppercase bg-brand-mist text-brand-ink px-2.5 py-1 rounded-lg border border-brand-mid/25">
              Classement
            </span>
          </div>

          <div className="space-y-3">
            {topClients.length > 0 ? (
              topClients.map((cli, idx) => {
                const paidPct = cli.totalTTC > 0 ? Math.round((cli.paidTTC / cli.totalTTC) * 100) : 0;
                return (
                  <div key={cli.clientName} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-brand-ink text-white font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-black text-slate-900 text-xs">{cli.clientName}</div>
                          <div className="text-[10px] text-slate-500">{cli.count} document(s) émis</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-slate-900 text-xs">{formatFCFA(cli.totalTTC)}</div>
                        <div className="text-[10px] font-semibold text-brand-ink">Encaissé : {formatFCFA(cli.paidTTC)}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-glow h-full rounded-full transition-all duration-500"
                        style={{ width: `${paidPct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                <span>Aucune donnée client pour l'instant</span>
              </div>
            )}
          </div>
        </div>

        {/* Pending & Overdue Invoices Alert Section */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Factures à Relancer & Impayés</span>
              </h3>
              <p className="text-xs text-slate-500">Prochaines échéances et retards de règlement</p>
            </div>
            <span className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200">
              Relances
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingInvoicesList.length > 0 ? (
              pendingInvoicesList.map((doc) => {
                const totals = getDocumentTotals(doc);
                const status = getStatusInfo(doc.status);
                const isOverdue = doc.status === 'en_retard';

                return (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDocument && onSelectDocument(doc)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isOverdue ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-50' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{doc.number}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${status.bgClass}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700">{doc.clientInfo.companyName || doc.clientInfo.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Échéance : <strong>{formatDateFR(doc.dueDate || doc.date)}</strong></span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="font-mono font-black text-xs text-slate-900">{formatFCFA(totals.totalTTC)}</div>
                        <div className="text-[10px] text-brand-ink font-bold hover:underline">Voir & relancer &rarr;</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                <CheckCircle2 className="w-8 h-8 text-blue-500 mx-auto opacity-80" />
                <p className="font-bold text-slate-700">Toutes les factures sont à jour !</p>
                <p>Aucun retard ou impayé détecté sur cette période.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
