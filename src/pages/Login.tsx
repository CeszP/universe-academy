import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setValidationError('')

    const emailTrim = email.trim()
    const passwordTrim = password.trim()
    const emailRegex = /^\S+@\S+\.\S+$/

    if (!emailTrim) {
      setValidationError('Ingresa tu correo electrónico')
      return
    }

    if (!emailRegex.test(emailTrim)) {
      setValidationError('Ingresa un correo válido')
      return
    }

    if (!passwordTrim) {
      setValidationError('Ingresa tu contraseña')
      return
    }

    setLoading(true)
    const { error } = await signIn(emailTrim, passwordTrim)
    if (error) setError('Credenciales incorrectas')
    setLoading(false)
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 overflow-hidden bg-cosmos-950">

      {/* Fondo atmosférico */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-universe-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-navy-900/30 blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full bg-nebula-600/8 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">

        {/* Logo + nombre */}
        <div className="flex flex-col items-center gap-4 mb-10 text-center">
          <div className="flex items-center justify-center h-20 w-50 ">
            <img src="/logo_light.png" alt="Universe Academy" className="object-contain w-full h-full" />
          </div>
          {/* <div>
            <h1 className="text-2xl font-bold tracking-widest text-white font-display">UNIVERSE</h1>
            <p className="font-display text-xs tracking-[0.4em] text-universe-300 mt-0.5">ACADEMY</p>
          </div> */}
          <p className="text-white/30 font-mono text-[18px] tracking-widest uppercase mt-1">
            Panel de administración
          </p>
        </div>

        {/* Card */}
        <div className="p-8 border shadow-2xl bg-cosmos-900/80 backdrop-blur rounded-2xl border-white/8 shadow-cosmos-950">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono text-white/40 mb-1.5 uppercase tracking-widest">
                Correo electrónico
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@universeacademy.mx"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-white/40 mb-1.5 uppercase tracking-widest">
                Contraseña
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {(validationError || error) && (
              <p className="px-3 py-2 font-mono text-xs text-red-400 rounded-lg bg-red-500/10">
                {validationError || error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 py-2.5"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
