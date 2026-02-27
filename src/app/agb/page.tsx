import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
    title: 'AGB | MPU Focus',
    description: 'Allgemeine Geschäftsbedingungen der MPU Focus',
}

export default function AGBPage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Zurück zur Startseite
                </Link>

                <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200">
                    <h1 className="text-3xl font-bold tracking-tight mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>

                    <div className="space-y-8 text-slate-600 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">§ 1 Geltungsbereich</h2>
                            <p>
                                Für die Geschäftsbeziehung zwischen MPU Focus (nachfolgend „Dienstleister“) und dem Kunden gelten ausschließlich die nachfolgenden Allgemeinen Geschäftsbedingungen in ihrer zum Zeitpunkt der Bestellung gültigen Fassung.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">§ 2 Leistungsgegenstand</h2>
                            <p>
                                MPU Focus bietet Beratungs- und Vorbereitungsdienstleistungen zur Medizinisch-Psychologischen Untersuchung (MPU) an. Die genaue Art der Leistung ergibt sich aus der jeweiligen Leistungsbeschreibung.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">§ 3 Vertragsschluss</h2>
                            <p>
                                Ein Vertrag kommt durch die schriftliche oder mündliche Zusage beider Parteien oder durch die Unterzeichnung eines Beratungsvertrages zustande.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">§ 4 Vergütung und Zahlungsbedingungen</h2>
                            <p>
                                Die Vergütung richtet sich nach den bei Vertragsschluss vereinbarten Preisen. Zahlungen sind ohne Abzug nach Rechnungsstellung fällig.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">§ 5 Haftung</h2>
                            <p>
                                Der Dienstleister haftet für Vorsatz und grobe Fahrlässigkeit. Eine Gewähr für das Bestehen der MPU kann nicht übernommen werden, da dies von der persönlichen Eignung und Entscheidung der Begutachtungsstelle abhängt.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    )
}
