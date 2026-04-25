/**
 * Orchestrates the full lesson experience.
 * Fetches lesson JSON, maps it to a flat steps array, and renders each step screen.
 * Supports both legacy (card1/card3/activities) and flow (steps[]) lesson formats.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import GridBackground from '../../components/ui/GridBackground'
import LessonProgressBar from '../../components/ui/LessonProgressBar'
import { generateLesson, activityComplete } from '../../api/client'
import { colors } from '../../theme'
import HookScreen from './HookScreen'
import ConceptBeatScreen from './ConceptBeatScreen'
import MultipleChoiceScreen from './MultipleChoiceScreen'
import FillBlankScreen from './FillBlankScreen'
import SequenceScreen from './SequenceScreen'
import ImageIDScreen from './ImageIDScreen'

export type LessonStep =
  | { type: 'hook'; motivation: string; learnPoints: string[] }
  | { type: 'concept'; headline: string; body: string; whyItMatters?: string }
  | { type: 'multiple_choice'; id: string; question: string; options: string[]; correctIndex: number; explanation: string }
  | { type: 'fill_blank'; id: string; sentence: string; correctAnswer: string; wordBank: string[]; explanation: string }
  | { type: 'sequence'; id: string; prompt: string; steps: string[]; correctOrder: number[] }
  | { type: 'image_id'; id: string; question: string; options: string[]; correctIndex: number; explanation: string }

function mapLessonToSteps(json: any): LessonStep[] {
  const steps: LessonStep[] = []

  // ── Flow format (flow array with hook/concept/activity) ──
  if (json.flow && Array.isArray(json.flow)) {
    for (const item of json.flow) {
      if (item.type === 'hook') {
        steps.push({
          type: 'hook',
          motivation: item.motivation ?? '',
          learnPoints: (item.learn_points ?? []).map((p: any) =>
            typeof p === 'string' ? p : p.text ?? ''
          ),
        })
      } else if (item.type === 'concept') {
        steps.push({
          type: 'concept',
          headline: item.point ?? item.headline ?? '',
          body: item.body ?? '',
          whyItMatters: item.why_it_matters,
        })
      } else if (item.type === 'activity' || item.type === 'capstone') {
        const actType = item.activity_type ?? item.type
        steps.push(_mapActivity(actType, item))
      }
    }
    return steps
  }

  // ── Legacy format (card1 / card3 / activities) ──
  if (json.card1) {
    steps.push({
      type: 'hook',
      motivation: json.card1.motivation ?? '',
      learnPoints: (json.card1.learn_points ?? []).map((p: any) =>
        typeof p === 'string' ? p : p.text ?? ''
      ),
    })
  }
  if (json.card3) {
    steps.push({
      type: 'concept',
      headline: json.card3.headline ?? '',
      body: (json.card3.points ?? []).map((p: any) =>
        typeof p === 'string' ? p : p.text ?? ''
      ).join('\n\n'),
      whyItMatters: json.card3.tell_me_more,
    })
  }
  for (const act of json.activities ?? []) {
    steps.push(_mapActivity(act.type, act))
  }

  return steps
}

function _mapActivity(actType: string, item: any): LessonStep {
  if (actType === 'fill_blank' || actType === 'fill-blank') {
    return {
      type: 'fill_blank',
      id: item.id ?? 'act',
      sentence: item.sentence ?? item.fill_blank_sentence ?? '',
      correctAnswer: item.correct_answer ?? item.fill_blank_answer ?? '',
      wordBank: item.word_bank ?? [],
      explanation: item.explanation ?? '',
    }
  }
  if (actType === 'sequence') {
    return {
      type: 'sequence',
      id: item.id ?? 'act',
      prompt: item.question ?? item.prompt ?? '',
      steps: item.steps ?? [],
      correctOrder: item.correct_order ?? [],
    }
  }
  if (actType === 'image_id') {
    return {
      type: 'image_id',
      id: item.id ?? 'act',
      question: item.question ?? item.prompt ?? '',
      options: item.options ?? item.images ?? [],
      correctIndex: item.correct_index ?? item.correct_image_index ?? 0,
      explanation: item.explanation ?? '',
    }
  }
  // Default: multiple_choice
  return {
    type: 'multiple_choice',
    id: item.id ?? 'act',
    question: item.question ?? item.prompt ?? '',
    options: item.options ?? [],
    correctIndex: item.correct_index ?? 0,
    explanation: item.explanation ?? '',
  }
}

interface Props {
  navigation: any
  route: {
    params: {
      lessonKey: string
      lessonTitle: string
      chapterTitle: string
      lessonType: string
      goal: string
      experience: number
      globalIndex: number
    }
  }
}

export default function LessonFlowScreen({ navigation, route }: Props) {
  const { user } = useUser()
  const { lessonKey, lessonTitle, chapterTitle, lessonType, goal, experience, globalIndex } = route.params
  const [steps, setSteps] = useState<LessonStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const startTime = useRef(Date.now())
  const xpEarned = useRef(0)
  const correctCount = useRef(0)
  const totalActivities = useRef(0)

  useEffect(() => {
    async function load() {
      try {
        const json = await generateLesson({
          user_id: user?.id ?? '',
          lesson_key: lessonKey,
          lesson_title: lessonTitle,
          chapter_title: chapterTitle,
          goal,
          buddy_name: 'Pepper',
          experience,
          lesson_type: lessonType,
        })
        setSteps(mapLessonToSteps(json))
      } catch (e) {
        console.error('[LessonFlow] load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [lessonKey])

  async function handleActivityDone(activityId: string, passed: boolean) {
    totalActivities.current += 1
    if (passed) correctCount.current += 1
    try {
      const res = await activityComplete({
        user_id: user?.id ?? '',
        lesson_key: lessonKey,
        activity_id: activityId,
        passed,
      })
      xpEarned.current += res.xp_earned ?? 0
      if (res.lesson_now_fully_complete) {
        advanceToComplete(res.mission_created ?? null)
        return
      }
    } catch (e) {
      console.error('[LessonFlow] activity complete error', e)
    }
    advance()
  }

  function advance() {
    if (currentStep + 1 >= steps.length) {
      advanceToComplete(null)
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  function advanceToComplete(missionCreated: { id: number; title: string } | null) {
    const elapsed = Math.round((Date.now() - startTime.current) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    const timeLabel = `${minutes}:${String(seconds).padStart(2, '0')}`
    const accuracy =
      totalActivities.current > 0
        ? Math.round((correctCount.current / totalActivities.current) * 100)
        : 100

    navigation.replace('LessonComplete', {
      lessonTitle,
      xpEarned: xpEarned.current,
      timeLabel,
      accuracy,
      missionCreated,
      globalIndex,
    })
  }

  if (loading || steps.length === 0) {
    return (
      <GridBackground style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.amber} />
      </GridBackground>
    )
  }

  const step = steps[currentStep]
  const activityCount = steps.filter((s) => !['hook', 'concept'].includes(s.type)).length
  const activitysDone = steps
    .slice(0, currentStep)
    .filter((s) => !['hook', 'concept'].includes(s.type)).length

  const progressLabel = `LESSON · ${currentStep + 1} / ${steps.length}`

  const progressBar = (
    <LessonProgressBar
      current={currentStep + 1}
      total={steps.length}
      label={progressLabel}
      onClose={() => navigation.goBack()}
    />
  )

  if (step.type === 'hook') {
    return (
      <HookScreen
        progressBar={progressBar}
        motivation={step.motivation}
        learnPoints={step.learnPoints}
        onContinue={advance}
      />
    )
  }
  if (step.type === 'concept') {
    return (
      <ConceptBeatScreen
        progressBar={progressBar}
        headline={step.headline}
        body={step.body}
        whyItMatters={step.whyItMatters}
        onContinue={advance}
      />
    )
  }
  if (step.type === 'multiple_choice') {
    return (
      <MultipleChoiceScreen
        progressBar={progressBar}
        activityId={step.id}
        question={step.question}
        options={step.options}
        correctIndex={step.correctIndex}
        explanation={step.explanation}
        onDone={(passed) => handleActivityDone(step.id, passed)}
      />
    )
  }
  if (step.type === 'fill_blank') {
    return (
      <FillBlankScreen
        progressBar={progressBar}
        activityId={step.id}
        sentence={step.sentence}
        correctAnswer={step.correctAnswer}
        wordBank={step.wordBank}
        explanation={step.explanation}
        lessonTitle={lessonTitle}
        goal={goal}
        lessonKey={lessonKey}
        userId={user?.id ?? ''}
        onDone={(passed) => handleActivityDone(step.id, passed)}
      />
    )
  }
  if (step.type === 'sequence') {
    return (
      <SequenceScreen
        progressBar={progressBar}
        activityId={step.id}
        prompt={step.prompt}
        steps={step.steps}
        correctOrder={step.correctOrder}
        onDone={(passed) => handleActivityDone(step.id, passed)}
      />
    )
  }
  if (step.type === 'image_id') {
    return (
      <ImageIDScreen
        progressBar={progressBar}
        activityId={step.id}
        question={step.question}
        options={step.options}
        correctIndex={step.correctIndex}
        explanation={step.explanation}
        onDone={(passed) => handleActivityDone(step.id, passed)}
      />
    )
  }

  return null
}
