"use client";

import { SessionProvider } from 'next-auth/react'
import React from 'react'
import { I18nProvider } from './i18n-provider'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        {children}
      </I18nProvider>
    </SessionProvider>
  )
}