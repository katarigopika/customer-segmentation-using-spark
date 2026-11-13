import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import type { CustomerRecord, SegmentSummary } from '../types/segmentation';
import { exportCustomersToCsv } from '../utils/csvExport';

type SortField =
  | 'customerId'
  | 'gender'
  | 'age'
  | 'annualIncome'
  | 'spendingScore'
  | 'segment';

interface CustomerDetailsViewProps {
  customers: CustomerRecord[];
  segments: SegmentSummary[];
  initialSegmentFilter: string;
  onClearInitialFilter: () => void;
  onNotifyExport: (count: number) => void;
}

export function CustomerDetailsView({
  customers,
  segments,
  initialSegmentFilter,
  onClearInitialFilter,
  onNotifyExport,
}: CustomerDetailsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState(initialSegmentFilter || 'ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('customerId');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (initialSegmentFilter && initialSegmentFilter !== 'ALL') {
      setSegmentFilter(initialSegmentFilter);
      setCurrentPage(1);
    }
  }, [initialSegmentFilter]);

  const segmentColorMap = useMemo(() => {
    const map = new Map<string, string>();
    segments.forEach((s) => map.set(s.name, s.color));
    return map;
  }, [segments]);

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = customers.filter((c) => {
      if (segmentFilter !== 'ALL' && c.segment !== segmentFilter) return false;
      if (genderFilter !== 'ALL' && c.gender.toLowerCase() !== genderFilter.toLowerCase()) {
        return false;
      }
      if (query) {
        const matchesId = String(c.customerId).toLowerCase().includes(query);
        const matchesGender = c.gender.toLowerCase().includes(query);
        const matchesSegment = c.segment.toLowerCase().includes(query);
        return matchesId || matchesGender || matchesSegment;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return sorted;
  }, [customers, searchQuery, segmentFilter, genderFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safePage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSegmentFilter('ALL');
    setGenderFilter('ALL');
    setSortField('customerId');
    setSortDirection('asc');
    setCurrentPage(1);
    onClearInitialFilter();
  };

  const handleExportFiltered = () => {
    exportCustomersToCsv(
      filteredAndSorted,
      segmentFilter === 'ALL'
        ? 'spark_customers_filtered.csv'
        : `spark_customers_${segmentFilter.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`
    );
    onNotifyExport(filteredAndSorted.length);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Customer Details
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Search, filter, sort, and export individual customer cluster assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportFiltered}
          disabled={filteredAndSorted.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 shadow-xs transition-all whitespace-nowrap self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Filtered CSV ({filteredAndSorted.length})</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Customer ID or Gender..."
            aria-label="Search customers by ID or gender"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={segmentFilter}
            onChange={(e) => {
              setSegmentFilter(e.target.value);
              setCurrentPage(1);
              if (e.target.value === 'ALL') onClearInitialFilter();
            }}
            aria-label="Filter by segment"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Segments</option>
            {segments.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by gender"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Genders</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>

          {(searchQuery || segmentFilter !== 'ALL' || genderFilter !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-600 tabular-nums">
            Showing <span className="font-semibold text-slate-900">{filteredAndSorted.length}</span>{' '}
            of {customers.length} total records
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <label htmlFor="rows-per-page">Rows per page:</label>
            <select
              id="rows-per-page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {paginatedRows.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-display text-base font-semibold text-slate-900 mt-4">
              No matching customer records
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Adjust your search query or segment filters to view clustered customer profiles.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">
                    <button
                      type="button"
                      onClick={() => handleSort('customerId')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900"
                    >
                      <span>Customer ID</span>
                      {renderSortIcon('customerId')}
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('gender')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900"
                    >
                      <span>Gender</span>
                      {renderSortIcon('gender')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('age')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 ml-auto"
                    >
                      <span>Age</span>
                      {renderSortIcon('age')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('annualIncome')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 ml-auto"
                    >
                      <span>Annual Income</span>
                      {renderSortIcon('annualIncome')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('spendingScore')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 ml-auto"
                    >
                      <span>Spending Score</span>
                      {renderSortIcon('spendingScore')}
                    </button>
                  </th>
                  <th className="py-3 px-6">
                    <button
                      type="button"
                      onClick={() => handleSort('segment')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900"
                    >
                      <span>Segment</span>
                      {renderSortIcon('segment')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedRows.map((customer) => {
                  const segColor = segmentColorMap.get(customer.segment) || '#4F46E5';
                  return (
                    <tr key={customer.customerId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-6 font-mono tabular-nums font-medium text-slate-900">
                        #{customer.customerId}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{customer.gender}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {customer.age}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        ${customer.annualIncome}k
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {customer.spendingScore}
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: segColor }}
                            aria-hidden="true"
                          />
                          <span className="text-slate-800 font-medium">{customer.segment}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredAndSorted.length > 0 && (
          <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500 tabular-nums">
              Page {safePage} of {totalPages}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
