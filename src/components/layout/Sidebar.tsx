import { NavLink } from 'react-router-dom'
import { Users, CreditCard, DoorOpen, BookOpen, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/estudiantes', icon: Users, label: 'Estudiantes' },
  { to: '/planes', icon: BookOpen, label: 'Planes' },
  { to: '/pagos', icon: CreditCard, label: 'Pagos' },
  { to: '/accesos', icon: DoorOpen, label: 'Accesos' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { signOut, user } = useAuth()

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 flex flex-col w-56 shrink-0 border-r bg-cosmos-900 border-white/8
      transition-transform duration-200 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto
    `}>

      {/* Logo */}
      <div className="border-b border-white/8">
        <div className="flex items-center justify-center">
          <img src="/logo_light.png" alt="Universe Academy" className="object-contain w-full h-auto" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-150 ${isActive ? 'nav-active' : 'nav-idle'
              }`
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Gradiente decorativo */}
      <div className="h-px mx-4 mb-4 bg-gradient-to-r from-transparent via-universe-600/40 to-transparent" />

      {/* Usuario */}
      <div className="px-4 pb-5">
        <p className="text-white/30 font-mono text-[9px] truncate mb-2 uppercase tracking-widest">
          {user?.email}
        </p>
        <button
          onClick={signOut}
          className="flex items-center gap-2 font-mono text-xs transition-colors text-white/30 hover:text-red-400"
        >
          <LogOut size={12} /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
