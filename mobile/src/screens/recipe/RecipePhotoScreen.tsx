import React, { useState } from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import { colors, typography, spacing, radius, blockShadow } from '../../theme'
import { validateLesson } from '../../api/client'

const GRADING_CRITERIA = [
  'Correct technique demonstrated',
  'Proper mise en place',
  'Good plating presentation',
  'Safe food handling visible',
]

export default function RecipePhotoScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets()
  const { lessonData, lessonKey, lessonTitle, goal, experience } = route.params

  const criteria: string[] = lessonData?.grading_criteria ?? GRADING_CRITERIA
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function pickPhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: false,
    })
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: false,
    })
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  async function handleSubmit() {
    if (!photoUri) return
    setSubmitting(true)
    navigation.navigate('RecipeFeedbackLoading', {
      ...route.params,
      photoUri,
      notes,
    })
  }

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepLabel}>RECIPE CHALLENGE</Text>
          <Text style={styles.title}>Submit Your Dish</Text>
          <Text style={styles.subtitle}>Photo will be graded by AI on technique, presentation, and safety.</Text>
        </View>

        {/* Photo capture area */}
        <TouchableOpacity
          onPress={pickPhoto}
          activeOpacity={0.85}
          style={[styles.photoArea, photoUri ? styles.photoAreaFilled : styles.photoAreaEmpty, blockShadow.paper]}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.photoHint}>Tap to take a photo</Text>
              <Text style={styles.photoSubhint}>or</Text>
            </View>
          )}
        </TouchableOpacity>

        {!photoUri && (
          <TouchableOpacity onPress={pickFromLibrary} style={styles.libraryLink}>
            <Text style={styles.libraryText}>Choose from library</Text>
          </TouchableOpacity>
        )}

        {photoUri && (
          <TouchableOpacity onPress={pickPhoto} style={styles.retakeLink}>
            <Text style={styles.retakeText}>Retake photo</Text>
          </TouchableOpacity>
        )}

        {/* Grading criteria */}
        <View style={styles.criteriaBox}>
          <Text style={styles.criteriaLabel}>GRADING CRITERIA</Text>
          {criteria.map((c, i) => (
            <View key={i} style={styles.criteriaRow}>
              <Text style={styles.criteriaBullet}>—</Text>
              <Text style={styles.criteriaText}>{c}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>NOTES (OPTIONAL)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Describe any variations or notes about your dish..."
            placeholderTextColor={colors.inkSoft}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton
          label={submitting ? 'Submitting...' : 'Submit for Grading →'}
          onPress={handleSubmit}
          disabled={!photoUri || submitting}
        />
        <InkButton
          label="Skip for Now"
          onPress={() => navigation.navigate('MainTabs')}
          variant="ghost"
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  stepLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.amber,
  },
  title: {
    fontFamily: typography.headlineBold,
    fontSize: 26,
    color: colors.ink,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  photoArea: {
    borderWidth: 2,
    borderRadius: radius.md,
    overflow: 'hidden',
    height: 240,
  },
  photoAreaEmpty: {
    borderColor: colors.ink,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAreaFilled: {
    borderColor: colors.ink,
    borderStyle: 'solid',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  cameraIcon: {
    fontSize: 40,
  },
  photoHint: {
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  photoSubhint: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  libraryLink: {
    alignItems: 'center',
    marginTop: -spacing.sm,
  },
  libraryText: {
    fontFamily: typography.labelMedium,
    fontSize: 13,
    color: colors.amber,
    textDecorationLine: 'underline',
  },
  retakeLink: {
    alignItems: 'center',
    marginTop: -spacing.sm,
  },
  retakeText: {
    fontFamily: typography.labelMedium,
    fontSize: 13,
    color: colors.inkSoft,
    textDecorationLine: 'underline',
  },
  criteriaBox: {
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  criteriaLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.amber,
    marginBottom: 2,
  },
  criteriaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  criteriaBullet: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.amber,
  },
  criteriaText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
    flex: 1,
  },
  notesBox: {
    gap: spacing.xs,
  },
  notesLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.inkSoft,
  },
  notesInput: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.surface,
    minHeight: 80,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
  },
})
