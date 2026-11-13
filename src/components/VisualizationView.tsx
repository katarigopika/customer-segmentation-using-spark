import { useMemo, useState } from 'react';
import { Bar, Doughnut, Line, Scatter } from 'react-chartjs-2';
import type { CustomerRecord, SegmentCentroid, SegmentSummary } from '../types/segmentation';
import { ensureChartJsRegistered, shortenSegmentName } from '../utils/chartConfig';

ensureChartJsRegistered();

interface VisualizationViewProps {
  customers: CustomerRecord[];
  segments: SegmentSummary[];
  centroids: SegmentCentroid[];
}

export function VisualizationView({
  customers,
  segments,
  centroids,
}: VisualizationViewProps) {
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');

  const filteredCustomers = useMemo(() => {
    if (selectedSegment === 'ALL') return customers;
    return customers.filter((c) => c.segment === selectedSegment);
  }, [customers, selectedSegment]);

  // 1. Customer Segmentation Scatter Plot (with centroids)
  const segmentedScatterData = useMemo(() => {
    const clusterDatasets = segments.map((seg) => ({
      label: shortenSegmentName(seg.name),
      data: filteredCustomers
        .filter((c) => c.segment === seg.name)
        .map((c) => ({
          x: c.annualIncome,
          y: c.spendingScore,
          customerId: c.customerId,
          segment: seg.name,
        })),
      backgroundColor: `${seg.color}BF`,
      borderColor: seg.color,
      borderWidth: 1,
      pointRadius: 4.5,
      pointHoverRadius: 7,
    }));

    const centroidDataset = {
      label: 'Cluster Centroids',
      data: centroids
        .filter((c) => selectedSegment === 'ALL' || c.segment === selectedSegment)
        .map((c) => ({
          x: c.avgIncome,
          y: c.avgSpending,
          segment: c.segment,
        })),
      backgroundColor: '#0F172A',
      borderColor: '#FFFFFF',
      borderWidth: 2,
      pointStyle: 'rectRot' as const,
      pointRadius: 8,
      pointHoverRadius: 10,
    };

    return { datasets: [...clusterDatasets, centroidDataset] };
  }, [segments, filteredCustomers, centroids, selectedSegment]);

  // 2. Number of Customers by Segment (Bar Chart)
  const customerCountBarData = useMemo(
    () => ({
      labels: segments.map((s) => shortenSegmentName(s.name)),
      datasets: [
        {
          label: 'Customers',
          data: segments.map((s) => s.count),
          backgroundColor: segments.map((s) => s.color),
          borderRadius: 8,
        },
      ],
    }),
    [segments]
  );

  // 3. Customer Distribution (Doughnut Chart)
  const distributionDoughnutData = useMemo(
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

  // 4. Average Income by Segment (Bar Chart)
  const avgIncomeBarData = useMemo(
    () => ({
      labels: segments.map((s) => shortenSegmentName(s.name)),
      datasets: [
        {
          label: 'Average Annual Income (k$)',
          data: segments.map((s) => s.avgIncome),
          backgroundColor: '#2563EB',
          borderRadius: 8,
        },
      ],
    }),
    [segments]
  );

  // 5. Average Spending by Segment (Line Chart)
  const avgSpendingLineData = useMemo(
    () => ({
      labels: segments.map((s) => shortenSegmentName(s.name)),
      datasets: [
        {
          label: 'Average Spending Score',
          data: segments.map((s) => s.avgSpending),
          borderColor: '#9333EA',
          backgroundColor: 'rgba(147, 51, 234, 0.14)',
          pointBackgroundColor: segments.map((s) => s.color),
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 6,
          tension: 0.35,
          fill: true,
        },
      ],
    }),
    [segments]
  );

  // 6. Income vs Spending Score by Gender (Scatter Plot)
  const genderScatterData = useMemo(
    () => ({
      datasets: [
        {
          label: 'Female',
          data: filteredCustomers
            .filter((c) => c.gender.toLowerCase() === 'female')
            .map((c) => ({
              x: c.annualIncome,
              y: c.spendingScore,
              customerId: c.customerId,
              age: c.age,
              segment: c.segment,
            })),
          backgroundColor: 'rgba(147, 51, 234, 0.72)',
          borderColor: '#9333EA',
          pointRadius: 4.5,
          pointHoverRadius: 7,
        },
        {
          label: 'Male',
          data: filteredCustomers
            .filter((c) => c.gender.toLowerCase() === 'male')
            .map((c) => ({
              x: c.annualIncome,
              y: c.spendingScore,
              customerId: c.customerId,
              age: c.age,
              segment: c.segment,
            })),
          backgroundColor: 'rgba(14, 165, 233, 0.75)',
          borderColor: '#0284C7',
          pointRadius: 4.5,
          pointHoverRadius: 7,
        },
      ],
    }),
    [filteredCustomers]
  );

  const commonTooltip = {
    backgroundColor: '#0F172A',
    padding: 10,
    cornerRadius: 8,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Interactive Data Visualization
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Six interactive Chart.js views exploring cluster boundaries, income distributions, and spending profiles.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="viz-segment-filter" className="text-xs font-medium text-slate-600">
            Filter scatter plots:
          </label>
          <select
            id="viz-segment-filter"
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Segments ({customers.length})</option>
            {segments.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Customer Segmentation Scatter Plot */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h2 className="font-display text-base font-semibold text-slate-900">
            1. Customer Segmentation Scatter Plot
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            K-Means cluster assignments and diamond centroid markers
          </p>
          <div className="h-[320px]">
            <Scatter
              data={segmentedScatterData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
                  tooltip: {
                    ...commonTooltip,
                    callbacks: {
                      label: (ctx) => {
                        const raw = ctx.raw as {
                          x: number;
                          y: number;
                          customerId?: number;
                          segment: string;
                        };
                        return raw.customerId
                          ? `#${raw.customerId} (${raw.segment}): $${raw.x}k, Score ${raw.y}`
                          : `Centroid (${raw.segment}): $${raw.x}k, Score ${raw.y}`;
                      },
                    },
                  },
                },
                scales: {
                  x: { title: { display: true, text: 'Annual Income (k$)' }, grid: { color: '#F1F5F9' } },
                  y: {
                    title: { display: true, text: 'Spending Score (1–100)' },
                    min: 0,
                    max: 105,
                    grid: { color: '#F1F5F9' },
                  },
                },
              }}
            />
          </div>
        </section>

        {/* Chart 2: Number of Customers by Segment */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h2 className="font-display text-base font-semibold text-slate-900">
            2. Number of Customers by Segment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Total headcount across each discovered behavioral cluster
          </p>
          <div className="h-[320px]">
            <Bar
              data={customerCountBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: commonTooltip,
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                },
              }}
            />
          </div>
        </section>

        {/* Chart 3: Customer Distribution Doughnut */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h2 className="font-display text-base font-semibold text-slate-900">
            3. Customer Distribution
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Relative percentage share per K-Means segment
          </p>
          <div className="h-[320px]">
            <Doughnut
              data={distributionDoughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                  legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
                  tooltip: commonTooltip,
                },
              }}
            />
          </div>
        </section>

        {/* Chart 4: Average Income by Segment */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h2 className="font-display text-base font-semibold text-slate-900">
            4. Average Income by Segment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Mean annual household income (k$) per cluster
          </p>
          <div className="h-[320px]">
            <Bar
              data={avgIncomeBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    ...commonTooltip,
                    callbacks: {
                      label: (ctx) => `Avg Income: $${Number(ctx.parsed.y).toFixed(2)}k`,
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                },
              }}
            />
          </div>
        </section>

        {/* Chart 5: Average Spending by Segment */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h2 className="font-display text-base font-semibold text-slate-900">
            5. Average Spending by Segment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Mean spending score trajectory across the five customer tiers
          </p>
          <div className="h-[320px]">
            <Line
              data={avgSpendingLineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    ...commonTooltip,
                    callbacks: {
                      label: (ctx) => `Avg Spending Score: ${Number(ctx.parsed.y).toFixed(2)}`,
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { min: 0, max: 100, grid: { color: '#F1F5F9' } },
                },
              }}
            />
          </div>
        </section>

        {/* Chart 6: Income vs Spending Score */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h2 className="font-display text-base font-semibold text-slate-900">
            6. Income vs Spending Score (By Gender)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Feature-space correlation segmented by customer gender
          </p>
          <div className="h-[320px]">
            <Scatter
              data={genderScatterData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
                  tooltip: {
                    ...commonTooltip,
                    callbacks: {
                      label: (ctx) => {
                        const raw = ctx.raw as {
                          x: number;
                          y: number;
                          customerId: number;
                          age: number;
                          segment: string;
                        };
                        return `Customer #${raw.customerId} (Age ${raw.age}): $${raw.x}k · Score ${raw.y}`;
                      },
                    },
                  },
                },
                scales: {
                  x: { title: { display: true, text: 'Annual Income (k$)' }, grid: { color: '#F1F5F9' } },
                  y: {
                    title: { display: true, text: 'Spending Score (1–100)' },
                    min: 0,
                    max: 105,
                    grid: { color: '#F1F5F9' },
                  },
                },
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
