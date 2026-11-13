import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import type { CustomerRecord, SegmentSummary } from '../types/segmentation';
import { ensureChartJsRegistered, shortenSegmentName } from '../utils/chartConfig';

ensureChartJsRegistered();

interface AnalyticsViewProps {
  customers: CustomerRecord[];
  segments: SegmentSummary[];
  onInspectSegment: (segmentName: string) => void;
}

export function AnalyticsView({
  customers,
  segments,
  onInspectSegment,
}: AnalyticsViewProps) {
  const genderStats = useMemo(() => {
    const female = customers.filter((c) => c.gender.toLowerCase() === 'female');
    const male = customers.filter((c) => c.gender.toLowerCase() === 'male');
    const avg = (arr: CustomerRecord[], key: 'annualIncome' | 'spendingScore' | 'age') =>
      arr.length ? arr.reduce((s, r) => s + r[key], 0) / arr.length : 0;

    return {
      femaleCount: female.length,
      maleCount: male.length,
      femaleIncome: avg(female, 'annualIncome'),
      maleIncome: avg(male, 'annualIncome'),
      femaleSpending: avg(female, 'spendingScore'),
      maleSpending: avg(male, 'spendingScore'),
      femaleAge: avg(female, 'age'),
      maleAge: avg(male, 'age'),
    };
  }, [customers]);

  const ageBracketData = useMemo(() => {
    const brackets = [
      { label: '18–25', min: 18, max: 25 },
      { label: '26–35', min: 26, max: 35 },
      { label: '36–45', min: 36, max: 45 },
      { label: '46–55', min: 46, max: 55 },
      { label: '56+', min: 56, max: 120 },
    ];

    const counts = brackets.map(
      (b) => customers.filter((c) => c.age >= b.min && c.age <= b.max).length
    );
    const avgSpend = brackets.map((b) => {
      const subset = customers.filter((c) => c.age >= b.min && c.age <= b.max);
      return subset.length
        ? Number(
            (subset.reduce((s, c) => s + c.spendingScore, 0) / subset.length).toFixed(1)
          )
        : 0;
    });

    return {
      labels: brackets.map((b) => b.label),
      datasets: [
        {
          label: 'Customer Count',
          data: counts,
          backgroundColor: '#4F46E5',
          borderRadius: 6,
        },
        {
          label: 'Avg Spending Score',
          data: avgSpend,
          backgroundColor: '#9333EA',
          borderRadius: 6,
        },
      ],
    };
  }, [customers]);

  const genderBySegmentData = useMemo(
    () => ({
      labels: segments.map((s) => shortenSegmentName(s.name)),
      datasets: [
        {
          label: 'Female',
          data: segments.map((s) => s.femaleCount),
          backgroundColor: '#7C3AED',
          borderRadius: 6,
        },
        {
          label: 'Male',
          data: segments.map((s) => s.maleCount),
          backgroundColor: '#0EA5E9',
          borderRadius: 6,
        },
      ],
    }),
    [segments]
  );

  const highestValueSegment = useMemo(() => {
    if (segments.length === 0) return null;
    return [...segments].sort(
      (a, b) => b.avgIncome * b.avgSpending - a.avgIncome * a.avgSpending
    )[0];
  }, [segments]);

  const largestSegment = useMemo(() => {
    if (segments.length === 0) return null;
    return [...segments].sort((a, b) => b.count - a.count)[0];
  }, [segments]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Customer Analytics
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Demographic composition, purchasing behavior by age cohort, and segment targeting insights.
        </p>
      </div>

      {/* Insight Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Gender Balance</span>
          </div>
          <p className="font-display text-xl font-bold text-slate-900 mt-2 tabular-nums">
            {genderStats.femaleCount} Female · {genderStats.maleCount} Male
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            Avg spending: {genderStats.femaleSpending.toFixed(1)} (F) vs{' '}
            {genderStats.maleSpending.toFixed(1)} (M)
          </p>
        </div>

        {largestSegment && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Largest Cluster</span>
            </div>
            <p className="font-display text-lg font-bold text-slate-900 mt-2 truncate">
              {largestSegment.name}
            </p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">
              {largestSegment.count} customers ({largestSegment.percentage.toFixed(1)}% share)
            </p>
          </div>
        )}

        {highestValueSegment && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Target className="w-4 h-4 text-purple-600" />
              <span>Prime Revenue Segment</span>
            </div>
            <p className="font-display text-lg font-bold text-slate-900 mt-2 truncate">
              {highestValueSegment.name}
            </p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">
              ${highestValueSegment.avgIncome.toFixed(1)}k income ·{' '}
              {highestValueSegment.avgSpending.toFixed(1)} score
            </p>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Age Cohort Volume & Spending Score
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Distribution of customers and mean spending score across age brackets
          </p>
          <div className="h-[300px]">
            <Bar
              data={ageBracketData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: { backgroundColor: '#0F172A', padding: 10, cornerRadius: 8 },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: '#F1F5F9' }, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Gender Composition by Segment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Male and female representation inside each Spark K-Means cluster
          </p>
          <div className="h-[300px]">
            <Bar
              data={genderBySegmentData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: { backgroundColor: '#0F172A', padding: 10, cornerRadius: 8 },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: '#F1F5F9' }, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Actionable Campaign Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h2 className="font-display text-base font-semibold text-slate-900">
            Segment Playbook & Recommended Actions
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {segments.map((seg) => (
            <div
              key={seg.name}
              className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <h3 className="text-sm font-semibold text-slate-900">{seg.name}</h3>
                  <span className="text-xs text-slate-500 tabular-nums">
                    ({seg.count} customers · Avg Age {seg.avgAge.toFixed(1)})
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {seg.strategy}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onInspectSegment(seg.name)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors whitespace-nowrap shrink-0 self-start md:self-center"
              >
                Inspect Segment
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
