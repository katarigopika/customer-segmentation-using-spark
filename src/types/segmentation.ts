export type NavSection =
  | 'dashboard'
  | 'segments'
  | 'analytics'
  | 'visualization'
  | 'customers'
  | 'upload'
  | 'performance'
  | 'reports'
  | 'settings';

export interface CustomerRecord {
  customerId: number;
  gender: 'Male' | 'Female' | string;
  age: number;
  annualIncome: number;
  spendingScore: number;
  clusterId: number;
  segment: string;
}

export interface SegmentCentroid {
  clusterId: number;
  segment: string;
  avgIncome: number;
  avgSpending: number;
  avgAge: number;
  count: number;
  color: string;
}

export interface SegmentSummary {
  id: number;
  name: string;
  count: number;
  percentage: number;
  avgIncome: number;
  avgSpending: number;
  avgAge: number;
  maleCount: number;
  femaleCount: number;
  color: string;
  strategy: string;
}

export interface ElbowMetricPoint {
  k: number;
  trainingCost: number;
  silhouetteScore: number;
}

export interface ModelMetrics {
  algorithm: string;
  framework: string;
  numClusters: number;
  silhouetteScore: number;
  trainingCost: number;
  centroids: SegmentCentroid[];
  elbowMetrics?: ElbowMetricPoint[];
  sparkExecution?: {
    sparkVersion: string;
    partitions: number;
    shufflePartitions: number;
    processingTimeMs?: number;
  };
}

export interface DashboardKPIs {
  totalCustomers: number;
  totalSegments: number;
  avgAnnualIncome: number;
  avgSpendingScore: number;
  silhouetteScore: number;
}

export interface RunHistoryItem {
  runId: number;
  datasetName: string;
  totalCustomers: number;
  numClusters: number;
  silhouetteScore: number;
  trainingCost: number;
  createdAt: string;
}

export interface DashboardPayload {
  mode: 'spark' | 'demo';
  backendAvailable: boolean;
  backendUrl?: string;
  dataset: {
    name: string;
    uploadedAt: string;
    totalRecords: number;
    runId?: number;
  };
  kpis: DashboardKPIs;
  model: ModelMetrics;
  segments: SegmentSummary[];
  customers: CustomerRecord[];
  history?: RunHistoryItem[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
