import { createSupabaseAdminClient } from './video-library'

export type QuizQuestionType = 'multiple_choice' | 'open'

export type QuizOption = {
  id: string
  text: string
  isCorrect: boolean
}

export type QuizQuestionRecord = {
  id: string
  quizId: string
  question: string
  questionType: QuizQuestionType
  options: QuizOption[]
  explanation: string | null
  points: number
  orderIndex: number
}

export type QuizRecord = {
  id: string
  title: string
  description: string | null
  chapterId: string | null
  chapterTitle: string | null
  categoryTitle: string | null
  passPercentage: number
  orderIndex: number
  isPublished: boolean
  createdAt: string | null
  questions: QuizQuestionRecord[]
}

export type QuizAnswerInput = {
  questionId: string
  selectedOptionIds?: string[]
  answerText?: string
}

export type GradedAnswer = {
  questionId: string
  questionType: QuizQuestionType
  selectedOptionIds: string[]
  answerText: string | null
  isCorrect: boolean | null
  pointsAwarded: number
  maxPoints: number
  needsReview: boolean
}

export type QuizAttemptRecord = {
  id: string
  quizId: string
  profileId: string
  answers: GradedAnswer[]
  score: number
  maxScore: number
  percentage: number
  passed: boolean | null
  needsReview: boolean
  reviewedAt: string | null
  startedAt: string | null
  completedAt: string
}

export type QuizUpsertInput = {
  title: string
  description?: string | null
  chapterId?: string | null
  passPercentage?: number
  orderIndex?: number
  isPublished?: boolean
  questions: Array<{
    question: string
    questionType: QuizQuestionType
    options?: Array<{ id?: string; text: string; isCorrect?: boolean }>
    explanation?: string | null
    points?: number
  }>
}

const QUIZ_SELECT = '*, chapter:mpu_video_chapters(id,title,category:mpu_video_categories(id,name))'

function toQuestionRecord(row: any): QuizQuestionRecord {
  const options = Array.isArray(row.options) ? row.options : []
  return {
    id: row.id,
    quizId: row.quiz_id,
    question: row.question,
    questionType: row.question_type === 'open' ? 'open' : 'multiple_choice',
    options: options.map((option: any) => ({
      id: String(option?.id ?? ''),
      text: String(option?.text ?? ''),
      isCorrect: option?.isCorrect === true,
    })),
    explanation: row.explanation ?? null,
    points: Number(row.points ?? 1),
    orderIndex: Number(row.order_index ?? 1),
  }
}

function toQuizRecord(row: any, questions: any[] = []): QuizRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    chapterId: row.chapter_id ?? null,
    chapterTitle: row.chapter?.title ?? null,
    categoryTitle: row.chapter?.category?.name ?? null,
    passPercentage: Number(row.pass_percentage ?? 70),
    orderIndex: Number(row.order_index ?? 1),
    isPublished: row.is_published === true,
    createdAt: row.created_at ?? null,
    questions: questions
      .map(toQuestionRecord)
      .sort((a, b) => a.orderIndex - b.orderIndex),
  }
}

function toAttemptRecord(row: any): QuizAttemptRecord {
  return {
    id: row.id,
    quizId: row.quiz_id,
    profileId: row.profile_id,
    answers: Array.isArray(row.answers) ? row.answers : [],
    score: Number(row.score ?? 0),
    maxScore: Number(row.max_score ?? 0),
    percentage: Number(row.percentage ?? 0),
    passed: row.passed ?? null,
    needsReview: row.needs_review === true,
    reviewedAt: row.reviewed_at ?? null,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at,
  }
}

function sanitizeQuestionsInput(questions: QuizUpsertInput['questions']) {
  const sanitized = (questions || [])
    .map((q, index) => {
      const question = String(q.question || '').trim()
      const questionType: QuizQuestionType = q.questionType === 'open' ? 'open' : 'multiple_choice'
      const options = questionType === 'multiple_choice'
        ? (q.options || [])
            .map((option, optionIndex) => ({
              id: String(option.id || `opt-${optionIndex + 1}`),
              text: String(option.text || '').trim(),
              isCorrect: option.isCorrect === true,
            }))
            .filter((option) => option.text.length > 0)
        : []

      return {
        question,
        question_type: questionType,
        options,
        explanation: q.explanation ? String(q.explanation).trim() || null : null,
        points: Number.isFinite(Number(q.points)) && Number(q.points) > 0 ? Math.round(Number(q.points)) : 1,
        order_index: index + 1,
      }
    })
    .filter((q) => q.question.length > 0)

  for (const q of sanitized) {
    if (q.question_type === 'multiple_choice') {
      if (q.options.length < 2) {
        throw new Error(`Frage "${q.question.slice(0, 40)}..." braucht mindestens 2 Antwortoptionen.`)
      }
      if (!q.options.some((option) => option.isCorrect)) {
        throw new Error(`Frage "${q.question.slice(0, 40)}..." braucht mindestens eine richtige Antwort.`)
      }
    }
  }

  return sanitized
}

async function loadQuestionsByQuizIds(supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>, quizIds: string[]) {
  if (quizIds.length === 0) return new Map<string, any[]>()

  const { data, error } = await supabaseAdmin
    .from('mpu_quiz_questions')
    .select('*')
    .in('quiz_id', quizIds)
    .order('order_index', { ascending: true })

  if (error) throw error

  const byQuiz = new Map<string, any[]>()
  for (const row of data || []) {
    const list = byQuiz.get(row.quiz_id) || []
    list.push(row)
    byQuiz.set(row.quiz_id, list)
  }
  return byQuiz
}

export async function listQuizzesAdmin(): Promise<QuizRecord[]> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_quizzes')
    .select(QUIZ_SELECT)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  const rows = data || []
  const questionsByQuiz = await loadQuestionsByQuizIds(supabaseAdmin, rows.map((row: any) => row.id))
  return rows.map((row: any) => toQuizRecord(row, questionsByQuiz.get(row.id) || []))
}

export async function listQuizzesPublished(): Promise<QuizRecord[]> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_quizzes')
    .select(QUIZ_SELECT)
    .eq('is_published', true)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  const rows = data || []
  const questionsByQuiz = await loadQuestionsByQuizIds(supabaseAdmin, rows.map((row: any) => row.id))
  return rows.map((row: any) => toQuizRecord(row, questionsByQuiz.get(row.id) || []))
}

export async function getQuizById(id: string): Promise<QuizRecord | null> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_quizzes')
    .select(QUIZ_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const questionsByQuiz = await loadQuestionsByQuizIds(supabaseAdmin, [id])
  return toQuizRecord(data, questionsByQuiz.get(id) || [])
}

export async function createQuiz(input: QuizUpsertInput): Promise<QuizRecord> {
  const title = String(input.title || '').trim()
  if (!title) throw new Error('Quiz-Titel ist erforderlich.')
  const questions = sanitizeQuestionsInput(input.questions)

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_quizzes')
    .insert({
      title,
      description: input.description ?? null,
      chapter_id: input.chapterId ?? null,
      pass_percentage: Number.isFinite(Number(input.passPercentage)) ? Number(input.passPercentage) : 70,
      order_index: input.orderIndex ?? 1,
      is_published: input.isPublished === true,
    })
    .select('id')
    .single()

  if (error) throw error

  if (questions.length > 0) {
    const { error: questionsError } = await supabaseAdmin
      .from('mpu_quiz_questions')
      .insert(questions.map((q) => ({ ...q, quiz_id: data.id })))
    if (questionsError) throw questionsError
  }

  const quiz = await getQuizById(data.id)
  if (!quiz) throw new Error('Quiz konnte nicht geladen werden.')
  return quiz
}

export async function updateQuiz(id: string, input: QuizUpsertInput): Promise<QuizRecord> {
  const title = String(input.title || '').trim()
  if (!title) throw new Error('Quiz-Titel ist erforderlich.')
  const questions = sanitizeQuestionsInput(input.questions)

  const supabaseAdmin = createSupabaseAdminClient()
  const { error } = await supabaseAdmin
    .from('mpu_quizzes')
    .update({
      title,
      description: input.description ?? null,
      chapter_id: input.chapterId ?? null,
      pass_percentage: Number.isFinite(Number(input.passPercentage)) ? Number(input.passPercentage) : 70,
      order_index: input.orderIndex ?? 1,
      is_published: input.isPublished === true,
    })
    .eq('id', id)

  if (error) throw error

  // Questions are replaced wholesale — the admin editor always sends the full list.
  const { error: deleteError } = await supabaseAdmin
    .from('mpu_quiz_questions')
    .delete()
    .eq('quiz_id', id)
  if (deleteError) throw deleteError

  if (questions.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('mpu_quiz_questions')
      .insert(questions.map((q) => ({ ...q, quiz_id: id })))
    if (insertError) throw insertError
  }

  const quiz = await getQuizById(id)
  if (!quiz) throw new Error('Quiz konnte nicht geladen werden.')
  return quiz
}

export async function deleteQuiz(id: string): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { error } = await supabaseAdmin
    .from('mpu_quizzes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export function gradeAnswers(quiz: QuizRecord, answers: QuizAnswerInput[]) {
  const answersByQuestion = new Map(
    (answers || []).map((answer) => [String(answer.questionId), answer]),
  )

  const graded: GradedAnswer[] = quiz.questions.map((question) => {
    const answer = answersByQuestion.get(question.id)

    if (question.questionType === 'open') {
      const answerText = String(answer?.answerText || '').trim()
      return {
        questionId: question.id,
        questionType: 'open',
        selectedOptionIds: [],
        answerText: answerText || null,
        isCorrect: null,
        pointsAwarded: 0,
        maxPoints: question.points,
        needsReview: answerText.length > 0,
      }
    }

    const selected = Array.isArray(answer?.selectedOptionIds)
      ? answer!.selectedOptionIds!.map(String)
      : []
    const validOptionIds = new Set(question.options.map((option) => option.id))
    const selectedValid = Array.from(new Set(selected.filter((optionId) => validOptionIds.has(optionId))))
    const correctIds = question.options.filter((option) => option.isCorrect).map((option) => option.id)
    const isCorrect = selectedValid.length === correctIds.length
      && correctIds.every((optionId) => selectedValid.includes(optionId))

    return {
      questionId: question.id,
      questionType: 'multiple_choice',
      selectedOptionIds: selectedValid,
      answerText: null,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
      maxPoints: question.points,
      needsReview: false,
    }
  })

  const maxScore = graded.reduce((sum, answer) => sum + answer.maxPoints, 0)
  const score = graded.reduce((sum, answer) => sum + answer.pointsAwarded, 0)
  const needsReview = graded.some((answer) => answer.needsReview)
  // Percentage over auto-gradable points only would be confusing; use full max.
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const passed = needsReview ? null : percentage >= quiz.passPercentage

  return { graded, score, maxScore, percentage, passed, needsReview }
}

export async function submitQuizAttempt(params: {
  quiz: QuizRecord
  profileId: string
  answers: QuizAnswerInput[]
  startedAt?: string | null
}): Promise<QuizAttemptRecord> {
  const { graded, score, maxScore, percentage, passed, needsReview } = gradeAnswers(params.quiz, params.answers)

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_quiz_attempts')
    .insert({
      quiz_id: params.quiz.id,
      profile_id: params.profileId,
      answers: graded,
      score,
      max_score: maxScore,
      percentage,
      passed,
      needs_review: needsReview,
      started_at: params.startedAt ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return toAttemptRecord(data)
}

export async function listAttemptsForProfile(profileId: string): Promise<QuizAttemptRecord[]> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_quiz_attempts')
    .select('*')
    .eq('profile_id', profileId)
    .order('completed_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toAttemptRecord)
}

export async function listAttemptsForQuiz(quizId: string): Promise<Array<QuizAttemptRecord & { profileName: string; profileEmail: string }>> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_quiz_attempts')
    .select('*, profile:mpu_profiles(id,first_name,last_name,email)')
    .eq('quiz_id', quizId)
    .order('completed_at', { ascending: false })

  if (error) throw error
  return (data || []).map((row: any) => ({
    ...toAttemptRecord(row),
    profileName: [row.profile?.first_name, row.profile?.last_name].filter(Boolean).join(' ') || 'Unbekannt',
    profileEmail: row.profile?.email || '',
  }))
}

export async function getAttemptById(id: string): Promise<QuizAttemptRecord | null> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_quiz_attempts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? toAttemptRecord(data) : null
}

/**
 * Admin review of open questions: assigns points per open question and
 * recomputes the attempt totals.
 */
export async function reviewAttemptOpenAnswers(attemptId: string, grades: Record<string, number>): Promise<QuizAttemptRecord> {
  const attempt = await getAttemptById(attemptId)
  if (!attempt) throw new Error('Versuch nicht gefunden.')

  const quiz = await getQuizById(attempt.quizId)
  if (!quiz) throw new Error('Quiz nicht gefunden.')

  const answers = attempt.answers.map((answer) => {
    if (answer.questionType !== 'open') return answer
    const rawGrade = grades[answer.questionId]
    if (rawGrade === undefined || rawGrade === null) {
      return { ...answer, needsReview: false }
    }
    const pointsAwarded = Math.max(0, Math.min(answer.maxPoints, Math.round(Number(rawGrade) || 0)))
    return {
      ...answer,
      pointsAwarded,
      isCorrect: pointsAwarded >= answer.maxPoints,
      needsReview: false,
    }
  })

  const maxScore = answers.reduce((sum, answer) => sum + answer.maxPoints, 0)
  const score = answers.reduce((sum, answer) => sum + answer.pointsAwarded, 0)
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const passed = percentage >= quiz.passPercentage

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_quiz_attempts')
    .update({
      answers,
      score,
      max_score: maxScore,
      percentage,
      passed,
      needs_review: false,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .select('*')
    .single()

  if (error) throw error
  return toAttemptRecord(data)
}
