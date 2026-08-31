import { KeyRound } from 'lucide-react'
import type { Auth } from '../../hooks/useAuth'

export default function PasswordModal({ auth }: { auth: Auth }) {
  if (!auth.showPasswordModal) return null

  const isSetup = auth.passwordSetupRequired
  const close = () => { auth.setShowPasswordModal(false); auth.setNewPassword(''); auth.setNewPasswordConfirm('') }

  return (
    <div
      role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={e => { if (!isSetup && e.target === e.currentTarget) close() }}
    >
      <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
          <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><KeyRound className="w-4 h-4" /></span>
          {isSetup ? 'Välkommen till Hireflow' : 'Byt lösenord'}
        </h2>
        {isSetup && <p className="text-xs text-slate-500 mb-4 ml-9">Sätt ett lösenord för att komma igång.</p>}
        <form onSubmit={auth.changePassword} className={`space-y-3 ${isSetup ? '' : 'mt-4'}`}>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{isSetup ? 'Lösenord' : 'Nytt lösenord'}</label>
            <input autoFocus required type="password" minLength={6} value={auth.newPassword} onChange={e => auth.setNewPassword(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Bekräfta lösenord</label>
            <input required type="password" minLength={6} value={auth.newPasswordConfirm} onChange={e => auth.setNewPasswordConfirm(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
          </div>
          {auth.passwordError && <p className="text-xs text-red-600">{auth.passwordError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            {!isSetup && <button type="button" onClick={close} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>}
            <button type="submit" disabled={auth.passwordBusy} className={`px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20 ${isSetup ? 'w-full' : ''}`}>
              {auth.passwordBusy ? 'Sparar...' : isSetup ? 'Sätt lösenord' : 'Byt lösenord'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
