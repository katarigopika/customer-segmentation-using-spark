import { useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Send,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  generateBigDataSampleCsvText,
  generateSampleCsvText,
} from '../data/demoDataset';

const REQUIRED_COLUMNS = [
  'CustomerID',
  'Gender',
  'Age',
  'Annual Income (k$)',
  'Spending Score (1-100)',
];

interface ParsedRow {
  CustomerID: number;
  Gender: string;
  Age: number;
  'Annual Income (k$)': number;
  'Spending Score (1-100)': number;
}

interface UploadDatasetViewProps {
  backendAvailable: boolean;
  flaskUrl: string;
  onSubmitToBackend: (
    datasetName: string,
    rows: ParsedRow[],
    k: number
  ) => Promise<boolean>;
  onOpenSettings: () => void;
}

export function UploadDatasetView({
  backendAvailable,
  flaskUrl,
  onSubmitToBackend,
  onOpenSettings,
}: UploadDatasetViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [validRows, setValidRows] = useState<ParsedRow[]>([]);
  const [skippedRows, setSkippedRows] = useState(0);
  const [parseError, setParseError] = useState('');
  const [numClusters, setNumClusters] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const processCsvText = (csvText: string, name: string) => {
    setParseError('');
    setFileName(name);

    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      setParseError(parsed.errors[0].message || 'Unable to parse CSV file.');
      setColumns([]);
      setValidRows([]);
      return;
    }

    const detectedCols = (parsed.meta.fields || []).map((c) => c.trim());
    setColumns(detectedCols);

    const missing = REQUIRED_COLUMNS.filter((req) => !detectedCols.includes(req));
    setMissingColumns(missing);

    if (missing.length > 0) {
      setValidRows([]);
      setSkippedRows(0);
      return;
    }

    const cleaned: ParsedRow[] = [];
    let skipped = 0;

    for (const row of parsed.data) {
      const id = Number(row['CustomerID']);
      const age = Number(row['Age']);
      const income = Number(row['Annual Income (k$)']);
      const spending = Number(row['Spending Score (1-100)']);
      const gender = String(row['Gender'] || '').trim();

      if (
        Number.isFinite(id) &&
        Number.isFinite(age) &&
        Number.isFinite(income) &&
        Number.isFinite(spending) &&
        gender.length > 0
      ) {
        cleaned.push({
          CustomerID: Math.round(id),
          Gender: gender,
          Age: Math.round(age),
          'Annual Income (k$)': income,
          'Spending Score (1-100)': spending,
        });
      } else {
        skipped += 1;
      }
    }

    setValidRows(cleaned);
    setSkippedRows(skipped);
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a valid .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      processCsvText(String(reader.result || ''), file.name);
    };
    reader.onerror = () => {
      setParseError('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCsv = () => {
    processCsvText(generateSampleCsvText(), 'Mall_Customers.csv');
  };

  const handleDownloadSampleCsv = (bigData = false) => {
    const csv = bigData ? generateBigDataSampleCsvText(5000) : generateSampleCsvText();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bigData ? 'Mall_Customers_5000_BigData.csv' : 'Mall_Customers_Sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setFileName('');
    setColumns([]);
    setMissingColumns([]);
    setValidRows([]);
    setSkippedRows(0);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (validRows.length < 5 || missingColumns.length > 0) return;
    setIsSubmitting(true);
    try {
      await onSubmitToBackend(fileName || 'uploaded_dataset.csv', validRows, numClusters);
    } finally {
      setIsSubmitting(false);
    }
  };

  const datasetStats =
    validRows.length > 0
      ? {
          minIncome: Math.min(...validRows.map((r) => r['Annual Income (k$)'])),
          maxIncome: Math.max(...validRows.map((r) => r['Annual Income (k$)'])),
          minAge: Math.min(...validRows.map((r) => r.Age)),
          maxAge: Math.max(...validRows.map((r) => r.Age)),
          avgSpending: (
            validRows.reduce((s, r) => s + r['Spending Score (1-100)'], 0) /
            validRows.length
          ).toFixed(1),
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Upload Customer Dataset
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Validate CSV schema locally, inspect dataset summary statistics, and submit to Flask + PySpark for K-Means clustering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleDownloadSampleCsv(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>200-Row CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadSampleCsv(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>5,000-Row Big Data CSV</span>
          </button>
          <button
            type="button"
            onClick={handleLoadSampleCsv}
            className="px-3.5 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Preview Sample CSV
          </button>
        </div>
      </div>

      {!backendAvailable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Python Flask + Apache Spark backend offline ({flaskUrl})
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                You can validate and preview CSV files here. To execute real PySpark K-Means clustering, run{' '}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">python backend/app.py</code>{' '}
                locally or configure your Flask endpoint.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3.5 py-2 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors whitespace-nowrap self-start sm:self-center"
          >
            Backend Settings
          </button>
        </div>
      )}

      {/* Dropzone & Schema Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileSelected(e.dataTransfer.files?.[0]);
            }}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h2 className="font-display text-base font-semibold text-slate-900 mt-4">
              Drop your customer CSV file here
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Supports standard UTF-8 CSV files with header columns matching the Mall Customers schema
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xs transition-all"
              >
                Choose CSV File
              </button>
              {fileName && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {parseError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 flex items-center gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Required CSV Columns
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Validated prior to PySpark VectorAssembler ingestion
            </p>
            <ul className="mt-4 space-y-2.5">
              {REQUIRED_COLUMNS.map((col) => {
                const isPresent = columns.includes(col);
                const hasChecked = columns.length > 0;
                return (
                  <li
                    key={col}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <code className="font-mono text-slate-800">{col}</code>
                    {hasChecked ? (
                      isPresent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Missing
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">Required</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <label
              htmlFor="cluster-k-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Target K-Means Clusters (k)
            </label>
            <select
              id="cluster-k-select"
              value={numClusters}
              onChange={(e) => setNumClusters(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[3, 4, 5, 6, 7].map((k) => (
                <option key={k} value={k}>
                  k = {k} clusters {k === 5 ? '(Recommended)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Preview & Submit Panel */}
      {fileName && missingColumns.length === 0 && validRows.length > 0 && datasetStats && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  {fileName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {validRows.length} valid rows · {skippedRows} skipped · Age {datasetStats.minAge}–
                  {datasetStats.maxAge} · Income ${datasetStats.minIncome}k–${datasetStats.maxIncome}k · Avg Score{' '}
                  {datasetStats.avgSpending}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || validRows.length < 5}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 shadow-xs transition-all whitespace-nowrap self-start md:self-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running PySpark K-Means...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit to Flask + Spark Backend</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-6">CustomerID</th>
                  <th className="py-2.5 px-4">Gender</th>
                  <th className="py-2.5 px-4 text-right">Age</th>
                  <th className="py-2.5 px-4 text-right">Annual Income (k$)</th>
                  <th className="py-2.5 px-6 text-right">Spending Score (1-100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {validRows.slice(0, 10).map((row, idx) => (
                  <tr key={`${row.CustomerID}-${idx}`} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-6 font-mono tabular-nums text-slate-900">
                      #{row.CustomerID}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{row.Gender}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {row.Age}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      ${row['Annual Income (k$)']}k
                    </td>
                    <td className="py-2.5 px-6 text-right font-mono tabular-nums text-slate-700">
                      {row['Spending Score (1-100)']}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-200 text-xs text-slate-500 tabular-nums">
            Showing preview of first {Math.min(10, validRows.length)} of {validRows.length} validated rows.
          </div>
        </div>
      )}
    </div>
  );
}
