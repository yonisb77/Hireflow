import { Eye, EyeOff } from 'lucide-react'
import HireflowMark from './HireflowMark'
import { BACKGROUND_CONSTELLATION } from '../constants'
import type { Auth } from '../hooks/useAuth'

export default function LoginScreen({ auth }: { auth: Auth }) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-900">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse at center, transparent 15%, black 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 15%, black 78%)',
        }}
      />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-drift" />
      <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] bg-indigo-500/30 rounded-full blur-3xl animate-drift-slow" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-glow" />

      {/* Prickkonstellation — ekar HireflowMark, ersätter tidigare bokstavliga kanban-kort */}
      {BACKGROUND_CONSTELLATION.map((n, i) => (
        <div
          key={i}
          className={`hidden md:block absolute rounded-full ${n.size} ${n.color} animate-glow`}
          style={{
            top: n.top,
            left: n.left,
            animationDelay: n.delay,
            animationDuration: n.glow ? '3s' : '5s',
            boxShadow: n.glow ? '0 0 14px 2px rgba(147,197,253,0.5)' : undefined,
          }}
        />
      ))}

      <div className="relative bg-gradient-to-br from-blue-100 to-indigo-200 p-8 rounded-2xl shadow-2xl shadow-black/40 border border-white/50 w-full max-w-sm animate-fade-in-up overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex justify-center mb-5">
          <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl p-3 shadow-md shadow-blue-600/30 animate-float">
            <HireflowMark className="w-6 h-6" />
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-6 text-center">Logga in på Hireflow</h1>
        <form onSubmit={auth.handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Användarnamn</label>
            <input
              type="text"
              autoComplete="off"
              value={auth.email}
              onChange={e => auth.setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Lösenord</label>
            <div className="relative">
              <input
                type={auth.showPassword ? 'text' : 'password'}
                value={auth.password}
                onChange={e => auth.setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 pr-9 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => auth.setShowPassword(v => !v)}
                aria-label={auth.showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {auth.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { auth.setShowForgotModal(true); auth.setForgotEmail(''); auth.setForgotSent(false) }}
              className="text-[11px] font-semibold text-blue-600 hover:underline mt-1.5"
            >
              Glömt lösenord?
            </button>
          </div>
          {auth.authError && <p className="text-xs text-red-600">{auth.authError}</p>}
          <button
            type="submit"
            disabled={auth.loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-medium py-2 rounded-lg text-sm transition shadow-sm shadow-blue-600/20"
          >
            {auth.loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>
      </div>

      {auth.showForgotModal && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) auth.setShowForgotModal(false) }}
        >
          <div className="relative bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl p-6 w-full max-w-sm animate-fade-in-up border border-white/50">
            <h2 className="text-base font-bold text-slate-800 mb-3">Återställ lösenord</h2>
            {auth.forgotSent ? (
              <>
                <p className="text-sm text-slate-600 mb-4">Om kontot finns har ett återställningsmail skickats till {auth.forgotEmail}.</p>
                <button type="button" onClick={() => auth.setShowForgotModal(false)} className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold">Stäng</button>
              </>
            ) : (
              <form onSubmit={auth.requestPasswordReset} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">E-post</label>
                  <input
                    autoFocus
                    required
                    type="email"
                    value={auth.forgotEmail}
                    onChange={e => auth.setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="din@epost.se"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => auth.setShowForgotModal(false)} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
                  <button type="submit" disabled={auth.forgotBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                    {auth.forgotBusy ? 'Skickar...' : 'Skicka återställningslänk'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
