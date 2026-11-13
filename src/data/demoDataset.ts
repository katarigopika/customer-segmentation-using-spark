import type {
  CustomerRecord,
  DashboardPayload,
  SegmentCentroid,
  SegmentSummary,
} from '../types/segmentation';

interface SegmentBlueprint {
  clusterId: number;
  name: string;
  count: number;
  incomeRange: [number, number];
  spendingRange: [number, number];
  ageRange: [number, number];
  femaleRatio: number;
  color: string;
  strategy: string;
}

const SEGMENT_BLUEPRINTS: SegmentBlueprint[] = [
  {
    clusterId: 0,
    name: 'Lower Income - Moderate Spenders',
    count: 58,
    incomeRange: [38, 66],
    spendingRange: [40, 60],
    ageRange: [23, 66],
    femaleRatio: 0.59,
    color: '#4F46E5',
    strategy:
      'Focus on retention bundles, seasonal loyalty multipliers, and repeat-purchase incentives to steadily grow basket size.',
  },
  {
    clusterId: 1,
    name: 'Lower Income - High Spenders',
    count: 25,
    incomeRange: [15, 39],
    spendingRange: [68, 98],
    ageRange: [18, 35],
    femaleRatio: 0.6,
    color: '#9333EA',
    strategy:
      'Promote trend-led launches, flexible installment plans, and referral bonuses tailored to younger high-velocity shoppers.',
  },
  {
    clusterId: 2,
    name: 'High Income - High Spenders',
    count: 42,
    incomeRange: [70, 137],
    spendingRange: [68, 97],
    ageRange: [27, 41],
    femaleRatio: 0.55,
    color: '#0EA5E9',
    strategy:
      'Prioritize VIP concierge tiers, early-access collections, and curated high-margin experiential offers.',
  },
  {
    clusterId: 3,
    name: 'Lower Income - Low Spenders',
    count: 37,
    incomeRange: [15, 44],
    spendingRange: [4, 36],
    ageRange: [20, 67],
    femaleRatio: 0.57,
    color: '#64748B',
    strategy:
      'Engage with value-driven bundles, targeted clearance campaigns, and low-friction entry promotions.',
  },
  {
    clusterId: 4,
    name: 'High Income - Low Spenders',
    count: 38,
    incomeRange: [71, 137],
    spendingRange: [3, 38],
    ageRange: [23, 59],
    femaleRatio: 0.45,
    color: '#059669',
    strategy:
      'Run quality-focused storytelling, personalized reactivation campaigns, and high-trust product guarantees.',
  },
];

function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDemoCustomers(): CustomerRecord[] {
  const rng = createSeededRng(20260513);
  const raw: Omit<CustomerRecord, 'customerId'>[] = [];

  for (const bp of SEGMENT_BLUEPRINTS) {
    for (let i = 0; i < bp.count; i++) {
      // Triangular distribution around cluster center for realistic, tightly separated K-Means clusters
      const u1 = (rng() + rng()) / 2;
      const u2 = (rng() + rng()) / 2;
      const u3 = (rng() + rng()) / 2;

      const income = Math.round(
        bp.incomeRange[0] + u1 * (bp.incomeRange[1] - bp.incomeRange[0])
      );
      const spending = Math.round(
        bp.spendingRange[0] + u2 * (bp.spendingRange[1] - bp.spendingRange[0])
      );
      const age = Math.round(
        bp.ageRange[0] + u3 * (bp.ageRange[1] - bp.ageRange[0])
      );
      const gender = rng() < bp.femaleRatio ? 'Female' : 'Male';

      raw.push({
        gender,
        age,
        annualIncome: income,
        spendingScore: spending,
        clusterId: bp.clusterId,
        segment: bp.name,
      });
    }
  }

  // Deterministic Fisher-Yates shuffle so CustomerID 1..200 reflects realistic mixed ordering
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = raw[i];
    raw[i] = raw[j];
    raw[j] = tmp;
  }

  return raw.map((item, index) => ({
    customerId: index + 1,
    ...item,
  }));
}

export function buildDemoDashboardPayload(backendUrl = 'http://127.0.0.1:5000'): DashboardPayload {
  const customers = buildDemoCustomers();
  const total = customers.length;

  const avgAnnualIncome = Number(
    (customers.reduce((acc, c) => acc + c.annualIncome, 0) / total).toFixed(2)
  );
  const avgSpendingScore = Number(
    (customers.reduce((acc, c) => acc + c.spendingScore, 0) / total).toFixed(2)
  );

  const segments: SegmentSummary[] = SEGMENT_BLUEPRINTS.map((bp, idx) => {
    const rows = customers.filter((c) => c.segment === bp.name);
    const count = rows.length;
    const avgIncome = Number(
      (rows.reduce((sum, r) => sum + r.annualIncome, 0) / count).toFixed(2)
    );
    const avgSpending = Number(
      (rows.reduce((sum, r) => sum + r.spendingScore, 0) / count).toFixed(2)
    );
    const avgAge = Number(
      (rows.reduce((sum, r) => sum + r.age, 0) / count).toFixed(1)
    );
    const maleCount = rows.filter((r) => r.gender === 'Male').length;
    const femaleCount = count - maleCount;

    return {
      id: idx + 1,
      name: bp.name,
      count,
      percentage: Number(((count / total) * 100).toFixed(1)),
      avgIncome,
      avgSpending,
      avgAge,
      maleCount,
      femaleCount,
      color: bp.color,
      strategy: bp.strategy,
    };
  });

  const centroids: SegmentCentroid[] = segments.map((s, idx) => ({
    clusterId: idx,
    segment: s.name,
    avgIncome: s.avgIncome,
    avgSpending: s.avgSpending,
    avgAge: s.avgAge,
    count: s.count,
    color: s.color,
  }));

  return {
    mode: 'demo',
    backendAvailable: false,
    backendUrl,
    dataset: {
      name: 'Mall_Customers.csv (Benchmark Demo)',
      uploadedAt: '2026-11-13T07:50:00Z',
      totalRecords: total,
      runId: 1,
    },
    kpis: {
      totalCustomers: total,
      totalSegments: 5,
      avgAnnualIncome,
      avgSpendingScore,
      silhouetteScore: 0.8117,
    },
    model: {
      algorithm: 'K-Means Clustering',
      framework: 'Apache Spark (PySpark MLlib)',
      numClusters: 5,
      silhouetteScore: 0.8117,
      trainingCost: 36.5464,
      centroids,
      elbowMetrics: [
        { k: 2, trainingCost: 198.421, silhouetteScore: 0.4215 },
        { k: 3, trainingCost: 112.684, silhouetteScore: 0.5482 },
        { k: 4, trainingCost: 61.392, silhouetteScore: 0.6841 },
        { k: 5, trainingCost: 36.5464, silhouetteScore: 0.8117 },
        { k: 6, trainingCost: 29.814, silhouetteScore: 0.7204 },
        { k: 7, trainingCost: 24.512, silhouetteScore: 0.6519 },
        { k: 8, trainingCost: 20.148, silhouetteScore: 0.6012 },
      ],
      sparkExecution: {
        sparkVersion: '3.5.3',
        partitions: 4,
        shufflePartitions: 4,
      },
    },
    segments,
    customers,
    history: [
      {
        runId: 1,
        datasetName: 'Mall_Customers.csv (Benchmark Demo)',
        totalCustomers: 200,
        numClusters: 5,
        silhouetteScore: 0.8117,
        trainingCost: 36.5464,
        createdAt: '2026-11-13T07:50:00Z',
      },
    ],
  };
}

export function generateSampleCsvText(): string {
  const customers = buildDemoCustomers();
  const header = 'CustomerID,Gender,Age,Annual Income (k$),Spending Score (1-100)';
  const lines = customers.map(
    (c) => `${c.customerId},${c.gender},${c.age},${c.annualIncome},${c.spendingScore}`
  );
  return [header, ...lines].join('\n');
}

export function generateBigDataSampleCsvText(rowCount = 5000): string {
  const rng = createSeededRng(987654);
  const header = 'CustomerID,Gender,Age,Annual Income (k$),Spending Score (1-100)';
  const lines: string[] = [header];

  for (let i = 1; i <= rowCount; i++) {
    const bp = SEGMENT_BLUEPRINTS[i % SEGMENT_BLUEPRINTS.length];
    const u1 = (rng() + rng()) / 2;
    const u2 = (rng() + rng()) / 2;
    const u3 = (rng() + rng()) / 2;

    const income = Math.round(
      bp.incomeRange[0] + u1 * (bp.incomeRange[1] - bp.incomeRange[0])
    );
    const spending = Math.round(
      bp.spendingRange[0] + u2 * (bp.spendingRange[1] - bp.spendingRange[0])
    );
    const age = Math.round(
      bp.ageRange[0] + u3 * (bp.ageRange[1] - bp.ageRange[0])
    );
    const gender = rng() < bp.femaleRatio ? 'Female' : 'Male';
    lines.push(`${i},${gender},${age},${income},${spending}`);
  }

  return lines.join('\n');
}

