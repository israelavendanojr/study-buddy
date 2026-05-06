import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MonkeyMascot from './MonkeyMascot';
import { colors, fonts, spacing } from '../theme';

interface QuestionHeaderProps {
  question: string;
  /** Font size for the question text. Defaults to 18. Onboarding screens use 20. */
  fontSize?: number;
}

export default function QuestionHeader({ question, fontSize = 18 }: QuestionHeaderProps) {
  return (
    <View style={styles.row}>
      <MonkeyMascot size={90} />
      <View style={styles.card}>
        <Text style={[styles.text, { fontSize }]}>{question}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.canvasAlt,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.headlineItalic,
    lineHeight: 26,
    color: colors.ink,
    textAlign: 'center',
  },
});
