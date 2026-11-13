import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { DashboardPayload } from '../types/segmentation';
import { exportFullReportCsv } from '../utils/csvExport';

interface ReportsViewProps {
  data: DashboardPayload;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export function ReportsView({ data, onNotify }: ReportsViewProps) {
  const { kpis, model, segments, customers, dataset } = data;

  const handleDownloadCsvReport = () => {
    exportFullReportCsv(segments, model, customers, dataset.name);
    onNotify(
      'success',
      'CSV Report Downloaded',
      'Saved segment summary, model metrics, and all customer assignments.'
    );
  };

  const handleDownloadPdfReport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    // Header band
    doc.setFillColor(11, 18, 33);
    doc.rect(0, 0, 595, 86, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Customer Segmentation Using Apache Spark', 40, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225);
    doc.text(
      `Dataset: ${dataset.name}  |  Mode: ${
        data.mode === 'spark' ? 'Apache Spark Live' : 'Demo Benchmark'
      }  |  Generated: ${new Date().toLocaleDateString()}`,
      40,
      64
    );

    // Executive Summary
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('1. Executive Summary & Model Performance', 40, 120);

    autoTable(doc, {
      startY: 132,
      head: [['Metric', 'Value', 'Details']],
      body: [
        ['Total Customers', String(kpis.totalCustomers), 'Active records clustered'],
        ['Total Segments (k)', String(kpis.totalSegments), model.algorithm],
        ['Average Annual Income', `$${kpis.avgAnnualIncome.toFixed(2)}k`, 'Dataset mean'],
        ['Average Spending Score', `${kpis.avgSpendingScore.toFixed(2)} / 100`, 'Behavioral index'],
        ['Silhouette Score', model.silhouetteScore.toFixed(4), 'Squared Euclidean evaluation'],
        ['Training Cost (WSSSE)', model.trainingCost.toFixed(4), model.framework],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      margin: { left: 40, right: 40 },
    });

    const afterFirstTable = (doc as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY || 320;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('2. Segment-Wise Customer Statistics', 40, afterFirstTable + 30);

    autoTable(doc, {
      startY: afterFirstTable + 42,
      head: [['Segment', 'Customers', 'Share', 'Avg Income', 'Avg Spending', 'Avg Age']],
      body: segments.map((s) => [
        s.name,
        String(s.count),
        `${s.percentage.toFixed(1)}%`,
        `$${s.avgIncome.toFixed(2)}k`,
        s.avgSpending.toFixed(2),
        `${s.avgAge.toFixed(1)} yrs`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      margin: { left: 40, right: 40 },
    });

    const afterSecondTable = (doc as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY || 540;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('3. Recommended Segment Strategies', 40, afterSecondTable + 30);

    autoTable(doc, {
      startY: afterSecondTable + 42,
      head: [['Segment', 'Actionable Marketing Strategy']],
      body: segments.map((s) => [s.name, s.strategy]),
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [51, 65, 85] },
      columnStyles: { 0: { cellWidth: 165, fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });

    doc.save('spark_customer_segmentation_report.pdf');
    onNotify(
      'success',
      'PDF Report Generated',
      'Downloaded spark_customer_segmentation_report.pdf.'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Analytics Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Export executive segmentation summaries, cluster statistics, and K-Means performance reports.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsvReport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Download CSV Report</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdfReport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xs transition-all whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* Report Document Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-5 bg-[#0B1221] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-300 shrink-0" />
            <div>
              <h2 className="font-display text-base font-semibold">
                Customer Segmentation Executive Report
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {dataset.name} · {kpis.totalCustomers} Customers · {kpis.totalSegments} Clusters
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-300 font-mono tabular-nums">
            Silhouette {model.silhouetteScore.toFixed(4)}
          </span>
        </div>

        <div className="p-6 space-y-8">
          {/* Model Performance Summary */}
          <section>
            <h3 className="font-display text-sm font-semibold text-slate-900 mb-3">
              Model Performance Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500">Algorithm</span>
                <p className="text-sm font-semibold text-slate-900 mt-1">{model.algorithm}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500">Framework</span>
                <p className="text-sm font-semibold text-slate-900 mt-1">Apache Spark</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500">Clusters (k)</span>
                <p className="text-sm font-semibold text-slate-900 mt-1 tabular-nums">
                  {model.numClusters}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500">Silhouette Score</span>
                <p className="text-sm font-semibold text-slate-900 mt-1 font-mono tabular-nums">
                  {model.silhouetteScore.toFixed(4)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500">Training Cost</span>
                <p className="text-sm font-semibold text-slate-900 mt-1 font-mono tabular-nums">
                  {model.trainingCost.toFixed(4)}
                </p>
              </div>
            </div>
          </section>

          {/* Segment-Wise Table */}
          <section>
            <h3 className="font-display text-sm font-semibold text-slate-900 mb-3">
              Segment-Wise Customer Statistics
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Segment</th>
                    <th className="py-3 px-4 text-right">Count</th>
                    <th className="py-3 px-4 text-right">Share</th>
                    <th className="py-3 px-4 text-right">Avg Income</th>
                    <th className="py-3 px-4 text-right">Avg Spending</th>
                    <th className="py-3 px-4 text-right">Avg Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {segments.map((seg) => (
                    <tr key={seg.name}>
                      <td className="py-3 px-4 font-medium text-slate-900">{seg.name}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {seg.count}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {seg.percentage.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        ${seg.avgIncome.toFixed(2)}k
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {seg.avgSpending.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {seg.avgAge.toFixed(1)} yrs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
