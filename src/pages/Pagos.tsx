import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getLocalDate } from '../lib/date'
import { downloadCsv } from '../lib/csv'
import type { CargoEspecial, EstadoPagoActual, Inscripcion } from '../types/database'
import { CheckCircle, Plus, XCircle, X } from 'lucide-react'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const TIPOS_CARGO = [
  { value: 'clase_suelta', label: 'Clase suelta' },
  { value: 'clase_extra', label: 'Clase extra' },
]

export default function Pagos() {
  const [estado, setEstado] = useState<EstadoPagoActual[]>([])
  const [cargos, setCargos] = useState<CargoEspecial[]>([])
  const [estudiantes, setEstudiantes] = useState<{ id: string; nombre: string; apellidos: string; activo: boolean }[]>([])
  const [planOptions, setPlanOptions] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showCargoModal, setShowCargoModal] = useState(false)
  const [inscripcionesByEstudiante, setInscripcionesByEstudiante] = useState<Record<string, { id: string; plan_id: string; plan_nombre: string; pagado: boolean }[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [alumnoStatusFilter, setAlumnoStatusFilter] = useState<'all' | 'activo' | 'inactivo'>('all')
  const [inscripcionStatusFilter, setInscripcionStatusFilter] = useState<'all' | 'con_inscripcion' | 'sin_inscripcion'>('all')
  const [cargoTipoFilter, setCargoTipoFilter] = useState('')
  const [cargoPagoFilter, setCargoPagoFilter] = useState<'all' | 'pendiente' | 'pagado'>('all')
  const [cargoForm, setCargoForm] = useState({
    estudiante_id: '',
    tipo: 'clase_suelta',
    descripcion: '',
    monto: '',
    pagado: false,
  })
  const [cargoError, setCargoError] = useState('')
  const [cargoSaving, setCargoSaving] = useState(false)
  const [confirmPaymentLoading, setConfirmPaymentLoading] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<{ row: EstadoPagoActual; inscripcionId: string; planNombre: string } | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const now = new Date()
  const anio = now.getFullYear()
  const mes = now.getMonth() + 1

  const cargar = async () => {
    setLoading(true)
    setError(null)

    const [estadoResp, cargosResp, estudiantesResp, inscripcionesResp] = await Promise.all([
      supabase.from('v_estado_pago_actual').select('*').order('apellidos'),
      supabase.from('cargos_especiales').select('*').order('fecha_cargo', { ascending: false }),
      supabase.from('estudiantes').select('id,nombre,apellidos,activo').order('apellidos'),
      supabase.from('inscripciones')
        .select('id,estudiante_id,plan_id,activa,planes(id,nombre)')
        .eq('activa', true),
    ])

    const estadoData = estadoResp.data ?? []
    const cargosData = cargosResp.data ?? []
    const estudiantesData = estudiantesResp.data ?? []
    const inscripciones: Array<Inscripcion & { planes?: { id: string; nombre: string } }> = inscripcionesResp.data ?? []

    let pagos: Array<{ inscripcion_id: string; pagado: boolean; anio: number; mes: number }> = []
    if (inscripciones.length > 0) {
      const pagoResp = await supabase
        .from('pagos')
        .select('inscripcion_id,pagado,anio,mes')
        .in('inscripcion_id', inscripciones.map(ins => ins.id))
        .eq('anio', anio)
        .eq('mes', mes)

      pagos = (pagoResp.data as Array<{ inscripcion_id: string; pagado: boolean; anio: number; mes: number }>) ?? []
    }
    const pagoPorInscripcion = new Map(pagos.map(pago => [pago.inscripcion_id, pago.pagado]))
    const groupedInscripciones = inscripciones.reduce<Record<string, { id: string; plan_id: string; plan_nombre: string; pagado: boolean }[]>>((acc, ins) => {
      if (!ins.estudiante_id) return acc
      const planNombre = (ins.planes as unknown as { nombre: string } | undefined)?.nombre ?? 'Plan desconocido'
      acc[ins.estudiante_id] = acc[ins.estudiante_id] ?? []
      acc[ins.estudiante_id].push({ id: ins.id, plan_id: ins.plan_id, plan_nombre: planNombre, pagado: pagoPorInscripcion.get(ins.id) ?? false })
      return acc
    }, {})

    const uniquePlans = Array.from(new Map(inscripciones.map(ins => [ins.plan_id, ins.planes?.nombre ?? 'Plan desconocido'])).entries())
      .map(([id, nombre]) => ({ id, nombre }))

    if (estadoResp.error || cargosResp.error || estudiantesResp.error || inscripcionesResp.error) {
      const errors = [estadoResp.error, cargosResp.error, estudiantesResp.error, inscripcionesResp.error]
        .filter(Boolean)
        .map(err => err?.message)
        .join(' | ')
      setError(errors)
    }

    setEstado(estadoData)
    setCargos(cargosData)
    setEstudiantes(estudiantesData)
    setInscripcionesByEstudiante(groupedInscripciones)
    setPlanOptions(uniquePlans)
    setLastUpdated(new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }))
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const filteredEstado = estado.filter(row => {
    const alumno = estudiantes.find(s => s.id === row.estudiante_id)
    if (!alumno) return false
    if (alumnoStatusFilter !== 'all' && ((alumnoStatusFilter === 'activo') !== alumno.activo)) return false

    const textoAlumno = `${alumno.apellidos} ${alumno.nombre}`.toLowerCase()
    const query = searchQuery.toLowerCase().trim()
    if (query && !textoAlumno.includes(query)) return false

    const inscripciones = inscripcionesByEstudiante[row.estudiante_id] ?? []
    if (planFilter && !inscripciones.some(ins => ins.plan_id === planFilter)) return false
    if (inscripcionStatusFilter === 'con_inscripcion' && inscripciones.length === 0) return false
    if (inscripcionStatusFilter === 'sin_inscripcion' && inscripciones.length > 0) return false

    return true
  })

  const filteredCargos = cargos.filter(cargo => {
    const alumno = estudiantes.find(s => s.id === cargo.estudiante_id)
    if (!alumno) return false

    if (cargoTipoFilter && cargo.tipo !== cargoTipoFilter) return false
    if (cargoPagoFilter === 'pendiente' && cargo.pagado) return false
    if (cargoPagoFilter === 'pagado' && !cargo.pagado) return false
    if (alumnoStatusFilter !== 'all' && ((alumnoStatusFilter === 'activo') !== alumno.activo)) return false

    const textoAlumno = `${alumno.apellidos} ${alumno.nombre}`.toLowerCase()
    if (searchQuery && !textoAlumno.includes(searchQuery.toLowerCase().trim())) return false

    return true
  })

  const filteredStudents = estudiantes.filter(alumno => {
    if (alumnoStatusFilter !== 'all' && ((alumnoStatusFilter === 'activo') !== alumno.activo)) return false
    const textoAlumno = `${alumno.apellidos} ${alumno.nombre}`.toLowerCase()
    const query = searchQuery.toLowerCase().trim()
    if (query && !textoAlumno.includes(query)) return false
    if (planFilter && !(inscripcionesByEstudiante[alumno.id] ?? []).some(ins => ins.plan_id === planFilter)) return false
    if (inscripcionStatusFilter === 'con_inscripcion' && (inscripcionesByEstudiante[alumno.id] ?? []).length === 0) return false
    if (inscripcionStatusFilter === 'sin_inscripcion' && (inscripcionesByEstudiante[alumno.id] ?? []).length > 0) return false
    return true
  })

  const cargosPendientes = filteredCargos.filter(c => !c.pagado)
  const cargosPagados = filteredCargos.filter(c => c.pagado)
  const alDia = filteredEstado.filter(e => e.acceso_permitido)
  const atrasados = filteredEstado.filter(e => !e.acceso_permitido)
  const estudiantesSinInscripcion = filteredStudents.filter(s => !estado.some(e => e.estudiante_id === s.id))
  const totalAlumnos = estudiantes.length
  const totalActivos = estudiantes.filter(s => s.activo).length
  const totalAdeudos = estado.filter(e => !e.acceso_permitido).length
  const totalCargosPendientes = cargos.filter(c => !c.pagado).length

  const registrarPago = async (row: EstadoPagoActual, inscripcionId?: string) => {
    let query = supabase
      .from('inscripciones')
      .select('id, plan_id, planes(monto)')
      .eq('estudiante_id', row.estudiante_id)
      .eq('activa', true)

    if (inscripcionId) {
      query = query.eq('id', inscripcionId)
    }

    const { data: inscripcionesRaw } = await query
    const inscripciones = (inscripcionesRaw as unknown as Array<{ id: string; plan_id: string; planes: { monto: number } }>) ?? []

    if (!inscripciones?.length) return

    for (const ins of inscripciones) {
      const plan = ins.planes
      await (supabase.from('pagos') as any).upsert({
        estudiante_id: row.estudiante_id,
        inscripcion_id: ins.id,
        anio,
        mes,
        monto: plan?.monto ?? 0,
        pagado: true,
        fecha_pago: getLocalDate(),
        metodo_pago: 'efectivo',
      }, { onConflict: 'inscripcion_id,anio,mes' })
    }

    cargar()
    setSuccessMessage('Pago registrado correctamente')
  }

  const confirmarPago = async () => {
    if (!pendingPayment) return
    setConfirmPaymentLoading(true)
    await registrarPago(pendingPayment.row, pendingPayment.inscripcionId)
    setConfirmPaymentLoading(false)
    setPendingPayment(null)
  }

  const cargosByEstudiante = cargos.reduce<Record<string, { id: string; descripcion: string; tipo: string; monto: number; pagado: boolean }[]>>((acc, cargo) => {
    if (!cargo.estudiante_id) return acc
    acc[cargo.estudiante_id] = acc[cargo.estudiante_id] ?? []
    acc[cargo.estudiante_id].push({
      id: cargo.id,
      descripcion: cargo.descripcion,
      tipo: cargo.tipo,
      monto: cargo.monto,
      pagado: cargo.pagado,
    })
    return acc
  }, {})

  const exportPagos = () => {
    const rows = filteredEstado.map(row => {
      const inscripciones = inscripcionesByEstudiante[row.estudiante_id] ?? []
      const cargos = cargosByEstudiante[row.estudiante_id] ?? []
      return {
        Nombre: row.nombre,
        Apellidos: row.apellidos,
        Estado: row.acceso_permitido ? 'Al corriente' : 'Adeudo',
        'Meses Adeudados': row.months_overdue ?? 0,
        'Total Adeudado ($)': row.monto_total_adeudado ?? 0,
        Inscripciones: inscripciones.map(ins => ins.plan_nombre).join('; '),
        Cargos: cargos.map(cargo => `${cargo.descripcion} (${cargo.pagado ? 'Pagado' : 'Pendiente'})`).join('; '),
      }
    })

    downloadCsv('pagos.csv', rows, [
      { label: 'Nombre', key: 'Nombre' },
      { label: 'Apellidos', key: 'Apellidos' },
      { label: 'Estado', key: 'Estado' },
      { label: 'Meses Adeudados', key: 'Meses Adeudados' },
      { label: 'Total Adeudado ($)', key: 'Total Adeudado ($)' },
      { label: 'Inscripciones', key: 'Inscripciones' },
      { label: 'Cargos', key: 'Cargos' },
    ])
  }

  const registrarCargoPagado = async (cargo: CargoEspecial) => {
    await (supabase.from('cargos_especiales') as any).update({
      pagado: true,
      fecha_pago: getLocalDate(),
      metodo_pago: 'efectivo',
    }).eq('id', cargo.id)

    cargar()
    setSuccessMessage('Cargo marcado como pagado')
  }

  const guardarCargo = async () => {
    setCargoError('')

    const monto = parseFloat(cargoForm.monto)
    if (!cargoForm.estudiante_id) {
      setCargoError('Selecciona un alumno para el cargo')
      return
    }
    if (!cargoForm.descripcion.trim()) {
      setCargoError('Describe el cargo')
      return
    }
    if (Number.isNaN(monto) || monto <= 0) {
      setCargoError('Ingresa un monto válido mayor a 0')
      return
    }

    setCargoSaving(true)
    await (supabase.from('cargos_especiales') as any).insert({
      estudiante_id: cargoForm.estudiante_id,
      tipo: cargoForm.tipo as CargoEspecial['tipo'],
      descripcion: cargoForm.descripcion.trim(),
      monto,
      pagado: cargoForm.pagado,
      fecha_cargo: getLocalDate(),
      fecha_pago: cargoForm.pagado ? getLocalDate() : null,
      metodo_pago: cargoForm.pagado ? 'efectivo' : '',
    })

    setCargoSaving(false)
    setShowCargoModal(false)
    setCargoForm({ estudiante_id: '', tipo: 'clase_suelta', descripcion: '', monto: '', pagado: false })
    cargar()
    setSuccessMessage('Cargo creado correctamente')
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 mb-8 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-widest font-display">PAGOS</h2>
          <p className="mt-1 font-mono text-xs text-surface-200/40">
            {MESES[mes - 1]} {anio} — {atrasados.length} alumno{atrasados.length !== 1 ? 's' : ''} con adeudo
          </p>
          <p className="mt-1 font-mono text-xs text-surface-200/40">Última actualización: {lastUpdated || '—'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportPagos} className="flex items-center justify-center btn-secondary">
            Exportar estado
          </button>
          <button onClick={() => {
            setCargoError('')
            setShowCargoModal(true)
          }} className="flex items-center gap-2 btn-primary">
            <Plus size={16} /> Nuevo cargo especial
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 mb-5 border rounded-2xl bg-emerald-500/10 border-emerald-400/20 text-emerald-200">
          {successMessage}
        </div>
      )}

      <div className="grid gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 border rounded-2xl bg-surface-900 border-surface-200/10">
          <p className="text-xs tracking-widest uppercase text-surface-200/60">Alumnos</p>
          <p className="text-3xl font-bold">{totalAlumnos}</p>
          <p className="text-xs text-surface-200/50">{totalActivos} activos</p>
        </div>
        <div className="p-4 border rounded-2xl bg-surface-900 border-surface-200/10">
          <p className="text-xs tracking-widest uppercase text-surface-200/60">Adeudos</p>
          <p className="text-3xl font-bold">{totalAdeudos}</p>
          <p className="text-xs text-surface-200/50">Alumnos con acceso denegado</p>
        </div>
        <div className="p-4 border rounded-2xl bg-surface-900 border-surface-200/10">
          <p className="text-xs tracking-widest uppercase text-surface-200/60">Cargos pendientes</p>
          <p className="text-3xl font-bold">{totalCargosPendientes}</p>
          <p className="text-xs text-surface-200/50">Cargos especiales</p>
        </div>
      </div>

      <div className="grid gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <input
          className="w-full input"
          placeholder="Buscar alumno"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select
          className="w-full input"
          value={alumnoStatusFilter}
          onChange={e => setAlumnoStatusFilter(e.target.value as 'all' | 'activo' | 'inactivo')}
        >
          <option value="all">Todos los alumnos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select
          className="w-full input"
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
        >
          <option value="">Todos los cursos</option>
          {planOptions.map(plan => (
            <option key={plan.id} value={plan.id}>{plan.nombre}</option>
          ))}
        </select>
        <select
          className="w-full input"
          value={inscripcionStatusFilter}
          onChange={e => setInscripcionStatusFilter(e.target.value as 'all' | 'con_inscripcion' | 'sin_inscripcion')}
        >
          <option value="all">Todos los estados de inscripción</option>
          <option value="con_inscripcion">Con inscripción</option>
          <option value="sin_inscripcion">Sin inscripción</option>
        </select>
        <select
          className="w-full input"
          value={cargoTipoFilter}
          onChange={e => setCargoTipoFilter(e.target.value)}
        >
          <option value="">Todos los cargos</option>
          <option value="clase_suelta">Clase suelta</option>
          <option value="clase_extra">Clase extra</option>
        </select>
        <select
          className="w-full input"
          value={cargoPagoFilter}
          onChange={e => setCargoPagoFilter(e.target.value as 'all' | 'pendiente' | 'pagado')}
        >
          <option value="all">Todos los cargos</option>
          <option value="pendiente">Pendientes</option>
          <option value="pagado">Pagados</option>
        </select>
        <button
          onClick={() => {
            setSearchQuery('')
            setAlumnoStatusFilter('all')
            setPlanFilter('')
            setInscripcionStatusFilter('all')
            setCargoTipoFilter('')
            setCargoPagoFilter('all')
          }}
          className="flex items-center justify-center gap-2 btn-secondary"
        >
          <X size={16} /> Limpiar
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-surface-200/40">Cargando...</p>
      ) : (
        <div className="space-y-8">
          {error && (
            <div className="p-4 text-red-200 border-red-400 card bg-red-500/10">
              <p className="text-sm font-body">Error al cargar pagos: {error}</p>
            </div>
          )}

          {/* Con adeudo */}
          {atrasados.length > 0 && (
            <div>
              <h3 className="mb-3 font-mono text-xs tracking-widest uppercase text-brand-500">Con adeudo</h3>
              <div className="p-0 card overflow-hidden">
                {/* Vista móvil: tarjetas */}
                <div className="md:hidden divide-y divide-surface-200/5">
                  {atrasados.map(row => (
                    <div key={row.estudiante_id} className="p-4 space-y-3">
                      <p className="font-medium font-body">{row.apellidos}, {row.nombre}</p>
                      <div className="flex flex-wrap gap-1">
                        {inscripcionesByEstudiante[row.estudiante_id]?.map(ins => (
                          <span key={ins.id} className={`badge ${ins.pagado ? 'badge-ok' : 'badge-err'} text-[11px] py-1 px-2`}>
                            {ins.plan_nombre} · {ins.pagado ? 'pagado' : 'adeudo'}
                          </span>
                        ))}
                        {cargosByEstudiante[row.estudiante_id]?.map(cargo => (
                          <span key={cargo.id} className={`badge ${cargo.pagado ? 'badge-ok' : 'badge-err'} text-[11px] py-1 px-2`}>
                            {cargo.descripcion} · {cargo.pagado ? 'pagado' : 'adeudo'}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-4 font-mono text-xs">
                        <span className="text-amber-400">
                          {row.months_overdue ?? 0} {(row.months_overdue ?? 0) === 1 ? 'mes' : 'meses'} adeudados
                        </span>
                        <span className="text-rose-400">
                          ${(row.monto_total_adeudado ?? 0).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge-err"><XCircle size={11} /> Adeudo</span>
                        {inscripcionesByEstudiante[row.estudiante_id]
                          ?.filter(ins => !ins.pagado)
                          .map(ins => (
                            <button
                              key={ins.id}
                              onClick={() => setPendingPayment({ row, inscripcionId: ins.id, planNombre: ins.plan_nombre })}
                              className="px-3 py-1 text-xs btn-primary"
                            >
                              Pagar {ins.plan_nombre}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Vista desktop: tabla */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="font-mono text-xs tracking-wider uppercase border-b border-surface-200/10 text-surface-200/40">
                        <th className="px-6 py-3 text-left">Alumno</th>
                        <th className="px-6 py-3 text-left">Meses Adeudados</th>
                        <th className="px-6 py-3 text-left">Total Adeudado</th>
                        <th className="px-6 py-3 text-left">Estado</th>
                        <th className="px-6 py-3 text-left">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200/5">
                      {atrasados.map(row => (
                        <tr key={row.estudiante_id} className="transition-colors hover:bg-surface-700/30">
                          <td className="px-6 py-4 font-medium font-body">
                            {row.apellidos}, {row.nombre}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {inscripcionesByEstudiante[row.estudiante_id]?.map(ins => (
                                <span key={ins.id} className={`badge ${ins.pagado ? 'badge-ok' : 'badge-err'} text-[11px] py-1 px-2`}>
                                  {ins.plan_nombre} {ins.pagado ? 'pagado' : 'adeudo'}
                                </span>
                              ))}
                              {cargosByEstudiante[row.estudiante_id]?.map(cargo => (
                                <span key={cargo.id} className={`badge ${cargo.pagado ? 'badge-ok' : 'badge-err'} text-[11px] py-1 px-2`}>
                                  {cargo.descripcion} {cargo.pagado ? 'pagado' : 'adeudo'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-amber-400">{row.months_overdue ?? 0}</td>
                          <td className="px-6 py-4 font-semibold text-rose-400">${(row.monto_total_adeudado ?? 0).toLocaleString('es-MX')}</td>
                          <td className="px-6 py-4"><span className="badge-err"><XCircle size={11} /> Adeudo</span></td>
                          <td className="px-6 py-4 space-y-2">
                            {inscripcionesByEstudiante[row.estudiante_id]
                              ?.filter(ins => !ins.pagado)
                              .map(ins => (
                                <button
                                  key={ins.id}
                                  onClick={() => setPendingPayment({ row, inscripcionId: ins.id, planNombre: ins.plan_nombre })}
                                  className="w-full px-3 py-1 text-xs btn-primary"
                                >
                                  Pagar {ins.plan_nombre}
                                </button>
                              ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Cargos especiales pendientes */}
          {cargosPendientes.length > 0 && (
            <div>
              <h3 className="mb-3 font-mono text-xs tracking-widest uppercase text-amber-400">Cargos especiales pendientes</h3>
              <div className="p-0 card overflow-hidden">
                {/* Vista móvil: tarjetas */}
                <div className="md:hidden divide-y divide-surface-200/5">
                  {cargosPendientes.map(cargo => {
                    const alumno = estudiantes.find(s => s.id === cargo.estudiante_id)
                    return (
                      <div key={cargo.id} className="p-4 space-y-2">
                        <p className="font-medium font-body">
                          {alumno?.apellidos ?? '—'}, {alumno?.nombre ?? '—'}
                        </p>
                        <p className="text-sm text-surface-200/70 font-body">
                          {cargo.descripcion}
                          <span className="ml-2 font-mono text-xs text-surface-200/40">
                            ({cargo.tipo.replace('_', ' ')})
                          </span>
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="font-semibold font-body">${cargo.monto.toLocaleString('es-MX')}</p>
                            <p className="font-mono text-xs text-surface-200/50">
                              {cargo.updated_at
                                ? new Date(cargo.updated_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                                : '—'}
                            </p>
                          </div>
                          <button onClick={() => registrarCargoPagado(cargo)} className="px-3 py-1 text-xs btn-primary">
                            Marcar pago
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Vista desktop: tabla */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="font-mono text-xs tracking-wider uppercase border-b border-surface-200/10 text-surface-200/40">
                        <th className="px-6 py-3 text-left">Alumno</th>
                        <th className="px-6 py-3 text-left">Cargo</th>
                        <th className="px-6 py-3 text-left">Monto</th>
                        <th className="px-6 py-3 text-left">Última actualización</th>
                        <th className="px-6 py-3 text-left">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200/5">
                      {cargosPendientes.map(cargo => (
                        <tr key={cargo.id} className="transition-colors hover:bg-surface-700/30">
                          <td className="px-6 py-4 font-medium font-body">
                            {estudiantes.find(s => s.id === cargo.estudiante_id)?.apellidos ?? '—'}, {estudiantes.find(s => s.id === cargo.estudiante_id)?.nombre ?? '—'}
                          </td>
                          <td className="px-6 py-4 font-body">{cargo.descripcion} ({cargo.tipo.replace('_', ' ')})</td>
                          <td className="px-6 py-4 font-semibold font-body">${cargo.monto.toLocaleString('es-MX')}</td>
                          <td className="px-6 py-4 font-mono text-xs text-surface-200/60">
                            {cargo.updated_at ? new Date(cargo.updated_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => registrarCargoPagado(cargo)} className="px-3 py-1 text-xs btn-primary">
                              Marcar pago
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Cargos especiales pagados */}
          {cargosPagados.length > 0 && (
            <div>
              <h3 className="mb-3 font-mono text-xs tracking-widest uppercase text-emerald-400">Cargos especiales pagados</h3>
              <div className="p-0 card overflow-hidden">
                {/* Vista móvil: tarjetas */}
                <div className="md:hidden divide-y divide-surface-200/5">
                  {cargosPagados.map(cargo => {
                    const alumno = estudiantes.find(s => s.id === cargo.estudiante_id)
                    return (
                      <div key={cargo.id} className="p-4 space-y-1">
                        <p className="font-medium font-body">
                          {alumno?.apellidos ?? '—'}, {alumno?.nombre ?? '—'}
                        </p>
                        <p className="text-sm text-surface-200/70 font-body">
                          {cargo.descripcion}
                          <span className="ml-2 font-mono text-xs text-surface-200/40">
                            ({cargo.tipo.replace('_', ' ')})
                          </span>
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <p className="font-semibold font-body">${cargo.monto.toLocaleString('es-MX')}</p>
                          <p className="font-mono text-xs text-surface-200/50">
                            {cargo.fecha_pago ?? 'Pagado'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Vista desktop: tabla */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="font-mono text-xs tracking-wider uppercase border-b border-surface-200/10 text-surface-200/40">
                        <th className="px-6 py-3 text-left">Alumno</th>
                        <th className="px-6 py-3 text-left">Cargo</th>
                        <th className="px-6 py-3 text-left">Monto</th>
                        <th className="px-6 py-3 text-left">Última actualización</th>
                        <th className="px-6 py-3 text-left">Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200/5">
                      {cargosPagados.map(cargo => (
                        <tr key={cargo.id} className="transition-colors hover:bg-surface-700/30">
                          <td className="px-6 py-4 font-medium font-body">
                            {estudiantes.find(s => s.id === cargo.estudiante_id)?.apellidos ?? '—'}, {estudiantes.find(s => s.id === cargo.estudiante_id)?.nombre ?? '—'}
                          </td>
                          <td className="px-6 py-4 font-body">{cargo.descripcion} ({cargo.tipo.replace('_', ' ')})</td>
                          <td className="px-6 py-4 font-semibold font-body">${cargo.monto.toLocaleString('es-MX')}</td>
                          <td className="px-6 py-4 font-mono text-xs text-surface-200/60">
                            {cargo.updated_at ? new Date(cargo.updated_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td className="px-6 py-4 text-xs font-body text-surface-200/70">
                            {cargo.fecha_pago ? cargo.fecha_pago : 'Pagado'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Alumnos sin inscripción activa */}
          {estudiantesSinInscripcion.length > 0 && (
            <div>
              <h3 className="mb-3 font-mono text-xs tracking-widest uppercase text-surface-200/60">Alumnos sin inscripción activa</h3>
              <div className="p-0 overflow-x-auto card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="font-mono text-xs tracking-wider uppercase border-b border-surface-200/10 text-surface-200/40">
                      <th className="px-6 py-3 text-left">Alumno</th>
                      <th className="px-6 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/5">
                    {estudiantesSinInscripcion.map(s => (
                      <tr key={s.id} className="transition-colors hover:bg-surface-700/30">
                        <td className="px-6 py-4 font-medium font-body">{s.apellidos}, {s.nombre}</td>
                        <td className="px-6 py-4"><span className="badge-warn">Sin inscripción activa</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Al corriente */}
          {alDia.length > 0 && (
            <div>
              <h3 className="mb-3 font-mono text-xs tracking-widest uppercase text-emerald-400">Al corriente</h3>
              <div className="p-0 overflow-x-auto card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="font-mono text-xs tracking-wider uppercase border-b border-surface-200/10 text-surface-200/40">
                      <th className="px-6 py-3 text-left">Alumno</th>
                      <th className="px-6 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/5">
                    {alDia.map(row => (
                      <tr key={row.estudiante_id} className="transition-colors hover:bg-surface-700/30">
                        <td className="px-6 py-4 font-medium font-body">
                          {row.apellidos}, {row.nombre}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {inscripcionesByEstudiante[row.estudiante_id]?.map(ins => (
                              <span key={ins.id} className={`badge ${ins.pagado ? 'badge-ok' : 'badge-err'} text-[11px] py-1 px-2`}>
                                {ins.plan_nombre} {ins.pagado ? 'pagado' : 'adeudo'}
                              </span>
                            ))}
                            {cargosByEstudiante[row.estudiante_id]?.map(cargo => (
                              <span key={cargo.id} className={`badge ${cargo.pagado ? 'badge-ok' : 'badge-err'} text-[11px] py-1 px-2`}>
                                {cargo.descripcion} {cargo.pagado ? 'pagado' : 'adeudo'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="badge-ok"><CheckCircle size={11} /> Al corriente</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmar pago */}
      {pendingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70">
          <div className="w-full max-w-md card bg-cosmos-900/95">
            <h3 className="mb-4 text-xl font-bold tracking-widest font-display">Confirmar pago</h3>
            <p className="text-sm text-surface-200/70">
              ¿Deseas registrar el pago de <strong>{pendingPayment.planNombre}</strong> para <strong>{pendingPayment.row.nombre} {pendingPayment.row.apellidos}</strong>?
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmarPago}
                disabled={confirmPaymentLoading}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {confirmPaymentLoading ? 'Registrando...' : 'Confirmar pago'}
              </button>
              <button
                onClick={() => setPendingPayment(null)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo cargo especial */}
      {showCargoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70">
          <div className="w-full max-w-md card bg-cosmos-900/95">
            <h3 className="mb-6 text-xl font-bold tracking-widest font-display">Nuevo cargo especial</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-mono text-xs tracking-wider uppercase text-surface-200/60">Alumno</label>
                <select
                  className="input bg-cosmos-800"
                  value={cargoForm.estudiante_id}
                  onChange={e => setCargoForm(f => ({ ...f, estudiante_id: e.target.value }))}
                >
                  <option value="" disabled>{estudiantes.length > 0 ? 'Selecciona un alumno' : 'No hay alumnos registrados'}</option>
                  {estudiantes.map(alumno => (
                    <option key={alumno.id} value={alumno.id}>{alumno.apellidos}, {alumno.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-mono text-xs tracking-wider uppercase text-surface-200/60">Tipo</label>
                <select
                  className="input bg-cosmos-800"
                  value={cargoForm.tipo}
                  onChange={e => setCargoForm(f => ({ ...f, tipo: e.target.value }))}
                >
                  {TIPOS_CARGO.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-mono text-xs tracking-wider uppercase text-surface-200/60">Descripción</label>
                <input
                  className="input"
                  value={cargoForm.descripcion}
                  onChange={e => setCargoForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 font-mono text-xs tracking-wider uppercase text-surface-200/60">Monto (MXN)</label>
                <input
                  className="input"
                  type="number"
                  value={cargoForm.monto}
                  onChange={e => setCargoForm(f => ({ ...f, monto: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="cargo-pagado"
                  type="checkbox"
                  checked={cargoForm.pagado}
                  onChange={e => setCargoForm(f => ({ ...f, pagado: e.target.checked }))}
                  className="accent-universe-400"
                />
                <label htmlFor="cargo-pagado" className="text-sm text-surface-200/70">Marcar como pagado</label>
              </div>
            </div>
            {cargoError && (
              <p className="px-3 py-2 text-sm text-red-300 rounded-lg bg-red-500/10">{cargoError}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={guardarCargo} disabled={cargoSaving} className="flex-1 btn-primary disabled:opacity-50">
                {cargoSaving ? 'Guardando...' : 'Guardar cargo'}
              </button>
              <button onClick={() => setShowCargoModal(false)} className="flex-1 btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
