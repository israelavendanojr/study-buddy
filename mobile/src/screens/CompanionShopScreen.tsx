import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'
const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_COLUMNS = 3
const GRID_GAP = 10
const GRID_PADDING = 16
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS

// ── Color mapping ─────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  mint_color: colors.mint,
  peach_color: colors.peach,
  sky_color: colors.sky,
  golden_color: colors.golden,
  lavender_color: '#D4B8F8',
  coral_color: '#FF8B7B',
  sage_color: '#B8D4B0',
  rose_color: '#F8B8D4',
}

function getCompanionColor(itemKey: string | null): string {
  if (!itemKey) return colors.mint
  return COLOR_MAP[itemKey] ?? colors.mint
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = 'color' | 'accessory' | 'outfit' | 'room_decoration'

interface CosmeticItem {
  id: number
  item_key: string
  name: string
  description: string | null
  item_type: TabKey
  cost_coins: number
  cost_gems: number
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  unlock_condition: string | null
  created_at: string
  is_owned?: boolean
  is_equipped?: boolean
}

interface EquippedState {
  color: string | null
  outfit: string | null
  accessories: string[]
  room_decorations: Array<{ item_id: string; x: number; y: number }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ITEM_TYPE_SLOT: Record<TabKey, string> = {
  color: 'color',
  accessory: 'accessory',
  outfit: 'outfit',
  room_decoration: 'room_decoration',
}

// Tab order and display labels per spec
const TABS: TabKey[] = ['outfit', 'room_decoration', 'color', 'accessory']
const TAB_LABELS: Record<TabKey, string> = {
  outfit: 'Outfit',
  room_decoration: 'Furniture',
  color: 'Color',
  accessory: 'Travel',
}

// ── Item type accent colors (for grid previews) ───────────────────────────────

const TYPE_ACCENT: Record<TabKey, string> = {
  color:           colors.border,
  outfit:          '#FFD9C4',
  accessory:       '#C8E8FF',
  room_decoration: '#C4EDD8',
}

// ── Featured bundles data ─────────────────────────────────────────────────────

const FEATURED_BUNDLES = [
  { id: 'f1', name: 'Summer Outfit',   cost: 1200, color: '#FFD9C4', badge: null },
  { id: 'f2', name: 'Beach Vibes',     cost: 800,  color: '#C8E8FF', badge: null },
  { id: 'f3', name: 'World Explorer',  cost: 600,  color: '#C4EDD8', badge: 'Travel' },
]

// ── CosmeticGridItem ──────────────────────────────────────────────────────────

interface GridItemProps {
  item: CosmeticItem
  onPress: (item: CosmeticItem) => void
}

const CosmeticGridItem = memo(function CosmeticGridItem({ item, onPress }: GridItemProps) {
  const isColor = item.item_type === 'color'
  const previewBg = isColor ? getCompanionColor(item.item_key) : TYPE_ACCENT[item.item_type]
  const costLabel = item.cost_coins === 0 ? 'Free' : `${item.cost_coins} coins`

  return (
    <Pressable
      style={({ pressed }) => [
        gridStyles.item,
        item.is_equipped && gridStyles.equippedBorder,
        pressed && { opacity: 0.8 },
      ]}
      onPress={() => onPress(item)}
    >
      {/* Preview */}
      <View style={[gridStyles.preview, { backgroundColor: previewBg }]}>
        {!isColor && (
          <Text style={gridStyles.previewInitial}>{item.name.charAt(0).toUpperCase()}</Text>
        )}
      </View>

      {/* Cost */}
      <Text style={gridStyles.cost}>{costLabel}</Text>

      {/* Owned checkmark */}
      {item.is_owned && (
        <View style={gridStyles.ownedBadge}>
          <Text style={gridStyles.ownedText}>✓</Text>
        </View>
      )}
    </Pressable>
  )
})

const gridStyles = StyleSheet.create({
  item: {
    width: ITEM_SIZE,
    backgroundColor: '#F0EBE1',
    borderRadius: radius.sm,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  equippedBorder: {
    borderColor: colors.mint,
  },
  preview: {
    width: ITEM_SIZE - 24,
    height: ITEM_SIZE - 24,
    borderRadius: 10,
    backgroundColor: colors.border,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInitial: {
    fontSize: 28,
    fontFamily: 'FredokaOne_400Regular',
    color: colors.foreground,
    opacity: 0.5,
  },
  cost: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.foreground,
    marginTop: 2,
  },
  ownedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#5CCB8F',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownedText: {
    fontSize: 9,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
})

// ── Detail Modal ──────────────────────────────────────────────────────────────

interface DetailModalProps {
  item: CosmeticItem | null
  equippedColor: string | null
  coins: number
  onClose: () => void
  onBuy: (item: CosmeticItem) => Promise<void>
  onEquip: (item: CosmeticItem) => Promise<void>
  onUnequip: (item: CosmeticItem) => Promise<void>
}

function DetailModal({
  item,
  equippedColor,
  coins,
  onClose,
  onBuy,
  onEquip,
  onUnequip,
}: DetailModalProps) {
  const slideAnim = useRef(new Animated.Value(400)).current
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (item) {
      setActionError(null)
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }).start()
    } else {
      slideAnim.setValue(400)
    }
  }, [item])

  if (!item) return null

  const isColor = item.item_type === 'color'
  const previewColor = isColor ? getCompanionColor(item.item_key) : getCompanionColor(equippedColor)

  const canAfford = item.is_owned || coins >= item.cost_coins

  async function handleAction() {
    setActionError(null)
    setActionLoading(true)
    try {
      if (!item!.is_owned) {
        await onBuy(item!)
      } else if (item!.is_equipped) {
        await onUnequip(item!)
      } else {
        await onEquip(item!)
      }
    } catch (e: any) {
      setActionError(e.message ?? 'Something went wrong')
    } finally {
      setActionLoading(false)
    }
  }

  function getActionLabel() {
    if (!item!.is_owned) {
      return item!.cost_coins === 0 ? 'Get for Free' : `Buy  ${item!.cost_coins} coins`
    }
    return item!.is_equipped ? 'Unequip' : 'Equip'
  }

  const actionDisabled = actionLoading || !canAfford

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Animated.View
          style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable>
            {/* Handle */}
            <View style={modalStyles.handle} />

            {/* Close */}
            <Pressable style={modalStyles.closeBtn} onPress={onClose}>
              <Text style={modalStyles.closeBtnText}>✕</Text>
            </Pressable>

            {/* Preview */}
            <View style={modalStyles.previewArea}>
              <Companion size={100} mood="happy" color={previewColor} />
              {isColor && (
                <View style={[modalStyles.colorSwatch, { backgroundColor: getCompanionColor(item.item_key) }]} />
              )}
            </View>

            {/* Info */}
            <View style={modalStyles.info}>
              <Text style={modalStyles.itemName}>{item.name}</Text>

              {item.description && (
                <Text style={modalStyles.description}>{item.description}</Text>
              )}

              {/* Cost */}
              {!item.is_owned && (
                <View style={modalStyles.costRow}>
                  {item.cost_coins === 0 ? (
                    <Text style={modalStyles.freeText}>Free</Text>
                  ) : (
                    <View style={[modalStyles.costPill, !canAfford && modalStyles.costPillInsufficient]}>
                      <Text style={modalStyles.costPillText}>{item.cost_coins} coins</Text>
                      {!canAfford && (
                        <Text style={modalStyles.insufficientText}> · need {item.cost_coins - coins} more</Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              {actionError && (
                <Text style={modalStyles.errorText}>{actionError}</Text>
              )}
            </View>

            {/* Action button */}
            <View style={modalStyles.actionArea}>
              <Pressable
                style={[
                  modalStyles.actionBtn,
                  item.is_equipped
                    ? { backgroundColor: colors.border }
                    : item.is_owned
                    ? [{ backgroundColor: colors.mint }, shadows.mint]
                    : [{ backgroundColor: canAfford ? colors.peach : colors.border }, canAfford && shadows.peach],
                  actionDisabled && { opacity: 0.5 },
                ]}
                onPress={handleAction}
                disabled={actionDisabled}
              >
                {actionLoading
                  ? <ActivityIndicator color={colors.foreground} />
                  : <Text style={modalStyles.actionBtnText}>{getActionLabel()}</Text>
                }
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    padding: 8,
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.muted,
    fontFamily: 'Nunito_700Bold',
  },
  previewArea: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  info: {
    paddingHorizontal: 24,
    gap: 10,
  },
  itemName: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 24,
    color: colors.foreground,
  },
  description: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  costRow: {
    flexDirection: 'row',
    gap: 8,
  },
  costPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  costPillInsufficient: {
    borderColor: '#FFAAAA',
    backgroundColor: '#FFF0F0',
  },
  costPillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.foreground,
  },
  insufficientText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: '#CC4444',
  },
  freeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.mint,
  },
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#CC4444',
    textAlign: 'center',
    marginTop: 4,
  },
  actionArea: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  actionBtn: {
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.foreground,
  },
})

// ── CompanionShopScreen ───────────────────────────────────────────────────────

export default function CompanionShopScreen() {
  const { user } = useUser()
  const navigation = useNavigation<StackNavigationProp<any>>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([])
  const [equipped, setEquipped] = useState<EquippedState>({
    color: null, outfit: null, accessories: [], room_decorations: [],
  })
  const [coins, setCoins] = useState(0)

  const [activeTab, setActiveTab] = useState<TabKey>('outfit')
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [allRes, invRes, equippedRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/cosmetics`),
        fetch(`${API_BASE}/cosmetics/${user.id}/inventory`),
        fetch(`${API_BASE}/cosmetics/${user.id}/equipped`),
        fetch(`${API_BASE}/companion/${user.id}/stats`),
      ])

      if (!allRes.ok || !invRes.ok || !equippedRes.ok || !statsRes.ok) {
        throw new Error('Failed to load shop data')
      }

      const [allItems, invItems, equippedData, statsData]: [
        CosmeticItem[], CosmeticItem[], EquippedState, { coins: number }
      ] = await Promise.all([allRes.json(), invRes.json(), equippedRes.json(), statsRes.json()])

      const ownedIds = new Set(invItems.map((i) => i.id))
      const equippedKeys = new Set([
        equippedData.color,
        equippedData.outfit,
        ...(equippedData.accessories ?? []),
        ...(equippedData.room_decorations ?? []).map((d) => d.item_id),
      ])

      const enriched: CosmeticItem[] = allItems.map((item) => ({
        ...item,
        is_owned: ownedIds.has(item.id),
        is_equipped: equippedKeys.has(item.item_key),
      }))

      setCosmetics(enriched)
      setEquipped(equippedData)
      setCoins(statsData.coins ?? 0)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load shop')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Tab change ─────────────────────────────────────────────────────────────

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab)
  }

  // ── Derived list ───────────────────────────────────────────────────────────

  const filtered = cosmetics.filter((c) => c.item_type === activeTab)

  // ── Purchase (coins only) ──────────────────────────────────────────────────

  async function handleBuy(item: CosmeticItem) {
    if (!user) return
    const res = await fetch(`${API_BASE}/cosmetics/${user.id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cosmetic_id: item.id, currency_type: 'coins' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail ?? 'Purchase failed')
    setCoins(data.remaining_coins)
    setCosmetics((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, is_owned: true } : c))
    )
    if (selectedItem?.id === item.id) {
      setSelectedItem((prev) => prev ? { ...prev, is_owned: true } : prev)
    }
  }

  // ── Equip ──────────────────────────────────────────────────────────────────

  async function handleEquip(item: CosmeticItem) {
    if (!user) return
    const res = await fetch(`${API_BASE}/cosmetics/${user.id}/equip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cosmetic_id: item.id, slot: ITEM_TYPE_SLOT[item.item_type] }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail ?? 'Equip failed')
    setEquipped(data.equipped)
    const newEquippedKeys = new Set([
      data.equipped.color,
      data.equipped.outfit,
      ...(data.equipped.accessories ?? []),
      ...(data.equipped.room_decorations ?? []).map((d: any) => d.item_id),
    ])
    setCosmetics((prev) =>
      prev.map((c) => ({ ...c, is_equipped: newEquippedKeys.has(c.item_key) }))
    )
    if (selectedItem?.id === item.id) {
      setSelectedItem((prev) => prev ? { ...prev, is_equipped: true } : prev)
    }
  }

  // ── Unequip ────────────────────────────────────────────────────────────────

  async function handleUnequip(item: CosmeticItem) {
    if (!user) return
    const res = await fetch(`${API_BASE}/cosmetics/${user.id}/unequip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cosmetic_id: item.id, slot: ITEM_TYPE_SLOT[item.item_type] }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail ?? 'Unequip failed')
    setEquipped(data.equipped)
    const newEquippedKeys = new Set([
      data.equipped.color,
      data.equipped.outfit,
      ...(data.equipped.accessories ?? []),
      ...(data.equipped.room_decorations ?? []).map((d: any) => d.item_id),
    ])
    setCosmetics((prev) =>
      prev.map((c) => ({ ...c, is_equipped: newEquippedKeys.has(c.item_key) }))
    )
    if (selectedItem?.id === item.id) {
      setSelectedItem((prev) => prev ? { ...prev, is_equipped: false } : prev)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shop</Text>
        </View>
        <View style={styles.centered}>
          <Companion size={100} mood="thinking" />
          <ActivityIndicator color={colors.mint} style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Loading shop…</Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shop</Text>
        </View>
        <View style={styles.centered}>
          <Companion size={100} mood="sad" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={[styles.retryBtn, shadows.mint]} onPress={fetchAll}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────

  const previewColor = getCompanionColor(equipped.color)

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Shop</Text>
        <View style={styles.headerRight}>
          <Companion size={36} mood="idle" color={previewColor} />
          <View style={styles.coinPill}>
            <View style={styles.coinDot} />
            <Text style={styles.coinPillText}>{coins.toLocaleString()} coins</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        numColumns={GRID_COLUMNS}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Featured bundles ───────────────────────────────────────── */}
            <ScrollView
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
              style={styles.featuredContainer}
            >
              {FEATURED_BUNDLES.map((bundle) => (
                <View key={bundle.id} style={styles.featuredCard}>
                  {/* Price badge */}
                  <View style={styles.featuredPriceBadge}>
                    <Text style={styles.featuredPriceText}>{bundle.cost} coins</Text>
                  </View>

                  {/* Travel badge */}
                  {bundle.badge && (
                    <View style={styles.featuredLabelBadge}>
                      <Text style={styles.featuredLabelText}>{bundle.badge}</Text>
                    </View>
                  )}

                  {/* Accent shape */}
                  <View style={[styles.featuredAccentWrap, { backgroundColor: bundle.color }]}>
                    <Text style={styles.featuredAccentLetter}>{bundle.name.charAt(0)}</Text>
                  </View>

                  {/* Name */}
                  <Text style={styles.featuredName}>{bundle.name}</Text>
                </View>
              ))}
            </ScrollView>

            {/* ── Category tabs ──────────────────────────────────────────── */}
            <View style={styles.tabsRow}>
              {TABS.map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
                  onPress={() => handleTabChange(tab)}
                >
                  <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
                    {TAB_LABELS[tab]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Collection heading ─────────────────────────────────────── */}
            <Text style={styles.collectionHeading}>Everyday Collection</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {`No ${TAB_LABELS[activeTab].toLowerCase()} available yet`}
            </Text>
          </View>
        }
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <CosmeticGridItem item={item} onPress={setSelectedItem} />
        )}
      />

      {/* ── Detail modal ───────────────────────────────────────────────────── */}
      <DetailModal
        item={selectedItem}
        equippedColor={equipped.color}
        coins={coins}
        onClose={() => setSelectedItem(null)}
        onBuy={handleBuy}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
      />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const LAVENDER = '#C4B5F4'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
  },
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.mint,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  retryBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.foreground,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  backBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: colors.foreground,
    lineHeight: 30,
  },
  title: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 28,
    color: colors.foreground,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.golden,
  },
  coinPillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.foreground,
  },

  // ── Featured bundles ────────────────────────────────────────────────────────
  featuredContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  featuredScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredCard: {
    width: 220,
    height: 160,
    backgroundColor: LAVENDER,
    borderRadius: radius.md,
    padding: 14,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  featuredPriceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  featuredPriceText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  featuredLabelBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.golden,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredLabelText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 9,
    color: colors.foreground,
  },
  featuredAccentWrap: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
  },
  featuredAccentLetter: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 28,
    color: colors.foreground,
  },
  featuredName: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },

  // ── Category tabs ────────────────────────────────────────────────────────────
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: colors.foreground,
  },
  tabPillText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.muted,
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },

  // ── Collection heading ───────────────────────────────────────────────────────
  collectionHeading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  // ── Grid ────────────────────────────────────────────────────────────────────
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 40,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
})
