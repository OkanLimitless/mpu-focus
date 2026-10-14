'use client'

import { useState } from 'react'
import Link from 'next/link'
import { contactErrors, type ContactData } from '@/lib/beratung-flow'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ContactForm({
  data,
  onChange,
  copy,
  showErrors = false,
}: {
  copy?: { title: string; hint: string; phoneHint: string }
  showErrors?: boolean
  data: ContactData
  onChange: (field: string, value: string | boolean) => void
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const errors = contactErrors(data)
  const fields = [
    {
      key: 'firstName',
      label: 'Vorname',
      type: 'text',
      autoComplete: 'given-name',
      max: 80,
    },
    {
      key: 'lastName',
      label: 'Nachname',
      type: 'text',
      autoComplete: 'family-name',
      max: 80,
    },
    {
      key: 'email',
      label: 'E-Mail-Adresse',
      type: 'email',
      autoComplete: 'email',
      max: 200,
    },
    {
      key: 'phone',
      label: 'Telefonnummer',
      type: 'tel',
      autoComplete: 'tel',
      max: 40,
    },
  ] as const
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">
          {copy?.title ?? 'Ihre Kontaktdaten'}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {copy?.hint ?? 'Alle Felder sind erforderlich'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => {
          const error = touched[field.key] || showErrors ? errors[field.key] : ''
          return (
            <div
              key={field.key}
              className={
                field.key === 'email' || field.key === 'phone'
                  ? 'col-span-2 min-w-0'
                  : 'min-w-0'
              }
            >
              <Label htmlFor={field.key} className="text-sm">
                {field.label} *
              </Label>
              <Input
                id={field.key}
                name={field.key}
                type={field.type}
                autoComplete={field.autoComplete}
                inputMode={
                  field.type === 'tel'
                    ? 'tel'
                    : field.type === 'email'
                      ? 'email'
                      : 'text'
                }
                maxLength={field.max}
                value={data[field.key]}
                required
                onChange={(event) => onChange(field.key, event.target.value)}
                onBlur={() =>
                  setTouched((previous) => ({ ...previous, [field.key]: true }))
                }
                aria-invalid={!!error}
                aria-describedby={
                  error
                    ? `${field.key}-error`
                    : field.key === 'phone'
                      ? 'phone-hint'
                      : undefined
                }
                className={`mt-1.5 h-12 rounded-lg text-base ${error ? 'border-red-500' : 'border-slate-300'}`}
              />
              {error && (
                <p
                  id={`${field.key}-error`}
                  className="mt-1 text-xs text-red-700"
                >
                  {error}
                </p>
              )}
              {field.key === 'phone' && (
                <p id="phone-hint" className="mt-1.5 text-xs text-slate-500">
                  {copy?.phoneHint}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
        <input
          id="privacyConsent"
          name="privacyConsent"
          type="checkbox"
          checked={data.privacyConsent}
          onChange={(e) => onChange('privacyConsent', e.target.checked)}
          required
          aria-invalid={showErrors && !!errors.privacyConsent}
          aria-describedby={showErrors && errors.privacyConsent ? 'privacyConsent-error' : undefined}
          className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
        />
        <span>
          Ich habe die{' '}
          <Link
            href="/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Datenschutzerklärung
          </Link>{' '}
          gelesen und stimme der Verarbeitung meiner Daten zur Kontaktaufnahme
          zu.
        </span>
      </label>
      {showErrors && errors.privacyConsent && <p id="privacyConsent-error" className="text-xs text-red-700">{errors.privacyConsent}</p>}
    </div>
  )
}
