'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Phone, Clock, CheckCircle, Star, Shield, Users, Award, Timer, ArrowLeft } from 'lucide-react'
import QuizStep from '@/components/enrollment/QuizStep'
import ContactForm from '@/components/enrollment/ContactForm'
import { useRouter } from 'next/navigation'

interface QuizData {
  timeframe: string
  reason: string
  jobLoss: boolean | undefined
  mpuChallenges: string[]
  concerns: string[]
  availability: string[]
}

interface ContactData {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export default function BeratungPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [quizData, setQuizData] = useState<QuizData>({
    timeframe: '',
    reason: '',
    jobLoss: undefined,
    mpuChallenges: [],
    concerns: [],
    availability: []
  })
  const [contactData, setContactData] = useState<ContactData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const totalSteps = 7 // 6 quiz steps + 1 contact form

  const quizSteps: Array<{
    question: string
    subtitle?: string
    type: 'single' | 'multiple' | 'boolean'
    field: string
    options: string[]
  }> = [
    {
      question: "In welcher Zeit wollen Sie Ihre positive MPU abgeschlossen haben?",
      type: "single" as const,
      field: "timeframe",
      options: [
        "Innerhalb von 3 Monaten",
        "3-6 Monate", 
        "6-12 Monate",
        "Über 1 Jahr"
      ]
    },
    {
      question: "Warum wurde Ihnen der Führerschein entzogen?",
      type: "single" as const,
      field: "reason",
      options: [
        "Alkohol",
        "Drogen",
        "Punkte",
        "Straftat",
        "Andere"
      ]
    },
    {
      question: "Haben Sie durch den Führerscheinentzug Ihren Job verloren?",
      type: "boolean" as const,
      field: "jobLoss",
      options: ["Ja", "Nein"]
    },
    {
      question: "Warum glauben Sie, bestehen 70% nicht die MPU?",
      subtitle: "(Mehrfachauswahl möglich)",
      type: "multiple" as const,
      field: "mpuChallenges",
      options: [
        "Mangelnde Vorbereitung",
        "Unzureichende Beratung",
        "Stress und Nervosität",
        "Fehlende Struktur",
        "Unrealistische Erwartungen",
        "Andere"
      ]
    },
    {
      question: "Welches sind Ihre größten Hürden und Ängste die Sie gerade beschäftigen?",
      subtitle: "(Mehrfachauswahl möglich)",
      type: "multiple" as const,
      field: "concerns",
      options: [
        "Angst vor dem Gespräch",
        "Unsicherheit bei der Vorbereitung",
        "Zeitliche Belastung",
        "Finanzielle Sorgen",
        "Unklarheit über den Ablauf",
        "Andere"
      ]
    },
    {
      question: "Zu welcher Tageszeit sind Sie am besten erreichbar?",
      subtitle: "(Mehrfachauswahl möglich)",
      type: "multiple" as const,
      field: "availability",
      options: [
        "Vormittag (8-12 Uhr)",
        "Mittag (12-16 Uhr)",
        "Nachmittag (16-20 Uhr)",
        "Abend (nach 20 Uhr)"
      ]
    }
  ]

  const handleQuizAnswer = (field: string, value: any) => {
    setQuizData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleContactChange = (field: string, value: string) => {
    setContactData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepValid = () => {
    if (currentStep < quizSteps.length) {
      const step = quizSteps[currentStep]
      const value = quizData[step.field as keyof QuizData]
      
      if (step.type === 'multiple') {
        return Array.isArray(value) && value.length > 0
      }
      if (step.type === 'boolean') {
        return value !== undefined && value !== null
      }
      return value !== '' && value !== undefined
    } else {
      // Contact form validation
      return contactData.firstName && contactData.lastName && 
             contactData.email && contactData.phone
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...contactData,
          ...quizData
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
      } else {
        alert('Es gab einen Fehler beim Senden Ihrer Anfrage. Bitte versuchen Sie es erneut.')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Es gab einen Fehler beim Senden Ihrer Anfrage. Bitte versuchen Sie es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl text-center shadow-2xl border-0">
          <CardHeader className="space-y-6 pb-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-3xl sm:text-4xl font-bold text-green-700 mb-2">
                Perfekt! 🎉
              </CardTitle>
              <CardDescription className="text-lg sm:text-xl text-gray-600">
                Ihre Anfrage wurde erfolgreich übermittelt.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="flex items-center justify-center space-x-3 text-blue-700 mb-3">
                <Phone className="w-6 h-6" />
                <span className="text-lg sm:text-xl font-bold">Wir rufen Sie an!</span>
              </div>
              <p className="text-blue-600 font-medium">
                Einer unserer MPU-Experten wird Sie innerhalb von 24 Stunden kontaktieren.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Kostenlose Erstberatung</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Individuelle Strategie</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Keine Verpflichtungen</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Sofortige Hilfe</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => router.push('/')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                Zur Startseite
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50 font-semibold py-3"
              >
                Neue Anfrage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header with Back Button and Trust Signals */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 p-2 -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Zurück zur Startseite</span>
              <span className="sm:hidden">Zurück</span>
            </Button>
            
            <div className="flex items-center space-x-4 sm:space-x-8">
              <div className="flex items-center space-x-1 sm:space-x-2 text-green-600">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-medium">100% sicher</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 text-blue-600">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-medium">500+ Erfolge</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="mb-3 sm:mb-4">
              <span className="inline-flex items-center px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800">
                <Timer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Nur 3 Minuten für Ihre kostenlose Beratung
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
              Kostenloses MPU-Beratungsgespräch
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-2">
              Beantworten Sie ein paar kurze Fragen und lassen Sie sich von unseren Experten beraten.
              <span className="block mt-1 font-medium text-blue-600">Wir rufen Sie innerhalb von 24 Stunden an!</span>
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="mb-6 sm:mb-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Star className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900">92%</div>
                <div className="text-xs sm:text-sm text-gray-600">Erfolgsquote</div>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900">500+</div>
                <div className="text-xs sm:text-sm text-gray-600">Erfolgreiche Kunden</div>
              </div>
              
              <div className="text-center">
                <div className="bg-yellow-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900">10+</div>
                <div className="text-xs sm:text-sm text-gray-600">Jahre Erfahrung</div>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900">24h</div>
                <div className="text-xs sm:text-sm text-gray-600">Rückruf-Zeit</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <span className="text-sm sm:text-base text-gray-600 font-medium">
                Schritt {currentStep + 1} von {totalSteps}
              </span>
              <span className="text-sm sm:text-base text-gray-600 font-medium">
                {Math.round(((currentStep + 1) / totalSteps) * 100)}% abgeschlossen
              </span>
            </div>
            <Progress 
              value={((currentStep + 1) / totalSteps) * 100} 
              className="h-3 sm:h-4 bg-gray-200"
            />
          </div>

          {/* Quiz Steps */}
          {currentStep < quizSteps.length ? (
            <div className="mb-6 sm:mb-8">
              <QuizStep
                step={quizSteps[currentStep]}
                value={quizData[quizSteps[currentStep].field as keyof QuizData]}
                onChange={handleQuizAnswer}
              />
            </div>
          ) : (
            /* Contact Form */
            <Card className="max-w-3xl mx-auto shadow-xl border-0 mb-6 sm:mb-8">
              <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  Damit einer unserer Experten Sie anrufen kann...
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-gray-600 mt-2">
                  müssen wir wissen, wie wir Sie am besten erreichen können.
                </CardDescription>
                <div className="flex items-center justify-center space-x-2 text-blue-600 mt-4 bg-white rounded-lg p-3 mx-4">
                  <Clock className="w-5 h-5" />
                  <span className="font-bold text-sm sm:text-base">Wir rufen Sie innerhalb 24 Stunden an!</span>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                <ContactForm
                  data={contactData}
                  onChange={handleContactChange}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center max-w-3xl mx-auto px-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Zurück</span>
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 py-2 sm:py-3 min-h-[44px] disabled:opacity-50"
              >
                <span>Weiter</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid() || isSubmitting}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 sm:px-6 py-2 sm:py-3 min-h-[44px] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Wird gesendet...</span>
                  </>
                ) : (
                  <>
                    <span>Anfrage senden</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Bottom Trust Signals */}
          <div className="mt-8 sm:mt-12">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-3xl mx-auto">
              <div className="text-center mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Warum MPU Focus wählen?</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Über 90% Erfolgsquote bei der MPU</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Kostenlose und unverbindliche Beratung</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Erfahrene Psychologen und Berater</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Individuelle Vorbereitung auf Ihren Fall</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}