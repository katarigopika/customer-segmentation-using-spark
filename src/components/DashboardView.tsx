import { useMemo } from 'react';
import { Doughnut, Scatter } from 'react-chartjs-2';
import {
  ArrowRight,
  Award,
  DollarSign,
  Layers,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { DashboardPayload, NavSection } from '../types/segmentation';
import { ensureChartJsRegistered, shortenSegmentName } from '../utils/chartConfig';
import { AnimatedCounter } from './AnimatedCounter';

ensureChartJsRegistered();

interface DashboardViewProps {
  data: DashboardPayload;
  onNavigate: (section: NavSection) => void;
  onInspectSegment: (segmentName: string) => void;
}

export function DashboardView({
  data,
  onNavigate,
  onInspectSegment,
}: DashboardViewProps) {
  const { kpis, segments, customers, model } = data;

  const kpiCards = [
    {
      label: 'Total Customers',
      value: kpis.totalCustomers,
      decimals: 0,
      prefix: '',
      suffix: '',
      subtext: 'Clustered customer profiles',
      icon: Users,
      accent: 'from-blue-600 to-indigo-600',
    },
    {
      label: 'Total Segments',
      value: kpis.totalSegments,
      decimals: 0,
      prefix: '',
      suffix: '',
      subtext: 'K-Means optimal clusters',
      icon: Layers,
      accent: 'from-indigo-600 to-purple-600',
    },
    {
      label: 'Avg Annual Income',
      value: kpis.avgAnnualIncome,
      decimals: 2,
      prefix: '$',
      suffix: 'k',
      subtext: 'Mean annual household income',
      icon: DollarSign,
      accent: 'from-sky-500 to-blue-600',
    },
    {
      label: 'Avg Spending Score',
      value: kpis.avgSpendingScore,
      decimals: 2,
      prefix: '',
      suffix: ' / 100',
      subtext: 'Behavioral expenditure index',
      icon: TrendingUp,
      accent: 'from-purple-600 to-fuchsia-600',
    },
    {
      label: 'Silhouette Score',
      value: kpis.silhouetteScore,
      decimals: 4,
      prefix: '',
      suffix: '',
      subtext: `Training cost ${model.trainingCost.toFixed(4)}`,
      icon: Award,
      accent: 'from-emerald-500 to-teal-600',
    },
  ];

  const scatterData = useMemo(() => {
    const datasets = segments.map((seg) => ({
      label: shortenSegmentName(seg.name),
      data: customers
        .filter((c) => c.segment === seg.name)
        .map((c) => ({
          x: c.annualIncome,
          y: c.spendingScore,
          customerId: c.customerId,
          age: c.age,
          gender: c.gender,
          fullSegment: seg.name,
        })),
      backgroundColor: `${seg.color}CC`,
      borderColor: seg.color,
      borderWidth: 1,
      pointRadius: 4.5,
      pointHoverRadius: 7,
    }));

    return { datasets };
  }, [customers, segments]);

  const scatterOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 16,
            font: { size: 12 },
          },
        },
        tooltip: {
          backgroundColor: '#0F172A',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: { raw: unknown }) => {
              const pt = ctx.raw as {
                x: number;
                y: number;
                customerId: number;
                age: number;
                gender: string;
                fullSegment: string;
              };
              return [
                `Customer #${pt.customerId} (${pt.gender}, Age ${pt.age})`,
                `Segment: ${pt.fullSegment}`,
                `Income: $${pt.x}k · Spending Score: ${pt.y}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Annual Income (k$)',
            font: { size: 12, weight: 600 as const },
            color: '#475569',
          },
          grid: { color: '#F1F5F9' },
        },
        y: {
          title: {
            display: true,
            text: 'Spending Score (1–100)',
            font: { size: 12, weight: 600 as const },
            color: '#475569',
          },
          min: 0,
          max: 105,
          grid: { color: '#F1F5F9' },
        },
      },
    }),
    []
  );

  const doughnutData = useMemo(
    () => ({
      labels: segments.map((s) => shortenSegmentName(s.name)),
      datasets: [
        {
          data: segments.map((s) => s.count),
          backgroundColor: segments.map((s) => s.color),
          borderColor: '#FFFFFF',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }),
    [segments]
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 14,
            font: { size: 12 },
          },
        },
        tooltip: {
          backgroundColor: '#0F172A',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: { label?: string; parsed: number }) => {
              const pct = ((ctx.parsed / Math.max(1, kpis.totalCustomers)) * 100).toFixed(1);
              return ` ${ctx.label}: ${ctx.parsed} customers (${pct}%)`;
            },
          },
        },
      },
    }),
    [kpis.totalCustomers]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Customer Segmentation Overview
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Unsupervised K-Means clustering across annual income and spending velocity using Apache Spark.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Upload New CSV
          </button>
          <button
            type="button"
            onClick={() => onNavigate('visualization')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xs transition-all whitespace-nowrap"
          >
            <span>All 6 Charts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center text-white shadow-xs shrink-0`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-3 font-display text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                <AnimatedCounter
                  value={card.value}
                  decimals={card.decimals}
                  prefix={card.prefix}
                  suffix={card.suffix}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">{card.subtext}</p>
            </div>
          );
        })}
      </section>

      {/* Primary Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Customer Segmentation Scatter Plot
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Annual Income (k$) vs Spending Score (1–100) across {kpis.totalSegments} Spark clusters
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('visualization')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
            >
              Expand view →
            </button>
          </div>
          <div className="h-[340px] w-full">
            <Scatter data={scatterData} options={scatterOptions} />
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Segment Share Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Proportion of {kpis.totalCustomers} customers per K-Means group
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('segments')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
            >
              Compare all →
            </button>
          </div>
          <div className="h-[340px] w-full">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </section>

      {/* Segment Summary Table */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Segment Performance Snapshot
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any segment row to filter the customer directory
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            {segments.length} segments · {kpis.totalCustomers} total customers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Segment</th>
                <th className="py-3 px-4 text-right">Customers</th>
                <th className="py-3 px-4 text-right">Share</th>
                <th className="py-3 px-4 text-right">Avg Income</th>
                <th className="py-3 px-4 text-right">Avg Spending</th>
                <th className="py-3 px-6 text-right">Avg Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {segments.map((seg) => (
                <tr
                  key={seg.name}
                  onClick={() => onInspectSegment(seg.name)}
                  className="hover:bg-slate-50/90 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-6 font-medium text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                        aria-hidden="true"
                      />
                      <span>{seg.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {seg.count}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600">
                    {seg.percentage.toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    ${seg.avgIncome.toFixed(2)}k
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {seg.avgSpending.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono tabular-nums text-slate-600">
                    {seg.avgAge.toFixed(1)} yrs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
