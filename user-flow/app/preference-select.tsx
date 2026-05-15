import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../src/components/GridBackground';
import SelectableCard from '../src/components/SelectableCard';
import { PREFERENCES, PREF_STORAGE_KEY } from '../src/config/preferences';
import { colors, fonts, spacing } from '../src/theme';

const HEADER_HEIGHT = 56;

export default function PreferenceSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prefKey } = useLocalSearchParams<{ prefKey: string }>();

  const pref = PREFERENCES.find((p) => p.key === prefKey);
  const [selectedIndex, setSelectedIndex] = useState(pref?.defaultIndex ?? 0);

  useEffect(() => {
    if (!pref) return;
    AsyncStorage.getItem(PREF_STORAGE_KEY(pref.key)).then((val) => {
      if (val !== null) {
        const idx = pref.options.indexOf(val as never);
        if (idx !== -1) setSelectedIndex(idx);
      }
    });
  }, []);

  const select = (index: number) => {
    setSelectedIndex(index);
  };

  const handleBack = async () => {
    if (pref) {
      await AsyncStorage.setItem(PREF_STORAGE_KEY(pref.key), pref.options[selectedIndex]);
    }
    router.back();
  };

  if (!pref) return null;

  return (
    <View style={styles.root}>
      <GridBackground />
      <View style={[styles.header, { height: HEADER_HEIGHT + insets.top, paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>{pref.label.toUpperCase()}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        {pref.options.map((option, i) => (
          <SelectableCard
            key={option}
            selected={i === selectedIndex}
            onSelect={() => select(i)}
            title={option}
            cardStyle={styles.optionCard}
          />
        ))}
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
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
});
