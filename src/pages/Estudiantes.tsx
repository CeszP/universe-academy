import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Estudiante } from '../types/database'
import { UserPlus, Pencil, UserX, UserCheck } from 'lucide-react'

export default function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Estudiante | null>(null)
  const [form, setForm] = useState({ nombre: '', apellidos: '', telefono: '', email: '' })

  const cargar = async () => {
    const { data } = await supabase.from('estudiantes').select('*').order('apellidos')
    setEstudiantes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: '', apellidos: '', telefono: '', email: '' })
    setShowModal(true)
  }

  const abrirEditar = (e: Estudiante) => {
    setEditando(e)
    setForm({ nombre: e.nombre, apellidos: e.apellidos, telefono: e.telefono ?? '', email: e.email ?? '' })
    setShowModal(true)
  }

  const guardar = async () => {
    if (editando) {
      await supabase.from('estudiantes').update(form).eq('id', editando.id)
    } else {
      await supabase.from('estudiantes').insert({ ...form, activo: true })
    }
    setShowModal(false)
    cargar()
  }

  const toggleActivo = async (e: Estudiante) => {
    await supabase.from('estudiantes').update({ activo: !e.activo }).eq('id', e.id)
    cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-4xl tracking-widest">ESTUDIANTES</h2>
          <p className="text-surface-200/40 font-mono text-xs mt-1">Gestión de alumnos</p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Nuevo alumno
        </button>
      </div>

      {loading ? (
        <p className="text-surface-200/40 font-mono text-sm">Cargando...</p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200/10 text-surface-200/40 font-mono text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Nombre</th>
                <th className="px-6 py-3 text-left">Teléfono</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/5">
              {estudiantes.map(e => (
                <tr key={e.id} className="hover:bg-surface-700/30 transition-colors">
                  <td className="px-6 py-4 font-body font-medium">{e.apellidos}, {e.nombre}</td>
                  <td className="px-6 py-4 font-mono text-surface-200/60 text-xs">{e.telefono ?? '—'}</td>
                  <td className="px-6 py-4 font-mono text-surface-200/60 text-xs">{e.email ?? '—'}</td>
                  <td className="px-6 py-4">
                    {e.activo
                      ? <span className="badge-ok">Activo</span>
                      : <span className="badge-err">Inactivo</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
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
            <h3 className="font-display text-2xl tracking-widest mb-6">
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
