import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Line, Svg } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import { borderRadius, colors, fonts, spacing } from '../../theme';
import MonkeyMascot from '../../components/MonkeyMascot';

const HEADER_HEIGHT = 56;

type LessonStatus = 'completed' | 'active' | 'locked';

interface LessonData {
  id: string;
  title: string;
  label: string;
  status: LessonStatus;
  icon: keyof typeof MaterialIcons.glyphMap;
  hook?: string;
  learnPoints?: string[];
}

const LESSONS: LessonData[] = [
  { id: 'knife-grip',    title: 'Knife Grip',         label: 'TECHNIQUE',        status: 'completed', icon: 'content-cut' },
  { id: 'bear-claw',     title: 'The Bear Claw',       label: 'TECHNIQUE',        status: 'completed', icon: 'pan-tool' },
  { id: 'sear-chicken',  title: 'Searing Chicken',     label: 'TECHNIQUE',        status: 'active',    icon: 'local-fire-department',
    hook: "I hate when chicken sticks to the pan. Let's get a beautiful golden-brown crust, everytime.",
    learnPoints: [
      "Identifying the 'Leidenfrost point' for a perfect pan temp.",
      "The 'No-Touch' rule for achieving Maillard browning.",
      "Deglazing the fond to create a 30-second pan sauce.",
    ],
  },
  { id: 'pan-flip',      title: 'The Pan Flip',        label: 'TECHNIQUE',        status: 'locked',    icon: 'restaurant' },
  { id: 'seared-recipe', title: 'Pan-Seared Chicken',  label: 'RECIPE CHALLENGE', status: 'locked',    icon: 'dining' },
];

function HudPill({ icon, count }: { icon: React.ReactNode; count: string }) {
  return (
    <View style={styles.hudPill}>
      {icon}
      <Text style={styles.hudPillText}>{count}</Text>
    </View>
  );
}

function Connector({ variant, opacity }: { variant: 'solid' | 'dashed'; opacity: number }) {
  return (
    <View style={[styles.connector, { opacity }]}>
      {variant === 'solid' ? (
        <View style={styles.connectorLineSolid} />
      ) : (
        <Svg width={2} height={28}>
          <Line x1="1" y1="0" x2="1" y2="28" stroke={colors.ink} strokeWidth={2} strokeDasharray="4,4" />
        </Svg>
      )}
      <View style={styles.connectorArrow} />
    </View>
  );
}

function LessonCard({
  lesson,
  isExpanded,
  onPress,
  onClose,
  onStartLesson,
  onDirectPress,
}: {
  lesson: LessonData;
  isExpanded: boolean;
  onPress: () => void;
  onClose: () => void;
  onStartLesson?: () => void;
  onDirectPress?: () => void;
}) {
  const isCompleted = lesson.status === 'completed';
  const isActive = lesson.status === 'active';
  const isLocked = lesson.status === 'locked';

  const shadowOffset = isActive ? 6 : 4;

  return (
    <View
      style={[
        styles.cardOuter,
        isLocked
          ? { opacity: 0.4 }
          : { paddingBottom: shadowOffset, paddingRight: shadowOffset },
      ]}
    >
      {/* Block shadow layer — absolute, sits behind the card face */}
      {!isLocked && (
        <View
          style={[
            styles.cardShadowBase,
            {
              top: shadowOffset,
              left: shadowOffset,
              backgroundColor: isActive ? colors.amber : colors.grid,
              opacity: isActive ? 0.5 : 1,
            },
          ]}
        />
      )}

      {/* Card face — in normal flow so cardOuter gets natural height */}
      <Pressable
        onPress={onDirectPress ?? (isActive ? onPress : undefined)}
        style={[
          styles.cardFace,
          isCompleted && styles.cardFaceCompleted,
          isActive && styles.cardFaceActive,
          isLocked && styles.cardFaceLocked,
        ]}
      >
        {/* Header row */}
        <View style={styles.cardHeaderRow}>
          {/* Left amber accent strip — completed only */}
          {isCompleted && <View style={styles.accentStrip} />}

          {/* Icon box */}
          <View style={[styles.iconBox, isLocked ? styles.iconBoxLocked : styles.iconBoxAmber]}>
            {isLocked ? (
              <MaterialIcons name="lock" size={24} color={colors.onSurfaceVariant} />
            ) : (
              <MaterialIcons name={lesson.icon} size={28} color="#FFFFFF" />
            )}
          </View>

          {/* Text column */}
          <View style={styles.cardTextCol}>
            <Text
              style={[
                styles.cardTypeLabel,
                { color: isLocked ? colors.onSurfaceVariant : colors.amber },
              ]}
            >
              {lesson.label}
            </Text>
            <Text style={styles.cardTitle}>{lesson.title}</Text>
          </View>

          {/* Right action icon */}
          {isCompleted && (
            <MaterialIcons name="chevron-right" size={24} color={colors.ink} style={styles.cardRightIcon} />
          )}
          {isActive && (
            <MaterialIcons
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={colors.amber}
              style={styles.cardRightIcon}
            />
          )}

          {/* Checkmark badge — completed only, overflows card top-right corner */}
          {isCompleted && (
            <View style={styles.checkBadge}>
              <MaterialIcons name="check" size={14} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Expanded section */}
        {isActive && isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.expandedSeparator} />

            {/* Hook quote */}
            <View style={styles.hookRow}>
              <MonkeyMascot size={40} float={false} />
              <Text style={styles.hookText}>"{lesson.hook}"</Text>
            </View>

            <View style={styles.expandedSeparator} />

            {/* Learn points */}
            <Text style={styles.learnPointsLabel}>IN THIS LESSON</Text>
            {lesson.learnPoints?.map((point, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <Pressable style={styles.btnClose} onPress={onClose}>
                <Text style={styles.btnCloseLabel}>CLOSE</Text>
              </Pressable>
              <Pressable style={styles.btnStart} onPress={onStartLesson}>
                <Text style={styles.btnStartLabel}>START LESSON -&gt;</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

export default function TrailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleStartLesson = () => router.push('/lesson');
  const handleStartRecipe = () => router.push('/recipe');

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Sticky header */}
      <View style={[styles.stickyHeader, { top: 0, paddingTop: insets.top, height: HEADER_HEIGHT + insets.top }]}>
        <Text style={styles.headerTitle}>GarlicMonkey</Text>
        <View style={styles.hudRow}>
          <HudPill icon={<MaterialIcons name="local-fire-department" size={14} color={colors.ink} />} count="7" />
          <HudPill icon={<MaterialCommunityIcons name={"food-hot-dog" as any} size={14} color={colors.ink} />} count="120" />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + HEADER_HEIGHT + spacing.lg,
          paddingBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Chapter header */}
        <View style={styles.chapterHeader}>
          <Text style={styles.chapterLabel}>CHAPTER 1:</Text>
          <Text style={styles.chapterTitle}>The Foundation</Text>
          <View style={styles.chapterSeparator} />
        </View>

        {/* Lesson cards with connectors */}
        <LessonCard lesson={LESSONS[0]} isExpanded={false} onPress={() => {}} onClose={() => {}} />
        <Connector variant="solid" opacity={1} />
        <LessonCard lesson={LESSONS[1]} isExpanded={false} onPress={() => {}} onClose={() => {}} />
        <Connector variant="solid" opacity={1} />
        <LessonCard
          lesson={LESSONS[2]}
          isExpanded={expandedId === LESSONS[2].id}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedId(expandedId === LESSONS[2].id ? null : LESSONS[2].id);
          }}
          onClose={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedId(null);
          }}
          onStartLesson={handleStartLesson}
        />
        <Connector variant="dashed" opacity={0.4} />
        <LessonCard lesson={LESSONS[3]} isExpanded={false} onPress={() => {}} onClose={() => {}} />
        <Connector variant="dashed" opacity={0.25} />
        <LessonCard lesson={LESSONS[4]} isExpanded={false} onPress={() => {}} onClose={() => {}} onDirectPress={handleStartRecipe} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },

  // Header
  stickyHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.canvas,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  headerTitle: {
    fontFamily: fonts.headlineBoldItalic,
    fontSize: 22,
    color: colors.ink,
  },
  hudRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    shadowColor: colors.grid,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  hudPillText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.ink,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },

  // Chapter header
  chapterHeader: {
    marginBottom: spacing.lg,
  },
  chapterLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.amber,
    textTransform: 'uppercase',
  },
  chapterTitle: {
    fontFamily: fonts.headlineItalic,
    fontSize: 32,
    lineHeight: 40,
    color: colors.ink,
    marginTop: 2,
  },
  chapterSeparator: {
    height: 1,
    backgroundColor: colors.ink,
    opacity: 0.15,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Connector
  connector: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'flex-end',
  },
  connectorLineSolid: {
    width: 2,
    flex: 1,
    backgroundColor: colors.ink,
  },
  connectorArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.ink,
  },

  // Card
  cardOuter: {
    // padding added inline per-card (shadowOffset) for non-locked cards
  },
  cardShadowBase: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  cardFace: {
    flexDirection: 'column',
    backgroundColor: colors.surfaceContainer,
    minHeight: 80,
    overflow: 'visible',
  },
  cardFaceCompleted: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  cardFaceActive: {
    borderWidth: 2,
    borderColor: colors.amber,
    borderStyle: 'dashed',
  },
  cardFaceLocked: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderStyle: 'dashed',
  },
  accentStrip: {
    width: 6,
    alignSelf: 'stretch',
    backgroundColor: colors.amber,
  },
  iconBox: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  iconBoxAmber: {
    backgroundColor: colors.amber,
  },
  iconBoxLocked: {
    backgroundColor: colors.surfaceVariant,
  },
  cardTextCol: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cardTypeLabel: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: fonts.headline,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    marginTop: 2,
  },
  cardRightIcon: {
    marginRight: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
  },

  // Expanded section
  expandedSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  expandedSeparator: {
    height: 1,
    backgroundColor: colors.ink,
    opacity: 0.15,
    marginVertical: spacing.sm,
  },
  hookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  hookText: {
    flex: 1,
    fontFamily: fonts.headlineItalic,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  learnPointsLabel: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.amber,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: 6,
  },
  bulletDot: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.amber,
    lineHeight: 20,
  },
  bulletText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btnClose: {
    flex: 1,
    height: 44,
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCloseLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.ink,
  },
  btnStart: {
    flex: 2,
    height: 44,
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStartLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.white,
  },
  checkBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
    zIndex: 5,
  },

});
