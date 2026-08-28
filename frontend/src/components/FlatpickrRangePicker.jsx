import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es.js';
import 'flatpickr/dist/flatpickr.min.css';

export default function FlatpickrRangePicker({
  dateFrom,
  dateTo,
  onChange,
  placeholder = 'Seleccionar rango de fechas...',
  showPresets = true,
}) {
  const inputRef = useRef(null);
  const fpRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const initialDates = [];
    if (dateFrom) initialDates.push(dateFrom);
    if (dateTo) initialDates.push(dateTo);

    fpRef.current = flatpickr(inputRef.current, {
      mode: 'range',
      locale: Spanish,
      dateFormat: 'Y-m-d',
      defaultDate: initialDates,
      allowInput: true,
      onClose: (selectedDates) => {
        if (selectedDates.length === 2) {
          const fromStr = formatDate(selectedDates[0]);
          const toStr = formatDate(selectedDates[1]);
          onChange({ dateFrom: fromStr, dateTo: toStr });
        } else if (selectedDates.length === 1) {
          const single = formatDate(selectedDates[0]);
          onChange({ dateFrom: single, dateTo: single });
        } else if (selectedDates.length === 0) {
          onChange({ dateFrom: '', dateTo: '' });
        }
      },
    });

    return () => {
      if (fpRef.current) {
        fpRef.current.destroy();
      }
    };
  }, []);

  // Sincronizar cambios externos
  useEffect(() => {
    if (!fpRef.current) return;
    const currentFrom = dateFrom || '';
    const currentTo = dateTo || '';
    if (currentFrom && currentTo) {
      fpRef.current.setDate([currentFrom, currentTo], false);
    } else if (currentFrom) {
      fpRef.current.setDate([currentFrom], false);
    } else if (!currentFrom && !currentTo) {
      fpRef.current.clear(false);
    }
  }, [dateFrom, dateTo]);

  const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyPreset = (presetKey) => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (presetKey === 'today') {
      from = now;
      to = now;
    } else if (presetKey === '7days') {
      from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      to = now;
    } else if (presetKey === '30days') {
      from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      to = now;
    } else if (presetKey === 'thisMonth') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (presetKey === 'lastMonth') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (presetKey === 'all') {
      onChange({ dateFrom: '', dateTo: '' });
      if (fpRef.current) fpRef.current.clear();
      return;
    }

    const fromStr = formatDate(from);
    const toStr = formatDate(to);
    onChange({ dateFrom: fromStr, dateTo: toStr });
    if (fpRef.current) {
      fpRef.current.setDate([fromStr, toStr], true);
    }
  };

  return (
    <div className="flatpickr-range-container">
      <div className="flatpickr-input-wrapper">
        <svg
          className="flatpickr-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          className="input flatpickr-custom-input"
          placeholder={placeholder}
          readOnly
        />

        {(dateFrom || dateTo) && (
          <button
            type="button"
            className="flatpickr-clear-btn"
            title="Limpiar rango de fechas"
            onClick={() => {
              onChange({ dateFrom: '', dateTo: '' });
              if (fpRef.current) fpRef.current.clear();
            }}
          >
            ✕
          </button>
        )}
      </div>

      {showPresets && (
        <div className="flatpickr-presets">
          <button
            type="button"
            className="preset-pill"
            onClick={() => applyPreset('today')}
          >
            Hoy
          </button>
          <button
            type="button"
            className="preset-pill"
            onClick={() => applyPreset('7days')}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            className="preset-pill"
            onClick={() => applyPreset('30days')}
          >
            30 días
          </button>
          <button
            type="button"
            className="preset-pill"
            onClick={() => applyPreset('thisMonth')}
          >
            Este mes
          </button>
          <button
            type="button"
            className="preset-pill"
            onClick={() => applyPreset('lastMonth')}
          >
            Mes anterior
          </button>
          <button
            type="button"
            className="preset-pill preset-all"
            onClick={() => applyPreset('all')}
          >
            Todo
          </button>
        </div>
      )}
    </div>
  );
}
