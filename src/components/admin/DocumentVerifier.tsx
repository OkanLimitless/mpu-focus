'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface DocumentVerificationResult {
  total: number
  verified: number
  missing: number
  fixed: number
  errors: Array<{
    userId: string
    email: string
    filename?: string
    testedUrls?: string[]
    error?: string
  }>
}

export default function DocumentVerifier() {
  const { toast } = useToast()
  const [isVerifying, setIsVerifying] = useState(false)
  const [results, setResults] = useState<DocumentVerificationResult | null>(null)

  const handleVerifyDocuments = async () => {
    try {
      setIsVerifying(true)
      const response = await fetch('/api/admin/documents/verify', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data.results)
        toast({
          title: "Verification Complete",
          description: `Checked ${data.results.total} documents. Fixed ${data.results.fixed}, Missing ${data.results.missing}`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to verify documents')
      }
    } catch (error: any) {
      console.error('Error verifying documents:', error)
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify documents",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Document URL Verifier</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Verify and fix document URLs for all users. This will check if documents are accessible and update URLs if needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleVerifyDocuments}
          disabled={isVerifying}
          className="w-full"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying Documents...
            </>
          ) : (
            'Verify All Documents'
          )}
        </Button>

        {results && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-700">{results.total}</div>
                <div className="text-sm text-blue-600">Total</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-700">{results.verified}</div>
                <div className="text-sm text-green-600">Valid</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-700">{results.fixed}</div>
                <div className="text-sm text-yellow-600">Fixed</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-700">{results.missing}</div>
                <div className="text-sm text-red-600">Missing</div>
              </div>
            </div>

            {/* Error Details */}
            {results.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-800">Missing/Broken Documents:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {results.errors.map((error, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                      <div className="flex items-start space-x-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800">{error.email}</p>
                          {error.filename && (
                            <p className="text-xs text-red-600">File: {error.filename}</p>
                          )}
                          {error.testedUrls && (
                            <div className="text-xs text-red-600 mt-1">
                              <p>Tested URLs:</p>
                              {error.testedUrls.map((url, i) => (
                                <p key={i} className="font-mono break-all">• {url}</p>
                              ))}
                            </div>
                          )}
                          {error.error && (
                            <p className="text-xs text-red-600 mt-1">Error: {error.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.missing === 0 && results.errors.length === 0 && (
              <div className="bg-green-50 p-4 rounded-lg flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800">All documents are accessible!</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}