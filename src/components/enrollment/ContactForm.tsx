'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ContactFormProps {
  data: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  onChange: (field: string, value: string) => void
}

export default function ContactForm({ data, onChange }: ContactFormProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Ihre Kontaktdaten
        </h3>
        <p className="text-sm text-gray-600">
          Alle Felder sind erforderlich
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            Vorname *
          </Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Ihr Vorname"
            value={data.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">
            Nachname *
          </Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Ihr Nachname"
            value={data.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          E-Mail-Adresse *
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="ihre.email@beispiel.de"
          value={data.email}
          onChange={(e) => onChange('email', e.target.value)}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Telefonnummer *
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+49 123 456789"
          value={data.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          className="w-full"
        />
        <p className="text-sm text-gray-500">
          Bitte geben Sie Ihre Telefonnummer an, damit wir Sie kontaktieren können.
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Datenschutz:</strong> Ihre Daten werden nur für die Kontaktaufnahme verwendet 
          und nicht an Dritte weitergegeben. Sie können der Verarbeitung jederzeit widersprechen.
        </p>
      </div>
    </div>
  )
}