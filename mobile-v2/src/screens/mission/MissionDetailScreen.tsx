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
import { useUser } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import { colors, typography, spacing, radius, blockShadow } from '../../theme'
import { submitMission } from '../../api/client'

interface Mission {
  id: number
  lesson_title: string
  title: string
  description: string
  tips?: string[]
  status: string
}

export default function MissionDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const mission: Mission = route.params?.mission

  const tips: string[] = mission?.tips ?? []
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const alreadySubmitted = mission?.status === 'submitted' || mission?.status === 'graded'

  async function pickPhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  async function handleSubmit() {
    if (!photoUri || !mission?.id) return
    setSubmitting(true)
    try {
      const result = await submitMission({
        mission_id: mission.id,
        user_id: user?.id ?? '',
        photo_url: photoUri,
        notes,
      })
      navigation.navigate('MissionFeedback', {
        mission,
        feedback: result,
      })
    } catch (e) {
      console.error('[MissionDetail submit]', e)
      navigation.navigate('MissionFeedback', { mission, feedback: null })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenLabel}>KITCHEN MISSION</Text>
          <Text style={styles.title}>{mission?.title}</Text>
          <Text style={styles.lessonRef}>From: {mission?.lesson_title}</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{mission?.description}</Text>

        {/* Tips */}
        {tips.length > 0 && (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsLabel}>TIPS</Text>
            {tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipBullet}>→</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Already submitted notice */}
        {alreadySubmitted ? (
          <View style={styles.submittedNote}>
            <Text style={styles.submittedText}>You have already submitted this mission.</Text>
          </View>
        ) : (
          <>
            {/* Photo area */}
            <TouchableOpacity
              onPress={pickPhoto}
              activeOpacity={0.85}
              style={[
                styles.photoArea,
                photoUri ? styles.photoAreaFilled : styles.photoAreaEmpty,
                blockShadow.paper,
              ]}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.cameraIcon}>📷</Text>
                  <Text style={styles.photoHint}>Tap to photograph your dish</Text>
                </View>
              )}
            </TouchableOpacity>

            {!photoUri && (
              <TouchableOpacity onPress={pickFromLibrary} style={styles.libraryLink}>
                <Text style={styles.libraryText}>Choose from library</Text>
              </TouchableOpacity>
            )}
            {photoUri && (
              <TouchableOpacity onPress={pickPhoto} style={styles.libraryLink}>
                <Text style={styles.libraryText}>Retake photo</Text>
              </TouchableOpacity>
            )}

            {/* Notes */}
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="What did you make? Any substitutions?"
                placeholderTextColor={colors.inkSoft}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {alreadySubmitted ? (
          <InkButton
            label="Back to Kitchen"
            onPress={() => navigation.goBack()}
          />
        ) : (
          <>
            <InkButton
              label={submitting ? 'Submitting...' : 'Submit Mission →'}
              onPress={handleSubmit}
              disabled={!photoUri || submitting}
            />
            <InkButton
              label="Back"
              onPress={() => navigation.goBack()}
              variant="ghost"
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}
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
  screenLabel: {
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
  lessonRef: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  description: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 23,
  },
  tipsBox: {
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  tipsLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.amber,
    marginBottom: 2,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipBullet: {
    fontFamily: typography.labelBold,
    fontSize: 13,
    color: colors.amber,
    lineHeight: 20,
  },
  tipText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
    flex: 1,
  },
  submittedNote: {
    borderWidth: 2,
    borderColor: colors.paperShadow,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  submittedText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  photoArea: {
    borderWidth: 2,
    borderRadius: radius.md,
    overflow: 'hidden',
    height: 220,
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
    gap: spacing.sm,
  },
  cameraIcon: {
    fontSize: 36,
  },
  photoHint: {
    fontFamily: typography.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
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
