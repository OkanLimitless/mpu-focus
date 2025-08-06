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
import { 
  Upload, 
  FileCheck, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  FileText,
  Shield,
  Clock
} from 'lucide-react'

interface VerificationData {
  user: {
    firstName: string
    lastName: string
    email: string
    verificationStatus: string
  }
  valid: boolean
}

export default function VerificationPage() {
  const { token } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [contractSigned, setContractSigned] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

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
          case 'verified':
            setCurrentStep(4)
            break
          default:
            setCurrentStep(1)
        }
      } else {
        toast({
          title: "Error",
          description: "Invalid or expired verification link",
          variant: "destructive",
        })
        router.push('/login')
      }
    } catch (error) {
      console.error('Error verifying token:', error)
      toast({
        title: "Error",
        description: "Failed to verify token",
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
          title: "Error",
          description: "Please upload a JPEG, PNG, or PDF file",
          variant: "destructive",
        })
        return
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error", 
          description: "File size must be less than 10MB",
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
        setCurrentStep(2)
        setUploadProgress(100)
        toast({
          title: "Success",
          description: "Document uploaded successfully",
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
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const signContract = async () => {
    if (!agreedToTerms) {
      toast({
        title: "Error",
        description: "Please read and agree to the terms",
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
          agreed: true
        }),
      })

      if (response.ok) {
        setContractSigned(true)
        setCurrentStep(3)
        toast({
          title: "Success",
          description: "Contract signed successfully. Your account is now under review.",
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
        title: "Error",
        description: error.message || "Failed to sign contract",
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your link...</p>
        </div>
      </div>
    )
  }

  if (!verificationData?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This verification link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Account Verification
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome {verificationData.user.firstName}! Complete these steps to access your account.
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-500">{currentStep}/4 steps</span>
            </div>
            <Progress value={getStepProgress()} className="mb-4" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Upload ID</span>
              <span>Sign Contract</span>
              <span>Review</span>
              <span>Complete</span>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Document Upload */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Step 1: Upload Identity Document</span>
              </CardTitle>
              <CardDescription>
                Please upload a clear photo of your passport or national ID card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <Label htmlFor="document" className="cursor-pointer">
                    <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
                      Choose file to upload
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
                    Supported formats: JPEG, PNG, PDF (max 10MB)
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
                {isSubmitting ? 'Uploading...' : 'Upload Document'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Contract Signing */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Step 2: Sign Service Agreement</span>
              </CardTitle>
              <CardDescription>
                Please review and sign our service agreement to proceed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg max-h-64 overflow-y-auto">
                <h3 className="font-bold mb-4">MPU-Focus Service Agreement</h3>
                <div className="space-y-4 text-sm">
                  <p>
                    <strong>1. Service Description:</strong> MPU-Focus provides comprehensive preparation courses and materials for the Medical-Psychological Assessment (MPU).
                  </p>
                  <p>
                    <strong>2. User Obligations:</strong> You agree to use the platform responsibly and provide accurate information during the course.
                  </p>
                  <p>
                    <strong>3. Privacy & Data Protection:</strong> We handle your personal data in accordance with GDPR and our Privacy Policy.
                  </p>
                  <p>
                    <strong>4. Course Access:</strong> Upon verification, you will receive full access to all course materials and support services.
                  </p>
                  <p>
                    <strong>5. Cancellation:</strong> You may cancel your subscription according to the terms outlined in your payment agreement.
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
                  I have read and agree to the service agreement and privacy policy
                </Label>
              </div>

              <Button
                onClick={signContract}
                disabled={!agreedToTerms || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Signing...' : 'Sign Agreement'}
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
                <span>Step 3: Under Review</span>
              </CardTitle>
              <CardDescription>
                Your documents are being reviewed by our team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="py-8">
                <Clock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Review in Progress</h3>
                <p className="text-gray-600">
                  Our team is reviewing your uploaded documents and signed agreement. 
                  This typically takes 1-2 business days.
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>What's next?</strong> You'll receive an email notification once your verification is complete. 
                  You can then access your full account and begin your MPU preparation.
                </p>
              </div>

              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full"
              >
                Go to Login
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
                <span>Verification Complete!</span>
              </CardTitle>
              <CardDescription>
                Your account has been verified and activated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Welcome to MPU-Focus!</h3>
                <p className="text-gray-600">
                  Your account has been successfully verified. You now have full access to all course materials and features.
                </p>
              </div>

              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Access Your Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}