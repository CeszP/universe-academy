import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getLocalDate } from '../lib/date'
import { downloadCsv } from '../lib/csv'
import type { Database, Estudiante, Inscripcion, Plan } from '../types/database'
import { UserPlus, Pencil, UserX, UserCheck, BookOpen, X } from 'lucide-react'

export default function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [planes, setPlanes] = useState<Plan[]>([])
  const [inscripcionesByEstudiante, setInscripcionesByEstudiante] = useState<Record<string, { id: string; plan_id: string; plan_nombre: string }[]>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showInscripcionModal, setShowInscripcionModal] = useState(false)
  const [editando, setEditando] = useState<Estudiante | null>(null)
  const [inscribirTarget, setInscribirTarget] = useState<Estudiante | null>(null)
  const [form, setForm] = useState({ nombre: '', apellidos: '', telefono: '', email: '' })
  const [registroPlanId, setRegistroPlanId] = useState('')
  const [registroPagoInicial, setRegistroPagoInicial] = useState(false)
  const [inscripcionForm, setInscripcionForm] = useState({ plan_id: '', pago_inicial: false })
  const [formError, setFormError] = useState('')
  const [inscripcionError, setInscripcionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'activo' | 'inactivo'>('all')
  const [inscripcionFilter, setInscripcionFilter] = useState<'all' | 'con_curso' | 'sin_curso'>('all')

  const cargar = async () => {
    const [estudiantesResp, planesResp, inscripcionesResp] = await Promise.all([
      supabase.from<'estudiantes', Database['public']['Tables']['estudiantes']>('estudiantes').select('*').order('apellidos'),
      supabase.from<'planes', Database['public']['Tables']['planes']>('planes').select('*').order('nombre'),
      supabase.from<'inscripciones', Database['public']['Tables']['inscripciones']>('inscripciones')
        .select('id,estudiante_id,plan_id,activa,planes(id,nombre)')
        .eq('activa', true),
    ])

    const inscripciones: Array<Inscripcion & { planes?: { id: string; nombre: string } }> = inscripcionesResp.data ?? []
    const grouped = inscripciones.reduce<Record<string, { id: string; plan_id: string; plan_nombre: string }[]>>((acc, ins) => {
      if (!ins.estudiante_id) return acc
      const planNombre = ins.planes?.nombre ?? 'Plan desconocido'
      acc[ins.estudiante_id] = acc[ins.estudiante_id] ?? []
      acc[ins.estudiante_id].push({ id: ins.id, plan_id: ins.plan_id, plan_nombre: planNombre })
      return acc
    }, {})

    setEstudiantes(estudiantesResp.data ?? [])
    setPlanes(planesResp.data ?? [])
    setInscripcionesByEstudiante(grouped)
    setLastUpdated(new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }))
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const filteredEstudiantes = estudiantes.filter(e => {
    const query = searchQuery.toLowerCase().trim()
    const textoAlumno = `${e.apellidos} ${e.nombre} ${e.telefono ?? ''} ${e.email ?? ''}`.toLowerCase()
    const cumpleBusqueda = !query || textoAlumno.includes(query)
    const cumpleStatus = statusFilter === 'all' || (statusFilter === 'activo' ? e.activo : !e.activo)
    const inscripciones = inscripcionesByEstudiante[e.id] ?? []
    const tieneCurso = inscripciones.length > 0
    const cumpleInscripcion =
      inscripcionFilter === 'all' ||
      (inscripcionFilter === 'con_curso' ? tieneCurso : !tieneCurso)
    const cumplePlan = !planFilter || inscripciones.some(ins => ins.plan_id === planFilter)
    return cumpleBusqueda && cumpleStatus && cumpleInscripcion && cumplePlan
  })

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: '', apellidos: '', telefono: '', email: '' })
    setRegistroPlanId('')
    setRegistroPagoInicial(false)
    setFormError('')
    setShowModal(true)
  }

  const exportEstudiantes = () => {
    const rows = filteredEstudiantes.map(est => {
      const inscripciones = inscripcionesByEstudiante[est.id] ?? []
      return {
        Nombre: est.nombre,
        Apellidos: est.apellidos,
        Teléfono: est.telefono ?? '',
        Email: est.email ?? '',
        Estado: est.activo ? 'Activo' : 'Inactivo',
        Cursos: inscripciones.map(ins => ins.plan_nombre).join('; '),
      }
    })

    downloadCsv('estudiantes.csv', rows, [
      { label: 'Nombre', key: 'Nombre' },
      { label: 'Apellidos', key: 'Apellidos' },
      { label: 'Teléfono', key: 'Teléfono' },
      { label: 'Email', key: 'Email' },
      { label: 'Estado', key: 'Estado' },
      { label: 'Cursos', key: 'Cursos' },
    ])
  }

  const abrirEditar = (e: Estudiante) => {
    setEditando(e)
    setForm({ nombre: e.nombre, apellidos: e.apellidos, telefono: e.telefono ?? '', email: e.email ?? '' })
    setFormError('')
    setShowModal(true)
  }

  const abrirInscribir = (e: Estudiante) => {
    setInscribirTarget(e)
    setInscripcionForm({ plan_id: '', pago_inicial: false })
    setInscripcionError('')
    setShowInscripcionModal(true)
  }

  const availablePlansForInscribir = (studentId: string) => {
    const inscritos = inscripcionesByEstudiante[studentId] ?? []
    const inscritosIds = new Set(inscritos.map(ins => ins.plan_id))
    return planes.filter(p => p.activo && !inscritosIds.has(p.id))
  }

  const validateEstudianteForm = () => {
    const nombre = form.nombre.trim()
    const apellidos = form.apellidos.trim()
    const emailTrim = form.email.trim()
    const emailRegex = /^\S+@\S+\.\S+$/

    if (!nombre) return 'El nombre es obligatorio'
    if (!apellidos) return 'Los apellidos son obligatorios'
    if (emailTrim && !emailRegex.test(emailTrim)) return 'Ingresa un correo válido'
    return ''
  }

  const guardar = async () => {
    const validationMessage = validateEstudianteForm()
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setFormError('')
    setSaving(true)

    const payload = {
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
    }

    try {
      if (editando) {
        await supabase.from<'estudiantes', Database['public']['Tables']['estudiantes']>('estudiantes').update(payload).eq('id', editando.id)
      } else {
        const { data: estudianteData, error: estudianteError } = await supabase
          .from<'estudiantes', Database['public']['Tables']['estudiantes']>('estudiantes')
          .insert({ ...payload, activo: true, foto_url: null, terminal_person_id: null })
          .select('id')
          .single()

        if (estudianteError || !estudianteData?.id) {
          console.error('Error creando estudiante', estudianteError)
          setFormError('No se pudo crear el alumno')
          return
        }

        if (registroPlanId) {
          const plan = planes.find(p => p.id === registroPlanId)
          const { data: inscripcionData, error: inscripcionError } = await supabase
            .from('inscripciones')
            .insert({
              estudiante_id: estudianteData.id,
              plan_id: registroPlanId,
              activa: true,
              fecha_inicio: getLocalDate(),
              fecha_fin: null,
            })
            .select('id')
            .single()

          if (inscripcionError || !inscripcionData?.id) {
            console.error('Error creando inscripción', inscripcionError)
            setFormError('No se pudo crear la inscripción')
            return
          }

          if (registroPagoInicial) {
            const monto = plan?.monto ?? 0
            await supabase.from<'pagos', Database['public']['Tables']['pagos']>('pagos').insert({
              estudiante_id: estudianteData.id,
              inscripcion_id: inscripcionData.id,
              anio: new Date().getFullYear(),
              mes: new Date().getMonth() + 1,
              monto,
              pagado: true,
              fecha_pago: getLocalDate(),
              metodo_pago: 'efectivo',
              referencia_externa: null,
              registrado_por: null,
            })
          }
        }
      }

      setShowModal(false)
      cargar()
      setSuccessMessage(editando ? 'Alumno actualizado correctamente' : 'Alumno registrado correctamente')
    } catch (err) {
      console.error('Error guardando estudiante', err)
      setFormError('Ocurrió un error al guardar el alumno')
    } finally {
      setSaving(false)
    }
  }

  const guardarInscripcion = async () => {
    if (!inscribirTarget) return
    if (!inscripcionForm.plan_id) {
      setInscripcionError('Selecciona un plan para inscribir')
      return
    }

    setInscripcionError('')

    try {
      const plan = planes.find(p => p.id === inscripcionForm.plan_id)
      const { data: inscripcionData, error: inscripcionError } = await supabase
        .from<'inscripciones', Database['public']['Tables']['inscripciones']>('inscripciones')
        .insert({
          estudiante_id: inscribirTarget.id,
          plan_id: inscripcionForm.plan_id,
          activa: true,
          fecha_inicio: getLocalDate(),
          fecha_fin: null,
        })
        .select('id')
        .single()

      if (inscripcionError || !inscripcionData?.id) {
        console.error('Error creando inscripción', inscripcionError)
        setInscripcionError('No se pudo crear la inscripción')
        return
      }

      if (inscripcionForm.pago_inicial) {
        const monto = plan?.monto ?? 0
        await supabase.from<'pagos', Database['public']['Tables']['pagos']>('pagos').insert({
          estudiante_id: inscribirTarget.id,
          inscripcion_id: inscripcionData.id,
          anio: new Date().getFullYear(),
          mes: new Date().getMonth() + 1,
          monto,
          pagado: true,
          fecha_pago: getLocalDate(),
          metodo_pago: 'efectivo',
          referencia_externa: null,
          registrado_por: null,
        })
      }

      setShowInscripcionModal(false)
      setInscribirTarget(null)
      cargar()
      setSuccessMessage('Inscripción registrada correctamente')
    } catch (err) {
      console.error('Error guardando inscripción', err)
      setInscripcionError('Ocurrió un error al guardar la inscripción')
    }
  }

  const toggleActivo = async (e: Estudiante) => {
    const action = e.activo ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Deseas ${action} a ${e.nombre} ${e.apellidos}?`)) {
      return
    }

    await supabase.from<'estudiantes', Database['public']['Tables']['estudiantes']>('estudiantes').update({ activo: !e.activo }).eq('id', e.id)
    cargar()
    setSuccessMessage(`Alumno ${action} correctamente`)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-surface-200/40 font-mono text-xs mb-2">Inicio / Estudiantes</p>
          <h2 className="font-display text-3xl font-bold tracking-widest">ESTUDIANTES</h2>
          <p className="text-surface-200/40 font-mono text-xs mt-1">Gestión de alumnos</p>
          <p className="text-surface-200/40 font-mono text-xs mt-2">Última actualización: {lastUpdated || '—'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportEstudiantes} className="btn-secondary flex items-center gap-2">
            Exportar CSV
          </button>
          <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} /> Nuevo alumno
          </button>
        </div>
      </div>
      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-200">
          {successMessage}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <input
          className="input w-full"
          placeholder="Buscar alumno, email o teléfono"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select
          className="input w-full"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | 'activo' | 'inactivo')}
        >
          <option value="all">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select
          className="input w-full"
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
        >
          <option value="">Todos los cursos</option>
          {planes.map(plan => (
            <option key={plan.id} value={plan.id}>{plan.nombre}</option>
          ))}
        </select>
        <select
          className="input w-full"
          value={inscripcionFilter}
          onChange={e => setInscripcionFilter(e.target.value as 'all' | 'con_curso' | 'sin_curso')}
        >
          <option value="all">Todos los alumnos</option>
          <option value="con_curso">Con curso</option>
          <option value="sin_curso">Sin curso</option>
        </select>
        <button
          onClick={() => {
            setSearchQuery('')
            setStatusFilter('all')
            setPlanFilter('')
            setInscripcionFilter('all')
          }}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <X size={16} /> Limpiar
        </button>
      </div>

      {
        loading ? (
          <p className="text-surface-200/40 font-mono text-sm">Cargando...</p>
        ) : (
          <>
            {filteredEstudiantes.length === 0 ? (
              <div className="card p-8 text-center text-surface-200/70">
                No se encontró ningún alumno con esos filtros.
              </div>
            ) : (
              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200/10 text-surface-200/40 font-mono text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Nombre</th>
                      <th className="px-6 py-3 text-left">Cursos</th>
                      <th className="px-6 py-3 text-left">Teléfono</th>
                      <th className="px-6 py-3 text-left">Email</th>
                      <th className="px-6 py-3 text-left">Última actualización</th>
                      <th className="px-6 py-3 text-left">Estado</th>
                      <th className="px-6 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/5">
                    {filteredEstudiantes.map(e => (
                      <tr key={e.id} className="hover:bg-surface-700/30 transition-colors">
                        <td className="px-6 py-4 font-body font-medium">{e.apellidos}, {e.nombre}</td>
                        <td className="px-6 py-4 space-y-1">
                          {inscripcionesByEstudiante[e.id]?.length ? (
                            inscripcionesByEstudiante[e.id].map(ins => (
                              <span key={ins.id} className="badge-ok text-[11px] py-1 px-2 inline-flex">{ins.plan_nombre}</span>
                            ))
                          ) : (
                            <span className="text-surface-200/50 text-xs">Sin curso activo</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-surface-200/60 text-xs">{e.telefono ?? '—'}</td>
                        <td className="px-6 py-4 font-mono text-surface-200/60 text-xs">{e.email ?? '—'}</td>
                        <td className="px-6 py-4 font-mono text-surface-200/60 text-xs">
                          {new Date(e.updated_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-6 py-4">
                          {e.activo
                            ? <span className="badge-ok">Activo</span>
                            : <span className="badge-err">Inactivo</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => abrirInscribir(e)} className="text-surface-200/50 hover:text-universe-300 transition-colors">
                              <BookOpen size={14} />
                            </button>
                            <button onClick={() => abrirEditar(e)} className="text-surface-200/50 hover:text-brand-500 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => toggleActivo(e)} className="text-surface-200/50 hover:text-amber-400 transition-colors">
                              {e.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
                <div className="card w-full max-w-md">
                  <h3 className="font-display text-xl font-bold tracking-widest mb-6">
                    {editando ? 'EDITAR ALUMNO' : 'NUEVO ALUMNO'}
                  </h3>
                  <div className="space-y-4">
                    {(['nombre', 'apellidos', 'telefono', 'email'] as const).map(campo => (
                      <div key={campo}>
                        <label className="block text-xs font-mono text-surface-200/60 mb-1 uppercase tracking-wider">{campo}</label>
                        <input
                          className="input"
                          value={form[campo]}
                          onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                        />
                      </div>
                    ))}

                    {!editando && (
                      <>
                        <div>
                          <label className="block text-xs font-mono text-surface-200/60 mb-1 uppercase tracking-wider">Plan inicial (opcional)</label>
                          <select
                            className="input bg-cosmos-800"
                            value={registroPlanId}
                            onChange={e => setRegistroPlanId(e.target.value)}
                          >
                            <option value="">Sin plan inicial</option>
                            {planes.filter(p => p.activo).map(plan => (
                              <option key={plan.id} value={plan.id}>
                                {plan.nombre} — ${plan.monto.toLocaleString('es-MX')}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            id="pago-inicial"
                            type="checkbox"
                            checked={registroPagoInicial}
                            onChange={e => setRegistroPagoInicial(e.target.checked)}
                            className="accent-universe-400"
                          />
                          <label htmlFor="pago-inicial" className="text-sm text-surface-200/70">Ya pagó el mes inicial</label>
                        </div>
                      </>
                    )}
                  </div>
                  {formError && (
                    <p className="px-3 py-2 text-sm text-red-300 rounded-lg bg-red-500/10">{formError}</p>
                  )}
                  <div className="flex gap-3 mt-6">
                    <button onClick={guardar} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  </div>
                </div>
              </div>
            )}

            {showInscripcionModal && inscribirTarget && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
                <div className="card w-full max-w-md">
                  <h3 className="font-display text-xl font-bold tracking-widest mb-6">Inscribir alumno</h3>
                  <div className="space-y-4">
                    <p className="text-surface-200/70 text-sm">{inscribirTarget.apellidos}, {inscribirTarget.nombre}</p>
                    <div>
                      <label className="block text-xs font-mono text-surface-200/60 mb-1 uppercase tracking-wider">Plan</label>
                      <select
                        className="input bg-cosmos-800"
                        value={inscripcionForm.plan_id}
                        onChange={e => setInscripcionForm(f => ({ ...f, plan_id: e.target.value }))}
                      >
                        <option value="">Selecciona un plan</option>
                        {availablePlansForInscribir(inscribirTarget.id).length > 0 ? (
                          availablePlansForInscribir(inscribirTarget.id).map(plan => (
                            <option key={plan.id} value={plan.id}>
                              {plan.nombre} — ${plan.monto.toLocaleString('es-MX')}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>No hay cursos disponibles</option>
                        )}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        id="inscripcion-pago-inicial"
                        type="checkbox"
                        checked={inscripcionForm.pago_inicial}
                        onChange={e => setInscripcionForm(f => ({ ...f, pago_inicial: e.target.checked }))}
                        className="accent-universe-400"
                      />
                      <label htmlFor="inscripcion-pago-inicial" className="text-sm text-surface-200/70">Marcar el mes inicial como pagado</label>
                    </div>
                  </div>
                  {inscripcionError && (
                    <p className="px-3 py-2 text-sm text-red-300 rounded-lg bg-red-500/10">{inscripcionError}</p>
                  )}
                  <div className="flex gap-3 mt-6">
                    <button onClick={guardarInscripcion} className="btn-primary flex-1">Guardar inscripción</button>
                    <button onClick={() => setShowInscripcionModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
    </div>
  )
}
