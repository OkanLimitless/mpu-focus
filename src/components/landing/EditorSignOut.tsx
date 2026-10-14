'use client'
import { signOut } from 'next-auth/react'
export default function EditorSignOut() {
  return <button type="button" onClick={() => signOut({ callbackUrl: '/login' })} className="min-h-[44px] px-3 text-sm font-semibold text-slate-600">Abmelden</button>
}
