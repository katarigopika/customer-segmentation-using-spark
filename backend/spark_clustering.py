"""Apache Spark (PySpark MLlib) K-Means Customer Segmentation Engine."""

from typing import Any, Dict, List, Tuple
import pandas as pd
from pyspark.ml import Pipeline
from pyspark.ml.clustering import KMeans
from pyspark.ml.evaluation import ClusteringEvaluator
from pyspark.ml.feature import StandardScaler, VectorAssembler
from pyspark.sql import SparkSession

REQUIRED_COLUMNS = [
    "CustomerID",
    "Gender",
    "Age",
    "Annual Income (k$)",
    "Spending Score (1-100)",
]

SEGMENT_METADATA: Dict[str, Dict[str, str]] = {
    "Lower Income - Moderate Spenders": {
        "color": "#4F46E5",
        "strategy": "Retention & loyalty bundles; reward steady repeat visits with tiered discounts.",
    },
    "Lower Income - High Spenders": {
        "color": "#9333EA",
        "strategy": "Flash sales, EMI/BNPL options, and trend-focused promotional campaigns.",
    },
    "High Income - High Spenders": {
        "color": "#0EA5E9",
        "strategy": "VIP concierge tiers, early product access, and premium experiential upsells.",
    },
    "Lower Income - Low Spenders": {
        "color": "#64748B",
        "strategy": "Value-oriented bundles, seasonal clearance alerts, and entry-level offers.",
    },
    "High Income - Low Spenders": {
        "color": "#059669",
        "strategy": "Targeted brand storytelling, quality guarantees, and personalized high-ticket reactivation.",
    },
}

_spark_session: SparkSession | None = None


def get_spark_session() -> SparkSession:
    """Create or reuse a local SparkSession for K-Means clustering."""
    global _spark_session
    if _spark_session is None:
        _spark_session = (
            SparkSession.builder.appName("CustomerSegmentationSpark")
            .master("local[*]")
            .config("spark.ui.enabled", "false")
            .config("spark.sql.shuffle.partitions", "4")
            .getOrCreate()
        )
        _spark_session.sparkContext.setLogLevel("ERROR")
    return _spark_session


def validate_and_clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Validate required schema and clean numeric fields using Pandas."""
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    cleaned = df[REQUIRED_COLUMNS].copy()
    cleaned = cleaned.dropna(subset=REQUIRED_COLUMNS)

    for col in ["CustomerID", "Age", "Annual Income (k$)", "Spending Score (1-100)"]:
        cleaned[col] = pd.to_numeric(cleaned[col], errors="coerce")

    cleaned = cleaned.dropna()
    cleaned["CustomerID"] = cleaned["CustomerID"].astype(int)
    cleaned["Age"] = cleaned["Age"].astype(int)
    cleaned["Gender"] = cleaned["Gender"].astype(str).str.strip()
    cleaned["Annual Income (k$)"] = cleaned["Annual Income (k$)"].astype(float)
    cleaned["Spending Score (1-100)"] = cleaned["Spending Score (1-100)"].astype(float)

    if len(cleaned) < 5:
        raise ValueError("Dataset must contain at least 5 valid customer rows.")

    return cleaned


def _assign_segment_labels(
    clustered_df: pd.DataFrame,
    global_income_mean: float,
) -> Tuple[Dict[int, str], List[Dict[str, Any]]]:
    """Map numeric Spark cluster IDs to human-readable behavioral segment names."""
    stats = (
        clustered_df.groupby("clusterId")
        .agg(
            avg_income=("Annual Income (k$)", "mean"),
            avg_spending=("Spending Score (1-100)", "mean"),
            avg_age=("Age", "mean"),
            count=("CustomerID", "count"),
        )
        .reset_index()
    )

    cluster_to_name: Dict[int, str] = {}
    used_names: set[str] = set()

    for _, row in stats.iterrows():
        cid = int(row["clusterId"])
        inc = float(row["avg_income"])
        spend = float(row["avg_spending"])

        income_band = "High Income" if inc >= global_income_mean else "Lower Income"
        if spend >= 62:
            spend_band = "High Spenders"
        elif spend <= 38:
            spend_band = "Low Spenders"
        else:
            spend_band = "Moderate Spenders"

        candidate = f"{income_band} - {spend_band}"
        if candidate in used_names:
            candidate = f"{candidate} (Cluster {cid + 1})"
        used_names.add(candidate)
        cluster_to_name[cid] = candidate

    centroids: List[Dict[str, Any]] = []
    for _, row in stats.iterrows():
        cid = int(row["clusterId"])
        seg_name = cluster_to_name[cid]
        centroids.append(
            {
                "clusterId": cid,
                "segment": seg_name,
                "avgIncome": round(float(row["avg_income"]), 2),
                "avgSpending": round(float(row["avg_spending"]), 2),
                "avgAge": round(float(row["avg_age"]), 1),
                "count": int(row["count"]),
                "color": SEGMENT_METADATA.get(seg_name, {}).get("color", "#6366F1"),
            }
        )

    return cluster_to_name, centroids


def run_spark_kmeans(df: pd.DataFrame, num_clusters: int = 5) -> Dict[str, Any]:
    """Execute PySpark K-Means pipeline and evaluate Silhouette Score."""
    cleaned = validate_and_clean_dataframe(df)
    k = max(2, min(int(num_clusters), len(cleaned)))

    spark = get_spark_session()
    spark_df = spark.createDataFrame(cleaned)

    assembler = VectorAssembler(
        inputCols=["Annual Income (k$)", "Spending Score (1-100)"],
        outputCol="raw_features",
    )
    scaler = StandardScaler(
        inputCol="raw_features",
        outputCol="features",
        withStd=True,
        withMean=True,
    )
    kmeans = KMeans(
        featuresCol="features",
        predictionCol="clusterId",
        k=k,
        seed=42,
        initMode="k-means||",
        maxIter=50,
    )

    import time

    start_time = time.perf_counter()
    pipeline = Pipeline(stages=[assembler, scaler, kmeans])
    model = pipeline.fit(spark_df)
    predictions = model.transform(spark_df)

    evaluator = ClusteringEvaluator(
        featuresCol="features",
        predictionCol="clusterId",
        metricName="silhouette",
        distanceMeasure="squaredEuclidean",
    )
    silhouette_score = float(evaluator.evaluate(predictions))
    kmeans_model = model.stages[-1]
    training_cost = float(kmeans_model.summary.trainingCost)
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)

    pdf = predictions.select(
        "CustomerID",
        "Gender",
        "Age",
        "Annual Income (k$)",
        "Spending Score (1-100)",
        "clusterId",
    ).toPandas()

    global_income_mean = float(pdf["Annual Income (k$)"].mean())
    cluster_to_name, centroids = _assign_segment_labels(pdf, global_income_mean)

    records: List[Dict[str, Any]] = []
    for _, row in pdf.iterrows():
        cid = int(row["clusterId"])
        records.append(
            {
                "customerId": int(row["CustomerID"]),
                "gender": str(row["Gender"]),
                "age": int(row["Age"]),
                "annualIncome": round(float(row["Annual Income (k$)"]), 2),
                "spendingScore": round(float(row["Spending Score (1-100)"]), 2),
                "clusterId": cid,
                "segment": cluster_to_name[cid],
            }
        )

    return {
        "records": records,
        "numClusters": k,
        "silhouetteScore": round(silhouette_score, 4),
        "trainingCost": round(training_cost, 4),
        "centroids": centroids,
        "sparkExecution": {
            "sparkVersion": spark.version,
            "partitions": spark_df.rdd.getNumPartitions(),
            "shufflePartitions": int(spark.conf.get("spark.sql.shuffle.partitions", "4")),
            "processingTimeMs": elapsed_ms,
        },
    }
