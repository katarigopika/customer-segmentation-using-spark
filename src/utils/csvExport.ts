import type { CustomerRecord, ModelMetrics, SegmentSummary } from '../types/segmentation';

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsvFile(filename: string, rows: (string | number)[][]) {
  const csvContent = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCustomersToCsv(
  customers: CustomerRecord[],
  filename = 'customer_segments_export.csv'
) {
  const header = [
    'CustomerID',
    'Gender',
    'Age',
    'Annual Income (k$)',
    'Spending Score (1-100)',
    'Cluster ID',
    'Segment',
  ];
  const body = customers.map((c) => [
    c.customerId,
    c.gender,
    c.age,
    c.annualIncome,
    c.spendingScore,
    c.clusterId,
    c.segment,
  ]);
  downloadCsvFile(filename, [header, ...body]);
}

export function exportFullReportCsv(
  segments: SegmentSummary[],
  model: ModelMetrics,
  customers: CustomerRecord[],
  datasetName: string
) {
  const rows: (string | number)[][] = [
    ['Customer Segmentation Using Apache Spark - Summary Report'],
    ['Dataset', datasetName],
    ['Algorithm', model.algorithm],
    ['Framework', model.framework],
    ['Number of Clusters (K)', model.numClusters],
    ['Silhouette Score', model.silhouetteScore.toFixed(4)],
    ['Training Cost (WSSSE)', model.trainingCost.toFixed(4)],
    [],
    ['Segment Summary'],
    [
      'Segment',
      'Customers',
      'Share (%)',
      'Avg Annual Income (k$)',
      'Avg Spending Score',
      'Avg Age',
      'Female Count',
      'Male Count',
    ],
    ...segments.map((s) => [
      s.name,
      s.count,
      `${s.percentage}%`,
      s.avgIncome.toFixed(2),
      s.avgSpending.toFixed(2),
      s.avgAge.toFixed(1),
      s.femaleCount,
      s.maleCount,
    ]),
    [],
    ['Customer Records'],
    ['CustomerID', 'Gender', 'Age', 'Annual Income (k$)', 'Spending Score (1-100)', 'Segment'],
    ...customers.map((c) => [
      c.customerId,
      c.gender,
      c.age,
      c.annualIncome,
      c.spendingScore,
      c.segment,
    ]),
  ];
  downloadCsvFile('spark_segmentation_full_report.csv', rows);
}
