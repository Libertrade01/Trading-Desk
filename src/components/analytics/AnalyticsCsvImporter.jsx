"use client";

import { useRef, useState } from "react";
import RTraderImportPreview from "../RTraderImportPreview";
import { processBrokerCSV } from "../../lib/broker-csv-import";
import { getMissingCommissionSymbols, importTradesToSupabase, loadImportAccount } from "../../lib/rtrader-import";
import { notifyTradesChanged } from "../../lib/session-events";

export default function AnalyticsCsvImporter({ open, onClose, onImported }) {
  const fileRef = useRef(null);
  const [broker, setBroker] = useState("rtrader");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const resetAndClose = () => {
    setError("");
    setPreview(null);
    setDragActive(false);
    onClose();
  };

  const processFile = async (file) => {
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const account = await loadImportAccount();
      const result = processBrokerCSV(text, account, broker);
      const missingSymbols = account?.commissions_enabled !== false
        ? getMissingCommissionSymbols(result.trades, account?.commissions || {})
        : [];
      setPreview({ ...result, account, filename: file.name, missingSymbols });
    } catch (err) {
      setError(err.message || "The CSV could not be read.");
    }
  };

  const handleInput = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    await processFile(file);
  };

  const handleConfirm = async (trades) => {
    await importTradesToSupabase(trades, preview?.account);
    notifyTradesChanged();
    await onImported(trades);
    resetAndClose();
  };

  if (!open) return null;

  return (
    <>
      {!preview && (
        <div className="import-modal-overlay open" onClick={(event) => event.target === event.currentTarget && resetAndClose()}>
          <section className="analytics-import-dialog" role="dialog" aria-modal="true" aria-labelledby="analytics-import-title">
            <header className="analytics-import-dialog__head">
              <div>
                <span className="import-modal-eyebrow">Historical trade import</span>
                <h2 id="analytics-import-title">Import trades to Stats.</h2>
                <p>Upload broker trades without creating or changing a Close LOOP journal.</p>
              </div>
              <button type="button" className="import-modal-close" onClick={resetAndClose} aria-label="Close">&times;</button>
            </header>

            <div className="analytics-import-dialog__broker">
              <label htmlFor="analytics-csv-broker">Broker</label>
              <select id="analytics-csv-broker" value={broker} onChange={(event) => { setBroker(event.target.value); setError(""); }}>
                <option value="rtrader">R Trader</option>
                <option value="tradovate">Tradovate</option>
              </select>
            </div>

            <div
              className={`pm-import-drop analytics-import-dialog__drop${dragActive ? " pm-import-drop--active" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") fileRef.current?.click();
              }}
              onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                processFile(event.dataTransfer.files?.[0]);
              }}
            >
              <div className="pm-import-drop-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="pm-import-drop-title">Drop CSV here or click to browse</div>
              <div className="pm-import-drop-hint">The imported dates will open automatically in Stats.</div>
              <button type="button" className="pm-closeout-upload-btn pm-import-drop-btn">Choose CSV</button>
            </div>

            {error && <p className="analytics-import-dialog__error" role="alert">{error}</p>}
            <p className="analytics-import-dialog__note">
              Re-importing an account and date replaces its existing CSV or manually entered trades. It does not create a Close LOOP journal.
            </p>
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleInput} />
          </section>
        </div>
      )}

      <RTraderImportPreview
        open={!!preview}
        onClose={() => setPreview(null)}
        trades={preview?.trades || []}
        openPosition={preview?.openPosition || 0}
        missingSymbols={preview?.missingSymbols || []}
        filename={preview?.filename || ""}
        account={preview?.account}
        sourceTimeZone={preview?.sourceTimeZone}
        timeColumnHeader={preview?.timeColumnHeader}
        brokerName={preview?.brokerName}
        onConfirm={handleConfirm}
      />
    </>
  );
}
