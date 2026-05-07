import { MaterialIcons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { borderRadius, colors, fonts, spacing } from '../theme';
import PressableCard from './PressableCard';

interface SelectableCardProps {
  selected: boolean;
  onSelect: () => void;
  /** Primary label, rendered with headline font and amber color when selected. Omit if children handles all content. */
  title?: string;
  /** Secondary text rendered below the title in muted body font. */
  description?: string;
  /** Slot for custom content rendered above the title (e.g. icons, large numbers). */
  children?: ReactNode;
  /** Extra styles applied to the animated card face. Use to set padding, alignment, flex, etc. */
  cardStyle?: StyleProp<ViewStyle>;
  /** Extra styles applied to the outer Pressable wrapper. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Selectable card primitive used across onboarding screens.
 *
 * Wraps PressableCard with a consistent selected/unselected border treatment and
 * a checkmark badge when selected. Pass `cardStyle` for padding and layout.
 */
export default function SelectableCard({
  selected,
  onSelect,
  title,
  description,
  children,
  cardStyle,
  style,
}: SelectableCardProps) {
  return (
    <PressableCard
      onPress={onSelect}
      selected={selected}
      style={style}
      cardStyle={[
        styles.card,
        selected ? styles.cardSelected : styles.cardActive,
        cardStyle,
      ]}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <MaterialIcons name="check" size={16} color={colors.white} />
        </View>
      )}
      {children}
      {title != null && (
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
      )}
      {description != null && (
        <Text style={styles.description}>{description}</Text>
      )}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    position: 'relative',
    gap: spacing.xs,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'solid',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.amberDark,
    borderStyle: 'dashed',
  },
  checkBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.amberDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
    zIndex: 5,
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
  },
  titleSelected: {
    color: colors.amberDark,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
});
