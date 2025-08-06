'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink, Search } from 'lucide-react'

interface DocumentVerificationResult {
  total: number
  verified: number
  missing: number
  fixed: number
  errors: Array<{
    userId: string
    email: string
    filename?: string
    error?: string
    suggestions?: string[]
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
          title: "UploadThing API Verification Complete",
          description: `Checked ${data.results.total} documents via API. Fixed ${data.results.fixed}, Missing ${data.results.missing}`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to verify documents')
      }
    } catch (error: any) {
      console.error('Error verifying documents:', error)
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify documents via UploadThing API",
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
          <Search className="h-5 w-5" />
          <span>UploadThing API Document Verifier</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Verify and fix document URLs using the official UploadThing API. This queries the actual files from UploadThing instead of guessing URLs.
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
              Querying UploadThing API...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Verify All Documents via API
            </>
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
                <div className="text-sm text-green-600">Already Valid</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-700">{results.fixed}</div>
                <div className="text-sm text-yellow-600">API Fixed</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-700">{results.missing}</div>
                <div className="text-sm text-red-600">Not in UploadThing</div>
              </div>
            </div>

            {/* Success Message */}
            {results.fixed > 0 && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-green-800 font-medium">
                    Successfully fixed {results.fixed} document URLs using UploadThing API!
                  </p>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  These documents now have the correct URLs from UploadThing and should be accessible.
                </p>
              </div>
            )}

            {/* Missing Documents */}
            {results.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-800 flex items-center space-x-2">
                  <ExternalLink className="h-4 w-4" />
                  <span>Documents Not Found in UploadThing:</span>
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {results.errors.map((error, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                      <div className="flex items-start space-x-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800">{error.email}</p>
                          {error.filename && (
                            <p className="text-xs text-red-600 font-mono break-all">
                              <strong>Database filename:</strong> {error.filename}
                            </p>
                          )}
                          {error.error && (
                            <p className="text-xs text-red-600 mt-1">
                              <strong>Issue:</strong> {error.error}
                            </p>
                          )}
                          {error.suggestions && error.suggestions.length > 0 && (
                            <div className="text-xs text-orange-600 mt-2 p-2 bg-orange-50 rounded">
                              <p className="font-medium">💡 Similar files found in UploadThing:</p>
                              {error.suggestions.map((suggestion, i) => (
                                <p key={i} className="font-mono break-all">• {suggestion}</p>
                              ))}
                              <p className="text-xs text-orange-700 mt-1">
                                These might be the same file with modified names. Check manually if needed.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Recommendations for missing files */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    <p className="text-blue-800 font-medium">
                      Recommendations for missing documents:
                    </p>
                  </div>
                  <ul className="text-blue-700 text-sm mt-2 space-y-1">
                    <li>• <strong>Set to resubmission status:</strong> Allow users to upload new documents</li>
                    <li>• <strong>Check suggestions:</strong> Similar filenames might be the same files</li>
                    <li>• <strong>Manual verification:</strong> Check UploadThing dashboard for the files</li>
                    <li>• <strong>Contact users:</strong> Ask them to re-upload if files are truly missing</li>
                  </ul>
                </div>
              </div>
            )}

            {results.missing === 0 && results.errors.length === 0 && (
              <div className="bg-green-50 p-4 rounded-lg flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-green-800 font-medium">All documents verified via UploadThing API!</p>
                  <p className="text-green-700 text-sm">Every document in your database has a corresponding file in UploadThing.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}