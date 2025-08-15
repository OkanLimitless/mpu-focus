'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import DocumentPreview from '@/components/ui/document-preview'
import DigitalSignature from '@/components/ui/digital-signature'
import { useI18n } from '@/components/providers/i18n-provider'
import { 
  Upload, 
  FileCheck, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  FileText,
  Shield,
  Clock,
  Eye,
  AlertTriangle
} from 'lucide-react'

interface VerificationData {
  user: {
    firstName: string
    lastName: string
    email: string
    verificationStatus: string
    passportDocument?: {
      rejectionReason?: string
    }
  }
  valid: boolean
}

export default function VerificationPage() {
  const { token } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useI18n()
  
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [contractSigned, setContractSigned] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  // Document preview and signature state
  const [uploadedDocument, setUploadedDocument] = useState<{filename: string, url: string} | null>(null)
  const [showDigitalSignature, setShowDigitalSignature] = useState(true)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signatureMethod, setSignatureMethod] = useState<'checkbox' | 'digital_signature' | 'qes'>('digital_signature')

  useEffect(() => {
    verifyToken()
  }, [token])

  const verifyToken = async () => {
    try {
      const response = await fetch(`/api/verification/${token}`)
      if (response.ok) {
        const data = await response.json()
        setVerificationData(data)
        
        // Set current step based on verification status
        switch (data.user.verificationStatus) {
          case 'pending':
            setCurrentStep(1)
            break
          case 'documents_uploaded':
            setCurrentStep(2)
            break
          case 'contract_signed':
            setCurrentStep(3)
            break
          case 'resubmission_required':
            // For resubmission, go back to step 1 but show resubmission message
            setCurrentStep(1)
            break
          case 'verified':
            setCurrentStep(4)
            break
          default:
            setCurrentStep(1)
        }
      } else {
        toast({
          title: t('error'),
          description: t('verificationPage_invalidLinkDesc'),
          variant: "destructive",
        })
        router.push('/login')
      }
    } catch (error) {
      console.error('Error verifying token:', error)
      toast({
        title: t('error'),
        description: t('verificationPage_failedToVerifyToken'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type (passport/ID documents)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: t('error'),
          description: t('verificationPage_uploadTypeError'),
          variant: "destructive",
        })
        return
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('error'), 
          description: t('verificationPage_uploadSizeError'),
          variant: "destructive",
        })
        return
      }
      
      setSelectedFile(file)
    }
  }

  const uploadDocument = async () => {
    if (!selectedFile) return

    try {
      setIsSubmitting(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('document', selectedFile)
      formData.append('token', token as string)

      const response = await fetch('/api/verification/upload-document', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        // Store document info for preview
        if (data.file) {
          setUploadedDocument({
            filename: data.file.name,
            url: data.file.url
          })
        }
        
        // Handle step progression based on API response
        if (data.nextStep === 'review') {
          // Resubmission case - contract already signed, go to review
          setCurrentStep(3)
        } else {
          // Normal flow - go to contract signing
          setCurrentStep(2)
        }
        
        setUploadProgress(100)
        toast({
          title: t('success'),
          description: data.message || t('verificationPage_uploadSuccess'),
        })
        // Refresh verification data
        await verifyToken()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
    } catch (error: any) {
      console.error('Error uploading document:', error)
      toast({
        title: t('error'),
        description: error.message || t('verificationPage_uploadFailed'),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fetch document data for preview
  const fetchDocumentData = async () => {
    try {
      const response = await fetch(`/api/verification/document/${token}`)
      if (response.ok) {
        const data = await response.json()
        if (data.document) {
          setUploadedDocument({
            filename: data.document.filename,
            url: data.document.url
          })
        }
      }
    } catch (error) {
      console.error('Error fetching document:', error)
    }
  }

  // Handle digital signature capture
  const handleSignatureCapture = (signature: string) => {
    setSignatureData(signature)
    setShowDigitalSignature(false)
    toast({
      title: t('verificationPage_signatureCapturedTitle'),
      description: t('verificationPage_signatureCapturedDesc'),
    })
  }

  // Use effect to fetch document when moving to step 2
  useEffect(() => {
    if (currentStep === 2 && !uploadedDocument) {
      fetchDocumentData()
    }
  }, [currentStep, token])

  const signContract = async () => {
    if (!agreedToTerms) {
      toast({
        title: t('error'),
        description: t('verificationPage_pleaseAgreeToTerms'),
        variant: "destructive",
      })
      return
    }

    // If using digital signature, require signature data
    if (showDigitalSignature && !signatureData) {
      toast({
        title: t('error'),
        description: t('verificationPage_pleaseProvideSignature'),
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/verification/sign-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token as string,
          agreed: true,
          signatureData: signatureData,
          signatureMethod: signatureMethod
        }),
      })

      if (response.ok) {
        setContractSigned(true)
        setCurrentStep(3)
        toast({
          title: t('success'),
          description: t('verificationPage_contractSignedSuccess'),
        })
        // Refresh verification data
        await verifyToken()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Contract signing failed')
      }
    } catch (error: any) {
      console.error('Error signing contract:', error)
      toast({
        title: t('error'),
        description: error.message || t('verificationPage_signFailed'),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepProgress = () => {
    switch (currentStep) {
      case 1: return 25
      case 2: return 50
      case 3: return 75
      case 4: return 100
      default: return 0
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>{t('verificationPage_backToDashboard')}</Button>
            <Button variant="outline" onClick={() => router.push('/login')}>{t('logout')}</Button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('verificationPage_verifyingLink')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!verificationData?.valid) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>{t('verificationPage_backToDashboard')}</Button>
            <Button variant="outline" onClick={() => router.push('/login')}>{t('logout')}</Button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <CardTitle>{t('verificationPage_invalidLinkTitle')}</CardTitle>
              <CardDescription>{t('verificationPage_invalidLinkDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/login')} className="w-full">{t('verificationPage_goToLogin')}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>{t('verificationPage_backToDashboard')}</Button>
          <Button variant="outline" onClick={() => router.push('/login')}>{t('logout')}</Button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('accountVerification')}</h1>
          <p className="text-gray-600 mt-2">{t('verificationPage_welcomeUser', { name: verificationData.user.firstName })}</p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">{t('progress')}</span>
              <span className="text-sm text-gray-500">{t('verificationPage_stepsProgress', { current: currentStep })}</span>
            </div>
            <Progress value={getStepProgress()} className="mb-4" />
                          <div className="flex justify-between text-xs text-gray-500">
                <span>{t('verificationPage_stepLabelUploadId')}</span>
                <span>{t('verificationPage_stepLabelSignContract')}</span>
                <span>{t('verificationPage_stepLabelReview')}</span>
                <span>{t('verificationPage_stepLabelComplete')}</span>
              </div>
          </CardContent>
        </Card>

        {/* Step 1: Document Upload */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>{t('verificationPage_step1Title')}</span>
              </CardTitle>
              <CardDescription>
                {t('verificationPage_step1Desc')}
              </CardDescription>
              
              {/* Resubmission Notice */}
              {verificationData?.user.verificationStatus === 'resubmission_required' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-orange-800">{t('verificationPage_resubmissionTitle')}</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        {t('verificationPage_resubmissionMessage1')}
                        <strong> {t('verificationPage_resubmissionMessageStrong')}</strong>
                      </p>
                      {verificationData.user.passportDocument?.rejectionReason && (
                        <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-800">
                          <strong>{t('verificationPage_reasonLabel')}</strong> {verificationData.user.passportDocument.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <Label htmlFor="document" className="cursor-pointer">
                    <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
                      {t('verificationPage_chooseFile')}
                    </span>
                    <Input
                      id="document"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-sm text-gray-500">
                    {t('verificationPage_supportedFormats')}
                  </p>
                </div>
              </div>

              {selectedFile && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileCheck className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={uploadDocument}
                disabled={!selectedFile || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? t('verificationPage_uploading') : t('verificationPage_uploadDocument')}
              </Button>

              {/* Document Preview after upload */}
              {uploadedDocument && (
                <div className="mt-6">
                  <DocumentPreview
                    filename={uploadedDocument.filename}
                    url={uploadedDocument.url}
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Contract Signing */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>{t('verificationPage_step2Title')}</span>
              </CardTitle>
              <CardDescription>
                {t('verificationPage_step2Desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg max-h-64 overflow-y-auto">
                <h3 className="font-bold mb-4">{t('verificationPage_agreementHeader')}</h3>
                <div className="space-y-4 text-sm">
                  <p>
                    <strong>{t('verificationPage_agreement_1_title')}</strong> {t('verificationPage_agreement_1_body')}
                  </p>
                  <p>
                    <strong>{t('verificationPage_agreement_2_title')}</strong> {t('verificationPage_agreement_2_body')}
                  </p>
                  <p>
                    <strong>{t('verificationPage_agreement_3_title')}</strong> {t('verificationPage_agreement_3_body')}
                  </p>
                  <p>
                    <strong>{t('verificationPage_agreement_4_title')}</strong> {t('verificationPage_agreement_4_body')}
                  </p>
                  <p>
                    <strong>{t('verificationPage_agreement_5_title')}</strong> {t('verificationPage_agreement_5_body')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm">
                  {t('verificationPage_termsAgreeLabel')}
                </Label>
              </div>

              {/* Signature method selection removed: defaulting to digital signature (canvas) */}

              {/* Digital Signature Component */}
              {showDigitalSignature && signatureMethod === 'digital_signature' && !signatureData && (
                <DigitalSignature
                  onSignatureCapture={handleSignatureCapture}
                  isSubmitting={isSubmitting}
                  className="w-full"
                />
              )}

              {/* Show captured signature */}
              {signatureData && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('verificationPage_yourDigitalSignature')}</Label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                                          <img
                        src={signatureData}
                        alt={t('verificationPage_yourSignatureAlt')}
                        className="max-w-full h-auto max-h-24 object-contain"
                      />
                  </div>
                                      <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSignatureData(null)
                        setShowDigitalSignature(true)
                      }}
                    >
                      {t('verificationPage_changeSignature')}
                    </Button>
                </div>
              )}

              <Button
                onClick={signContract}
                disabled={!agreedToTerms || !signatureData || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? t('verificationPage_signing') : t('verificationPage_signAgreementButton')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Under Review */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>{t('verificationPage_step3Title')}</span>
              </CardTitle>
              <CardDescription>
                {t('verificationPage_step3Desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="py-8">
                <Clock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('verificationPage_reviewInProgress')}</h3>
                <p className="text-gray-600">
                  {t('verificationPage_reviewInProgressDesc')}
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{t('verificationPage_whatsNext')}</strong> {t('verificationPage_whatsNextDesc')}
                </p>
              </div>

              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full"
              >
                {t('verificationPage_goToLogin')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Completed */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>{t('verificationPage_step4Title')}</span>
              </CardTitle>
              <CardDescription>
                {t('verificationPage_step4Desc1')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('verificationPage_welcomeHeadline')}</h3>
                <p className="text-gray-600">
                  {t('verificationPage_step4Desc2')}
                </p>
              </div>

              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                {t('verificationPage_accessYourDashboard')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}