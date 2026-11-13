"""SQLite persistence layer for Customer Segmentation Using Apache Spark."""

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "customer_segmentation.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create database tables if they do not exist."""
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS model_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset_name TEXT NOT NULL,
                total_customers INTEGER NOT NULL,
                num_clusters INTEGER NOT NULL,
                silhouette_score REAL NOT NULL,
                training_cost REAL NOT NULL,
                algorithm TEXT NOT NULL DEFAULT 'K-Means Clustering',
                framework TEXT NOT NULL DEFAULT 'Apache Spark (PySpark MLlib)',
                centroids_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                gender TEXT NOT NULL,
                age INTEGER NOT NULL,
                annual_income REAL NOT NULL,
                spending_score REAL NOT NULL,
                cluster_id INTEGER NOT NULL,
                segment_name TEXT NOT NULL,
                FOREIGN KEY (run_id) REFERENCES model_runs(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_customers_run_id ON customers(run_id);
            CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment_name);
            """
        )
        conn.commit()


def save_clustering_run(
    dataset_name: str,
    records: List[Dict[str, Any]],
    num_clusters: int,
    silhouette_score: float,
    training_cost: float,
    centroids: List[Dict[str, Any]],
) -> int:
    """Persist a completed Spark K-Means run and its clustered customer rows."""
    created_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO model_runs (
                dataset_name,
                total_customers,
                num_clusters,
                silhouette_score,
                training_cost,
                centroids_json,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                dataset_name,
                len(records),
                num_clusters,
                round(float(silhouette_score), 4),
                round(float(training_cost), 4),
                json.dumps(centroids),
                created_at,
            ),
        )
        run_id = int(cursor.lastrowid)

        cursor.executemany(
            """
            INSERT INTO customers (
                run_id,
                customer_id,
                gender,
                age,
                annual_income,
                spending_score,
                cluster_id,
                segment_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    run_id,
                    int(r["customerId"]),
                    str(r["gender"]),
                    int(r["age"]),
                    float(r["annualIncome"]),
                    float(r["spendingScore"]),
                    int(r["clusterId"]),
                    str(r["segment"]),
                )
                for r in records
            ],
        )
        conn.commit()
        return run_id


def get_latest_run() -> Optional[Dict[str, Any]]:
    """Fetch the most recent clustering run metadata and customer records."""
    with get_connection() as conn:
        run_row = conn.execute(
            "SELECT * FROM model_runs ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if not run_row:
            return None

        customer_rows = conn.execute(
            """
            SELECT customer_id, gender, age, annual_income, spending_score, cluster_id, segment_name
            FROM customers
            WHERE run_id = ?
            ORDER BY customer_id ASC
            """,
            (run_row["id"],),
        ).fetchall()

        customers = [
            {
                "customerId": int(row["customer_id"]),
                "gender": row["gender"],
                "age": int(row["age"]),
                "annualIncome": float(row["annual_income"]),
                "spendingScore": float(row["spending_score"]),
                "clusterId": int(row["cluster_id"]),
                "segment": row["segment_name"],
            }
            for row in customer_rows
        ]

        return {
            "runId": int(run_row["id"]),
            "datasetName": run_row["dataset_name"],
            "totalCustomers": int(run_row["total_customers"]),
            "numClusters": int(run_row["num_clusters"]),
            "silhouetteScore": float(run_row["silhouette_score"]),
            "trainingCost": float(run_row["training_cost"]),
            "algorithm": run_row["algorithm"],
            "framework": run_row["framework"],
            "centroids": json.loads(run_row["centroids_json"]),
            "createdAt": run_row["created_at"],
            "customers": customers,
        }


def get_run_history(limit: int = 10) -> List[Dict[str, Any]]:
    """Return recent clustering run summaries."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, dataset_name, total_customers, num_clusters,
                   silhouette_score, training_cost, created_at
            FROM model_runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [
            {
                "runId": int(r["id"]),
                "datasetName": r["dataset_name"],
                "totalCustomers": int(r["total_customers"]),
                "numClusters": int(r["num_clusters"]),
                "silhouetteScore": float(r["silhouette_score"]),
                "trainingCost": float(r["training_cost"]),
                "createdAt": r["created_at"],
            }
            for r in rows
        ]
