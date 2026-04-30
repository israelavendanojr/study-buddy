import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Line, Svg } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import RecipeHeader, { RECIPE_HEADER_HEIGHT } from '../../components/RecipeHeader';
import { colors, fonts, spacing } from '../../theme';
import MonkeyMascot from '../../components/MonkeyMascot';
import { RecipeIntroContent } from '../../types/recipe';

interface RecipeIntroScreenProps {
  content: RecipeIntroContent;
  onNext: () => void;
  onClose: () => void;
}

export default function RecipeIntroScreen({ content, onNext, onClose }: RecipeIntroScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <GridBackground />

      <RecipeHeader
        title="RECIPE CHALLENGE"
        timeMinutes={content.timeMinutes}
        onLeft={onClose}
        variant="close"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + RECIPE_HEADER_HEIGHT + spacing.lg,
          paddingBottom: insets.bottom + 56 + spacing.lg + spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Card wrapper with block shadow */}
        <View style={styles.cardShadowWrap}>
          <View style={styles.cardShadow} />
          <View style={styles.card}>

            {/* Chapter label */}
            <Text style={styles.chapterLabel}>{content.chapterLabel}</Text>

            {/* Title */}
            <Text style={styles.title}>{content.title}</Text>

            {/* Description */}
            <Text style={styles.description}>{content.description}</Text>

            {/* Separator */}
            <View style={styles.separator} />

            {/* Skills */}
            <Text style={styles.sectionLabel}>SKILLS YOU'LL APPLY</Text>
            {content.skills.map((skill, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{skill}</Text>
              </View>
            ))}

            {/* Separator */}
            <View style={styles.separator} />

            {/* Chef tip row */}
            <View style={styles.tipRow}>
              <MonkeyMascot size={60} />
              <Text style={styles.tipQuote}>"{content.tipQuote}"</Text>
            </View>

            {/* Dashed separator */}
            <View style={styles.dashedSeparatorWrap}>
              <Svg width="100%" height={2}>
                <Line
                  x1="0" y1="1" x2="2000" y2="1"
                  stroke={colors.ink}
                  strokeWidth={1.5}
                  strokeDasharray="6,6"
                />
              </Svg>
            </View>

            {/* Recipe photo */}
            <Image
              source={content.photo}
              style={styles.recipePhoto}
              resizeMode="cover"
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer button */}
      <View style={[styles.footerWrap, { paddingBottom: insets.bottom + spacing.md, paddingHorizontal: spacing.lg }]}>
        <View style={styles.footerBtnShadowWrap}>
          <View style={styles.footerBtnShadow} />
          <Pressable style={styles.footerBtn} onPress={onNext}>
            <Text style={styles.footerBtnLabel}>SEE WHAT YOU'LL NEED →</Text>
          </Pressable>
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

  // Scroll
  scroll: {
    flex: 1,
  },

  // Card
  cardShadowWrap: {
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: spacing.lg,
    overflow: 'hidden',
  },

  // Card content
  chapterLabel: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 2.5,
    color: colors.amber,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.headlineBoldItalic,
    fontSize: 30,
    lineHeight: 38,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: colors.ink,
    opacity: 0.15,
    marginVertical: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 2.5,
    color: colors.amber,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 8,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.amber,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },

  // Chef tip
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tipQuote: {
    flex: 1,
    fontFamily: fonts.headlineItalic,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink,
  },

  // Dashed separator
  dashedSeparatorWrap: {
    marginVertical: spacing.md,
    marginHorizontal: -spacing.lg,
  },

  // Recipe photo
  recipePhoto: {
    width: undefined,
    alignSelf: 'stretch',
    height: 200,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    marginHorizontal: -spacing.lg,
    marginTop: 0,
  },

  // Footer
  footerWrap: {
    backgroundColor: colors.canvas,
    paddingTop: spacing.md,
  },
  footerBtnShadowWrap: {
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
  },
  footerBtnShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  footerBtn: {
    height: 56,
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.white,
  },
});
