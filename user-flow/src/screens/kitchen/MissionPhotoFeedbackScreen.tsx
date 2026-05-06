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
import FlowHeader, { FLOW_HEADER_HEIGHT } from '../../components/FlowHeader';
import GradingCriteriaCard from '../../components/GradingCriteriaCard';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import PhotoResultCard from '../../components/PhotoResultCard';
import XPBanner from '../../components/XPBanner';
import { colors, fonts, spacing } from '../../theme';
import { CriterionResult } from '../../types/recipe';

export interface MissionPhotoFeedbackContent {
  title: string;
  gradingResults: CriterionResult[];
  maxScorePerCriterion: number;
  totalScore: number;
  maxTotalScore: number;
  xpEarned: number;
}

interface Props {
  content: MissionPhotoFeedbackContent;
  onClose: () => void;
}

export default function MissionPhotoFeedbackScreen({ content, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const shareAnim = useRef(new Animated.Value(0)).current;

  const handleSharePressIn = () =>
    Animated.timing(shareAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  const handleSharePressOut = () =>
    Animated.timing(shareAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();

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

      <FlowHeader
        title="MISSION"
        onLeft={onClose}
      />

      <View style={{ flex: 1, paddingTop: FLOW_HEADER_HEIGHT + insets.top }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <PhotoResultCard title={content.title} />

          {/* Submitted photo */}
          <Image
            source={require('../../../assets/submissions/dice-onion.jpg')}
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

          <XPBanner xpEarned={content.xpEarned} label="MISSION COMPLETE" />
        </ScrollView>

        {/* Sticky footer */}
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
            <InkButton label="BACK TO KITCHEN →" onPress={onClose} />
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
    paddingTop: spacing.lg,
    gap: spacing.lg,
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
  primaryButton: {
    flex: 2,
  },
});
