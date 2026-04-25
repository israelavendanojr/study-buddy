import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors, typography, spacing } from '../../theme'

export type NavTab = 'Trail' | 'Kitchen' | 'Profile'

interface Props {
  active: NavTab
  onPress: (tab: NavTab) => void
}

function TrailIcon({ active }: { active: boolean }) {
  const c = active ? colors.amber : colors.inkSoft
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="2.5" stroke={c} strokeWidth="2" />
      <Circle cx="5" cy="12" r="2.5" stroke={c} strokeWidth="2" />
      <Circle cx="19" cy="12" r="2.5" stroke={c} strokeWidth="2" />
      <Circle cx="12" cy="19" r="2.5" stroke={c} strokeWidth="2" />
      <Path d="M12 7.5V9.5M6.8 10l2.4 1.2M17.2 10l-2.4 1.2M7 14l2.5 2.5M17 14l-2.5 2.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

function KitchenIcon({ active }: { active: boolean }) {
  const c = active ? colors.amber : colors.inkSoft
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M8 2v4M12 2v4M16 2v4M5 6h14v2a7 7 0 0 1-14 0V6z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 16v6M14 16v6M8 22h8" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? colors.amber : colors.inkSoft
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={c} strokeWidth="2" />
      <Path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

const TABS: { key: NavTab; label: string; Icon: React.FC<{ active: boolean }> }[] = [
  { key: 'Trail', label: 'Trail', Icon: TrailIcon },
  { key: 'Kitchen', label: 'Kitchen', Icon: KitchenIcon },
  { key: 'Profile', label: 'Profile', Icon: ProfileIcon },
]

export default function BottomNav({ active, onPress }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 4 }]}>
      {TABS.map(({ key, label, Icon }) => {
        const isActive = active === key
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            onPress={() => onPress(key)}
            activeOpacity={0.7}
          >
            <Icon active={isActive} />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {label}
            </Text>
            {isActive && <View style={styles.activeBar} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    position: 'relative',
  },
  tabLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  tabLabelActive: {
    color: colors.amber,
  },
  activeBar: {
    position: 'absolute',
    top: -10,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: colors.amber,
    borderRadius: 2,
  },
})
