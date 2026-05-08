import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../src/components/GridBackground';
import { colors, fonts, spacing } from '../src/theme';

const HEADER_HEIGHT = 56;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <GridBackground />
      <View style={[styles.header, { height: HEADER_HEIGHT + insets.top, paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.placeholder}>Settings coming soon.</Text>
      </View>
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
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontFamily: fonts.headlineItalic,
    fontSize: 24,
    color: colors.ink,
  },
});
