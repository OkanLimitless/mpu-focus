'use client'

import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PenTool, RotateCcw, Check, X } from 'lucide-react'

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
  const sigCanvasRef = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    // Check if signature canvas is available
    if (sigCanvasRef.current) {
      setIsEmpty(sigCanvasRef.current.isEmpty())
    }
  }, [])

  const handleClear = () => {
    sigCanvasRef.current?.clear()
    setIsEmpty(true)
    setIsValid(false)
  }

  const handleSave = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      const signatureData = sigCanvasRef.current.toDataURL('image/png')
      onSignatureCapture(signatureData)
    }
  }

  const handleSignatureEnd = () => {
    if (sigCanvasRef.current) {
      const empty = sigCanvasRef.current.isEmpty()
      setIsEmpty(empty)
      // Simple validation: signature should have some content
      setIsValid(!empty)
    }
  }

  const canvasProps = {
    velocityFilterWeight: 0.7,
    minWidth: 0.5,
    maxWidth: 2.5,
    dotSize: 0,
    penColor: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255, 255, 255)',
    onEnd: handleSignatureEnd,
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PenTool className="h-5 w-5" />
          <span>Digital Signature</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Please sign below using your mouse, trackpad, or touch screen.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Signature Canvas */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
          <div className="relative">
            <SignatureCanvas
              ref={sigCanvasRef}
              canvasProps={{
                width: 500,
                height: 200,
                className: 'signature-canvas w-full h-48 border rounded cursor-crosshair',
              }}
              {...canvasProps}
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-gray-400 text-lg font-medium">
                  Sign here
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Validation Message */}
        {!isEmpty && isValid && (
          <div className="flex items-center space-x-2 text-green-600 text-sm">
            <Check className="h-4 w-4" />
            <span>Signature captured successfully</span>
          </div>
        )}

        {!isEmpty && !isValid && (
          <div className="flex items-center space-x-2 text-red-600 text-sm">
            <X className="h-4 w-4" />
            <span>Please provide a valid signature</span>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between space-x-4">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isEmpty || isSubmitting}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Clear</span>
          </Button>

          <div className="flex space-x-2">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isEmpty || !isValid || isSubmitting}
              className="flex items-center space-x-2"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Signature'}</span>
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Use your mouse, trackpad, or finger to draw your signature</p>
          <p>• Your signature will be securely stored and legally binding</p>
          <p>• Clear and redraw if you need to make changes</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Signature Display Component for viewing saved signatures
interface SignatureDisplayProps {
  signatureData: string
  className?: string
  title?: string
}

export function SignatureDisplay({ 
  signatureData, 
  className, 
  title = "Digital Signature" 
}: SignatureDisplayProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-sm">
          <PenTool className="h-4 w-4" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-gray-50">
          <img
            src={signatureData}
            alt="Digital Signature"
            className="max-w-full h-auto max-h-32 object-contain"
          />
        </div>
      </CardContent>
    </Card>
  )
}