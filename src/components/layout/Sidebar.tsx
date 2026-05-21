import { NavLink } from 'react-router-dom'
import { Users, CreditCard, DoorOpen, BookOpen, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const nav = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/estudiantes', icon: Users,           label: 'Estudiantes'  },
  { to: '/planes',      icon: BookOpen,        label: 'Planes'       },
  { to: '/pagos',       icon: CreditCard,      label: 'Pagos'        },
  { to: '/accesos',     icon: DoorOpen,        label: 'Accesos'      },
]

export default function Sidebar() {
  const { signOut, user } = useAuth()

  return (
    <aside className="w-56 bg-surface-800 border-r border-surface-200/10 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-surface-200/10">
        <span className="font-display text-3xl text-brand-500 tracking-widest">ACCESO</span>
        <p className="text-surface-200/40 font-mono text-[10px] mt-0.5 uppercase tracking-widest">
          Academia de Baile
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body transition-colors duration-150 ${
                isActive
                  ? 'bg-brand-500/15 text-brand-500'
                  : 'text-surface-200/60 hover:text-surface-50 hover:bg-surface-700'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario */}
      <div className="px-4 py-4 border-t border-surface-200/10">
        <p className="text-surface-200/40 font-mono text-[10px] truncate mb-2">{user?.email}</p>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-surface-200/50 hover:text-brand-500 text-xs font-mono transition-colors"
        >
          <LogOut size={13} /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
