const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

// Execute the real TypeScript modules with an isolated database transport.
function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require: (id) => (id in mocks ? mocks[id] : require(id)),
      console,
      process: {
        env: {
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        },
      },
      fetch,
      Response,
      Request,
      URL,
      ...globals,
    },
    { filename: file }
  )
  return module.exports
}
const content = load('src/lib/landing-content.ts')
const beratung = load('src/lib/beratung-content.ts')
const website = load('src/lib/website-content.ts', {
  './landing-content': content,
  './beratung-content': beratung,
})
const flow = load('src/lib/beratung-flow.ts')
function setup() {
  const rows = new Map()
  let race = false
  const transport = async (url, init) => {
    const parsed = new URL(url)
    assert.equal(parsed.pathname, '/rest/v1/mpu_settings')
    const queryKey = parsed.searchParams.get('key')?.replace(/^eq\./, '')
    let row = rows.get(queryKey) ?? null
    if (init.method === 'GET')
      return new Response(JSON.stringify(row), {
        headers: { 'Content-Type': 'application/json' },
      })
    const value = JSON.parse(init.body)
    if (init.method === 'POST') row = rows.get(value.key) ?? null
    if (init.method === 'POST' && row)
      return new Response(JSON.stringify({ code: '23505' }), { status: 409 })
    if (init.method === 'PATCH') {
      if (
        race ||
        parsed.searchParams.get('updated_at') !== `eq.${row.updated_at}`
      )
        return new Response('null', {
          headers: { 'Content-Type': 'application/json' },
        })
    }
    row = { ...row, ...value }
    rows.set(value.key ?? queryKey, row)
    return new Response(JSON.stringify({ updated_at: row.updated_at }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = load(
    'src/lib/landing-store.ts',
    { 'server-only': {}, './website-content': website },
    { fetch: transport }
  )
  return {
    store,
    race: () => {
      race = true
    },
  }
}

test('all extracted defaults pass validation; unsafe media, missing content and oversized copy fail', () => {
  assert.equal(
    content.landingContentSchema.safeParse(content.defaultLandingContent)
      .success,
    true
  )
  for (const patch of [
    { heroImage: 'javascript:alert(1)' },
    { heroTitle: '' },
    { heroTitle: 'a'.repeat(201) },
    { extra: 'unexpected' },
  ]) {
    assert.equal(
      content.landingContentSchema.safeParse({
        ...content.defaultLandingContent,
        ...patch,
      }).success,
      false
    )
  }
})

test('drafts persist without changing public content; publish preserves a recoverable prior version', async () => {
  const { store } = setup()
  const initial = await store.getLandingState()
  assert.equal(initial.revision, null)
  const draft = {
    ...content.defaultLandingContent,
    heroTitle: 'Unser neuer Titel',
  }
  const saved = await store.saveLandingContent({
    action: 'save',
    content: draft,
    revision: null,
    email: 'editor@example.test',
  })
  assert.equal(
    (await store.getLandingState()).document.draft.heroTitle,
    draft.heroTitle
  )
  assert.equal(
    (await store.getPublishedLandingContent()).heroTitle,
    content.defaultLandingContent.heroTitle
  )
  const published = await store.saveLandingContent({
    action: 'publish',
    content: draft,
    revision: saved.revision,
    email: 'editor@example.test',
  })
  assert.equal(
    (await store.getPublishedLandingContent()).heroTitle,
    draft.heroTitle
  )
  assert.equal(
    published.document.previousPublished.heroTitle,
    content.defaultLandingContent.heroTitle
  )
  await assert.rejects(
    store.saveLandingContent({
      action: 'save',
      content: draft,
      revision: null,
      email: 'editor@example.test',
    }),
    store.LandingConflictError
  )
})

test('a concurrent database write cannot be overwritten after the initial revision check', async () => {
  const { store, race } = setup()
  const saved = await store.saveLandingContent({
    action: 'save',
    content: content.defaultLandingContent,
    revision: null,
    email: 'editor@example.test',
  })
  race()
  await assert.rejects(
    store.saveLandingContent({
      action: 'publish',
      content: content.defaultLandingContent,
      revision: saved.revision,
      email: 'editor@example.test',
    }),
    store.LandingConflictError
  )
})

test('API denies anonymous and unauthorized access; checks origin and validates writes', async () => {
  let authorization = 'Unauthorized'
  let writes = 0
  const route = load(
    'src/app/api/admin/website/route.ts',
    {
      'next/server': {
        NextResponse: {
          json: (body, init) => new Response(JSON.stringify(body), init),
        },
      },
      '@/lib/website-auth': {
        assertWebsiteEditorRequest: async () => {
          if (authorization) throw new Error(authorization)
          return { email: 'editor@example.test' }
        },
      },
      '@/lib/website-content': website,
      '@/lib/landing-store': {
        ...setup().store,
        saveLandingContent: async () => {
          writes++
          return content.initialLandingState
        },
      },
    },
    { Error }
  )
  assert.equal(
    (await route.GET(new Request('http://localhost:3000/api/admin/website')))
      .status,
    401
  )
  assert.equal(
    (
      await route.PUT(
        new Request('http://localhost:3000/api/admin/website', {
          method: 'PUT',
        })
      )
    ).status,
    401
  )
  authorization = 'Forbidden'
  assert.equal(
    (await route.GET(new Request('http://localhost:3000/api/admin/website')))
      .status,
    403
  )
  assert.equal(
    (
      await route.PUT(
        new Request('http://localhost:3000/api/admin/website', {
          method: 'PUT',
        })
      )
    ).status,
    403
  )
  authorization = ''
  const request = (origin, patch = {}) =>
    new Request('http://localhost:3000/api/admin/website', {
      method: 'PUT',
      headers: { Origin: origin },
      body: JSON.stringify({
        action: 'save',
        revision: null,
        content: content.defaultLandingContent,
        ...patch,
      }),
    })
  assert.equal((await route.PUT(request('https://other.example'))).status, 403)
  assert.equal(
    (await route.PUT(request('http://localhost:3000', { content: {} }))).status,
    400
  )
  assert.equal(writes, 0)
  assert.equal((await route.PUT(request('http://localhost:3000'))).status, 200)
  assert.equal(writes, 1)
  assert.equal(
    (
      await route.GET(
        new Request('http://localhost:3000/api/admin/website?page=unknown')
      )
    ).status,
    400
  )
  for (const protectedField of [
    'source',
    'consentVersion',
    'options',
    'field',
    'type',
    'tracking',
    'steps',
  ]) {
    const response = await route.PUT(
      request('http://localhost:3000', {
        page: 'beratung',
        content: {
          ...beratung.defaultBeratungContent,
          [protectedField]: 'tampered',
        },
      })
    )
    assert.equal(response.status, 400, protectedField)
  }
  assert.equal(
    (await route.PUT(request('http://localhost:3000', { page: 'beratung' })))
      .status,
    400
  )
  assert.equal(
    (await route.PUT(request('http://localhost:3000', { page: 'unknown' })))
      .status,
    400
  )
  assert.equal(writes, 1)
  assert.equal(
    (
      await route.PUT(
        request('http://localhost:3000', {
          page: 'beratung',
          content: beratung.defaultBeratungContent,
        })
      )
    ).status,
    200
  )
  assert.equal(writes, 2)
})

test('home and Beratung drafts, publishing and restoration are isolated', async () => {
  const { store } = setup()
  const email = 'editor@example.test'
  const home = await store.saveLandingContent({
    page: 'home',
    content: { ...content.defaultLandingContent, heroTitle: 'Homepage draft' },
    action: 'save',
    revision: null,
    email,
  })
  const draft = {
    ...beratung.defaultBeratungContent,
    introTitle: 'Neue Beratung',
    question2: 'Was ist Ihr Anliegen?',
  }
  const saved = await store.saveLandingContent({
    page: 'beratung',
    content: draft,
    action: 'save',
    revision: null,
    email,
  })
  assert.equal(
    (await store.getLandingState('beratung')).document.draft.question2,
    draft.question2
  )
  assert.equal(
    (await store.getPublishedLandingContent('beratung')).introTitle,
    beratung.defaultBeratungContent.introTitle
  )
  const published = await store.saveLandingContent({
    page: 'beratung',
    content: draft,
    action: 'publish',
    revision: saved.revision,
    email,
  })
  assert.equal(
    (await store.getPublishedLandingContent('beratung')).introTitle,
    draft.introTitle
  )
  assert.equal((await store.getLandingState('home')).revision, home.revision)
  assert.equal(
    (await store.getLandingState('home')).document.draft.heroTitle,
    'Homepage draft'
  )
  assert.equal(
    (await store.getPublishedLandingContent()).heroTitle,
    content.defaultLandingContent.heroTitle
  )
  assert.equal(
    published.document.previousPublished.introTitle,
    beratung.defaultBeratungContent.introTitle
  )
  await store.saveLandingContent({
    page: 'beratung',
    content: published.document.previousPublished,
    action: 'publish',
    revision: published.revision,
    email,
  })
  assert.equal(
    (await store.getPublishedLandingContent('beratung')).introTitle,
    beratung.defaultBeratungContent.introTitle
  )
  await assert.rejects(
    store.saveLandingContent({
      page: 'beratung',
      content: draft,
      action: 'save',
      revision: saved.revision,
      email,
    }),
    store.LandingConflictError
  )
})

test('editable copy cannot change the three-screen funnel, answer values or validation', () => {
  const edited = {
    ...beratung.defaultBeratungContent,
    question2: 'Geänderter Fragetext',
  }
  const steps = flow.getBeratungSteps(edited)
  assert.deepEqual(
    JSON.parse(JSON.stringify(steps.map((step) => step.field))),
    ['reason', 'timeframe']
  )
  assert.deepEqual(JSON.parse(JSON.stringify(steps[0].options)), [
    'Alkohol',
    'Drogen',
    'Punkte',
    'Straftat',
    'Andere',
  ])
  assert.equal(steps[0].question, edited.question2)
  assert.equal(beratung.beratungContentSchema.safeParse(edited).success, true)
  assert.equal(
    beratung.beratungContentSchema.safeParse({ ...edited, steps: [] }).success,
    false
  )
  assert.equal(steps[1].options.includes('Noch unsicher'), true)
  const errors = flow.contactErrors({
    firstName: ' ',
    lastName: '',
    email: 'x@ y.de',
    phone: '-------',
    privacyConsent: false,
  })
  assert.equal(Object.values(errors).every(Boolean), true)
})

test('lead endpoint, attribution, consent and submitted answers stay independent of CMS copy', () => {
  const contact = {
    firstName: 'Test',
    lastName: 'Person',
    email: 'test@example.test',
    phone: '+4912345678',
    privacyConsent: true,
  }
  const answers = {
    timeframe: '3-6 Monate',
    reason: 'Alkohol',
    jobLoss: false,
    mpuChallenges: ['Stress und Nervosität'],
    concerns: ['Zeitliche Belastung'],
    availability: ['Mittag (12-16 Uhr)'],
  }
  assert.equal(flow.BERATUNG_LEAD_ENDPOINT, '/api/leads')
  const payload = JSON.parse(
    JSON.stringify(flow.buildBeratungLeadPayload(contact, answers))
  )
  assert.deepEqual(payload, {
    ...contact,
    ...answers,
    source: 'beratung-quiz-de',
    consentAccepted: true,
    consentVersion: 'beratung_v1',
  })
  assert.equal(payload.jobLoss, false)
})

test('Ads are blocked before opt-in, conversion is deduplicated and revocation clears attribution', () => {
  const storage = () => {
    const data = new Map()
    return {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key),
    }
  }
  const localStorage = storage(),
    sessionStorage = storage()
  const win = new EventTarget()
  win.location = {
    origin: 'https://example.test',
    search:
      '?gclid=test-click&utm_campaign=search&email=private&reason=Alkohol',
  }
  const scripts = []
  const tracking = load(
    'src/lib/ads-tracking.ts',
    {},
    {
      window: win,
      localStorage,
      sessionStorage,
      URLSearchParams,
      Event,
      document: {
        createElement: () => ({}),
        head: { appendChild: (script) => scripts.push(script) },
      },
      process: {
        env: {
          NEXT_PUBLIC_GOOGLE_ADS_ID: 'AW-123456',
          NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: 'test-label',
          NEXT_PUBLIC_GOOGLE_ADS_SOEST_FORM_LABEL: 'soest-form',
          NEXT_PUBLIC_GOOGLE_ADS_PHONE_LABEL: 'phone-click',
          NEXT_PUBLIC_GOOGLE_ADS_OLPE_WHATSAPP_LABEL: 'olpe-whatsapp',
        },
      },
    }
  )
  const stop = tracking.startBeratungTracking()
  tracking.trackBeratungLead('lead-1')
  assert.equal(scripts.length, 0)
  assert.deepEqual(
    JSON.parse(JSON.stringify(tracking.getLeadAttribution())),
    {}
  )
  tracking.saveAdsConsent(true)
  assert.equal(scripts.length, 1)
  assert.deepEqual(JSON.parse(JSON.stringify(tracking.getLeadAttribution())), {
    gclid: 'test-click',
    utm_campaign: 'search',
  })
  tracking.trackBeratungLead('lead-1')
  tracking.trackBeratungLead('lead-1')
  let events = win.dataLayer.map((args) => Array.from(args))
  assert.equal(events.filter((args) => args[0] === 'event').length, 1)
  assert.deepEqual(
    JSON.parse(JSON.stringify(events.find((args) => args[0] === 'event')[2])),
    {
      send_to: 'AW-123456/test-label',
      transaction_id: 'lead-1',
      page_location: 'https://example.test/beratung',
      page_title: 'Beratungsanfrage',
    }
  )
  tracking.trackBeratungLead('lead-2', 'soest')
  tracking.trackBeratungContact('phone', 'general')
  tracking.trackBeratungContact('whatsapp', 'olpe')
  tracking.trackBeratungContact('whatsapp', 'general') // No configured destination.
  events = win.dataLayer.map((args) => Array.from(args)).filter(args => args[0] === 'event')
  assert.deepEqual(Array.from(events, args => args[2].send_to), [
    'AW-123456/test-label', 'AW-123456/soest-form', 'AW-123456/phone-click', 'AW-123456/olpe-whatsapp',
  ])
  assert.equal(events[2][2].transaction_id, undefined)
  assert.doesNotMatch(JSON.stringify(events), /private|Alkohol|test-click/)
  stop() // Revocation must still work after leaving the funnel.
  tracking.saveAdsConsent(false)
  tracking.trackBeratungLead('lead-3')
  tracking.trackBeratungContact('phone')
  assert.equal(win.dataLayer.filter((args) => args[0] === 'event').length, 4)
  assert.equal(sessionStorage.getItem('mpu-beratung-attribution-v1'), null)
  assert.equal(win.dataLayer.at(-1)[2].ad_storage, 'denied')
  stop()
})

test('lead API validates consent and answers, persists allowed attribution, and never acknowledges a failed write', async () => {
  let rows = [],
    fail = false
  const tracking = load('src/lib/ads-tracking.ts')
  const route = load(
    'src/app/api/leads/route.ts',
    {
      'next/server': {
        NextResponse: {
          json: (body, init) => new Response(JSON.stringify(body), init),
        },
      },
      '@supabase/supabase-js': {
        createClient: () => ({
          from: table => {
            assert.equal(table, 'mpu_signups', 'a missing column must not fall back to the legacy table')
            return {
            insert: (value) => ({
              select: () => ({
                single: async () => {
                  if (fail)
                    return {
                      error: { code: 'PGRST204', message: 'internal detail: acquisition column in mpu_signups missing from schema cache' },
                    }
                  rows.push(value)
                  return { data: { id: 'test-lead-id' }, error: null }
                },
              }),
            }),
          } },
        }),
      },
      '@/lib/admin-auth': { assertAdminRequest: async () => {} },
      '@/lib/rate-limit': { rateLimit: async () => ({ ok: true }) },
      '@/lib/beratung-flow': flow,
      '@/lib/lead-acquisition': load('src/lib/lead-acquisition.ts', { './ads-tracking': tracking }),
      '@/lib/lead-notification': { leadNotificationsEnabled: () => true, notifyNewLead: async () => { throw new Error('SMTP unavailable') } },
    },
    { console: { error: () => {} } }
  )
  const body = {
    firstName: 'Test',
    lastName: 'Person',
    email: 'test@example.test',
    phone: '+490000000000',
    source: 'beratung-quiz-de',
    region: 'soest',
    website: 'kompakt',
    acquisition: { website: 'kompakt', channel: 'phone' },
    reason: 'Punkte',
    timeframe: 'Noch unsicher',
    consentAccepted: true,
    availability: [],
    attribution: {
      gclid: 'test-click',
      utm_campaign: 'test',
      email: 'do-not-store',
      utm_content: 'bad\nvalue',
    },
  }
  const request = (patch) =>
    new Request('https://example.test/api/leads', {
      method: 'POST',
      body: JSON.stringify({ ...body, ...patch }),
    })
  assert.equal(
    (await route.POST(request({ consentAccepted: undefined }))).status,
    400
  )
  assert.equal((await route.POST(request({ reason: 'invalid' }))).status, 400)
  assert.equal((await route.POST(request({ phone: '-------' }))).status, 400)
  assert.equal((await route.POST(request({ source: 'kompakt' }))).status, 400)
  assert.equal((await route.POST(request({ source: 'landing-page-de', consentAccepted: undefined }))).status, 400)
  assert.equal(rows.length, 0)
  const result = await route.POST(request({}))
  assert.equal(result.status, 201)
  assert.equal((await result.json()).leadId, 'test-lead-id')
  assert.equal(rows[0].acquisition.attribution.gclid, 'test-click')
  assert.equal(rows[0].acquisition.website, 'focus')
  assert.equal(rows[0].acquisition.region, 'soest')
  assert.equal(rows[0].acquisition.landingPage, '/beratung')
  assert.equal(rows[0].notification_status, 'pending')
  assert.deepEqual(Object.keys(rows[0].acquisition.attribution).sort(), ['gclid', 'utm_campaign'])
  assert.match(rows[0].notes, /Kontakt-Einwilligung: beratung_v1/)
  assert.doesNotMatch(rows[0].notes, /do-not-store|bad\nvalue/)
  fail = true
  const error = await route.POST(request({}))
  assert.equal(error.status, 500)
  assert.doesNotMatch(await error.text(), /internal detail/)
})

test('website capability is checked against active bound profiles; editors cannot enter admin APIs', async () => {
  const access = load('src/lib/website-access.ts', {}, { process: { env: { WEBSITE_EDITOR_EMAILS: ' Editor@Example.test ' } } })
  let session = { user: { id: 'auth-editor', email: 'editor@example.test', role: 'admin' } }
  let profile = { role: 'student', is_active: true, auth_user_id: 'auth-editor' }
  const mocks = {
    'next-auth': { getServerSession: async () => session },
    '@/lib/auth': { authOptions: {} },
    '@/lib/mpu-profiles': { getProfileByEmail: async () => profile },
    '@/lib/website-access': access,
  }
  const editor = load('src/lib/website-auth.ts', mocks)
  const admin = load('src/lib/admin-auth.ts', mocks)
  assert.equal((await editor.assertWebsiteEditorRequest()).email, 'editor@example.test')
  await assert.rejects(admin.assertAdminRequest(), /Forbidden/)
  profile = { ...profile, is_active: false }
  await assert.rejects(editor.assertWebsiteEditorRequest(), /Forbidden/)
  profile = { ...profile, is_active: true, auth_user_id: 'someone-else' }
  await assert.rejects(editor.assertWebsiteEditorRequest(), /Forbidden/)
  profile.auth_user_id = 'auth-editor'
  session.user.email = 'unlisted@example.test'
  await assert.rejects(editor.assertWebsiteEditorRequest(), /Forbidden/)
  profile.role = 'admin'
  await editor.assertWebsiteEditorRequest()
  session = null
  await assert.rejects(editor.assertWebsiteEditorRequest(), /Unauthorized/)
})

test('contact destinations require E.164; no placeholder or script URL can become a CTA', () => {
  const get = env => load('src/lib/beratung-contact.ts', { 'server-only': {} }, { process: { env } }).getBeratungContact()
  assert.equal(get({}).phone, null)
  assert.equal(get({ BERATUNG_PHONE: 'javascript:alert(1)' }).phone, null)
  assert.equal(get({ BERATUNG_PHONE: '+49123456789' }).phone, 'tel:+49123456789')
  assert.equal(get({ BERATUNG_WHATSAPP: '+49123456789' }).whatsapp, 'https://wa.me/49123456789')
})

test('editing CRM notes cannot alter acquisition, source or notification state', async () => {
  let write
  const original = { id: 'lead', acquisition: { website: 'focus', region: 'olpe' }, source: 'beratung-quiz-de', notification_status: 'sent' }
  const route = load('src/app/api/leads/[id]/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
    '@/lib/admin-auth': { assertAdminRequest: async () => {} },
    '@supabase/supabase-js': { createClient: () => ({ from: () => ({ update: value => {
      write = value
      return { eq: () => ({ select: () => ({ single: async () => ({ data: { ...original, ...value }, error: null }) }) }) }
    } }) }) },
  })
  const response = await route.PATCH(new Request('https://example.test/api/leads/lead', {
    method: 'PATCH', body: JSON.stringify({ notes: 'Called back', acquisition: { website: 'kompakt' }, source: 'fake', notification_status: 'disabled' }),
  }), { params: { id: 'lead' } })
  assert.equal(response.status, 200)
  assert.deepEqual(Object.keys(write), ['notes'])
  const result = await response.json()
  assert.equal(result.lead.acquisition.website, 'focus')
  assert.equal(result.lead.notificationStatus, 'sent')
})

test('notification is disabled by default, contains no contact data, and reports delivery failures', async () => {
  let sent, closed = 0, fail = false
  const env = {}
  const notifier = load('src/lib/lead-notification.ts', {
    'server-only': {},
    nodemailer: { default: { createTransport: () => ({
      sendMail: async options => { sent = options; if (fail) throw Error('SMTP failed'); return { accepted: ['team@example.test'] } },
      close: () => closed++,
    }) } },
  }, { process: { env }, console: { error: () => {} } })
  assert.equal(await notifier.notifyNewLead('lead-id'), 'disabled')
  assert.equal(sent, undefined)
  Object.assign(env, { LEAD_NOTIFICATION_EMAIL: 'team@example.test', SMTP_HOST: 'smtp.example.test', FROM_EMAIL: 'site@example.test' })
  assert.equal(await notifier.notifyNewLead('lead-id'), 'sent')
  assert.match(sent.text, /lead-id/)
  assert.equal(sent.to, 'team@example.test')
  fail = true
  assert.equal(await notifier.notifyNewLead('lead-id'), 'failed')
  assert.equal(closed, 2)
})
