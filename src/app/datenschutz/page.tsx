import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
    title: 'Datenschutzerklärung | MPU Focus',
    description: 'Datenschutzerklärung der MPU Focus',
}

export default function DatenschutzPage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Zurück zur Startseite
                </Link>

                <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200">
                    <h1 className="text-3xl font-bold tracking-tight mb-8">Datenschutzerklärung</h1>

                    <div className="space-y-8 text-slate-600 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Verantwortliche Stelle</h2>
                            <p>
                                Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br />
                                <br />
                                MPU Focus<br />
                                Musterstraße 1<br />
                                12345 Musterstadt<br />
                                Telefon: +49 (0) 123 456789<br />
                                E-Mail: info@mpu-focus.de
                            </p>
                            <p className="mt-4">
                                Diese Angaben sind aktuell als Musterdaten hinterlegt und muessen vor Live-Betrieb durch die tatsaechlichen Unternehmensdaten ersetzt werden.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Zwecke und Rechtsgrundlagen der Verarbeitung</h2>
                            <p>
                                Wir verarbeiten personenbezogene Daten, um Anfragen zu beantworten, Beratungen anzubahnen, den Website-Betrieb sicherzustellen und unsere Leistungen organisatorisch umzusetzen.
                            </p>
                            <p className="mt-3">
                                Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Kommunikation), Art. 6 Abs. 1 lit. c DSGVO (rechtliche Pflichten), Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb) sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung, z. B. bei Kontaktformularen).
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Erhobene Datenkategorien</h2>
                            <p>
                                Bei Kontaktanfragen verarbeiten wir insbesondere: Vorname, Nachname, E-Mail-Adresse, Telefonnummer, freiwillige Fallbeschreibung sowie Formulardaten (z. B. Auswahlangaben aus Beratungsfragen).
                            </p>
                            <p className="mt-3">
                                Zusaetzlich werden technische Zugriffsdaten verarbeitet (z. B. IP-Adresse, Datum/Uhrzeit, Browserinformationen), soweit dies fuer den sicheren Betrieb erforderlich ist.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Kontaktformular und Lead-Management</h2>
                            <p>
                                Wenn Sie uns ueber ein Formular kontaktieren, verwenden wir Ihre Angaben ausschliesslich zur Bearbeitung Ihrer Anfrage und zur Kontaktaufnahme. Die Einwilligung wird beim Absenden aktiv abgefragt.
                            </p>
                            <p className="mt-3">
                                Die Daten werden intern nur durch berechtigte Personen verarbeitet. Eine automatisierte Entscheidungsfindung findet nicht statt.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Empfaenger und Auftragsverarbeiter</h2>
                            <p>
                                Zur technischen Bereitstellung der Website und Verarbeitung von Formularanfragen nutzen wir externe Dienstleister (z. B. Hosting-, Datenbank- und E-Mail-Dienste). Mit diesen werden, soweit erforderlich, Auftragsverarbeitungsvertraege gemaess Art. 28 DSGVO abgeschlossen.
                            </p>
                            <p className="mt-3">
                                Eine Datenuebermittlung in Drittstaaten erfolgt nur, wenn die gesetzlichen Voraussetzungen der Art. 44 ff. DSGVO erfuellt sind.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Speicherdauer</h2>
                            <p>
                                Wir speichern personenbezogene Daten nur so lange, wie es fuer die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
                            </p>
                            <p className="mt-3">
                                Kontakt- und Beratungsdaten werden nach Wegfall des Zwecks regelmaessig geprueft und geloescht, sofern keine gesetzlichen Pflichten oder berechtigten Interessen entgegenstehen.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Cookies und Einwilligungsmanagement</h2>
                            <p>
                                Diese Website nutzt Cookies. Erforderliche Cookies dienen dem technischen Betrieb. Weitere Cookies werden nur auf Grundlage Ihrer Auswahl im Cookie-Banner gesetzt.
                            </p>
                            <p className="mt-3">
                                Sie koennen Ihre Cookie-Einstellungen jederzeit fuer die Zukunft aendern.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Ihre Rechte</h2>
                            <p>
                                Sie haben das Recht auf Auskunft, Berichtigung, Loeschung, Einschraenkung der Verarbeitung, Datenuertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO). Erteilte Einwilligungen koennen Sie jederzeit mit Wirkung fuer die Zukunft widerrufen.
                            </p>
                            <p className="mt-3">
                                Zudem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehoerde zu beschweren.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Datensicherheit</h2>
                            <p>
                                Wir setzen technische und organisatorische Massnahmen ein, um Ihre Daten gegen Verlust, Missbrauch und unbefugten Zugriff zu schuetzen.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Aktualitaet dieser Datenschutzerklaerung</h2>
                            <p>
                                Stand: 02.03.2026. Wir passen diese Datenschutzerklaerung an, sobald sich Verarbeitungen oder rechtliche Anforderungen aendern.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    )
}
