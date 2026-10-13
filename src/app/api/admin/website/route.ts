import { NextResponse } from 'next/server'
import { z } from 'zod'
import { assertWebsiteEditorRequest } from '@/lib/website-auth'
import { websitePages, websitePageSchema } from '@/lib/website-content'
import {
  getLandingState,
  LandingConflictError,
  saveLandingContent,
} from '@/lib/landing-store'

export const dynamic = 'force-dynamic'
const inputSchema = z
  .object({
    page: websitePageSchema.default('home'),
    action: z.enum(['save', 'publish']),
    revision: z.string().max(80).nullable(),
    content: z.unknown(),
  })
  .strict()

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message === 'Unauthorized' || message === 'Forbidden')
    return NextResponse.json(
      { error: 'Bitte melden Sie sich mit Website-Zugriff an.' },
      { status: message === 'Unauthorized' ? 401 : 403 }
    )
  if (error instanceof LandingConflictError)
    return NextResponse.json(
      {
        error:
          'Die Seite wurde inzwischen geändert. Laden Sie den aktuellen Stand, bevor Sie erneut speichern.',
      },
      { status: 409 }
    )
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return NextResponse.json(
      {
        error:
          'Bitte prüfen Sie die Inhalte. Alle Felder müssen ausgefüllt sein und die Zeichenbegrenzung einhalten.',
      },
      { status: 400 }
    )
  console.error('Website editor request failed:', error)
  return NextResponse.json(
    {
      error:
        'Die Inhalte konnten nicht gespeichert oder geladen werden. Bitte versuchen Sie es erneut.',
    },
    { status: 500 }
  )
}

export async function GET(request: Request) {
  try {
    await assertWebsiteEditorRequest()
    const page = websitePageSchema.parse(
      new URL(request.url).searchParams.get('page') ?? 'home'
    )
    return NextResponse.json(await getLandingState(page), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return failure(error)
  }
}

export async function PUT(request: Request) {
  try {
    const { email } = await assertWebsiteEditorRequest()
    // Cookie-based writes may only originate from this website.
    if (request.headers.get('origin') !== new URL(request.url).origin)
      return NextResponse.json(
        { error: 'Ungültiger Ursprung.' },
        { status: 403 }
      )
    const raw = await request.text()
    if (raw.length > 100_000)
      return NextResponse.json(
        { error: 'Die Inhalte sind zu groß.' },
        { status: 413 }
      )
    const input = inputSchema.parse(JSON.parse(raw))
    return NextResponse.json(
      await saveLandingContent({
        ...input,
        content: websitePages[input.page].schema.parse(input.content),
        email,
      }),
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    return failure(error)
  }
}
