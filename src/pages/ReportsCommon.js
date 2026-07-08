import { useEffect, useState } from 'react';
import { api } from '../api';
import { PERIOD_LABELS, todayKey, getFilterRange, formatFilterHint, formatMoney, formatDateKey, formatDateTime } from './reportsShared';

export function useCaptains() {
  const [captains, setCaptains] = useState([]);
  useEffect(() => {
    api.getCaptains().then(setCaptains);
  }, []);
  return captains;
}

export function ReportsFilterBar({ period, setPeriod, date, setDate, captainId, setCaptainId, captains, showCaptain = true }) {
  const range = getFilterRange(period, date);

  return (
    <div className="card mb-5 report-print-hidden">
      <div className="finance-tabs-bar">
        <div className="finance-filter-periods">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button key={key} type="button" className={`finance-filter-period-btn ${period === key ? 'active' : ''}`} onClick={() => setPeriod(key)}>{label}</button>
          ))}
        </div>
        <div className="finance-page-filter">
          {showCaptain && (
            <select className="finance-filter-select" value={captainId} onChange={e => setCaptainId(e.target.value)}>
              <option value="">كل الكباتن</option>
              {captains.map(c => <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>)}
            </select>
          )}
          <input className="finance-filter-date-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <span className="finance-filter-hint">{formatFilterHint(period, range)}</span>
        </div>
      </div>
    </div>
  );
}

export { PERIOD_LABELS, todayKey, getFilterRange, formatMoney, formatDateKey, formatDateTime };
