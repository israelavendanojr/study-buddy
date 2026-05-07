import { MaterialIcons } from '@expo/vector-icons';
import React, { ReactNode, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';
import FlowHeader, { FLOW_HEADER_HEIGHT } from './FlowHeader';
import GradingCriteriaCard from './GradingCriteriaCard';
import GridBackground from './GridBackground';
import InkButton from './InkButton';
import PhotoUploadArea from './PhotoUploadArea';
import StepBadge from './StepBadge';

interface PhotoSubmissionScreenProps {
  flowTitle: string;
  timeMinutes?: number;
  /** Rendered between the FlowHeader and the ScrollView (e.g. RecipeStepIndicator). */
  stepIndicator?: ReactNode;
  /** If provided, a StepBadge with this label is shown at the top of the scroll content. */
  stepBadgeLabel?: string;
  title: string;
  instruction: string;
  gradingCriteria: string[];
  gradingNote: string;
  submitHint: string;
  notesMultiline?: boolean;
  notePlaceholder?: string;
  onNext: () => void;
  onLeft: () => void;
}

export default function PhotoSubmissionScreen({
  flowTitle,
  timeMinutes,
  stepIndicator,
  stepBadgeLabel,
  title,
  instruction,
  gradingCriteria,
  gradingNote,
  submitHint,
  notesMultiline = false,
  notePlaceholder = 'Add a note...',
  onNext,
  onLeft,
}: PhotoSubmissionScreenProps) {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState('');

  return (
    <View style={styles.root}>
      <GridBackground />

      <FlowHeader title={flowTitle} timeMinutes={timeMinutes} onLeft={onLeft} />

      <View style={{ flex: 1, paddingTop: FLOW_HEADER_HEIGHT + insets.top }}>
        {stepIndicator}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeader}>
            {stepBadgeLabel && <StepBadge label={stepBadgeLabel} />}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.instruction}>{instruction}</Text>
          </View>

          <PhotoUploadArea />

          <GradingCriteriaCard
            heading="WHAT WE'RE LOOKING FOR"
            criteria={gradingCriteria.map((label) => ({ label, score: 5, maxScore: 5 }))}
            filledStarColor={colors.ink}
            footer={<Text style={styles.gradingNote}>{gradingNote}</Text>}
          />

          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>ADD NOTES (OPTIONAL)</Text>
            <View style={styles.notesBox}>
              {notes.map((note, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{note}</Text>
                  <Pressable onPress={() => setNotes(notes.filter((_, j) => j !== i))} hitSlop={8}>
                    <MaterialIcons name="close" size={16} color={`${colors.ink}60`} />
                  </Pressable>
                </View>
              ))}
              <View style={[styles.noteInputRow, notesMultiline && styles.noteInputRowMultiline]}>
                <Text style={styles.bullet}>•</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder={notePlaceholder}
                  placeholderTextColor={`${colors.ink}50`}
                  value={newNote}
                  onChangeText={setNewNote}
                  onSubmitEditing={() => {
                    const trimmed = newNote.trim();
                    if (trimmed) {
                      setNotes([...notes, trimmed]);
                      setNewNote('');
                    }
                  }}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  multiline={notesMultiline}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <InkButton label="SUBMIT FOR GRADING →" onPress={onNext} />
          <Text style={styles.submitHint}>{submitHint}</Text>
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
  stepHeader: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.headlineBoldItalic,
    fontSize: 36,
    lineHeight: 40,
    color: colors.ink,
  },
  instruction: {
    fontFamily: fonts.body,
    fontSize: 19,
    lineHeight: 30,
    color: colors.ink,
    opacity: 0.7,
  },
  gradingNote: {
    fontFamily: fonts.headlineItalic,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
  notesSection: {
    gap: spacing.sm,
  },
  notesLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.ink,
  },
  notesBox: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  bullet: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteInputRowMultiline: {
    alignItems: 'flex-start',
  },
  notesInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
    paddingVertical: 2,
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
    gap: spacing.sm,
  },
  submitHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
  },
});
