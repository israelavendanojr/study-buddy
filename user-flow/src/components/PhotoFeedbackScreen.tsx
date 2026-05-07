import React, { ReactNode, useRef } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';
import { CriterionResult } from '../types/recipe';
import FlowHeader, { FLOW_HEADER_HEIGHT } from './FlowHeader';
import GradingCriteriaCard from './GradingCriteriaCard';
import GridBackground from './GridBackground';
import InkButton from './InkButton';
import PhotoResultCard from './PhotoResultCard';
import XPBanner from './XPBanner';

interface PhotoFeedbackScreenProps {
  flowTitle: string;
  timeMinutes?: number;
  /** Rendered between the FlowHeader and the ScrollView (e.g. RecipeStepIndicator). */
  stepIndicator?: ReactNode;
  photoSource: ImageSourcePropType;
  title: string;
  gradingResults: CriterionResult[];
  maxScorePerCriterion: number;
  totalScore: number;
  maxTotalScore: number;
  xpEarned: number;
  xpLabel: string;
  primaryButtonLabel: string;
  onLeft: () => void;
  onPrimary: () => void;
}

export default function PhotoFeedbackScreen({
  flowTitle,
  timeMinutes,
  stepIndicator,
  photoSource,
  title,
  gradingResults,
  maxScorePerCriterion,
  totalScore,
  maxTotalScore,
  xpEarned,
  xpLabel,
  primaryButtonLabel,
  onLeft,
  onPrimary,
}: PhotoFeedbackScreenProps) {
  const insets = useSafeAreaInsets();
  const shareAnim = useRef(new Animated.Value(0)).current;

  const handleSharePressIn = () =>
    Animated.timing(shareAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  const handleSharePressOut = () =>
    Animated.timing(shareAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();

  const overallScoreFooter = (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>OVERALL SCORE</Text>
      <Text style={styles.scoreValue}>{totalScore} / {maxTotalScore}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <GridBackground />

      <FlowHeader title={flowTitle} timeMinutes={timeMinutes} onLeft={onLeft} />

      <View style={{ flex: 1, paddingTop: FLOW_HEADER_HEIGHT + insets.top }}>
        {stepIndicator}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <PhotoResultCard title={title} />

          <Image source={photoSource} style={styles.photo} resizeMode="cover" />

          <GradingCriteriaCard
            heading="HOW YOU DID"
            criteria={gradingResults.map((r) => ({
              label: r.label,
              score: r.score,
              maxScore: maxScorePerCriterion,
            }))}
            filledStarColor={colors.amber}
            footer={overallScoreFooter}
          />

          <XPBanner xpEarned={xpEarned} label={xpLabel} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            onPressIn={handleSharePressIn}
            onPressOut={handleSharePressOut}
            style={styles.shareWrapper}
          >
            <Animated.View
              style={[
                styles.shareShadow,
                { opacity: shareAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
              ]}
            />
            <Animated.View
              style={[
                styles.shareButton,
                {
                  transform: [
                    { translateX: shareAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
                    { translateY: shareAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
                  ],
                },
              ]}
            >
              <Text style={styles.shareLabel}>SHARE</Text>
            </Animated.View>
          </Pressable>
          <View style={styles.primaryButton}>
            <InkButton label={primaryButtonLabel} onPress={onPrimary} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  photo: {
    width: '100%',
    height: 220,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  scoreLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.amber,
  },
  scoreValue: {
    fontFamily: fonts.headline,
    fontSize: 32,
    lineHeight: 36,
    color: colors.ink,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.grid,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shareWrapper: {
    flex: 1,
    height: 56,
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
  },
  shareShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  shareButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 4,
    bottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    backgroundColor: colors.canvas,
  },
  shareLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.ink,
  },
  primaryButton: {
    flex: 2,
  },
});
