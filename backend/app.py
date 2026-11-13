"""Flask REST API server for Customer Segmentation Using Apache Spark."""

import csv
import io
import os
from typing import Any, Dict, List

import pandas as pd
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

from database import get_latest_run, get_run_history, init_db, save_clustering_run
from spark_clustering import REQUIRED_COLUMNS, SEGMENT_METADATA, run_spark_kmeans

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_CSV_PATH = os.path.join(BASE_DIR, "sample_data", "Mall_Customers.csv")

app = Flask(__name__)
CORS(app)


def build_segment_summaries(customers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Aggregate segment-level metrics from clustered customer records."""
    total = len(customers)
    if total == 0:
        return []

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for row in customers:
        grouped.setdefault(row["segment"], []).append(row)

    preferred_order = [
        "Lower Income - Moderate Spenders",
        "Lower Income - High Spenders",
        "High Income - High Spenders",
        "Lower Income - Low Spenders",
        "High Income - Low Spenders",
    ]
    ordered_names = [n for n in preferred_order if n in grouped] + [
        n for n in sorted(grouped.keys()) if n not in preferred_order
    ]

    palette = ["#4F46E5", "#9333EA", "#0EA5E9", "#64748B", "#059669", "#D97706"]
    summaries: List[Dict[str, Any]] = []

    for idx, seg_name in enumerate(ordered_names):
        rows = grouped[seg_name]
        count = len(rows)
        avg_income = sum(r["annualIncome"] for r in rows) / count
        avg_spending = sum(r["spendingScore"] for r in rows) / count
        avg_age = sum(r["age"] for r in rows) / count
        male_count = sum(1 for r in rows if r["gender"].lower() == "male")
        female_count = count - male_count
        meta = SEGMENT_METADATA.get(seg_name, {})

        summaries.append(
            {
                "id": idx + 1,
                "name": seg_name,
                "count": count,
                "percentage": round((count / total) * 100, 1),
                "avgIncome": round(avg_income, 2),
                "avgSpending": round(avg_spending, 2),
                "avgAge": round(avg_age, 1),
                "maleCount": male_count,
                "femaleCount": female_count,
                "color": meta.get("color", palette[idx % len(palette)]),
                "strategy": meta.get(
                    "strategy",
                    "Tailor campaign messaging and lifecycle offers to cluster purchasing capacity.",
                ),
            }
        )
    return summaries


def build_dashboard_payload(run_data: Dict[str, Any]) -> Dict[str, Any]:
    """Shape stored Spark run into complete dashboard JSON payload."""
    customers = run_data["customers"]
    total = len(customers)
    avg_income = round(sum(c["annualIncome"] for c in customers) / total, 2) if total else 0.0
    avg_spending = round(sum(c["spendingScore"] for c in customers) / total, 2) if total else 0.0
    segments = build_segment_summaries(customers)

    return {
        "mode": "spark",
        "backendAvailable": True,
        "dataset": {
            "name": run_data["datasetName"],
            "uploadedAt": run_data["createdAt"],
            "totalRecords": total,
            "runId": run_data["runId"],
        },
        "kpis": {
            "totalCustomers": total,
            "totalSegments": run_data["numClusters"],
            "avgAnnualIncome": avg_income,
            "avgSpendingScore": avg_spending,
            "silhouetteScore": run_data["silhouetteScore"],
        },
        "model": {
            "algorithm": run_data["algorithm"],
            "framework": run_data["framework"],
            "numClusters": run_data["numClusters"],
            "silhouetteScore": run_data["silhouetteScore"],
            "trainingCost": run_data["trainingCost"],
            "centroids": run_data["centroids"],
        },
        "segments": segments,
        "customers": customers,
        "history": get_run_history(10),
    }


def ensure_seeded_database() -> Dict[str, Any]:
    """Initialize SQLite and run PySpark on Mall_Customers.csv if empty."""
    init_db()
    latest = get_latest_run()
    if latest is not None:
        return latest

    if not os.path.exists(SAMPLE_CSV_PATH):
        raise FileNotFoundError(f"Sample CSV not found at {SAMPLE_CSV_PATH}")

    df = pd.read_csv(SAMPLE_CSV_PATH)
    result = run_spark_kmeans(df, num_clusters=5)
    save_clustering_run(
        dataset_name="Mall_Customers.csv",
        records=result["records"],
        num_clusters=result["numClusters"],
        silhouette_score=result["silhouetteScore"],
        training_cost=result["trainingCost"],
        centroids=result["centroids"],
    )
    seeded = get_latest_run()
    assert seeded is not None
    return seeded


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status": "ok",
            "engine": "Apache Spark (PySpark MLlib)",
            "framework": "Python Flask",
            "database": "SQLite",
        }
    )


@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    run_data = ensure_seeded_database()
    return jsonify(build_dashboard_payload(run_data))


@app.route("/api/customers", methods=["GET"])
def get_customers():
    run_data = ensure_seeded_database()
    customers = run_data["customers"]

    segment_filter = request.args.get("segment", "").strip()
    search_query = request.args.get("search", "").strip().lower()

    if segment_filter and segment_filter.lower() != "all":
        customers = [c for c in customers if c["segment"] == segment_filter]

    if search_query:
        customers = [
            c
            for c in customers
            if search_query in str(c["customerId"]).lower()
            or search_query in c["gender"].lower()
            or search_query in c["segment"].lower()
        ]

    return jsonify({"total": len(customers), "customers": customers})


@app.route("/api/upload", methods=["POST"])
def upload_dataset():
    init_db()
    num_clusters = int(request.form.get("k", 5))
    dataset_name = "uploaded_dataset.csv"

    try:
        if "file" in request.files:
            uploaded_file = request.files["file"]
            dataset_name = uploaded_file.filename or dataset_name
            df = pd.read_csv(uploaded_file)
        elif request.is_json:
            payload = request.get_json(silent=True) or {}
            rows = payload.get("rows", [])
            dataset_name = payload.get("datasetName", dataset_name)
            num_clusters = int(payload.get("k", 5))
            df = pd.DataFrame(rows)
        else:
            return jsonify({"error": "No CSV file or JSON dataset provided."}), 400

        missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing:
            return (
                jsonify(
                    {
                        "error": f"Dataset missing required columns: {', '.join(missing)}",
                        "requiredColumns": REQUIRED_COLUMNS,
                    }
                ),
                400,
            )

        result = run_spark_kmeans(df, num_clusters=num_clusters)
        save_clustering_run(
            dataset_name=dataset_name,
            records=result["records"],
            num_clusters=result["numClusters"],
            silhouette_score=result["silhouetteScore"],
            training_cost=result["trainingCost"],
            centroids=result["centroids"],
        )
        latest = get_latest_run()
        assert latest is not None
        return jsonify(build_dashboard_payload(latest)), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"PySpark processing error: {str(exc)}"}), 500


@app.route("/api/reset", methods=["POST"])
def reset_to_sample():
    init_db()
    df = pd.read_csv(SAMPLE_CSV_PATH)
    result = run_spark_kmeans(df, num_clusters=5)
    save_clustering_run(
        dataset_name="Mall_Customers.csv",
        records=result["records"],
        num_clusters=result["numClusters"],
        silhouette_score=result["silhouetteScore"],
        training_cost=result["trainingCost"],
        centroids=result["centroids"],
    )
    latest = get_latest_run()
    assert latest is not None
    return jsonify(build_dashboard_payload(latest))


@app.route("/api/export/csv", methods=["GET"])
def export_csv():
    run_data = ensure_seeded_database()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "CustomerID",
            "Gender",
            "Age",
            "Annual Income (k$)",
            "Spending Score (1-100)",
            "Cluster ID",
            "Segment",
        ]
    )
    for row in run_data["customers"]:
        writer.writerow(
            [
                row["customerId"],
                row["gender"],
                row["age"],
                row["annualIncome"],
                row["spendingScore"],
                row["clusterId"],
                row["segment"],
            ]
        )

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=spark_customer_segments.csv"
        },
    )


if __name__ == "__main__":
    ensure_seeded_database()
    app.run(host="0.0.0.0", port=5000, debug=True)
