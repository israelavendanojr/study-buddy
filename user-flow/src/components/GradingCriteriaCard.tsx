import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

export interface CriterionRow {
  label: string;
  score: number;    // how many stars are filled
  maxScore: number; // total stars to render
}

interface GradingCriteriaCardProps {
  heading: string;
  criteria: CriterionRow[];
  filledStarColor?: string;
  footer?: React.ReactNode;
}

export default function GradingCriteriaCard({
  heading,
  criteria,
  filledStarColor = colors.ink,
  footer,
}: GradingCriteriaCardProps) {
  return (
    <View style={styles.shadowWrap}>
      <View style={styles.shadow} />
      <View style={styles.card}>
        <Text style={styles.heading}>{heading}</Text>
        <View style={styles.criteriaList}>
          {criteria.map((criterion, i) => (
            <View
              key={i}
              style={[
                styles.criterionRow,
                i < criteria.length - 1 && styles.criterionBorder,
              ]}
            >
              <Text style={styles.criterionText}>{criterion.label}</Text>
              <View style={styles.stars}>
                {Array.from({ length: criterion.maxScore }).map((_, s) => (
                  <MaterialIcons
                    key={s}
                    name={s < criterion.score ? 'star' : 'star-border'}
                    size={18}
                    color={s < criterion.score ? filledStarColor : `${colors.ink}40`}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
        {footer && (
          <View style={styles.footer}>
            {footer}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
  },
  shadow: {
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
    gap: spacing.md,
  },
  heading: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.amber,
  },
  criteriaList: {
    gap: 0,
  },
  criterionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  criterionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  criterionText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    flexShrink: 0,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: `${colors.ink}20`,
    paddingTop: spacing.md,
  },
});
