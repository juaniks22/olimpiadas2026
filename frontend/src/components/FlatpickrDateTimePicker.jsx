import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es.js';
import 'flatpickr/dist/flatpickr.min.css';

// Convierte Date a 'YYYY-MM-DDTHH:mm' local
function toIsoLocal(d) {
  if (!d) return '';
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
}

export default function FlatpickrDateTimePicker({
  id,
  value,
  onChange,
  minDate,
  maxDate,
  baseDate,
  placeholder = 'dd/mm/aaaa, --:--',
  required = false,
  disabled = false,
  className = '',
  style = {},
}) {
  const inputRef = useRef(null);
  const fpRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) return;

    fpRef.current = flatpickr(inputRef.current, {
      enableTime: true,
      time_24hr: true,
      locale: Spanish,
      dateFormat: 'd/m/Y, H:i',
      defaultDate: value ? new Date(value) : undefined,
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
      allowInput: true,
      disableMobile: true,
      onOpen: (selectedDates, dateStr, instance) => {
        // Si no hay fecha seleccionada pero se pasó una fecha base (ej. el día del evento), saltar a ese día
        if ((!selectedDates || selectedDates.length === 0) && baseDate) {
          const bDate = new Date(`${baseDate}T12:00:00`);
          if (!isNaN(bDate.getTime())) {
            instance.jumpToDate(bDate);
          }
        }
      },
      onChange: (selectedDates) => {
        if (onChange) {
          if (selectedDates && selectedDates.length > 0) {
            onChange(toIsoLocal(selectedDates[0]));
          } else {
            onChange('');
          }
        }
      },
    });

    return () => {
      if (fpRef.current) {
        fpRef.current.destroy();
      }
    };
  }, []);

  // Sincronizar cambios de valor externo o fecha base
  useEffect(() => {
    if (!fpRef.current) return;
    if (value) {
      fpRef.current.setDate(new Date(value), false);
    } else {
      fpRef.current.clear(false);
      if (baseDate) {
        const bDate = new Date(`${baseDate}T12:00:00`);
        if (!isNaN(bDate.getTime())) {
          fpRef.current.jumpToDate(bDate);
        }
      }
    }
  }, [value, baseDate]);

  // Sincronizar minDate y maxDate dinámicos
  useEffect(() => {
    if (!fpRef.current) return;
    fpRef.current.set('minDate', minDate || undefined);
  }, [minDate]);

  useEffect(() => {
    if (!fpRef.current) return;
    fpRef.current.set('maxDate', maxDate || undefined);
  }, [maxDate]);

  // Sincronizar disabled
  useEffect(() => {
    if (!fpRef.current || !inputRef.current) return;
    if (disabled) {
      inputRef.current.setAttribute('disabled', 'disabled');
    } else {
      inputRef.current.removeAttribute('disabled');
    }
  }, [disabled]);

  const handleSetNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const now = new Date();
    if (fpRef.current) {
      if (maxDate) {
        fpRef.current.set('maxDate', now);
      }
      fpRef.current.setDate(now, false);
    }
    if (onChange) {
      onChange(toIsoLocal(now));
    }
  };

  return (
    <div className="flatpickr-datetime-wrapper" style={style}>
      <div className="flatpickr-datetime-field">
        <svg
          className="flatpickr-datetime-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          onClick={() => fpRef.current?.open()}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={`input flatpickr-datetime-input ${className}`}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
        />
      </div>
      {!disabled && (
        <button
          type="button"
          className="flatpickr-datetime-now-btn"
          onClick={handleSetNow}
          title="Fijar fecha y hora actual"
        >
          Ahora
        </button>
      )}
    </div>
  );
}
