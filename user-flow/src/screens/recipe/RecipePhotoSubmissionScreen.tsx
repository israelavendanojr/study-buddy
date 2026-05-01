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
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import RecipeHeader, { RECIPE_HEADER_HEIGHT } from '../../components/RecipeHeader';
import RecipeStepIndicator from '../../components/RecipeStepIndicator';
import StepBadge from '../../components/StepBadge';
import { colors, fonts, spacing } from '../../theme';
import { RecipePhotoSubmissionContent } from '../../types/recipe';

interface RecipePhotoSubmissionScreenProps {
  content: RecipePhotoSubmissionContent;
  onNext: () => void;
  onBack: () => void;
}

export default function RecipePhotoSubmissionScreen({
  content,
  onNext,
  onBack,
}: RecipePhotoSubmissionScreenProps) {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');

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
          currentStep={content.stepCount + 1}
          showCameraFinal
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 104 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Step badge + title + instruction */}
          <View style={styles.stepHeader}>
            <StepBadge label={`STEP ${content.stepNumber}`} />
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.instruction}>{content.instruction}</Text>
          </View>

          {/* Grading card */}
          <View style={styles.cardShadowWrap}>
            <View style={styles.cardShadow} />
            <View style={styles.card}>
              <Text style={styles.cardHeading}>WHAT WE'RE LOOKING FOR</Text>
              <View style={styles.criteriaList}>
                {content.gradingCriteria.map((criterion, i) => (
                  <View
                    key={i}
                    style={[
                      styles.criterionRow,
                      i < content.gradingCriteria.length - 1 && styles.criterionBorder,
                    ]}
                  >
                    <Text style={styles.criterionText}>{criterion}</Text>
                    <View style={styles.stars}>
                      {[0, 1, 2, 3, 4].map((s) => (
                        <MaterialIcons key={s} name="star" size={18} color={colors.ink} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.gradingNote}>{content.gradingNote}</Text>
            </View>
          </View>

          {/* Photo upload */}
          <Pressable style={styles.photoUpload}>
            <MaterialIcons name="photo-camera" size={48} color={colors.ink} />
            <Text style={styles.photoLabel}>TAP TO TAKE PHOTO</Text>
            <Text style={styles.photoHint}>or upload from camera roll</Text>
          </Pressable>

          {/* Notes section */}
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>ADD NOTES (OPTIONAL)</Text>
            <View style={styles.notesBox}>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder="Any notes about your cook — what went well, what was tricky..."
                placeholderTextColor={`${colors.ink}50`}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
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
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },

  // Step header
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

  // Grading card with block shadow
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
    gap: spacing.md,
  },
  cardHeading: {
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
    borderStyle: 'solid',
    opacity: 1,
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
  gradingNote: {
    fontFamily: fonts.headlineItalic,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },

  // Photo upload
  photoUpload: {
    height: 200,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  photoLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 2.5,
    color: colors.ink,
  },
  photoHint: {
    fontFamily: fonts.headlineItalic,
    fontSize: 12,
    color: colors.ink,
    opacity: 0.5,
  },

  // Notes
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
    padding: spacing.md,
  },
  notesInput: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    paddingBottom: spacing.sm,
    minHeight: 72,
  },

  // Footer
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
