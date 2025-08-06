'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Phone, Clock, CheckCircle } from 'lucide-react'
import QuizStep from '@/components/enrollment/QuizStep'
import ContactForm from '@/components/enrollment/ContactForm'

interface QuizData {
  timeframe: string
  reason: string
  jobLoss: boolean
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
  const [currentStep, setCurrentStep] = useState(0)
  const [quizData, setQuizData] = useState<QuizData>({
    timeframe: '',
    reason: '',
    jobLoss: false,
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

  const quizSteps = [
    {
      question: "In welcher Zeit wollen Sie Ihre positive MPU abgeschlossen haben?",
      type: "single",
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
      type: "single",
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
      type: "boolean",
      field: "jobLoss",
      options: ["Ja", "Nein"]
    },
    {
      question: "Warum glauben Sie, bestehen 70% nicht die MPU?",
      subtitle: "(Mehrfachauswahl möglich)",
      type: "multiple",
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
      type: "multiple",
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
      type: "multiple",
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
      return value !== '' && value !== false && value !== undefined
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              Vielen Dank!
            </CardTitle>
            <CardDescription className="text-base">
              Ihre Anfrage wurde erfolgreich übermittelt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-blue-700 mb-2">
                <Phone className="w-5 h-5" />
                <span className="font-semibold">Wir rufen Sie an!</span>
              </div>
              <p className="text-sm text-blue-600">
                Einer unserer Experten wird Sie innerhalb von 24 Stunden kontaktieren.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Zur Startseite
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Kostenloses Beratungsgespräch
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Beantworten Sie ein paar kurze Fragen und lassen Sie sich von unseren Experten beraten.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Schritt {currentStep + 1} von {totalSteps}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(((currentStep + 1) / totalSteps) * 100)}% abgeschlossen
            </span>
          </div>
          <Progress value={((currentStep + 1) / totalSteps) * 100} className="h-2" />
        </div>

        {/* Quiz Steps */}
        {currentStep < quizSteps.length ? (
          <QuizStep
            step={quizSteps[currentStep]}
            value={quizData[quizSteps[currentStep].field as keyof QuizData]}
            onChange={handleQuizAnswer}
          />
        ) : (
          /* Contact Form */
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                Damit einer unserer Experten Sie anrufen kann...
              </CardTitle>
              <CardDescription>
                müssen wir wissen, wie wir Sie am besten erreichen können.
              </CardDescription>
              <div className="flex items-center justify-center space-x-2 text-blue-600 mt-4">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Wir rufen Sie innerhalb 24 Stunden an!</span>
              </div>
            </CardHeader>
            <CardContent>
              <ContactForm
                data={contactData}
                onChange={handleContactChange}
              />
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Zurück</span>
          </Button>

          {currentStep < totalSteps - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex items-center space-x-2"
            >
              <span>Weiter</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid() || isSubmitting}
              className="flex items-center space-x-2"
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
      </div>
    </div>
  )
}