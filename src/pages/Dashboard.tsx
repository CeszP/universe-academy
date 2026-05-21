import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, CheckCircle, XCircle, DoorOpen } from 'lucide-react'

interface Stats {
  totalAlumnos: number
  alumnosAlDia: number
  alumnosAtrasados: number
  accesosHoy: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalAlumnos: 0, alumnosAlDia: 0, alumnosAtrasados: 0, accesosHoy: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ count: total }, { data: pagos }, { count: accesosHoy }] = await Promise.all([
        supabase.from('estudiantes').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('v_estado_pago_actual').select('acceso_permitido'),
        supabase.from('accesos')
          .select('*', { count: 'exact', head: true })
          .gte('capturado_en', new Date().toISOString().split('T')[0]),
      ])

      const alDia = pagos?.filter(p => p.acceso_permitido).length ?? 0
      const atrasados = (pagos?.length ?? 0) - alDia

      setStats({
        totalAlumnos: total ?? 0,
        alumnosAlDia: alDia,
        alumnosAtrasados: atrasados,
        accesosHoy: accesosHoy ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Alumnos activos',   value: stats.totalAlumnos,    icon: Users,       color: 'text-sky-400'     },
    { label: 'Al corriente',      value: stats.alumnosAlDia,    icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Con adeudo',        value: stats.alumnosAtrasados,icon: XCircle,     color: 'text-brand-500'   },
    { label: 'Accesos hoy',       value: stats.accesosHoy,      icon: DoorOpen,    color: 'text-amber-400'   },
  ]

  return (
    <div>
      <h2 className="font-display text-4xl tracking-widest mb-1">DASHBOARD</h2>
      <p className="text-surface-200/40 font-mono text-xs mb-8">
        {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex flex-col gap-3">
            <Icon size={20} className={color} />
            <div>
              <p className={`font-display text-4xl tracking-wider ${loading ? 'opacity-30' : ''}`}>
                {loading ? '—' : value}
              </p>
              <p className="text-surface-200/50 font-mono text-xs mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
