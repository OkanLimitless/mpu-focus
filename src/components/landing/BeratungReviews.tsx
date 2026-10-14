import { Star } from 'lucide-react'
import { getBeratungReviews, type BeratungContent } from '@/lib/beratung-content'

export default function BeratungReviews({ content, preview }: { content: BeratungContent; preview: boolean }) {
  const reviews = getBeratungReviews(content)
  if (!reviews.length && !preview) return null
  const placeholders = reviews.length === 0
  const cards = placeholders ? [1, 2, 3].map(number => ({
    quote: 'Hier erscheint eine echte, freigegebene Kundenstimme mit einem Link zur Originalbewertung.',
    author: `Kundenname · Vorschau ${number}`,
    source: '', rating: '',
  })) : reviews
  return (
    <section id="reviews" className="mx-auto mt-8 max-w-xl lg:max-w-none">
      <h2 className="text-lg font-bold">{content.reviewsTitle}</h2>
      {placeholders && <p className="mt-2 text-xs text-slate-500">Layout-Vorschau · keine echten Bewertungen. Auf der öffentlichen Seite ausgeblendet, bis eigene Kundenstimmen hinterlegt sind.</p>}
      <div className={`mt-4 grid gap-4 ${cards.length > 1 ? 'lg:grid-cols-3' : ''}`}>
        {cards.map((review, index) => (
          <figure key={index} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{placeholders ? '–' : review.author.slice(0, 1)}</span>
              <figcaption className="text-sm font-semibold">{review.author}</figcaption>
            </div>
            {(review.rating || placeholders) && <div className="mb-3 flex gap-1" role="img" aria-label={placeholders ? 'Sterne-Platzhalter, keine Bewertung' : `${review.rating} von 5 Sternen`}>
              {[1, 2, 3, 4, 5].map(star => <span key={star} className={`rounded p-1 ${star <= Number(review.rating) ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-300'}`}><Star aria-hidden="true" className="h-3 w-3" fill={star <= Number(review.rating) ? 'currentColor' : 'none'} /></span>)}
            </div>}
            <blockquote className="flex-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{placeholders ? review.quote : `„${review.quote}“`}</blockquote>
            {review.source && <a href={review.source} target="_blank" rel="noopener noreferrer" onClick={event => { if (preview) event.preventDefault() }} className="mt-4 inline-flex min-h-[44px] items-center border-t border-slate-100 pt-3 text-xs text-blue-700 underline">Originalbewertung lesen</a>}
            {placeholders && <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">Quellenlink folgt mit der Originalbewertung</p>}
          </figure>
        ))}
      </div>
    </section>
  )
}
