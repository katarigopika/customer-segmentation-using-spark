# Customer Segmentation Using Apache Spark — Setup & Execution Guide

This project pairs a **React + TypeScript + Chart.js** analytics dashboard with a **Python Flask + Apache Spark (PySpark MLlib) + Pandas + SQLite** clustering backend.

---

## Project Architecture

```text
├── backend/
│   ├── app.py                     # Flask REST API server (port 5000)
│   ├── spark_clustering.py        # PySpark VectorAssembler + StandardScaler + KMeans
│   ├── database.py                # SQLite persistence (customer_segmentation.db)
│   ├── requirements.txt           # Python dependencies
│   └── sample_data/
│       └── Mall_Customers.csv     # 200-customer benchmark dataset
├── src/                           # React + TypeScript + Tailwind + Chart.js frontend
├── server.ts                      # Express/Vite dev server & API proxy (port 3000)
└── package.json                   # Node dependencies & scripts
```

---

## Prerequisites (VS Code Local Setup)

1. **Python 3.10 or 3.11**
2. **Java JDK 11 or 17** (required by Apache Spark / PySpark JVM)
   - Verify with: `java -version`
3. **Node.js 18+** (or Node 22+)

---

## Step 1: Start the Python Flask + Apache Spark Backend

Open a terminal in VS Code:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:
- **Windows (PowerShell):** `.\.venv\Scripts\Activate.ps1`
- **macOS / Linux:** `source .venv/bin/activate`

Install dependencies and launch Flask:

```bash
pip install -r requirements.txt
python app.py
```

The Flask API will initialize `customer_segmentation.db`, run Apache Spark K-Means on `sample_data/Mall_Customers.csv`, and listen on **`http://127.0.0.1:5000`**.

---

## Step 2: Start the Frontend Dashboard

Open a second terminal in VS Code at the project root:

```bash
npm install
npm run dev
```

Open **`http://localhost:3000`** in your browser.

The Node server on port `3000` automatically detects and proxies `/api/*` requests to your running Flask + PySpark backend on `http://127.0.0.1:5000`. If Flask is offline, the dashboard transparently displays a **Demo Dataset Mode** banner instead of pretending Spark ran in the browser.
