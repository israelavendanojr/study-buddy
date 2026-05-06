import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface PhotoResultCardProps {
  title: string;
  stampLabel?: string;
}

export default function PhotoResultCard({ title, stampLabel }: PhotoResultCardProps) {
  return (
    <View style={styles.cardWrap}>
      <View style={styles.cardShadow} />
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>Submitted · Just now</Text>
        </View>
        {stampLabel ? (
          <View style={styles.stampWrap}>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>{stampLabel}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
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
    borderLeftWidth: 8,
    borderLeftColor: colors.amber,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardInner: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: fonts.headline,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    opacity: 0.5,
  },
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
});
