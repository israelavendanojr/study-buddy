import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface PhotoUploadAreaProps {
  onPress?: () => void;
}

export default function PhotoUploadArea({ onPress }: PhotoUploadAreaProps) {
  return (
    <Pressable style={styles.photoUpload} onPress={onPress}>
      <MaterialIcons name="photo-camera" size={48} color={colors.ink} />
      <Text style={styles.photoLabel}>TAP TO TAKE PHOTO</Text>
      <Text style={styles.photoHint}>or upload from camera roll</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
