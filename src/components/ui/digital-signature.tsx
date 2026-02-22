'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, PenTool } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface DigitalSignatureProps {
  onSignatureCapture: (signatureData: string) => void
  onCancel?: () => void
  isSubmitting?: boolean
  className?: string
}

export default function DigitalSignature({
  onSignatureCapture,
  onCancel,
  isSubmitting = false,
  className
}: DigitalSignatureProps) {
  const [agreed, setAgreed] = useState(false)

  const handleSave = () => {
    if (agreed) {
      // Return a placeholder or simple identifier for the checkbox signature
      onSignatureCapture('SIGNED_VIA_CHECKBOX')
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PenTool className="h-5 w-5" />
          <span>Elektronische Signatur</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Bestätigen Sie das Dokument mit Ihrer digitalen Zustimmung.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 p-4 border rounded-lg bg-gray-50">
          <Checkbox
            id="signature-agree"
            checked={agreed}
            onCheckedChange={(c) => setAgreed(!!c)}
          />
          <Label htmlFor="signature-agree" className="text-sm leading-tight cursor-pointer">
            Ich bestätige hiermit die Richtigkeit der Angaben und unterzeichne dieses Dokument elektronisch.
          </Label>
        </div>

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Abbrechen
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!agreed || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'Verarbeiten...' : 'Zustimmen & Unterzeichnen'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function SignatureDisplay({ signatureData, className }: { signatureData: string, className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center space-x-2 text-green-600 font-medium">
        <Check className="h-4 w-4" />
        <span>Elektronisch unterzeichnet</span>
      </div>
    </div>
  )
}