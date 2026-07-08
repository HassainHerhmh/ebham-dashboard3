import { useState, useEffect } from 'react';
import { api, DAYS, WEEK_ORDER_SATURDAY } from '../api';

const defaultDayShift = (i) => ({
  day_of_week: i,
  period_count: i === 5 ? 1 : 2,
  period1_start: '08:00',
  period1_end: '12:00',
  break_hours: 2,
  break_mins: 0,
  period2_start: '14:00',
  period2_end: '17:00',
  is_active: i <= 4
});

const DEFAULT_SHIFTS = DAYS.map((_, i) => defaultDayShift(i));

function PeriodModeToggle({ value, onChange, disabled }) {
  return (
    <div className="shift-period-mode">
      <button
        type="button"
        className={value === 1 ? 'active' : ''}
        disabled={disabled}
        onClick={() => onChange(1)}
      >
        فترة واحدة
      </button>
      <button
        type="button"
        className={value === 2 ? 'active' : ''}
        disabled={disabled}
        onClick={() => onChange(2)}
      >
        فترتين
      </button>
    </div>
  );
}

function normalizeShift(existing, i) {
  if (!existing) return defaultDayShift(i);
  const totalMins = Number(
    existing.break_minutes ?? Math.round(Number(existing.break_hours ?? 2) * 60)
  );
  const period_count = Number(existing.period_count) === 1 ? 1 : 2;
  return {
    day_of_week: i,
    period_count,
    period1_start: existing.period1_start || existing.start_time || '08:00',
    period1_end: period_count === 1
      ? (existing.period1_end || existing.end_time || '17:00')
      : (existing.period1_end || '12:00'),
    break_hours: Math.floor(totalMins / 60),
    break_mins: totalMins % 60,
    period2_start: existing.period2_start || '14:00',
    period2_end: existing.period2_end || existing.end_time || '17:00',
    is_active: true
  };
}

export default function Shifts() {
  const [captains, setCaptains] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState({
    period_count: 2,
    period1_start: '08:00',
    period1_end: '12:00',
    break_hours: 2,
    break_mins: 0,
    period2_start: '14:00',
    period2_end: '17:00',
    is_active: true,
  });

  const updateTemplate = (field, value) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  const applyToAllDays = () => {
    setShifts(prev => prev.map(s => ({
      ...s,
      period_count: template.period_count,
      period1_start: template.period1_start,
      period1_end: template.period1_end,
      break_hours: template.break_hours,
      break_mins: template.break_mins,
      period2_start: template.period2_start,
      period2_end: template.period2_end,
      is_active: template.is_active,
    })));
    setSaved(false);
  };

  useEffect(() => {
    api.getCaptains().then(list => {
      setCaptains(list);
      if (list.length) setSelectedId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    api.getShifts(selectedId).then(existing => {
      if (existing.length === 0) {
        setShifts(DEFAULT_SHIFTS);
      } else {
        setShifts(DAYS.map((_, i) => {
          const found = existing.find(s => s.day_of_week === i);
          return found
            ? normalizeShift(found, i)
            : { ...defaultDayShift(i), is_active: false };
        }));
      }
    });
  }, [selectedId]);

  const updateShift = (dayIndex, field, value) => {
    setShifts(prev => prev.map(s => s.day_of_week === dayIndex ? { ...s, [field]: value } : s));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = shifts.map(s => ({
        ...s,
        break_minutes: Math.max(0, Number(s.break_hours || 0) * 60 + Number(s.break_mins || 0))
      }));
      await api.saveShifts(selectedId, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const selectedCaptain = captains.find(c => c.id === selectedId);

  return (
    <>
      <div className="page-header">
        <h2>إعداد الدوام</h2>
        <p>حدّد فترة واحدة أو فترتين مع فترة راحة لكل يوم</p>
      </div>

      <div className="card">
        <div className="form-group" style={{ maxWidth: 400 }}>
          <label>اختر الكابتن</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {captains.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
            ))}
          </select>
        </div>

        {selectedCaptain && (
          <p className="my-3 mb-5 text-sm text-gray-500 dark:text-gray-400">
            دوام: <strong className="text-gray-800 dark:text-gray-200">{selectedCaptain.name}</strong> — {selectedCaptain.captain_number}
          </p>
        )}

        <div className="shift-apply-all-card">
          <div className="shift-apply-all-head">
            <div>
              <strong>إعداد موحّد</strong>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                حدّد الأوقات مرة واحدة ثم طبّقها على كل أيام الأسبوع
              </p>
            </div>
            <label className="shift-active-toggle">
              <input
                type="checkbox"
                checked={template.is_active}
                onChange={e => updateTemplate('is_active', e.target.checked)}
              />
              نشط
            </label>
          </div>

          <PeriodModeToggle
            value={template.period_count}
            onChange={v => updateTemplate('period_count', v)}
          />

          <div className="shift-apply-all-body">
            <div className="shift-period-block">
              <span className="shift-period-label">
                {template.period_count === 1 ? 'فترة الدوام' : 'الفترة الأولى'}
              </span>
              <div className="shift-period-times">
                <label>
                  <span>بداية</span>
                  <input type="time" value={template.period1_start} onChange={e => updateTemplate('period1_start', e.target.value)} />
                </label>
                <label>
                  <span>نهاية</span>
                  <input
                    type="time"
                    value={template.period1_end}
                    onChange={e => updateTemplate('period1_end', e.target.value)}
                  />
                </label>
              </div>
            </div>

            {template.period_count === 2 && (
              <>
            <div className="shift-period-block shift-break-block">
              <span className="shift-period-label">فترة الراحة</span>
              <div className="shift-break-fields">
                <label className="shift-break-input">
                  <input type="number" min="0" max="8" value={template.break_hours} onChange={e => updateTemplate('break_hours', Number(e.target.value))} />
                  <span>ساعة</span>
                </label>
                <label className="shift-break-input">
                  <input type="number" min="0" max="59" step="5" value={template.break_mins} onChange={e => updateTemplate('break_mins', Number(e.target.value))} />
                  <span>دقيقة</span>
                </label>
              </div>
            </div>

            <div className="shift-period-block">
              <span className="shift-period-label">الفترة الثانية</span>
              <div className="shift-period-times">
                <label>
                  <span>بداية</span>
                  <input type="time" value={template.period2_start} onChange={e => updateTemplate('period2_start', e.target.value)} />
                </label>
                <label>
                  <span>نهاية</span>
                  <input type="time" value={template.period2_end} onChange={e => updateTemplate('period2_end', e.target.value)} />
                </label>
              </div>
            </div>
              </>
            )}
          </div>

          <button type="button" className="btn btn-secondary shift-apply-all-btn" onClick={applyToAllDays}>
            تطبيق الإعداد على كل الأيام
          </button>
        </div>

        <div className="shift-period-grid">
          {WEEK_ORDER_SATURDAY.map(dayIndex => {
            const s = shifts.find(x => x.day_of_week === dayIndex) || defaultDayShift(dayIndex);
            return (
            <div className={`shift-period-card ${s.is_active ? '' : 'shift-period-off'}`} key={dayIndex}>
              <div className="shift-period-header">
                <span className="day-label">{DAYS[dayIndex]}</span>
                <label className="shift-active-toggle">
                  <input
                    type="checkbox"
                    checked={s.is_active}
                    onChange={e => updateShift(dayIndex, 'is_active', e.target.checked)}
                  />
                  نشط
                </label>
              </div>

              <PeriodModeToggle
                value={s.period_count ?? 2}
                disabled={!s.is_active}
                onChange={v => updateShift(dayIndex, 'period_count', v)}
              />

              <div className="shift-period-block">
                <span className="shift-period-label">
                  {s.period_count === 1 ? 'فترة الدوام' : 'الفترة الأولى'}
                </span>
                <div className="shift-period-times">
                  <label>
                    <span>بداية</span>
                    <input
                      type="time"
                      value={s.period1_start}
                      disabled={!s.is_active}
                      onChange={e => updateShift(dayIndex, 'period1_start', e.target.value)}
                    />
                  </label>
                  <label>
                    <span>نهاية</span>
                    <input
                      type="time"
                      value={s.period1_end}
                      disabled={!s.is_active}
                      onChange={e => updateShift(dayIndex, 'period1_end', e.target.value)}
                    />
                  </label>
                </div>
              </div>

              {s.period_count === 2 && (
                <>
              <div className="shift-period-block shift-break-block">
                <span className="shift-period-label">فترة الراحة</span>
                <div className="shift-break-fields">
                  <label className="shift-break-input">
                    <input
                      type="number"
                      min="0"
                      max="8"
                      value={s.break_hours}
                      disabled={!s.is_active}
                      onChange={e => updateShift(dayIndex, 'break_hours', Number(e.target.value))}
                    />
                    <span>ساعة</span>
                  </label>
                  <label className="shift-break-input">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="5"
                      value={s.break_mins}
                      disabled={!s.is_active}
                      onChange={e => updateShift(dayIndex, 'break_mins', Number(e.target.value))}
                    />
                    <span>دقيقة</span>
                  </label>
                </div>
              </div>

              <div className="shift-period-block">
                <span className="shift-period-label">الفترة الثانية</span>
                <div className="shift-period-times">
                  <label>
                    <span>بداية</span>
                    <input
                      type="time"
                      value={s.period2_start}
                      disabled={!s.is_active}
                      onChange={e => updateShift(dayIndex, 'period2_start', e.target.value)}
                    />
                  </label>
                  <label>
                    <span>نهاية</span>
                    <input
                      type="time"
                      value={s.period2_end}
                      disabled={!s.is_active}
                      onChange={e => updateShift(dayIndex, 'period2_end', e.target.value)}
                    />
                  </label>
                </div>
              </div>
                </>
              )}
            </div>
            );
          })}
        </div>

        <div className="mt-5 flex gap-3 items-center">
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ الدوام'}
          </button>
          {saved && <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">✓ تم الحفظ</span>}
        </div>
      </div>
    </>
  );
}
