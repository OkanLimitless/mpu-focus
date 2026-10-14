'use client'

import { useEffect, useState } from 'react'
import LandingPage from './LandingPage'
import BeratungPage from './BeratungPage'
import type { LandingContent } from '@/lib/landing-content'
import type { BeratungContent } from '@/lib/beratung-content'
import { websitePages, type WebsitePageId } from '@/lib/website-content'

export default function LandingPreview({
  page = 'home',
}: {
  page?: WebsitePageId
}) {
  const definition = websitePages[page]
  const [content, setContent] = useState(definition.defaults)
  const [section, setSection] = useState(definition.sections[0].id)
  const [previewStep, setPreviewStep] = useState(0)

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.page !== page
      )
        return
      if (event.data.type === 'landing-content') {
        const parsed = definition.schema.safeParse(event.data.content)
        if (parsed.success) setContent(parsed.data)
      }
      if (
        event.data.type === 'landing-section' &&
        definition.sections.some((item) => item.id === event.data.section)
      ) {
        const nextSection = event.data.section as string
        setSection(nextSection)
        if (page === 'beratung') {
          setPreviewStep(
            nextSection === 'question1'
              ? 1
              : nextSection === 'contact'
                ? 2
                : nextSection === 'success'
                  ? 3
                  : 0
          )
        }
      }
    }
    function click(event: MouseEvent) {
      const link = (event.target as HTMLElement).closest('a')
      if (!link) return
      event.preventDefault()
      const href = link.getAttribute('href')
      if (href?.startsWith('#')) {
        const target = document.getElementById(href.slice(1))
        if (target)
          window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' })
      }
    }
    window.addEventListener('message', receive)
    document.addEventListener('click', click, true)
    window.parent.postMessage(
      { type: 'landing-ready', page },
      window.location.origin
    )
    return () => {
      window.removeEventListener('message', receive)
      document.removeEventListener('click', click, true)
    }
  }, [page, definition])

  useEffect(() => {
    // Wait for the funnel to render the requested question/contact/success screen.
    const timeout = window.setTimeout(() => {
      const id =
        page === 'beratung' && section.startsWith('question')
          ? 'question'
          : section
      const target = document.getElementById(id)
      window.scrollTo({
        top: target ? target.offsetTop - (page === 'home' ? 80 : 16) : 0,
        behavior: 'smooth',
      })
    }, 50)
    return () => window.clearTimeout(timeout)
  }, [section, previewStep, page])

  return page === 'beratung' ? (
    <BeratungPage
      key={section}
      content={content as BeratungContent}
      preview
      previewStep={previewStep}
    />
  ) : (
    <LandingPage content={content as LandingContent} preview />
  )
}
