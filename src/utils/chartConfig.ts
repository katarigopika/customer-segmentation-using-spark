import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

let registered = false;

export function ensureChartJsRegistered() {
  if (registered) return;
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler
  );
  ChartJS.defaults.font.family = "'DM Sans', system-ui, -apple-system, sans-serif";
  ChartJS.defaults.color = '#475569';
  registered = true;
}

export const SEGMENT_SHORT_NAMES: Record<string, string> = {
  'Lower Income - Moderate Spenders': 'Lower Inc · Moderate',
  'Lower Income - High Spenders': 'Lower Inc · High',
  'High Income - High Spenders': 'High Inc · High',
  'Lower Income - Low Spenders': 'Lower Inc · Low',
  'High Income - Low Spenders': 'High Inc · Low',
};

export function shortenSegmentName(name: string): string {
  return SEGMENT_SHORT_NAMES[name] || name;
}
