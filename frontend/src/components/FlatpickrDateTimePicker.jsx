import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es.js';
import 'flatpickr/dist/flatpickr.min.css';

export default function FlatpickrDateTimePicker({
  id,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'dd/mm/aaaa, --:--',
  required = false,
  disabled = false,
  enableSeconds = false,
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
      enableSeconds,
      locale: Spanish,
      dateFormat: enableSeconds ? 'Y-m-d\\TH:i:S' : 'Y-m-d\\TH:i',
      altInput: true,
      altFormat: enableSeconds ? 'd/m/Y, H:i:S' : 'd/m/Y, H:i',
      altInputClass: `input flatpickr-datetime-input ${className}`.trim(),
      defaultDate: value || undefined,
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
      allowInput: true,
      disableMobile: true, // Forzar flatpickr consistente en lugar del picker nativo de iOS/Android/Chrome
      onChange: (selectedDates, dateStr) => {
        if (onChange) {
          onChange(dateStr || '');
        }
      },
    });

    return () => {
      if (fpRef.current) {
        fpRef.current.destroy();
      }
    };
  }, []);

  // Sincronizar cambios de valor externo
  useEffect(() => {
    if (!fpRef.current) return;
    if (value) {
      fpRef.current.setDate(value, false);
    } else {
      fpRef.current.clear(false);
    }
  }, [value]);

  // Sincronizar minDate y maxDate dinámicos
  useEffect(() => {
    if (!fpRef.current) return;
    fpRef.current.set('minDate', minDate || undefined);
  }, [minDate]);

  useEffect(() => {
    if (!fpRef.current) return;
    fpRef.current.set('maxDate', maxDate || undefined);
  }, [maxDate]);

  // Manejar estado disabled
  useEffect(() => {
    if (!fpRef.current) return;
    if (disabled) {
      fpRef.current._input.setAttribute('disabled', 'disabled');
      if (fpRef.current.altInput) {
        fpRef.current.altInput.setAttribute('disabled', 'disabled');
      }
    } else {
      fpRef.current._input.removeAttribute('disabled');
      if (fpRef.current.altInput) {
        fpRef.current.altInput.removeAttribute('disabled');
      }
    }
  }, [disabled]);

  const handleSetNow = () => {
    const now = new Date();
    if (fpRef.current) {
      fpRef.current.setDate(now, true);
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
