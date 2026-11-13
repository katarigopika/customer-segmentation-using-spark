import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { buildDemoDashboardPayload } from './src/data/demoDataset.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DEFAULT_FLASK_URL = process.env.FLASK_BACKEND_URL || 'http://127.0.0.1:5000';

function resolveFlaskUrl(req: express.Request): string {
  const headerUrl = req.header('x-flask-url');
  if (headerUrl && /^https?:\/\/.+/.test(headerUrl.trim())) {
    return headerUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_FLASK_URL.replace(/\/+$/, '');
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 3500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', async (req, res) => {
    const flaskUrl = resolveFlaskUrl(req);
    try {
      const response = await fetchWithTimeout(`${flaskUrl}/api/health`, {}, 2000);
      if (response.ok) {
        const data = await response.json();
        return res.json({
          connected: true,
          mode: 'spark',
          backendUrl: flaskUrl,
          details: data,
        });
      }
    } catch {
      // Flask backend is offline; report honestly so frontend enters clearly labeled Demo Mode
    }
    return res.json({
      connected: false,
      mode: 'demo',
      backendUrl: flaskUrl,
      message:
        'Python Flask + Apache Spark backend is currently unreachable. Serving benchmark demo dataset.',
    });
  });

  app.get('/api/dashboard', async (req, res) => {
    const flaskUrl = resolveFlaskUrl(req);
    try {
      const response = await fetchWithTimeout(`${flaskUrl}/api/dashboard`, {}, 3000);
      if (response.ok) {
        const payload = await response.json();
        return res.json({
          ...payload,
          mode: 'spark',
          backendAvailable: true,
          backendUrl: flaskUrl,
        });
      }
    } catch {
      // Fallback to clearly labeled demo dataset
    }
    return res.json(buildDemoDashboardPayload(flaskUrl));
  });

  app.get('/api/customers', async (req, res) => {
    const flaskUrl = resolveFlaskUrl(req);
    const query = new URLSearchParams(
      Object.entries(req.query).reduce<Record<string, string>>((acc, [k, v]) => {
        if (typeof v === 'string') acc[k] = v;
        return acc;
      }, {})
    ).toString();
    try {
      const response = await fetchWithTimeout(
        `${flaskUrl}/api/customers${query ? `?${query}` : ''}`,
        {},
        3000
      );
      if (response.ok) {
        const payload = await response.json();
        return res.json({ ...payload, mode: 'spark', backendAvailable: true });
      }
    } catch {
      // Fallback
    }
    const demo = buildDemoDashboardPayload(flaskUrl);
    return res.json({
      mode: 'demo',
      backendAvailable: false,
      total: demo.customers.length,
      customers: demo.customers,
    });
  });

  app.post('/api/upload', async (req, res) => {
    const flaskUrl = resolveFlaskUrl(req);
    try {
      const response = await fetchWithTimeout(
        `${flaskUrl}/api/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        },
        25000
      );
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      return res.json({
        ...data,
        mode: 'spark',
        backendAvailable: true,
        backendUrl: flaskUrl,
      });
    } catch {
      return res.status(503).json({
        error: `Cannot reach Python Flask + Apache Spark backend at ${flaskUrl}. Start backend/app.py in VS Code or update the Flask URL in Settings.`,
        backendAvailable: false,
        backendUrl: flaskUrl,
      });
    }
  });

  app.post('/api/reset', async (req, res) => {
    const flaskUrl = resolveFlaskUrl(req);
    try {
      const response = await fetchWithTimeout(
        `${flaskUrl}/api/reset`,
        { method: 'POST' },
        15000
      );
      if (response.ok) {
        const data = await response.json();
        return res.json({
          ...data,
          mode: 'spark',
          backendAvailable: true,
          backendUrl: flaskUrl,
        });
      }
    } catch {
      // Fallback to resetting demo state
    }
    return res.json(buildDemoDashboardPayload(flaskUrl));
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer();
