import { Building2, ChevronDown, KeyRound, LogOut, ShieldCheck, UserPlus } from 'lucide-react'
import HireflowMark from './HireflowMark'
import { initials } from '../utils'
import type { Auth } from '../hooks/useAuth'
import type { AtsData } from '../hooks/useAtsData'

export default function AppHeader({ auth, ats }: { auth: Auth; ats: AtsData }) {
  if (!auth.session) return null

  return (
    <header className="relative z-30 bg-slate-900/60 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-y-2">
      <div className="flex items-center gap-2.5 font-bold text-white text-lg">
        <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5 shadow-sm shadow-blue-600/30">
          <HireflowMark className="w-4 h-4" />
        </span>
        <span>Hireflow</span>
        {auth.isAdmin && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-blue-600 px-2 py-0.5 rounded-full ml-2">
            <ShieldCheck className="w-3 h-3" /> Admin
          </span>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => ats.setShowUserMenu(v => !v)}
          className="flex items-center gap-2 text-xs text-slate-200 font-medium hover:bg-white/10 pl-1 pr-2.5 py-1.5 rounded-lg transition"
        >
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
            {initials(auth.profile?.company_name || auth.session.user.email || '?') || '?'}
          </span>
          <span className="max-w-[8rem] sm:max-w-none truncate">{auth.profile?.company_name || auth.session.user.email}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${ats.showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        {ats.showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => ats.setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-gradient-to-br from-blue-100 to-indigo-200 border border-blue-100 rounded-xl shadow-lg z-50 py-1.5 animate-fade-in-up">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-700 truncate">{auth.profile?.company_name}</p>
                {!auth.isAdmin && <p className="text-[11px] text-slate-400 truncate">{auth.session.user.email}</p>}
              </div>
              {auth.isAdmin && (
                <button
                  onClick={() => { ats.setShowManageCompaniesModal(true); ats.setManageError(null); ats.setShowUserMenu(false) }}
                  className="w-full text-left text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 px-3 py-2 transition"
                >
                  <Building2 className="w-3.5 h-3.5" /> Hantera företag
                </button>
              )}
              {auth.isAdmin && (
                <button
                  onClick={() => { ats.setShowAccountModal(true); ats.setShowUserMenu(false) }}
                  className="w-full text-left text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 px-3 py-2 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Skapa konto
                </button>
              )}
              <button
                onClick={() => { auth.setShowPasswordModal(true); ats.setShowUserMenu(false) }}
                className="w-full text-left text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 px-3 py-2 transition"
              >
                <KeyRound className="w-3.5 h-3.5" /> Byt lösenord
              </button>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={auth.handleLogout}
                  className="w-full text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 px-3 py-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logga ut
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
