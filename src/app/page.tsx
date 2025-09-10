'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Phone, Clock, Users, Award, TrendingUp, Star, ArrowRight, Shield, Target } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const { t } = useI18n()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (session) {
      // User is authenticated, redirect to primary learning environment
      if (session.user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/learn')
      }
    } else {
      // User is not authenticated, show landing page
      setIsLoading(false)
    }
  }, [session, status, router])

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  // Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "MPU Focus",
    "description": "Professionelle MPU-Beratung und Vorbereitung mit über 90% Erfolgsquote",
    "url": "https://mpu-focus.de",
    "telephone": "+49-XXX-XXXXXXX",
    "priceRange": "€€",
    "serviceArea": {
      "@type": "Country",
      "name": "Deutschland"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "MPU Beratungsservices",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "MPU Beratung",
            "description": "Individuelle MPU-Vorbereitung für Alkohol-, Drogen- und Punkte-MPU"
          }
        }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "500"
    }
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-white">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 sm:py-16 lg:py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-4 sm:mb-6">
            <span className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Über 90% Erfolgsquote bei der MPU
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight px-2">
            Bestehen Sie Ihre <span className="text-blue-600">MPU</span><br className="hidden sm:block" />
            <span className="sm:hidden"> </span>mit professioneller Beratung
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-2">
            Individuelle MPU-Vorbereitung von Experten. Strukturiert, verständlich und erfolgreich. 
            Holen Sie sich Ihren Führerschein zurück.
          </p>
          
          <div className="flex flex-col gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold shadow-lg min-h-[48px]"
              onClick={() => router.push('/beratung')}
            >
              <span className="mr-2">{t('bookFreeConsultation')}</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            </Button>
            
            <div className="flex items-center text-gray-600 text-sm sm:text-base">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
              <span>Rückruf innerhalb 24 Stunden</span>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-full">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">500+</div>
                <div className="text-sm sm:text-base text-gray-600">Erfolgreiche Kunden</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="bg-green-100 p-2 sm:p-3 rounded-full">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">92%</div>
                <div className="text-sm sm:text-base text-gray-600">Erfolgsquote</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="bg-yellow-100 p-2 sm:p-3 rounded-full">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">10+</div>
                <div className="text-sm sm:text-base text-gray-600">Jahre Erfahrung</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
              Warum scheitern 70% an der MPU?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-2">
              Die MPU ist mehr als nur ein Test - sie ist eine psychologische Herausforderung, 
              die richtige Vorbereitung und Expertenwissen erfordert.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-red-100 p-2 rounded-full mt-1 flex-shrink-0">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Mangelnde Vorbereitung</h3>
                    <p className="text-sm sm:text-base text-gray-600">Viele unterschätzen die Komplexität der MPU und bereiten sich nicht strukturiert vor.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-red-100 p-2 rounded-full mt-1 flex-shrink-0">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Unzureichende Beratung</h3>
                    <p className="text-sm sm:text-base text-gray-600">Falsche oder oberflächliche Beratung führt zu unrealistischen Erwartungen.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-red-100 p-2 rounded-full mt-1 flex-shrink-0">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Stress und Nervosität</h3>
                    <p className="text-sm sm:text-base text-gray-600">Ohne professionelle Begleitung werden Betroffene von Angst überwältigt.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 text-white p-6 sm:p-8 rounded-lg mt-6 lg:mt-0">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Unsere Lösung:</h3>
              <ul className="space-y-2 sm:space-y-3">
                <li className="flex items-start space-x-2 sm:space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">Strukturierte, individuelle Vorbereitung</span>
                </li>
                <li className="flex items-start space-x-2 sm:space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">Erfahrene Psychologen und Berater</span>
                </li>
                <li className="flex items-start space-x-2 sm:space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">Praxisnahe Gesprächssimulationen</span>
                </li>
                <li className="flex items-start space-x-2 sm:space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">Kontinuierliche Betreuung bis zum Erfolg</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
              Ihre Vorteile mit MPU Focus
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-2">
              Professionelle MPU-Beratung mit bewährten Methoden und individueller Betreuung
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-3 sm:pb-4">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Individuelle Analyse</CardTitle>
              </CardHeader>
              <CardContent className="text-center px-4 sm:px-6">
                <p className="text-sm sm:text-base text-gray-600">
                  Detaillierte Bewertung Ihres Falls und maßgeschneiderte Vorbereitungsstrategie
                  für optimale Erfolgsaussichten.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-3 sm:pb-4">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Expertenbetreuung</CardTitle>
              </CardHeader>
              <CardContent className="text-center px-4 sm:px-6">
                <p className="text-sm sm:text-base text-gray-600">
                  Qualifizierte Psychologen und MPU-Berater mit jahrelanger Erfahrung 
                  begleiten Sie durch den gesamten Prozess.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow sm:col-span-2 lg:col-span-1">
              <CardHeader className="text-center pb-3 sm:pb-4">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Erfolgsgarantie</CardTitle>
              </CardHeader>
              <CardContent className="text-center px-4 sm:px-6">
                <p className="text-sm sm:text-base text-gray-600">
                  Über 90% unserer Kunden bestehen die MPU im ersten Anlauf - 
                  dank strukturierter Vorbereitung und bewährter Methoden.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
              Das sagen unsere Kunden
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 px-2">
              Erfolgsgeschichten von Menschen, die ihre MPU erfolgreich bestanden haben
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  "Dank der professionellen Beratung habe ich meine MPU im ersten Anlauf bestanden. 
                  Die Vorbereitung war strukturiert und hat mir die Angst genommen."
                </p>
                <div className="text-sm sm:text-base font-semibold text-gray-900">- Michael K.</div>
                <div className="text-xs sm:text-sm text-gray-500">Alkohol-MPU</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  "Ich war sehr skeptisch, aber das Team hat mich optimal vorbereitet. 
                  Nach 8 Monaten habe ich endlich meinen Führerschein zurück!"
                </p>
                <div className="text-sm sm:text-base font-semibold text-gray-900">- Sandra M.</div>
                <div className="text-xs sm:text-sm text-gray-500">Drogen-MPU</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  "Kompetente Beratung und realistische Einschätzung meiner Situation. 
                  Ohne diese Hilfe hätte ich die MPU nicht geschafft."
                </p>
                <div className="text-sm sm:text-base font-semibold text-gray-900">- Thomas R.</div>
                <div className="text-xs sm:text-sm text-gray-500">Punkte-MPU</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6 px-2">
            Starten Sie jetzt Ihre erfolgreiche MPU-Vorbereitung
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Vereinbaren Sie noch heute Ihr kostenloses Beratungsgespräch und machen Sie den ersten Schritt 
            zu Ihrem Führerschein.
          </p>
          
          <div className="flex flex-col gap-3 sm:gap-4 justify-center items-center px-4">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold shadow-lg min-h-[48px]"
              onClick={() => router.push('/beratung')}
            >
              <span className="mr-2">Jetzt kostenlose Beratung sichern</span>
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            </Button>
            
            <div className="flex items-center text-blue-100 text-sm sm:text-base">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
              <span>100% kostenlos & unverbindlich</span>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-blue-100 px-4">
            <p className="text-xs sm:text-sm text-center">
              ✓ Sofortige Terminvereinbarung ✓ Individuelle Beratung ✓ Keine versteckten Kosten
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">MPU Focus</h3>
          <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6 px-2">
            Ihr vertrauensvoller Partner für eine erfolgreiche MPU-Vorbereitung
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-8 text-xs sm:text-sm text-gray-400">
            <span>© 2024 MPU Focus</span>
            <span className="hidden sm:inline">•</span>
            <span>Datenschutz</span>
            <span className="hidden sm:inline">•</span>
            <span>Impressum</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
