import { ArrowUpRight, DollarSign, ShoppingBag, UserCheck, Users } from 'lucide-react';
import type { SegmentSummary } from '../types/segmentation';

interface SegmentsViewProps {
  segments: SegmentSummary[];
  totalCustomers: number;
  onInspectSegment: (segmentName: string) => void;
}

export function SegmentsView({
  segments,
  totalCustomers,
  onInspectSegment,
}: SegmentsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Customer Segments
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Five behavioral clusters discovered across {totalCustomers.toLocaleString()} customers via Apache Spark K-Means.
          </p>
        </div>
        <span className="text-xs font-medium text-slate-500 tabular-nums">
          {segments.length} clusters · 100.0% population coverage
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {segments.map((segment, index) => (
          <article
            key={segment.name}
            className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-slate-500 tabular-nums">
                    Cluster {index + 1} · {segment.percentage.toFixed(1)}% of total
                  </span>
                  <h2 className="font-display text-lg font-bold text-slate-900 mt-1">
                    {segment.name}
                  </h2>
                </div>
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden="true"
                />
              </div>

              {/* Share progress bar */}
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, segment.percentage)}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Customers</span>
                  </dt>
                  <dd className="font-display text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                    {segment.count}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Avg Income</span>
                  </dt>
                  <dd className="font-display text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                    ${segment.avgIncome.toFixed(1)}k
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Avg Spending</span>
                  </dt>
                  <dd className="font-display text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                    {segment.avgSpending.toFixed(1)}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Avg Age</span>
                  </dt>
                  <dd className="font-display text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                    {segment.avgAge.toFixed(1)} yrs
                  </dd>
                </div>
              </dl>

              <p className="text-xs text-slate-600 leading-relaxed mt-4 pt-4 border-t border-slate-100">
                {segment.strategy}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 tabular-nums">
                {segment.femaleCount} Female · {segment.maleCount} Male
              </span>
              <button
                type="button"
                onClick={() => onInspectSegment(segment.name)}
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors whitespace-nowrap"
              >
                <span>View customers</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
