import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Acceso } from '../types/database'
import { DoorOpen, DoorClosed, AlertTriangle } from 'lucide-react'

export default function Accesos() {
  const [accesos, setAccesos] = useState<(Acceso & { estudiantes: { nombre: string; apellidos: string } | null })[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    const { data } = await supabase
      .from('accesos')
      .select('*, estudiantes(nombre, apellidos)')
      .order('capturado_en', { ascending: false })
      .limit(100)
    setAccesos((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // Realtime: escucha nuevos accesos
    const channel = supabase
      .channel('accesos_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'accesos' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const iconTipo = (tipo: string) => {
    if (tipo === 'entrada')  return <DoorOpen size={14} className="text-emerald-400" />
    if (tipo === 'salida')   return <DoorClosed size={14} className="text-sky-400" />
    return <AlertTriangle size={14} className="text-brand-500" />
  }

  const badgeTipo = (tipo: string) => {
    if (tipo === 'entrada')  return <span className="badge-ok">Entrada</span>
    if (tipo === 'salida')   return <span className="inline-flex items-center gap-1 bg-sky-500/15 text-sky-400 text-xs font-mono px-2 py-0.5 rounded-full">Salida</span>
    return <span className="badge-err">Denegado</span>
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold tracking-widest">ACCESOS</h2>
        <p className="text-surface-200/40 font-mono text-xs mt-1">Log en tiempo real — últimos 100 registros</p>
      </div>

      {loading ? (
        <p className="text-surface-200/40 font-mono text-sm">Cargando...</p>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200/10 text-surface-200/40 font-mono text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Tipo</th>
                <th className="px-6 py-3 text-left">Alumno</th>
                <th className="px-6 py-3 text-left">Motivo</th>
                <th className="px-6 py-3 text-left">Fecha y hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/5">
              {accesos.map(a => (
                <tr key={a.id} className="hover:bg-surface-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {iconTipo(a.tipo)}
                      {badgeTipo(a.tipo)}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-body font-medium">
                    {a.estudiantes ? `${a.estudiantes.apellidos}, ${a.estudiantes.nombre}` : <span className="text-surface-200/30">Desconocido</span>}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-surface-200/50">
                    {a.motivo_denegado ?? '—'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-surface-200/50">
                    {new Date(a.capturado_en).toLocaleString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
