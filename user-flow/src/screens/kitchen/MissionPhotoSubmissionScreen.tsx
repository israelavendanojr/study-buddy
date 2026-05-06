import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FlowHeader, { FLOW_HEADER_HEIGHT } from '../../components/FlowHeader';
import GradingCriteriaCard from '../../components/GradingCriteriaCard';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import PhotoUploadArea from '../../components/PhotoUploadArea';
import { colors, fonts, spacing } from '../../theme';

export interface MissionPhotoSubmissionContent {
  title: string;
  instruction: string;
  gradingCriteria: string[];
  gradingNote: string;
  submitHint: string;
}

interface Props {
  content: MissionPhotoSubmissionContent;
  onNext: () => void;
  onClose: () => void;
}

export default function MissionPhotoSubmissionScreen({ content, onNext, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState('');

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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title + instruction */}
          <View style={styles.stepHeader}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.instruction}>{content.instruction}</Text>
          </View>

          {/* Photo upload */}
          <PhotoUploadArea />
          
          {/* Grading criteria */}
          <GradingCriteriaCard
            heading="WHAT WE'RE LOOKING FOR"
            criteria={content.gradingCriteria.map((label) => ({ label, score: 5, maxScore: 5 }))}
            filledStarColor={colors.ink}
            footer={<Text style={styles.gradingNote}>{content.gradingNote}</Text>}
          />


          {/* Notes section */}
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
              <View style={styles.noteInputRow}>
                <Text style={styles.bullet}>•</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Any notes about your cook — what went well, what was tricky..."
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
                  multiline
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <InkButton label="SUBMIT FOR GRADING →" onPress={onNext} />
          <Text style={styles.submitHint}>{content.submitHint}</Text>
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
    alignItems: 'flex-start',
    gap: spacing.sm,
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
