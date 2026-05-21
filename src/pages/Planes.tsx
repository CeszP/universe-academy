import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Plan } from '../types/database'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'

export default function Planes() {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Plan | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', monto: '' })

  const cargar = async () => {
    const { data } = await supabase.from('planes').select('*').order('nombre')
    setPlanes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: '', descripcion: '', monto: '' })
    setShowModal(true)
  }

  const abrirEditar = (p: Plan) => {
    setEditando(p)
    setForm({ nombre: p.nombre, descripcion: p.descripcion ?? '', monto: String(p.monto) })
    setShowModal(true)
  }

  const guardar = async () => {
    const payload = { nombre: form.nombre, descripcion: form.descripcion, monto: parseFloat(form.monto) }
    if (editando) {
      await supabase.from('planes').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('planes').insert({ ...payload, activo: true })
    }
    setShowModal(false)
    cargar()
  }

  const toggleActivo = async (p: Plan) => {
    await supabase.from('planes').update({ activo: !p.activo }).eq('id', p.id)
    cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-4xl tracking-widest">PLANES</h2>
          <p className="text-surface-200/40 font-mono text-xs mt-1">Catálogo de clases y paquetes</p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      {loading ? (
        <p className="text-surface-200/40 font-mono text-sm">Cargando...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planes.map(p => (
            <div key={p.id} className={`card ${!p.activo ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-body font-semibold">{p.nombre}</p>
                  <p className="text-surface-200/50 text-xs font-mono mt-1">{p.descripcion ?? '—'}</p>
                </div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => abrirEditar(p)} className="text-surface-200/40 hover:text-brand-500 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => toggleActivo(p)} className="text-surface-200/40 hover:text-amber-400 transition-colors">
                    {p.activo ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                  </button>
                </div>
              </div>
              <p className="font-display text-3xl tracking-wider text-brand-500 mt-4">
                ${p.monto.toLocaleString('es-MX')}
                <span className="text-sm text-surface-200/40 font-body font-normal">/mes</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md">
            <h3 className="font-display text-2xl tracking-widest mb-6">
              {editando ? 'EDITAR PLAN' : 'NUEVO PLAN'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-surface-200/60 mb-1 uppercase tracking-wider">Nombre</label>
                <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-mono text-surface-200/60 mb-1 uppercase tracking-wider">Descripción</label>
                <input className="input" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-mono text-surface-200/60 mb-1 uppercase tracking-wider">Monto mensual (MXN)</label>
                <input className="input" type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardar} className="btn-primary flex-1">Guardar</button>
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
