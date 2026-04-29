import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  unstable_batchedUpdates,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import MonkeyMascot from '../../components/MonkeyMascot';
import { colors, fonts, spacing } from '../../theme';

interface SequenceScreenProps {
  onNext: () => void;
  onSkip: () => void;
}

interface DragItem {
  key: string;
  label: string;
  originalIndex: number;
}

const STEPS_IN_ORDER = [
  'Heat the pan',
  'Add oil',
  'Pat chicken dry',
  'Add chicken to pan',
  "Don't move it",
  'Flip once',
];

const ITEM_HEIGHT = 68;
const ITEM_GAP = 10;
const SLOT = ITEM_HEIGHT + ITEM_GAP;

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function DragRow({
  item,
  index,
  translateAnim,
  isGhost,
}: {
  item: DragItem;
  index: number;
  translateAnim: Animated.Value;
  isGhost: boolean;
}) {
  return (
    <Animated.View
      style={[
        styles.rowShadow,
        isGhost && styles.rowShadowGhost,
        { transform: [{ translateY: translateAnim }] },
      ]}
    >
      <View style={[styles.row, isGhost && styles.rowGhost]}>
        <MaterialIcons
          name="drag-indicator"
          size={22}
          color={isGhost ? colors.amber : colors.onSurfaceVariant}
          style={styles.dragHandle}
        />
        <Text style={[styles.rowText, isGhost && styles.rowTextGhost]}>
          {item.label}
        </Text>
        <View style={[styles.numberBadge, isGhost && styles.numberBadgeGhost]}>
          <Text style={[styles.numberText, isGhost && styles.numberTextGhost]}>
            {index + 1}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function FloatingDragRow({
  item,
  position,
  colorAnim,
}: {
  item: DragItem;
  position: number;
  colorAnim: Animated.Value;
}) {
  const [borderStyle, setBorderStyle] = useState<'dashed' | 'solid'>('dashed');

  useEffect(() => {
    const id = colorAnim.addListener(({ value }) => {
      setBorderStyle(value > 0.6 ? 'solid' : 'dashed');
    });
    return () => colorAnim.removeListener(id);
  }, [colorAnim]);

  const accentColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.amber, colors.ink],
  });
  const badgeBg = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.amber, colors.canvas],
  });
  const badgeTextColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.white, colors.ink],
  });
  const iconAmberOpacity = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Animated.View style={[styles.rowShadow, styles.rowShadowFloating, { shadowColor: accentColor }]}>
      <Animated.View style={[styles.row, styles.rowFloating, { borderColor: accentColor, borderStyle }]}>
        {/* Cross-fade drag handle: amber fades out, ink fades in */}
        <View style={{ width: 22, height: 22, flexShrink: 0 }}>
          <MaterialIcons
            name="drag-indicator"
            size={22}
            color={colors.onSurfaceVariant}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={{ opacity: iconAmberOpacity }}>
            <MaterialIcons name="drag-indicator" size={22} color={colors.amber} />
          </Animated.View>
        </View>
        <Animated.Text style={[styles.rowText, { color: accentColor }]}>
          {item.label}
        </Animated.Text>
        <Animated.View
          style={[styles.numberBadge, { borderColor: accentColor, backgroundColor: badgeBg }]}
        >
          <Animated.Text style={[styles.numberText, { color: badgeTextColor }]}>
            {position + 1}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function SkipButton({ onPress }: { onPress: () => void }) {
  const translateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(translateAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(translateAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.skipWrapper}
    >
      <Animated.View
        style={[
          styles.skipShadow,
          {
            opacity: translateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.skipButton,
          {
            transform: [
              {
                translateX: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 4],
                }),
              },
              {
                translateY: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 4],
                }),
              },
            ],
          },
        ]}
      >
        <MaterialIcons name="skip-next" size={18} color={colors.ink} />
        <Text style={styles.skipLabel}>SKIP</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function SequenceScreen({
  onNext,
  onSkip,
}: SequenceScreenProps) {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<DragItem[]>(() =>
    shuffleArray(
      STEPS_IN_ORDER.map((label, i) => ({ key: `item-${i}`, label, originalIndex: i }))
    )
  );
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState(0);

  // Stable refs
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const draggingKeyRef = useRef<string | null>(null);
  const dragStartIdxRef = useRef<number>(0);
  const dragStartPageYRef = useRef<number>(0);
  const currentHoverIdxRef = useRef<number>(0);
  const dropSessionRef = useRef<number>(0);
  const listRef = useRef<View>(null);
  const listPageYRef = useRef(0);

  // Animated values
  const floatingTopAnim = useRef(new Animated.Value(0)).current;
  const colorTransitionAnim = useRef(new Animated.Value(0)).current;
  const itemTranslateAnims = useRef<Record<string, Animated.Value>>({});

  // Ensure every item has an anim value
  items.forEach((item) => {
    if (!itemTranslateAnims.current[item.key]) {
      itemTranslateAnims.current[item.key] = new Animated.Value(0);
    }
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const relY = evt.nativeEvent.pageY - listPageYRef.current;
          const startIdx = Math.max(
            0,
            Math.min(itemsRef.current.length - 1, Math.floor(relY / SLOT))
          );
          const key = itemsRef.current[startIdx]?.key;
          if (!key) return;

          dragStartIdxRef.current = startIdx;
          dragStartPageYRef.current = evt.nativeEvent.pageY;
          currentHoverIdxRef.current = startIdx;
          draggingKeyRef.current = key;

          dropSessionRef.current += 1; // invalidate any in-flight drop callback
          floatingTopAnim.setValue(startIdx * SLOT);
          colorTransitionAnim.setValue(0);
          setHoverIndex(startIdx);
          setDraggingKey(key);
        },
        onPanResponderMove: (evt) => {
          const key = draggingKeyRef.current;
          if (!key) return;

          const dy = evt.nativeEvent.pageY - dragStartPageYRef.current;
          const startIdx = dragStartIdxRef.current;
          const n = itemsRef.current.length;

          const floatingTop = Math.max(0, Math.min((n - 1) * SLOT, startIdx * SLOT + dy));
          floatingTopAnim.setValue(floatingTop);

          const hoverIdx = Math.max(0, Math.min(n - 1, Math.round(floatingTop / SLOT)));

          if (currentHoverIdxRef.current !== hoverIdx) {
            currentHoverIdxRef.current = hoverIdx;
            setHoverIndex(hoverIdx);

            itemsRef.current.forEach((item, i) => {
              if (item.key === key) return;
              let shift = 0;
              if (hoverIdx < startIdx && i >= hoverIdx && i < startIdx) {
                shift = SLOT;
              } else if (hoverIdx > startIdx && i > startIdx && i <= hoverIdx) {
                shift = -SLOT;
              }
              const anim = itemTranslateAnims.current[item.key];
              if (anim) {
                Animated.spring(anim, {
                  toValue: shift,
                  tension: 300,
                  friction: 30,
                  useNativeDriver: true,
                }).start();
              }
            });
          }
        },
        onPanResponderRelease: () => {
          const key = draggingKeyRef.current;
          if (!key) {
            setDraggingKey(null);
            return;
          }
          const fromIdx = dragStartIdxRef.current;
          const toIdx = currentHoverIdxRef.current;

          // Snap floating card to its landing slot and fade colors back, then commit
          const thisSession = ++dropSessionRef.current;
          Animated.parallel([
            Animated.spring(floatingTopAnim, {
              toValue: toIdx * SLOT,
              tension: 400,
              friction: 28,
              useNativeDriver: false,
            }),
            Animated.timing(colorTransitionAnim, {
              toValue: 1,
              duration: 220,
              useNativeDriver: false,
            }),
          ]).start(({ finished }) => {
            // If a new drag started before this settled, bail — don't mutate state mid-drag
            if (!finished || dropSessionRef.current !== thisSession) return;

            Object.values(itemTranslateAnims.current).forEach((a) => a.setValue(0));
            draggingKeyRef.current = null;
            // Batch both updates into one render so the ghost never flickers visible mid-swap
            unstable_batchedUpdates(() => {
              setItems((prev) => {
                if (fromIdx === toIdx) return prev;
                const next = [...prev];
                const [moved] = next.splice(fromIdx, 1);
                next.splice(toIdx, 0, moved);
                return next;
              });
              setDraggingKey(null);
            });
          });
        },
        onPanResponderTerminate: () => {
          Object.values(itemTranslateAnims.current).forEach((a) => a.setValue(0));
          colorTransitionAnim.setValue(0);
          draggingKeyRef.current = null;
          setDraggingKey(null);
        },
      }),
    []
  );

  const draggingItem = draggingKey ? items.find((i) => i.key === draggingKey) ?? null : null;

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Spacer for overlay progress bar */}
      <View style={{ height: insets.top + 52 }} />

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!draggingKey}
      >
        {/* Question row: mascot + prompt card */}
        <View style={styles.questionRow}>
          <MonkeyMascot size={90} />
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>Put these steps in the correct order.</Text>
          </View>
        </View>

        {/* Drag label */}
        <View style={styles.dragLabelRow}>
          <MaterialIcons name="swap-vert" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.dragLabel}>DRAG TO REORDER</Text>
        </View>

        {/* Drag list */}
        <View
          ref={listRef}
          style={styles.list}
          onLayout={() => {
            listRef.current?.measure((_x, _y, _w, _h, _px, py) => {
              listPageYRef.current = py;
            });
          }}
          {...panResponder.panHandlers}
        >
          {items.map((item, index) => (
            <DragRow
              key={item.key}
              item={item}
              index={index}
              translateAnim={
                itemTranslateAnims.current[item.key] ?? new Animated.Value(0)
              }
              isGhost={draggingKey === item.key}
            />
          ))}

          {/* Floating card — renders on top while dragging */}
          {draggingItem && (
            <Animated.View
              pointerEvents="none"
              style={[styles.floatingCard, { top: floatingTopAnim }]}
            >
              <FloatingDragRow item={draggingItem} position={hoverIndex} colorAnim={colorTransitionAnim} />
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <SkipButton onPress={onSkip} />
        <View style={styles.checkButtonWrapper}>
          <InkButton label="CHECK" onPress={onNext} />
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
  header: {
    backgroundColor: colors.canvas,
    zIndex: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },

  // Question row
  questionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  questionCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.canvasAlt,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: {
    fontFamily: fonts.headlineItalic,
    fontSize: 18,
    lineHeight: 26,
    color: colors.ink,
    textAlign: 'center',
  },

  // Drag label
  dragLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: -spacing.sm,
  },
  dragLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
  },

  // List
  list: {
    gap: ITEM_GAP,
  },

  // Row base
  rowShadow: {
    shadowColor: colors.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    height: ITEM_HEIGHT,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    flex: 1,
  },
  dragHandle: {
    flexShrink: 0,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
  },

  // Ghost (placeholder while item is floating) — invisible spacer
  rowShadowGhost: {
    opacity: 0,
  },
  rowGhost: {},
  rowTextGhost: {},
  numberBadgeGhost: {},
  numberTextGhost: {},

  // Floating card (the lifted item)
  floatingCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    zIndex: 999,
  },
  rowShadowFloating: {
    shadowColor: colors.amber,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  rowFloating: {
    borderColor: colors.amber,
    borderStyle: 'dashed',
    backgroundColor: colors.canvas,
  },
  rowTextActive: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.amber,
    flex: 1,
  },
  numberBadgeFloating: {
    borderColor: colors.amber,
    backgroundColor: colors.amber,
  },
  numberTextFloating: {
    color: colors.white,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.canvasAlt,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },

  // Skip button
  skipWrapper: {
    width: '35%',
    height: 56,
    position: 'relative',
  },
  skipShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  skipButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 4,
    bottom: 4,
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  skipLabel: {
    fontFamily: fonts.label,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.ink,
  },

  // Check button
  checkButtonWrapper: {
    flex: 1,
  },
});
