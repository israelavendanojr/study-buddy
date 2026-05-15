import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../src/components/GridBackground';
import PressableCard from '../src/components/PressableCard';
import { PREFERENCES, PREF_STORAGE_KEY } from '../src/config/preferences';
import { colors, fonts, spacing } from '../src/theme';

const HEADER_HEIGHT = 56;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<string[]>(
    PREFERENCES.map((p) => p.options[p.defaultIndex])
  );

  useFocusEffect(
    useCallback(() => {
      Promise.all(PREFERENCES.map((p) => AsyncStorage.getItem(PREF_STORAGE_KEY(p.key)))).then(
        (results) => {
          setValues(
            results.map((val, i) =>
              val !== null ? val : PREFERENCES[i].options[PREFERENCES[i].defaultIndex]
            )
          );
        }
      );
    }, [])
  );

  return (
    <View style={styles.root}>
      <GridBackground />
      <View style={[styles.header, { height: HEADER_HEIGHT + insets.top, paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={40} color={colors.canvas} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Israel</Text>
            <View style={styles.profileMeta}>
              <Text style={styles.profileUsername}>@israel0207</Text>
              <Text style={styles.profileUsername}> · Joined 2026</Text>
            </View>
          </View>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          {PREFERENCES.map((pref, i) => (
            <PressableCard
              key={pref.key}
              onPress={() => router.push({ pathname: '/preference-select', params: { prefKey: pref.key } })}
              cardStyle={styles.prefSubcard}
            >
              <Text style={styles.prefLabel}>{pref.label}</Text>
              <View style={styles.prefValueRow}>
                <Text style={styles.prefValue}>{values[i]}</Text>
                <MaterialIcons name="chevron-right" size={18} color={colors.amber} />
              </View>
            </PressableCard>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontFamily: fonts.label,
    fontSize: 16,
    letterSpacing: 4,
    color: colors.ink,
  },
  scroll: {
    flex: 1,
  },
  body: {
    padding: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  profileName: {
    fontFamily: fonts.headline,
    fontSize: 20,
    color: colors.ink,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileUsername: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
  },
  prefSubcard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  prefLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  prefValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  prefValue: {
    fontFamily: fonts.labelMedium,
    fontSize: 13,
    color: colors.amber,
  },
});
