import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Line, Svg } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import { borderRadius, colors, fonts, spacing } from '../../theme';

const HEADER_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 64;

type LessonStatus = 'completed' | 'active' | 'locked';

interface LessonData {
  id: string;
  title: string;
  label: string;
  status: LessonStatus;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const LESSONS: LessonData[] = [
  { id: 'knife-grip',    title: 'Knife Grip',         label: 'TECHNIQUE',        status: 'completed', icon: 'content-cut' },
  { id: 'bear-claw',     title: 'The Bear Claw',       label: 'TECHNIQUE',        status: 'completed', icon: 'pan-tool' },
  { id: 'sear-chicken',  title: 'Searing Chicken',     label: 'TECHNIQUE',        status: 'active',    icon: 'local-fire-department' },
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

function LessonCard({ lesson }: { lesson: LessonData }) {
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
      <View
        style={[
          styles.cardFace,
          isCompleted && styles.cardFaceCompleted,
          isActive && styles.cardFaceActive,
          isLocked && styles.cardFaceLocked,
        ]}
      >
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
          <MaterialIcons name="play-arrow" size={24} color={colors.amber} style={styles.cardRightIcon} />
        )}

        {/* Checkmark badge — completed only, overflows card top-right corner */}
        {isCompleted && (
          <View style={styles.checkBadge}>
            <MaterialIcons name="check" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>
    </View>
  );
}

function NavTab({
  label,
  icon,
  active,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  active: boolean;
}) {
  return (
    <View style={styles.navTab}>
      <View style={active ? styles.navTabActiveBox : undefined}>
        <MaterialIcons
          name={icon}
          size={22}
          color={active ? '#FFFFFF' : colors.onSurfaceVariant}
        />
      </View>
      <Text
        style={[
          styles.navTabLabel,
          { color: active ? colors.ink : colors.onSurfaceVariant },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TrailScreen() {
  const insets = useSafeAreaInsets();

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
          paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom + spacing.lg,
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
        <LessonCard lesson={LESSONS[0]} />
        <Connector variant="solid" opacity={1} />
        <LessonCard lesson={LESSONS[1]} />
        <Connector variant="solid" opacity={1} />
        <LessonCard lesson={LESSONS[2]} />
        <Connector variant="dashed" opacity={0.4} />
        <LessonCard lesson={LESSONS[3]} />
        <Connector variant="dashed" opacity={0.25} />
        <LessonCard lesson={LESSONS[4]} />
      </ScrollView>

      {/* Bottom nav */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
        <NavTab label="TRAIL" icon="map" active={true} />
        <NavTab label="KITCHEN" icon="restaurant" active={false} />
        <NavTab label="PROFILE" icon="person" active={false} />
      </View>
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
    fontFamily: fonts.headlineItalic,
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
    flexDirection: 'row',
    alignItems: 'center',
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

  // Bottom nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.canvas,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 4,
  },
  navTabActiveBox: {
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  navTabLabel: {
    fontFamily: fonts.labelMedium,
    fontSize: 10,
    letterSpacing: 1,
  },
});
