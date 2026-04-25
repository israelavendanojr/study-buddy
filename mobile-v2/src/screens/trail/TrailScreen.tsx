import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import Svg, { Line, Path } from 'react-native-svg'
import GridBackground from '../../components/ui/GridBackground'
import InkCard from '../../components/ui/InkCard'
import InkButton from '../../components/ui/InkButton'
import BottomNav from '../../components/ui/BottomNav'
import { getRoadmap } from '../../api/client'
import { colors, typography, spacing, blockShadow, radius } from '../../theme'

interface Lesson {
  id: string
  title: string
  type: string
  estimatedMinutes: number
}
interface Chapter {
  title: string
  lessons: Lesson[]
}

function nodeState(lessonIndex: number, activeIndex: number): 'done' | 'active' | 'locked' {
  if (lessonIndex < activeIndex) return 'done'
  if (lessonIndex === activeIndex) return 'active'
  return 'locked'
}

export default function TrailScreen({ navigation }: any) {
  const { user } = useUser()
  const insets = useSafeAreaInsets()
  const [roadmap, setRoadmap] = useState<{ chapters: Chapter[]; active_index: number; _meta: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheetLesson, setSheetLesson] = useState<(Lesson & { globalIndex: number; chapterTitle: string }) | null>(null)
  const sheetAnim = useRef(new Animated.Value(0)).current

  async function load() {
    if (!user?.id) return
    try {
      const data = await getRoadmap(user.id) as any
      setRoadmap(data)
    } catch (e) {
      console.error('[Trail] load error', e)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [user?.id]))

  function openSheet(lesson: Lesson, globalIndex: number, chapterTitle: string) {
    setSheetLesson({ ...lesson, globalIndex, chapterTitle })
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start()
  }

  function closeSheet() {
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setSheetLesson(null)
    )
  }

  const meta = roadmap?._meta ?? {}
  const streak = roadmap?.active_index !== undefined ? '—' : '0'

  // Build flat lesson list with global indices
  const flatLessons: (Lesson & { globalIndex: number; chapterTitle: string })[] = []
  roadmap?.chapters?.forEach((ch) => {
    ch.lessons.forEach((l) => {
      flatLessons.push({ ...l, globalIndex: flatLessons.length, chapterTitle: ch.title })
    })
  })
  const activeIndex = roadmap?.active_index ?? 0

  const translateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] })

  return (
    <GridBackground style={{ flex: 1 }}>
      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.appTitle}>GARLIC MONKEY</Text>
        <View style={styles.hud}>
          <Text style={styles.hudItem}>🔥 {meta.streak_days ?? 0}</Text>
          <Text style={styles.hudItem}>⭐ {meta.total_xp ?? 0} XP</Text>
        </View>
      </View>

      {/* ── Lesson trail ── */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <Text style={styles.loadingText}>Loading your trail...</Text>
        )}

        {roadmap?.chapters?.map((chapter, ci) => (
          <View key={ci} style={styles.chapterBlock}>
            {/* Chapter label */}
            <View style={styles.chapterHeader}>
              <View style={styles.chapterLine} />
              <Text style={styles.chapterTitle}>{chapter.title.toUpperCase()}</Text>
              <View style={styles.chapterLine} />
            </View>

            {/* Lesson nodes */}
            {chapter.lessons.map((lesson, li) => {
              const gi = flatLessons.findIndex(
                (f) => f.id === lesson.id && f.chapterTitle === chapter.title
              )
              const state = nodeState(gi, activeIndex)
              const isActive = state === 'active'
              const isDone = state === 'done'
              const isLocked = state === 'locked'
              const typeLabel = lesson.type?.toUpperCase() ?? 'LESSON'

              return (
                <View key={lesson.id} style={styles.nodeWrapper}>
                  {/* Connector line */}
                  {li > 0 && (
                    <View style={styles.connector}>
                      <Svg width={2} height={32}>
                        <Line x1="1" y1="0" x2="1" y2="32" stroke={colors.ink} strokeWidth="2" strokeDasharray="4,4" />
                      </Svg>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => isActive && openSheet(lesson, gi, chapter.title)}
                    activeOpacity={isActive ? 0.8 : 1}
                    style={[
                      styles.node,
                      isDone && styles.nodeDone,
                      isActive && styles.nodeActive,
                      isActive && blockShadow.amber,
                      !isActive && !isDone && blockShadow.paper,
                      isLocked && styles.nodeLocked,
                    ]}
                  >
                    <View style={styles.nodeLeft}>
                      {/* State badge */}
                      <View style={[styles.badge, isDone && styles.badgeDone, isActive && styles.badgeActive]}>
                        <Text style={styles.badgeText}>
                          {isDone ? '✓' : isActive ? '▶' : '🔒'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.nodeCenter}>
                      <Text style={[styles.nodeTitle, isLocked && styles.nodeTitleLocked]}>
                        {lesson.title}
                      </Text>
                      <View style={styles.nodeMeta}>
                        <Text style={styles.typeChip}>{typeLabel}</Text>
                        <Text style={styles.duration}>{lesson.estimatedMinutes ?? 10} min</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        ))}

        {!loading && !roadmap && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No roadmap yet. Complete onboarding to get started.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom nav ── */}
      <View style={styles.navContainer}>
        <BottomNav
          active="Trail"
          onPress={(tab) => {
            if (tab === 'Kitchen') navigation.navigate('Kitchen')
            if (tab === 'Profile') navigation.navigate('Profile')
          }}
        />
      </View>

      {/* ── Lesson detail sheet ── */}
      {sheetLesson && (
        <Modal transparent animationType="none" visible={!!sheetLesson} onRequestClose={closeSheet}>
          <TouchableOpacity style={styles.overlay} onPress={closeSheet} activeOpacity={1} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetChapter}>{sheetLesson.chapterTitle.toUpperCase()}</Text>
            <Text style={styles.sheetTitle}>{sheetLesson.title}</Text>

            <View style={styles.sheetMeta}>
              <Text style={styles.typeChip}>{sheetLesson.type?.toUpperCase()}</Text>
              <Text style={styles.duration}>{sheetLesson.estimatedMinutes ?? 10} min</Text>
            </View>

            <View style={styles.sheetDivider} />

            <InkButton
              label="Start Lesson →"
              onPress={() => {
                closeSheet()
                const isRecipe = sheetLesson.type === 'recipe'
                if (isRecipe) {
                  navigation.navigate('RecipeIntro', {
                    lessonKey: `${sheetLesson.id}_${sheetLesson.title.toLowerCase().replace(/\s+/g, '_')}`,
                    lessonTitle: sheetLesson.title,
                    chapterTitle: sheetLesson.chapterTitle,
                    goal: meta.goal ?? '',
                    experience: meta.experience ?? 2,
                    globalIndex: sheetLesson.globalIndex,
                  })
                } else {
                  navigation.navigate('LessonFlow', {
                    lessonKey: `${sheetLesson.id}_${sheetLesson.title.toLowerCase().replace(/\s+/g, '_')}`,
                    lessonTitle: sheetLesson.title,
                    chapterTitle: sheetLesson.chapterTitle,
                    lessonType: sheetLesson.type,
                    goal: meta.goal ?? '',
                    experience: meta.experience ?? 2,
                    globalIndex: sheetLesson.globalIndex,
                  })
                }
              }}
            />

            <InkButton
              label="Close"
              onPress={closeSheet}
              variant="ghost"
              style={{ marginTop: spacing.sm }}
            />
          </Animated.View>
        </Modal>
      )}
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    backgroundColor: colors.background,
  },
  appTitle: {
    fontFamily: typography.labelBold,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.ink,
  },
  hud: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  hudItem: {
    fontFamily: typography.labelBold,
    fontSize: 13,
    color: colors.ink,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  loadingText: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 40,
  },
  chapterBlock: {
    marginBottom: spacing.xl,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  chapterLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.ink,
  },
  chapterTitle: {
    fontFamily: typography.labelBold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.ink,
  },
  nodeWrapper: {
    alignItems: 'center',
  },
  connector: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  nodeDone: {
    backgroundColor: colors.surfaceContainer,
  },
  nodeActive: {
    borderStyle: 'dashed',
  },
  nodeLocked: {
    opacity: 0.4,
  },
  nodeLeft: {
    width: 36,
    alignItems: 'center',
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: {
    backgroundColor: colors.ink,
  },
  badgeActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amberDark,
  },
  badgeText: {
    fontSize: 13,
    color: colors.white,
  },
  nodeCenter: {
    flex: 1,
    gap: 4,
  },
  nodeTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  nodeTitleLocked: {
    color: colors.inkSoft,
  },
  nodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeChip: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.amber,
    borderWidth: 1,
    borderColor: colors.amber,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  duration: {
    fontFamily: typography.label,
    fontSize: 12,
    color: colors.inkSoft,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 22,
  },
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.paperShadow,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetChapter: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.inkSoft,
  },
  sheetTitle: {
    fontFamily: typography.headlineBold,
    fontSize: 22,
    color: colors.ink,
    lineHeight: 28,
  },
  sheetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetDivider: {
    height: 1.5,
    backgroundColor: colors.paperShadow,
    marginVertical: spacing.xs,
  },
})
