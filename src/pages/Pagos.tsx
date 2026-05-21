import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { EstadoPagoActual } from '../types/database'
import { CheckCircle, XCircle } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Pagos() {
  const [estado, setEstado] = useState<EstadoPagoActual[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const anio = now.getFullYear()
  const mes = now.getMonth() + 1

  const cargar = async () => {
    const { data } = await supabase.from('v_estado_pago_actual').select('*').order('apellidos')
    setEstado(data ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const registrarPago = async (row: EstadoPagoActual) => {
    // Buscar inscripciones activas del alumno
    const { data: inscripciones } = await supabase
      .from('inscripciones')
      .select('id, plan_id, planes(monto)')
      .eq('estudiante_id', row.estudiante_id)
      .eq('activa', true)

    if (!inscripciones?.length) return

    // Para cada inscripción, upsert el pago del mes actual como pagado
    for (const ins of inscripciones) {
      const plan = ins.planes as unknown as { monto: number }
      await supabase.from('pagos').upsert({
        estudiante_id: row.estudiante_id,
        inscripcion_id: ins.id,
        anio,
        mes,
        monto: plan?.monto ?? 0,
        pagado: true,
        fecha_pago: new Date().toISOString().split('T')[0],
        metodo_pago: 'efectivo',
      }, { onConflict: 'inscripcion_id,anio,mes' })
    }

    cargar()
  }

  const alDia = estado.filter(e => e.acceso_permitido)
  const atrasados = estado.filter(e => !e.acceso_permitido)

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-4xl tracking-widest">PAGOS</h2>
        <p className="text-surface-200/40 font-mono text-xs mt-1">
          {MESES[mes - 1]} {anio} — {atrasados.length} alumno{atrasados.length !== 1 ? 's' : ''} con adeudo
        </p>
      </div>

      {loading ? (
        <p className="text-surface-200/40 font-mono text-sm">Cargando...</p>
      ) : (
        <div className="space-y-8">
          {/* Con adeudo */}
          {atrasados.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-brand-500 mb-3">Con adeudo</h3>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200/10 text-surface-200/40 font-mono text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Alumno</th>
                      <th className="px-6 py-3 text-left">Estado</th>
                      <th className="px-6 py-3 text-left">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/5">
                    {atrasados.map(row => (
                      <tr key={row.estudiante_id} className="hover:bg-surface-700/30 transition-colors">
                        <td className="px-6 py-4 font-body font-medium">{row.apellidos}, {row.nombre}</td>
                        <td className="px-6 py-4"><span className="badge-err"><XCircle size={11} /> Adeudo</span></td>
                        <td className="px-6 py-4">
                          <button onClick={() => registrarPago(row)} className="btn-primary text-xs py-1 px-3">
                            Registrar pago
                          </button>
                        </td>
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
              <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-400 mb-3">Al corriente</h3>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200/10 text-surface-200/40 font-mono text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Alumno</th>
                      <th className="px-6 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/5">
                    {alDia.map(row => (
                      <tr key={row.estudiante_id} className="hover:bg-surface-700/30 transition-colors">
                        <td className="px-6 py-4 font-body font-medium">{row.apellidos}, {row.nombre}</td>
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
    </div>
  )
}
