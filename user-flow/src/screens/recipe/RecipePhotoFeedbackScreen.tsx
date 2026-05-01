import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradingCriteriaCard from '../../components/GradingCriteriaCard';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import RecipeHeader, { RECIPE_HEADER_HEIGHT } from '../../components/RecipeHeader';
import RecipeStepIndicator from '../../components/RecipeStepIndicator';
import { colors, fonts, spacing } from '../../theme';
import { RecipePhotoFeedbackContent } from '../../types/recipe';

interface RecipePhotoFeedbackScreenProps {
  content: RecipePhotoFeedbackContent;
  onBack: () => void;
  onClose: () => void;
}

export default function RecipePhotoFeedbackScreen({
  content,
  onBack,
  onClose,
}: RecipePhotoFeedbackScreenProps) {
  const insets = useSafeAreaInsets();
  const shareAnim = useRef(new Animated.Value(0)).current;

  const handleSharePressIn = () => Animated.timing(shareAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  const handleSharePressOut = () => Animated.timing(shareAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();

  const overallScoreFooter = (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>OVERALL SCORE</Text>
      <Text style={styles.scoreValue}>
        {content.totalScore} / {content.maxTotalScore}
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <GridBackground />

      <RecipeHeader
        title="RECIPE CHALLENGE"
        timeMinutes={content.timeMinutes}
        onLeft={onBack}
      />

      <View style={{ flex: 1, paddingTop: RECIPE_HEADER_HEIGHT + insets.top }}>
        <RecipeStepIndicator
          stepCount={content.stepCount}
          currentStep={content.stepCount + 2}
          showCameraFinal
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Recipe result card */}
          <View style={styles.recipeCardWrap}>
            <View style={styles.recipeCardShadow} />
            <View style={styles.recipeCard}>
              <View style={styles.recipeCardInner}>
                <Text style={styles.recipeTitle}>{content.title}</Text>
                <Text style={styles.recipeSubtitle}>Submitted · Just now</Text>
              </View>
              {/* Stamp badge */}
              <View style={styles.stampWrap}>
                {/* <View style={styles.stamp}>
                  <Text style={styles.stampText}>{content.stampLabel}</Text>
                </View> */}
              </View>
            </View>
          </View>

          {/* Submitted photo */}
          <Image
            source={require('../../../assets/submissions/pan_sear_chicken_2.jpg')}
            style={styles.photo}
            resizeMode="cover"
          />

          {/* Grading results card */}
          <GradingCriteriaCard
            heading="HOW YOU DID"
            criteria={content.gradingResults.map((r) => ({
              label: r.label,
              score: r.score,
              maxScore: content.maxScorePerCriterion,
            }))}
            filledStarColor={colors.amber}
            footer={overallScoreFooter}
          />

          {/* XP banner */}
          <View style={styles.xpWrap}>
            <View style={styles.xpShadow} />
            <View style={styles.xpBanner}>
              {/* <MaterialIcons name="bolt" size={28} color={colors.canvas} /> */}
              <View style={styles.xpTextBlock}>
                <Text style={styles.xpAmount}>+{content.xpEarned} XP EARNED</Text>
                <Text style={styles.xpSub}>RECIPE COMPLETE</Text>
              </View>
              {/* <MaterialIcons name="bolt" size={28} color={colors.canvas} /> */}
            </View>
          </View>
        </ScrollView>

        {/* Sticky footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            onPressIn={handleSharePressIn}
            onPressOut={handleSharePressOut}
            style={styles.shareWrapper}
          >
            <Animated.View style={[styles.shareShadow, {
              opacity: shareAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            }]} />
            <Animated.View style={[styles.shareButton, {
              transform: [
                { translateX: shareAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
                { translateY: shareAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
              ],
            }]}>
              <Text style={styles.shareLabel}>SHARE</Text>
            </Animated.View>
          </Pressable>
          <View style={styles.roadmapButton}>
            <InkButton label="BACK TO ROADMAP →" onPress={onClose} />
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

  // Recipe result card
  recipeCardWrap: {
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
  },
  recipeCardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  recipeCard: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    borderLeftWidth: 8,
    borderLeftColor: colors.amber,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recipeCardInner: {
    flex: 1,
    gap: 4,
  },
  recipeTitle: {
    fontFamily: fonts.headline,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
  },
  recipeSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    opacity: 0.5,
  },

  // Stamp badge
  stampWrap: {
    flexShrink: 0,
  },
  stamp: {
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    transform: [{ rotate: '5deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  stampText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.canvas,
    textAlign: 'center',
  },

  // Submitted photo
  photo: {
    width: '100%',
    height: 220,
    borderWidth: 2,
    borderColor: colors.ink,
  },

  // Overall score footer (inside GradingCriteriaCard footer slot)
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

  // XP banner
  xpWrap: {
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
  },
  xpShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  xpBanner: {
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  xpTextBlock: {
    alignItems: 'center',
    gap: 2,
  },
  xpAmount: {
    fontFamily: fonts.label,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.canvas,
  },
  xpSub: {
    fontFamily: fonts.label,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.canvas,
    opacity: 0.75,
  },

  // Sticky footer
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
  roadmapButton: {
    flex: 2,
  },
});
