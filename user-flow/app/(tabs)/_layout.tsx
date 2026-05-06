import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, colors, fonts, spacing } from '../../src/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_DEFS = [
  { name: 'index',   label: 'TRAIL',   icon: 'map'        },
  { name: 'kitchen', label: 'KITCHEN', icon: 'restaurant' },
  { name: 'profile', label: 'PROFILE', icon: 'person'     },
] as const;

function GarlicTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const def = TAB_DEFS[i];

        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={() => navigation.navigate(route.name)}
          >
            <View style={focused ? styles.activeBox : undefined}>
              <MaterialIcons
                name={def.icon as any}
                size={22}
                color={focused ? '#FFFFFF' : colors.onSurfaceVariant}
              />
            </View>
            <Text style={[styles.label, { color: focused ? colors.ink : colors.onSurfaceVariant }]}>
              {def.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.canvas,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 4,
  },
  activeBox: {
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  label: {
    fontFamily: fonts.labelMedium,
    fontSize: 10,
    letterSpacing: 1,
  },
});

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <GarlicTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="kitchen" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
