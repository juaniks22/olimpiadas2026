import { useState, useEffect } from 'react';
import { exportRestockPdf, exportRestockTxt } from '../utils/restockTicketExport';

async function readError(res, fallback) {
  try {
    const data = await res.json();
    return data?.error?.message || fallback;
  } catch {
    return fallback;
  }
}

const errorBoxStyle = {
  padding: '12px', background: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E',
  borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', whiteSpace: 'pre-line',
};

// Ticket de reposición: antes de reactivar un carro, el personal ve qué se consumió
// (= qué falta reponer) y tiene que tildar cada ítem repuesto. Recién ahí se habilita
// el botón "Reactivar carro".
export default function RestockTicketModal({ cartId, token, API_URL, onClose, onReactivated }) {
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [ticket, setTicket] = useState(null);
  const [checked, setChecked] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/crash-carts/${cartId}/restock-ticket`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await readError(r, 'No se pudo cargar el ticket de reposición'));
        return r.json();
      })
      .then(setTicket)
      .catch((e) => setErr(e.message));
  }, [API_URL, token, cartId]);

  const lines = ticket?.lines || [];
  const allChecked = lines.length > 0 && lines.every((l) => checked[l.itemId]);
  const canReactivate = !!ticket && (lines.length === 0 || allChecked);
  const pending = lines.filter((l) => !checked[l.itemId]).length;

  const toggle = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const toggleAll = () =>
    setChecked(allChecked ? {} : Object.fromEntries(lines.map((l) => [l.itemId, true])));

  const reactivate = async () => {
    if (!canReactivate) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${cartId}/reactivate`, {
        method: 'POST', headers: authHeaders,
      });
      if (!res.ok) {
        setErr(await readError(res, 'No se pudo reactivar el carro'));
        return;
      }
      onReactivated?.();
      onClose();
    } catch {
      setErr('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="modal slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '95%' }}>
        <div className="modal-header">
          <h2>Reposición del carro{ticket?.cartName ? `: ${ticket.cartName}` : ''}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {err && <div style={errorBoxStyle}>{err}</div>}

        {!ticket && !err ? (
          <p style={{ color: 'var(--text-tertiary)' }}>Cargando...</p>
        ) : lines.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No hay consumos pendientes de reponer en este carro. Podés reactivarlo directamente.
          </p>
        ) : (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
              Repuesto lo consumido de cada ítem hasta la cantidad estándar y tildá la casilla.
              El carro se reactiva cuando esté <strong>todo tildado</strong>.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => exportRestockPdf(ticket, checked)}>
                Descargar PDF
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => exportRestockTxt(ticket, checked)}>
                Descargar TXT
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'right' }}>#</th>
                    <th>Ítem</th>
                    <th style={{ width: 140 }}>A reponer</th>
                    <th>Unidad</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Repuesto</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr
                      key={l.itemId}
                      onClick={() => toggle(l.itemId)}
                      style={{ cursor: 'pointer', opacity: checked[l.itemId] ? 0.55 : 1 }}
                    >
                      <td style={{ textAlign: 'right', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                      <td>{l.name}</td>
                      <td>
                        <strong>{l.consumed}</strong>
                        {l.standardQuantity != null && (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                            {' '}/ {l.standardQuantity} estándar
                          </span>
                        )}
                      </td>
                      <td>{l.unit || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="restock-check"
                          checked={!!checked[l.itemId]}
                          onChange={() => toggle(l.itemId)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Marcar ${l.name} como repuesto`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <button className="btn btn-sm btn-secondary" onClick={toggleAll}>
                {allChecked ? 'Desmarcar todo como repuesto' : 'Marcar todo como repuesto'}
              </button>
              <span style={{ fontSize: '0.8125rem', color: pending ? '#F59E0B' : '#16A34A' }}>
                {pending ? `Faltan tildar ${pending} ítem(s)` : 'Todo repuesto ✓'}
              </span>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={reactivate}
            disabled={busy || !canReactivate}
            title={canReactivate ? '' : 'Tildá todos los ítems repuestos para poder reactivar'}
          >
            {busy ? 'Reactivando...' : 'Reactivar carro'}
          </button>
        </div>
      </div>
    </div>
  );
}
