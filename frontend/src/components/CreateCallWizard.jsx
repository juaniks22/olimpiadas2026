import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../App';

// ─── Helpers ────────────────────────────────────────────────────────────────
async function readError(res, fallback) {
  try { const d = await res.json(); return d?.error?.message || fallback; }
  catch { return fallback; }
}

function toLocalDatetime(d) {
  if (!d) return '';
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Tope para los inputs datetime-local: el evento ya ocurrió y ya está firmado en
// papel, así que ninguna fecha/hora puede ser futura (además de validarse al enviar).
const nowLocal = () => toLocalDatetime(new Date());

const DNI_PATTERN = /^\d{6,8}$/;

const ID_TYPES = [
  { value: 'NN', label: 'No Identificado (NN)' },
  { value: 'DNI', label: 'DNI' },
  { value: 'TEMPORARY_ID', label: 'ID Temporario' },
];

const SEX_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
];

const AIRWAY_OPTIONS = [
  '', 'Cánula orofaríngea', 'Tubo endotraqueal', 'Máscara laríngea',
  'Bolsa-válvula-máscara', 'Otro',
];

const VENOUS_OPTIONS = [
  '', 'Periférico', 'Central', 'Intraóseo', 'Otro',
];

const ROUTE_OPTIONS = ['IV', 'IO', 'IM', 'SC', 'ET', 'VO'];

// ─── Estilos inline coherentes con design system ────────────────────────────

const sectionStyle = {
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-lg)',
  marginBottom: 'var(--space-lg)',
};

const sectionTitleStyle = {
  fontSize: '1rem',
  fontWeight: 700,
  marginBottom: 'var(--space-md)',
  color: 'var(--text-primary)',
};

const fieldGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 'var(--space-md)',
};

const errorBoxStyle = {
  padding: '12px', background: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E',
  borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', whiteSpace: 'pre-line',
};

const successBoxStyle = {
  ...errorBoxStyle, background: 'rgba(34,197,94,0.12)', color: '#16A34A',
};

const stepperStyle = {
  display: 'flex', gap: 4, marginBottom: 'var(--space-lg)',
};

const stepDotBase = {
  flex: 1, height: 4, borderRadius: 2, transition: 'background 0.2s',
};

const addBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.8125rem',
  cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0',
};

// ─── Main Component ─────────────────────────────────────────────────────────
const TOTAL_STEPS = 6;

export default function CreateCallWizard({ onClose, onCreated }) {
  const { token, API_URL } = useContext(AuthContext);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─ Catálogos (cargados una vez) ─
  const [areas, setAreas] = useState([]);
  const [positions, setPositions] = useState([]);   // ResponseTeamPosition
  const [staffList, setStaffList] = useState([]);    // StaffMember

  // ─ Paso 1: Datos iniciales ─
  const [areaId, setAreaId] = useState('');
  const [callType, setCallType] = useState('EMERGENCY');
  const [origin, setOrigin] = useState('INTRA_HOSPITAL');

  // Carro derivado del área
  const [areaCart, setAreaCart] = useState(null);     // { id, name, status, items[] }
  const [cartItems, setCartItems] = useState([]);

  // ─ Paso 2: Ficha del paciente ─
  const [patientIdType, setPatientIdType] = useState('NN');
  const [patientDni, setPatientDni] = useState('');
  const [patientTempId, setPatientTempId] = useState('');
  const [patientSex, setPatientSex] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [timeSinceDiscovery, setTimeSinceDiscovery] = useState('');

  // ─ Paso 3: Cronología ─
  const [callReceivedAt, setCallReceivedAt] = useState('');
  const [teamArrivalAt, setTeamArrivalAt] = useState('');
  const [cprStartedAt, setCprStartedAt] = useState('');
  const [roscAt, setRoscAt] = useState('');
  const [eventEndedAt, setEventEndedAt] = useState('');

  // ─ Paso 4: Manejo clínico ─
  const [airway, setAirway] = useState('');
  const [venous, setVenous] = useState('');
  const [postStatus, setPostStatus] = useState('');
  const [suspensionCause, setSuspensionCause] = useState('');
  const [defibs, setDefibs] = useState([]); // { sequenceNumber, performedAt, energyDelivered, rhythm }
  const [drugs, setDrugs] = useState([]);   // { crashCartItemId, drugName, dose, unit, route, administeredAt }

  // ─ Paso 5: Equipo ─
  const [teamAssignments, setTeamAssignments] = useState([]);

  // ─── Load catalogues ─────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [areasRes, posRes, staffRes] = await Promise.all([
          fetch(`${API_URL}/api/areas?isActive=true`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/response-team-positions`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/staff-members`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (areasRes.ok) {
          const d = await areasRes.json();
          setAreas(Array.isArray(d) ? d : d.data || []);
        }
        if (posRes.ok) {
          const d = await posRes.json();
          setPositions(Array.isArray(d) ? d : d.data || []);
        }
        if (staffRes.ok) {
          const d = await staffRes.json();
          setStaffList(Array.isArray(d) ? d : d.data || []);
        }
      } catch { /* silent */ }
    };
    load();
  }, [API_URL, token]);

  // ─── When area changes, load its crash cart ───────────────────────────────
  const loadCartForArea = useCallback(async (selectedAreaId) => {
    setAreaCart(null);
    setCartItems([]);
    if (!selectedAreaId) return;
    try {
      const res = await fetch(`${API_URL}/api/crash-carts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const carts = await res.json();
      const list = Array.isArray(carts) ? carts : carts.data || [];
      // find IN_SERVICE cart for this area
      const cart = list.find(c => c.areaId === selectedAreaId && c.status === 'IN_SERVICE')
        || list.find(c => c.areaId === selectedAreaId);
      if (cart) {
        // Load full cart detail to get items
        const detailRes = await fetch(`${API_URL}/api/crash-carts/${cart.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setAreaCart(detail);
          setCartItems(detail.items || []);
        }
      }
    } catch { /* silent */ }
  }, [API_URL, token]);

  useEffect(() => { loadCartForArea(areaId); }, [areaId, loadCartForArea]);

  const validateStep = (s) => {
    switch (s) {
      case 1:
        if (!areaId) return 'Seleccioná un área para continuar.';
        return null;
      case 2: {
        if (patientIdType === 'DNI') {
          if (!patientDni.trim()) return 'Ingresá el DNI del paciente.';
          if (!DNI_PATTERN.test(patientDni.trim())) return 'El DNI debe tener entre 6 y 8 dígitos numéricos.';
        }
        if (patientIdType === 'TEMPORARY_ID' && !patientTempId.trim()) return 'Ingresá el ID temporario.';
        if (patientAge === '' || patientAge === null || patientAge === undefined) return 'Ingresá la edad del paciente (puede ser estimada).';
        if (!admissionDate) return 'Ingresá la fecha de ingreso.';
        if (admissionDate && new Date(admissionDate) > new Date()) {
          return 'La fecha de ingreso no puede ser futura.';
        }
        return null;
      }
      case 3: {
        // En un llamado de Emergencia (Código Azul) estos tres hitos son obligatorios:
        // sin ellos no se puede calcular el tiempo de respuesta (CP-6) y el formulario
        // Utstein pierde su propósito (CU-07 incluye CU-08/CU-10, y CU-12 depende de esto).
        if (callType === 'EMERGENCY') {
          if (!callReceivedAt) return 'La hora de Recepción / Activación del Código es obligatoria en una Emergencia.';
          if (!teamArrivalAt) return 'La hora de Llegada del Equipo es obligatoria en una Emergencia.';
          if (!eventEndedAt) return 'La hora de Fin / Suspensión del Evento es obligatoria en una Emergencia.';
        }

        const times = [
          { label: 'Recepción', val: callReceivedAt },
          { label: 'Llegada', val: teamArrivalAt },
          { label: 'Inicio RCP', val: cprStartedAt },
          { label: 'RCE', val: roscAt },
          { label: 'Fin de Evento', val: eventEndedAt }
        ].filter(t => t.val);

        for (const t of times) {
          if (new Date(t.val) > new Date()) {
            return `El tiempo de "${t.label}" no puede ser futuro.`;
          }
        }

        for (let i = 0; i < times.length - 1; i++) {
          if (new Date(times[i].val) > new Date(times[i+1].val)) {
            return `El tiempo de "${times[i+1].label}" no puede ser anterior a "${times[i].label}".`;
          }
        }

        // Guarda contra errores de tipeo en el datetime picker (ej. día
        // equivocado): un llamado es inmutable una vez guardado, así que
        // un salto irreal acá queda pegado para siempre en las métricas.
        if (callReceivedAt && teamArrivalAt) {
          const gapMinutes = (new Date(teamArrivalAt) - new Date(callReceivedAt)) / 60000;
          if (gapMinutes > 180) {
            return `La llegada del equipo quedó a ${Math.round(gapMinutes / 60)}hs de la recepción. Revisá la fecha y hora cargadas (¿día equivocado?).`;
          }
        }
        return null;
      }
      case 4: {
        for (let i = 0; i < defibs.length; i++) {
          const d = defibs[i];
          if (!d.performedAt || !d.energyDelivered || !d.rhythm || !d.sequenceNumber) {
            return `Completá todos los campos de la desfibrilación N° ${d.sequenceNumber || i+1}.`;
          }
          if (new Date(d.performedAt) > new Date()) {
            return `La hora de la desfibrilación N° ${d.sequenceNumber || i+1} no puede ser futura.`;
          }
          if (callReceivedAt && new Date(d.performedAt) < new Date(callReceivedAt)) {
            return `La hora de la desfibrilación N° ${d.sequenceNumber || i+1} no puede ser anterior al inicio del evento.`;
          }
        }
        for (let i = 0; i < drugs.length; i++) {
          const d = drugs[i];
          if (!d.crashCartItemId || !d.dose || !d.unit || !d.route || !d.administeredAt) {
            return `Completá todos los campos de la droga administrada (${d.drugName || 'Fila ' + (i+1)}).`;
          }
          if (new Date(d.administeredAt) > new Date()) {
            return `La hora de administración de ${d.drugName} no puede ser futura.`;
          }
          if (callReceivedAt && new Date(d.administeredAt) < new Date(callReceivedAt)) {
            return `La hora de administración de ${d.drugName} no puede ser anterior al inicio del evento.`;
          }
        }
        return null;
      }
      case 5: {
        // CU-10 (Asignar Equipo de Respuesta) es inclusión OBLIGATORIA de CU-07
        // (Documento de Análisis y Diseño, 4.4). No se puede registrar sin nadie asignado.
        for (let i = 0; i < teamAssignments.length; i++) {
          const a = teamAssignments[i];
          if (!a.positionId || !a.staffMemberId) {
            return `Completá la posición y el personal para la asignación de la fila ${i+1}.`;
          }
        }
        const validCount = teamAssignments.filter(a => a.positionId && a.staffMemberId).length;
        if (validCount === 0) {
          return 'Asigná al menos un integrante del equipo de respuesta (obligatorio).';
        }
        return null;
      }
      default: return null;
    }
  };

  // ─── Build payload ────────────────────────────────────────────────────────
  const buildPayload = () => {
    const eventForm = {
      patientIdentificationType: patientIdType,
      patientDni: patientIdType === 'DNI' ? patientDni.trim() : null,
      patientTemporaryId: patientIdType === 'TEMPORARY_ID' ? patientTempId.trim() : null,
      patientSex: patientSex || null,
      patientAge: patientAge ? Number(patientAge) : null,
      admissionDate: admissionDate || null,
      timeSinceDiscoveryMinutes: timeSinceDiscovery ? Number(timeSinceDiscovery) : null,
      callReceivedAt: callReceivedAt || null,
      teamArrivalAt: teamArrivalAt || null,
      cprStartedAt: cprStartedAt || null,
      returnOfSpontaneousCirculationAt: roscAt || null,
      eventEndedAt: eventEndedAt || null,
      airwayManagement: airway || null,
      venousAccess: venous || null,
      postResuscitationStatus: postStatus || null,
      suspensionCause: suspensionCause || null,
      crashCartId: areaCart?.id || null,
    };

    const defibrillations = defibs
      .filter(d => d.performedAt)
      .map((d, i) => ({
        sequenceNumber: d.sequenceNumber || i + 1,
        performedAt: d.performedAt,
        energyDelivered: d.energyDelivered ? Number(d.energyDelivered) : null,
        rhythm: d.rhythm || null,
      }));

    const drugsAdministered = drugs
      .filter(d => d.drugName && d.administeredAt)
      .map(d => ({
        drugName: d.drugName,
        dose: Number(d.dose) || 0,
        unit: d.unit || '',
        route: d.route || null,
        administeredAt: d.administeredAt,
      }));

    // crashCartConsumptions: cada droga seleccionada del carro genera un consumo
    const crashCartConsumptions = drugs
      .filter(d => d.crashCartItemId && d.dose)
      .map(d => ({
        crashCartItemId: d.crashCartItemId,
        quantity: Math.ceil(Number(d.dose)) || 1,
      }));

    const teamAsg = teamAssignments
      .filter(a => a.positionId && a.staffMemberId)
      .map(a => ({ positionId: a.positionId, staffMemberId: a.staffMemberId }));

    return {
      areaId,
      type: callType,
      origin,
      eventForm,
      defibrillations,
      drugsAdministered,
      crashCartConsumptions,
      teamAssignments: teamAsg,
    };
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setErr('');
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const res = await fetch(`${API_URL}/api/calls`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await readError(res, 'Error al crear el registro');
        setErr(msg);
        return;
      }
      onCreated();
      onClose();
    } catch {
      setErr('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Navigation ───────────────────────────────────────────────────────────
  const handleNext = () => {
    const error = validateStep(step);
    if (error) {
      setErr(error);
    } else {
      setErr('');
      setStep(s => Math.min(TOTAL_STEPS, s + 1));
    }
  };
  const prev = () => { setErr(''); setStep(s => Math.max(1, s - 1)); };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 780, width: '95%' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>Registrar Evento Clínico</h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', marginTop: 2 }}>
              Paso {step} de {TOTAL_STEPS}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={submitting}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={stepperStyle}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} style={{
              ...stepDotBase,
              background: i < step ? 'var(--color-primary)' : 'var(--border-subtle)',
            }} />
          ))}
        </div>

        {err && <div style={errorBoxStyle}>{err}</div>}

        {/* Step content */}
        <div style={{ minHeight: 240 }}>
          {step === 1 && (
            <Step1Area
              areas={areas} areaId={areaId} setAreaId={setAreaId}
              callType={callType} setCallType={setCallType}
              origin={origin} setOrigin={setOrigin}
              areaCart={areaCart}
            />
          )}
          {step === 2 && (
            <Step2Patient
              patientIdType={patientIdType} setPatientIdType={setPatientIdType}
              patientDni={patientDni} setPatientDni={setPatientDni}
              patientTempId={patientTempId} setPatientTempId={setPatientTempId}
              patientSex={patientSex} setPatientSex={setPatientSex}
              patientAge={patientAge} setPatientAge={setPatientAge}
              admissionDate={admissionDate} setAdmissionDate={setAdmissionDate}
              timeSinceDiscovery={timeSinceDiscovery} setTimeSinceDiscovery={setTimeSinceDiscovery}
              origin={origin}
            />
          )}
          {step === 3 && (
            <Step3Chronology
              callReceivedAt={callReceivedAt} setCallReceivedAt={setCallReceivedAt}
              teamArrivalAt={teamArrivalAt} setTeamArrivalAt={setTeamArrivalAt}
              cprStartedAt={cprStartedAt} setCprStartedAt={setCprStartedAt}
              roscAt={roscAt} setRoscAt={setRoscAt}
              eventEndedAt={eventEndedAt} setEventEndedAt={setEventEndedAt}
              callType={callType}
            />
          )}
          {step === 4 && (
            <Step4Clinical
              airway={airway} setAirway={setAirway}
              venous={venous} setVenous={setVenous}
              postStatus={postStatus} setPostStatus={setPostStatus}
              suspensionCause={suspensionCause} setSuspensionCause={setSuspensionCause}
              defibs={defibs} setDefibs={setDefibs}
              drugs={drugs} setDrugs={setDrugs}
              cartItems={cartItems} areaCart={areaCart}
              callReceivedAt={callReceivedAt}
            />
          )}
          {step === 5 && (
            <Step5Team
              teamAssignments={teamAssignments} setTeamAssignments={setTeamAssignments}
              positions={positions} staffList={staffList}
            />
          )}
          {step === 6 && (
            <Step6Summary
              areaId={areaId} areas={areas} callType={callType} origin={origin}
              patientIdType={patientIdType} patientDni={patientDni} patientTempId={patientTempId}
              patientSex={patientSex} patientAge={patientAge}
              defibs={defibs} drugs={drugs} teamAssignments={teamAssignments}
              areaCart={areaCart} positions={positions} staffList={staffList}
            />
          )}
        </div>

        {/* Footer navigation */}
        <div className="modal-actions">
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={prev} disabled={submitting}>
              ← Anterior
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < TOTAL_STEPS ? (
            <button
              type="button" className="btn btn-primary" onClick={handleNext}
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button" className="btn btn-primary" onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Registrando...' : 'Registrar Evento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Área, Gravedad, Origen
// ═══════════════════════════════════════════════════════════════════════════════
function Step1Area({ areas, areaId, setAreaId, callType, setCallType, origin, setOrigin, areaCart }) {
  return (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Datos Iniciales del Evento</h3>
      <div style={fieldGridStyle}>
        <div className="input-group">
          <label htmlFor="wiz-area">Área del Evento *</label>
          <select id="wiz-area" className="input" value={areaId} onChange={e => setAreaId(e.target.value)} required>
            <option value="">Seleccionar área...</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="wiz-type">Gravedad</label>
          <select id="wiz-type" className="input" value={callType} onChange={e => setCallType(e.target.value)}>
            <option value="EMERGENCY">Emergencia (Código Azul)</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="wiz-origin">Origen</label>
          <select id="wiz-origin" className="input" value={origin} onChange={e => setOrigin(e.target.value)}>
            <option value="INTRA_HOSPITAL">Intrahospitalario</option>
            <option value="EXTRA_HOSPITAL">Extrahospitalario</option>
          </select>
        </div>
      </div>
      {areaId && areaCart && (
        <div style={{ marginTop: 'var(--space-md)', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
          <strong>Carro asignado:</strong> {areaCart.name}
          {' — '}
          <span className={`badge ${areaCart.status === 'IN_SERVICE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
            {areaCart.status === 'IN_SERVICE' ? 'En Operación' : 'Fuera de Servicio'}
          </span>
          {areaCart.status !== 'IN_SERVICE' && (
            <span style={{ color: 'var(--color-danger)', marginLeft: 8 }}>
              ⚠ No se podrán registrar consumos
            </span>
          )}
        </div>
      )}
      {areaId && !areaCart && (
        <div style={{ marginTop: 'var(--space-md)', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
          No se encontró carro de paro para esta área.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Ficha del Paciente
// ═══════════════════════════════════════════════════════════════════════════════
function Step2Patient({
  patientIdType, setPatientIdType, patientDni, setPatientDni,
  patientTempId, setPatientTempId, patientSex, setPatientSex,
  patientAge, setPatientAge, admissionDate, setAdmissionDate,
  timeSinceDiscovery, setTimeSinceDiscovery, origin,
}) {
  return (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Ficha del Paciente</h3>
      <div style={fieldGridStyle}>
        <div className="input-group">
          <label htmlFor="wiz-id-type">Tipo de Identificación *</label>
          <select id="wiz-id-type" className="input" value={patientIdType} onChange={e => setPatientIdType(e.target.value)}>
            {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {patientIdType === 'DNI' && (
          <div className="input-group">
            <label htmlFor="wiz-dni">DNI * (6 a 8 dígitos)</label>
            <input
              id="wiz-dni" className="input" type="text" inputMode="numeric"
              placeholder="Ej. 40123456" maxLength={8}
              value={patientDni}
              onChange={e => setPatientDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
              required
            />
          </div>
        )}
        {patientIdType === 'TEMPORARY_ID' && (
          <div className="input-group">
            <label htmlFor="wiz-tempid">ID Temporario *</label>
            <input id="wiz-tempid" className="input" type="text" placeholder="Ej. TEMP-001" value={patientTempId} onChange={e => setPatientTempId(e.target.value)} required />
          </div>
        )}

        <div className="input-group">
          <label htmlFor="wiz-sex">Sexo</label>
          <select id="wiz-sex" className="input" value={patientSex} onChange={e => setPatientSex(e.target.value)}>
            {SEX_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="wiz-age">Edad *</label>
          <input id="wiz-age" className="input" type="number" min={0} max={150} placeholder="Años" value={patientAge} onChange={e => setPatientAge(e.target.value)} required />
        </div>

        <div className="input-group">
          <label htmlFor="wiz-admission">Fecha de Ingreso *</label>
          <input id="wiz-admission" className="input" type="datetime-local" step="1" max={nowLocal()} value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} required />
        </div>

        {origin === 'EXTRA_HOSPITAL' && (
          <div className="input-group">
            <label htmlFor="wiz-discovery">Tiempo desde Hallazgo (min)</label>
            <input id="wiz-discovery" className="input" type="number" min={0} placeholder="Minutos" value={timeSinceDiscovery} onChange={e => setTimeSinceDiscovery(e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Cronología
// ═══════════════════════════════════════════════════════════════════════════════
function Step3Chronology({
  callReceivedAt, setCallReceivedAt, teamArrivalAt, setTeamArrivalAt,
  cprStartedAt, setCprStartedAt, roscAt, setRoscAt,
  eventEndedAt, setEventEndedAt, callType,
}) {
  const required = callType === 'EMERGENCY';
  const timeFields = [
    { id: 'wiz-received', label: `Recepción / Activación del Código${required ? ' *' : ''}`, value: callReceivedAt, set: setCallReceivedAt },
    { id: 'wiz-arrival', label: `Llegada del Equipo${required ? ' *' : ''}`, value: teamArrivalAt, set: setTeamArrivalAt, min: callReceivedAt },
    { id: 'wiz-cpr', label: 'Inicio de RCP', value: cprStartedAt, set: setCprStartedAt, min: teamArrivalAt || callReceivedAt },
    { id: 'wiz-rosc', label: 'Retorno de Circulación Espontánea (RCE)', value: roscAt, set: setRoscAt, min: cprStartedAt || teamArrivalAt || callReceivedAt },
    { id: 'wiz-end', label: `Fin / Suspensión del Evento${required ? ' *' : ''}`, value: eventEndedAt, set: setEventEndedAt, min: callReceivedAt },
  ];

  return (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Cronología de Tiempos Críticos</h3>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', marginBottom: 'var(--space-md)' }}>
        {required
          ? 'Al ser un llamado de Emergencia (Código Azul), Recepción, Llegada del Equipo y Fin del Evento (*) son obligatorios: de ahí se calcula el tiempo de respuesta. El RCE es opcional si no hubo retorno de circulación.'
          : 'Registre la hora exacta de cada hito del evento. El RCE es opcional si no hubo retorno de circulación.'}
      </p>
      <div style={fieldGridStyle}>
        {timeFields.map(f => (
          <div className="input-group" key={f.id}>
            <label htmlFor={f.id}>{f.label}</label>
            <input id={f.id} className="input" type="datetime-local" step="1" value={f.value} min={f.min || undefined} max={nowLocal()} onChange={e => f.set(e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Manejo Clínico: Vías + Desfibrilaciones + Drogas
// ═══════════════════════════════════════════════════════════════════════════════
function Step4Clinical({
  airway, setAirway, venous, setVenous,
  postStatus, setPostStatus, suspensionCause, setSuspensionCause,
  defibs, setDefibs, drugs, setDrugs,
  cartItems, areaCart, callReceivedAt,
}) {
  const cartAvailable = areaCart && areaCart.status === 'IN_SERVICE' && cartItems.length > 0;

  // ── Desfibrilaciones ──
  const addDefib = () => setDefibs(d => [...d, { sequenceNumber: d.length + 1, performedAt: '', energyDelivered: '', rhythm: '' }]);
  const updateDefib = (i, field, val) => setDefibs(d => d.map((x, j) => j === i ? { ...x, [field]: val } : x));
  const removeDefib = (i) => setDefibs(d => d.filter((_, j) => j !== i).map((x, j) => ({ ...x, sequenceNumber: j + 1 })));

  // ── Drogas ──
  const addDrug = () => setDrugs(d => [...d, { crashCartItemId: '', drugName: '', dose: '', unit: '', route: 'IV', administeredAt: '' }]);
  const updateDrug = (i, field, val) => {
    setDrugs(d => d.map((x, j) => {
      if (j !== i) return x;
      const updated = { ...x, [field]: val };
      // Al cambiar el ítem seleccionado, copiar nombre y unidad
      if (field === 'crashCartItemId') {
        const item = cartItems.find(it => it.id === val);
        if (item) {
          updated.drugName = item.name;
          updated.unit = item.unit || '';
        }
      }
      return updated;
    }));
  };
  const removeDrug = (i) => setDrugs(d => d.filter((_, j) => j !== i));

  return (
    <>
      {/* Vías y estado */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Manejo Clínico</h3>
        <div style={fieldGridStyle}>
          <div className="input-group">
            <label htmlFor="wiz-airway">Vía Aérea</label>
            <select id="wiz-airway" className="input" value={airway} onChange={e => setAirway(e.target.value)}>
              <option value="">Sin especificar</option>
              {AIRWAY_OPTIONS.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="wiz-venous">Acceso Venoso</label>
            <select id="wiz-venous" className="input" value={venous} onChange={e => setVenous(e.target.value)}>
              <option value="">Sin especificar</option>
              {VENOUS_OPTIONS.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="wiz-post">Estado Post-Reanimación</label>
            <input id="wiz-post" className="input" type="text" placeholder="Ej. Estable, en UTI" value={postStatus} onChange={e => setPostStatus(e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor="wiz-suspension">Causa de Suspensión</label>
            <input id="wiz-suspension" className="input" type="text" placeholder="Solo si no hubo RCE" value={suspensionCause} onChange={e => setSuspensionCause(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Desfibrilaciones */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Desfibrilaciones ({defibs.length})</h3>
          <button type="button" style={addBtnStyle} onClick={addDefib}>+ Agregar descarga</button>
        </div>
        {defibs.length === 0 && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>No se registraron desfibrilaciones.</p>
        )}
        {defibs.map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
            <div className="input-group" style={{ margin: 0, minWidth: 30, alignItems: 'center', paddingBottom: 10 }}>
              <label style={{ fontSize: '0.75rem' }}>N°</label>
              <div style={{ fontWeight: 600 }}>{d.sequenceNumber}</div>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem' }}>Hora</label>
              <input className="input" type="datetime-local" step="1" min={callReceivedAt || undefined} max={nowLocal()} value={d.performedAt} onChange={e => updateDefib(i, 'performedAt', e.target.value)} />
            </div>
            <div className="input-group" style={{ margin: 0, minWidth: 80 }}>
              <label style={{ fontSize: '0.75rem' }}>Energía (J)</label>
              <input className="input" type="number" style={{ width: 80 }} placeholder="200" value={d.energyDelivered} onChange={e => updateDefib(i, 'energyDelivered', e.target.value)} />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem' }}>Ritmo</label>
              <input className="input" type="text" style={{ width: 120 }} placeholder="FV, TVSP..." value={d.rhythm} onChange={e => updateDefib(i, 'rhythm', e.target.value)} />
            </div>
            <button className="btn btn-sm btn-danger" type="button" onClick={() => removeDefib(i)} style={{ marginBottom: 2 }}>✕</button>
          </div>
        ))}
      </div>

      {/* Drogas / Consumos del carro */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Drogas Administradas ({drugs.length})</h3>
          <button type="button" style={addBtnStyle} onClick={addDrug} disabled={!cartAvailable}>+ Agregar droga</button>
        </div>
        {!cartAvailable && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
            {!areaCart ? 'No hay carro asignado a esta área.'
              : areaCart.status !== 'IN_SERVICE' ? 'El carro está fuera de servicio; no se pueden registrar consumos.'
              : 'El carro no tiene ítems cargados.'}
          </p>
        )}
        {drugs.map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
            <div className="input-group" style={{ margin: 0, flex: '1 1 180px' }}>
              <label style={{ fontSize: '0.75rem' }}>Fármaco</label>
              <select className="input" value={d.crashCartItemId} onChange={e => updateDrug(i, 'crashCartItemId', e.target.value)}>
                <option value="">Seleccionar...</option>
                {cartItems.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit || 'ud'})</option>)}
              </select>
            </div>
            <div className="input-group" style={{ margin: 0, minWidth: 70 }}>
              <label style={{ fontSize: '0.75rem' }}>Dosis</label>
              <input className="input" type="number" style={{ width: 70 }} min={0} step="0.1" value={d.dose} onChange={e => updateDrug(i, 'dose', e.target.value)} />
            </div>
            <div className="input-group" style={{ margin: 0, minWidth: 100 }}>
              <label style={{ fontSize: '0.75rem' }}>Unidad</label>
              <input className="input" type="text" style={{ width: 100, backgroundColor: 'var(--bg-body)' }} value={d.unit} readOnly placeholder="Autocompletado" />
            </div>
            <div className="input-group" style={{ margin: 0, minWidth: 80 }}>
              <label style={{ fontSize: '0.75rem' }}>Vía</label>
              <select className="input" style={{ width: 80 }} value={d.route} onChange={e => updateDrug(i, 'route', e.target.value)}>
                {ROUTE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem' }}>Hora</label>
              <input className="input" type="datetime-local" step="1" min={callReceivedAt || undefined} max={nowLocal()} value={d.administeredAt} onChange={e => updateDrug(i, 'administeredAt', e.target.value)} />
            </div>
            <button className="btn btn-sm btn-danger" type="button" onClick={() => removeDrug(i)} style={{ marginBottom: 2 }}>✕</button>
          </div>
        ))}
        {drugs.length > 0 && areaCart && (
          <p style={{ marginTop: 8, fontSize: '0.8125rem', color: 'var(--color-warning)' }}>
            ⚠ El consumo de cualquier ítem inhabilitará automáticamente el carro "{areaCart.name}".
          </p>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Equipo Interviniente
// ═══════════════════════════════════════════════════════════════════════════════
function Step5Team({ teamAssignments, setTeamAssignments, positions, staffList }) {
  const addAssignment = () => setTeamAssignments(a => [...a, { positionId: '', staffMemberId: '' }]);
  const updateAssignment = (i, field, val) =>
    setTeamAssignments(a => a.map((x, j) => j === i ? { ...x, [field]: val } : x));
  const removeAssignment = (i) => setTeamAssignments(a => a.filter((_, j) => j !== i));

  const activeStaff = staffList.filter(s => s.isActive !== false);
  const activePositions = positions.filter(p => p.isActive !== false);

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Equipo Interviniente ({teamAssignments.length}) *</h3>
        <button type="button" style={addBtnStyle} onClick={addAssignment}>+ Agregar persona</button>
      </div>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', marginBottom: 'var(--space-md)' }}>
        Asigne personal a cada posición del equipo de respuesta (Líder, Vía aérea, Compresiones, etc.). Obligatorio: al menos una persona.
      </p>

      {activePositions.length === 0 || activeStaff.length === 0 ? (
        <p style={{ color: 'var(--color-warning)', fontSize: '0.8125rem' }}>
          ⚠ No hay posiciones o personal registrado en el sistema. El administrador debe cargar estos catálogos primero.
        </p>
      ) : (
        <>
          {teamAssignments.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <div className="input-group" style={{ margin: 0, flex: '1 1 180px' }}>
                <label style={{ fontSize: '0.75rem' }}>Posición</label>
                <select className="input" value={a.positionId} onChange={e => updateAssignment(i, 'positionId', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {activePositions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ margin: 0, flex: '1 1 220px' }}>
                <label style={{ fontSize: '0.75rem' }}>Personal</label>
                <select className="input" value={a.staffMemberId} onChange={e => updateAssignment(i, 'staffMemberId', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name} — DNI {s.dni}</option>)}
                </select>
              </div>
              <button className="btn btn-sm btn-danger" type="button" onClick={() => removeAssignment(i)} style={{ marginBottom: 2 }}>✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6 — Resumen antes de enviar
// ═══════════════════════════════════════════════════════════════════════════════
function Step6Summary({
  areaId, areas, callType, origin,
  patientIdType, patientDni, patientTempId,
  patientSex, patientAge,
  defibs, drugs, teamAssignments,
  areaCart, positions, staffList,
}) {
  const areaName = areas.find(a => a.id === areaId)?.name || '—';

  const patientLabel = patientIdType === 'DNI'
    ? `DNI ${patientDni}`
    : patientIdType === 'TEMPORARY_ID'
      ? `ID ${patientTempId}`
      : 'NN (No Identificado)';

  const validDefibs = defibs.filter(d => d.performedAt);
  const validDrugs = drugs.filter(d => d.drugName && d.administeredAt);
  const validTeam = teamAssignments.filter(a => a.positionId && a.staffMemberId);

  const summaryItems = [
    { label: 'Área', value: areaName },
    { label: 'Gravedad', value: callType === 'EMERGENCY' ? 'Emergencia (Código Azul)' : 'Normal' },
    { label: 'Origen', value: origin === 'INTRA_HOSPITAL' ? 'Intrahospitalario' : 'Extrahospitalario' },
    { label: 'Paciente', value: patientLabel },
    { label: 'Sexo / Edad', value: `${patientSex || 's/d'} / ${patientAge ? patientAge + ' años' : 's/d'}` },
    { label: 'Carro de Paro', value: areaCart ? areaCart.name : 'Sin carro' },
    { label: 'Desfibrilaciones', value: String(validDefibs.length) },
    { label: 'Drogas administradas', value: String(validDrugs.length) },
    { label: 'Equipo interviniente', value: String(validTeam.length) + ' personas' },
  ];

  return (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Resumen del Evento</h3>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', marginBottom: 'var(--space-md)' }}>
        Revise los datos antes de registrar. Una vez enviado, el registro es inmutable.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
        {summaryItems.map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{s.label}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {validDrugs.length > 0 && areaCart && (
        <div style={{ marginTop: 'var(--space-md)', padding: '10px 14px', background: 'rgba(244, 63, 94, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', fontWeight: 600 }}>
            ⚠ Al registrar, el carro "{areaCart.name}" pasará automáticamente a Fuera de Servicio.
          </p>
        </div>
      )}
    </div>
  );
}