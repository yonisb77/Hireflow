import { UserPlus } from 'lucide-react'
import type { AtsData } from '../../hooks/useAtsData'

export default function AccountModal({ ats }: { ats: AtsData }) {
  if (!ats.showAccountModal) return null

  return (
    <div
      role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={e => { if (e.target === e.currentTarget) { ats.setShowAccountModal(false); ats.setAccountMessage(null) } }}
    >
      <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><UserPlus className="w-4 h-4" /></span>
          Skapa konto
        </h2>
        <form onSubmit={ats.createAccount} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">E-post</label>
            <input autoFocus required type="email" value={ats.newAccEmail} onChange={e => ats.setNewAccEmail(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="person@foretag.se" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Kontotyp</label>
            <select value={ats.newAccRole} onChange={e => ats.setNewAccRole(e.target.value as 'admin' | 'customer')} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white">
              <option value="customer">Kund</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {ats.newAccRole === 'customer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Företagsnamn</label>
              <input required value={ats.newAccCompany} onChange={e => ats.setNewAccCompany(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="Företaget AB" />
            </div>
          )}
          {ats.accountMessage && <p className="text-xs text-slate-600">{ats.accountMessage}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { ats.setShowAccountModal(false); ats.setAccountMessage(null) }} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Stäng</button>
            <button type="submit" disabled={ats.accountBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
              {ats.accountBusy ? 'Skickar...' : 'Skicka inbjudan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
