import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
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

// ── Color mapping: item_key → hex ─────────────────────────────────────────────

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
type SortKey = 'all' | 'new' | 'affordable'

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
  // enriched on client
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

const RARITY_COLORS: Record<string, string> = {
  common: colors.border,
  uncommon: colors.mint,
  rare: colors.sky,
  legendary: colors.golden,
}

const RARITY_TEXT_COLORS: Record<string, string> = {
  common: colors.muted,
  uncommon: '#3D7A5A',
  rare: '#2A5A8A',
  legendary: '#7A5A10',
}

const TAB_LABELS: Record<TabKey, string> = {
  color: 'Colors',
  accessory: 'Accessories',
  outfit: 'Outfits',
  room_decoration: 'Room Decor',
}

const ITEM_TYPE_SLOT: Record<TabKey, string> = {
  color: 'color',
  accessory: 'accessory',
  outfit: 'outfit',
  room_decoration: 'room_decoration',
}

function isNewItem(createdAt: string): boolean {
  const created = new Date(createdAt)
  const now = new Date()
  return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7
}

// ── CurrencyBar ───────────────────────────────────────────────────────────────

interface CurrencyBarProps {
  coins: number
  gems: number
  onBuyGems: () => void
}

function CurrencyBar({ coins, gems, onBuyGems }: CurrencyBarProps) {
  return (
    <View style={currencyStyles.bar}>
      <View style={currencyStyles.pill}>
        <Text style={currencyStyles.icon}>🪙</Text>
        <Text style={currencyStyles.value}>{coins.toLocaleString()}</Text>
      </View>
      <View style={currencyStyles.pill}>
        <Text style={currencyStyles.icon}>💎</Text>
        <Text style={currencyStyles.value}>{gems}</Text>
      </View>
      <Pressable style={currencyStyles.buyButton} onPress={onBuyGems}>
        <Text style={currencyStyles.buyText}>+ Gems</Text>
      </Pressable>
    </View>
  )
}

const currencyStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { fontSize: 14 },
  value: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.foreground,
  },
  buyButton: {
    marginLeft: 'auto',
    backgroundColor: colors.sky,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  buyText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#2A5A8A',
  },
})

// ── CosmeticGridItem ──────────────────────────────────────────────────────────

interface GridItemProps {
  item: CosmeticItem
  onPress: (item: CosmeticItem) => void
}

const CosmeticGridItem = memo(function CosmeticGridItem({ item, onPress }: GridItemProps) {
  const isColor = item.item_type === 'color'
  const rarityColor = RARITY_COLORS[item.rarity] ?? colors.border
  const isNew = isNewItem(item.created_at)

  return (
    <Pressable
      style={[
        gridStyles.item,
        item.is_equipped && gridStyles.equippedBorder,
      ]}
      onPress={() => onPress(item)}
    >
      {/* Preview */}
      <View style={[gridStyles.preview, isColor && { backgroundColor: getCompanionColor(item.item_key) }]}>
        {!isColor && (
          <Text style={gridStyles.previewEmoji}>
            {item.item_type === 'accessory' ? '🎀' : item.item_type === 'outfit' ? '👕' : '🪴'}
          </Text>
        )}
      </View>

      {/* Rarity dot */}
      <View style={[gridStyles.rarityDot, { backgroundColor: rarityColor }]} />

      {/* Name */}
      <Text style={gridStyles.name} numberOfLines={1}>{item.name}</Text>

      {/* Cost */}
      <Text style={gridStyles.cost}>
        {item.cost_coins > 0 ? `🪙 ${item.cost_coins}` : `💎 ${item.cost_gems}`}
      </Text>

      {/* Badges */}
      {item.is_owned && (
        <View style={gridStyles.ownedBadge}>
          <Text style={gridStyles.ownedText}>{item.is_equipped ? '✓' : '✓'}</Text>
        </View>
      )}
      {isNew && !item.is_owned && (
        <View style={gridStyles.newBadge}>
          <Text style={gridStyles.newText}>NEW</Text>
        </View>
      )}
    </Pressable>
  )
})

const gridStyles = StyleSheet.create({
  item: {
    width: ITEM_SIZE,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    position: 'relative',
  },
  equippedBorder: {
    borderColor: colors.mint,
    borderWidth: 2,
  },
  preview: {
    width: ITEM_SIZE - 20,
    height: ITEM_SIZE - 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewEmoji: {
    fontSize: 28,
  },
  rarityDot: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.foreground,
    textAlign: 'center',
    width: '100%',
  },
  cost: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  ownedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: colors.mint,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownedText: {
    fontSize: 9,
    fontFamily: 'Nunito_700Bold',
    color: colors.foreground,
  },
  newBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: colors.peach,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  newText: {
    fontSize: 8,
    fontFamily: 'Nunito_700Bold',
    color: colors.foreground,
  },
})

// ── Detail Modal ──────────────────────────────────────────────────────────────

interface DetailModalProps {
  item: CosmeticItem | null
  equippedColor: string | null
  coins: number
  gems: number
  onClose: () => void
  onBuy: (item: CosmeticItem, currencyType: 'coins' | 'gems') => Promise<void>
  onEquip: (item: CosmeticItem) => Promise<void>
  onUnequip: (item: CosmeticItem) => Promise<void>
}

function DetailModal({
  item,
  equippedColor,
  coins,
  gems,
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
  const rarityColor = RARITY_COLORS[item.rarity]
  const rarityTextColor = RARITY_TEXT_COLORS[item.rarity]

  const canAffordCoins = coins >= item.cost_coins
  const canAffordGems = gems >= item.cost_gems
  const preferCoins = item.cost_coins > 0
  const preferGems = item.cost_gems > 0 && !preferCoins

  async function handleAction() {
    setActionError(null)
    setActionLoading(true)
    try {
      if (!item!.is_owned) {
        const currencyType = preferCoins ? 'coins' : 'gems'
        await onBuy(item!, currencyType)
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
      if (preferCoins) return `Buy  🪙 ${item!.cost_coins}`
      return `Buy  💎 ${item!.cost_gems}`
    }
    return item!.is_equipped ? 'Unequip' : 'Equip'
  }

  function canAfford() {
    if (item!.is_owned) return true
    if (preferCoins) return canAffordCoins
    return canAffordGems
  }

  const actionDisabled = actionLoading || !canAfford()

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
              <View style={modalStyles.nameRow}>
                <Text style={modalStyles.itemName}>{item.name}</Text>
                <View style={[modalStyles.rarityBadge, { backgroundColor: rarityColor }]}>
                  <Text style={[modalStyles.rarityText, { color: rarityTextColor }]}>
                    {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                  </Text>
                </View>
              </View>

              {item.description && (
                <Text style={modalStyles.description}>{item.description}</Text>
              )}

              {/* Cost row */}
              {!item.is_owned && (
                <View style={modalStyles.costRow}>
                  {item.cost_coins > 0 && (
                    <View style={[modalStyles.costPill, !canAffordCoins && modalStyles.costPillInsufficient]}>
                      <Text style={modalStyles.costPillText}>🪙 {item.cost_coins} coins</Text>
                      {!canAffordCoins && <Text style={modalStyles.insufficientText}> (need {item.cost_coins - coins} more)</Text>}
                    </View>
                  )}
                  {item.cost_gems > 0 && (
                    <View style={[modalStyles.costPill, !canAffordGems && modalStyles.costPillInsufficient]}>
                      <Text style={modalStyles.costPillText}>💎 {item.cost_gems} gems</Text>
                      {!canAffordGems && <Text style={modalStyles.insufficientText}> (need {item.cost_gems - gems} more)</Text>}
                    </View>
                  )}
                  {item.cost_coins === 0 && item.cost_gems === 0 && (
                    <Text style={modalStyles.freeText}>Free</Text>
                  )}
                </View>
              )}

              {/* Error */}
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
                    : [{ backgroundColor: canAfford() ? colors.peach : colors.border }, canAfford() && shadows.peach],
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemName: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 24,
    color: colors.foreground,
    flex: 1,
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
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
    flexWrap: 'wrap',
  },
  costPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  costPillInsufficient: {
    borderColor: '#FFAAAA',
    backgroundColor: '#FFF0F0',
  },
  costPillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.foreground,
  },
  insufficientText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
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

  // ── State ──────────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([])
  const [equipped, setEquipped] = useState<EquippedState>({
    color: null, outfit: null, accessories: [], room_decorations: [],
  })
  const [coins, setCoins] = useState(0)
  const [gems, setGems] = useState(0)

  const [activeTab, setActiveTab] = useState<TabKey>('color')
  const [sortBy, setSortBy] = useState<SortKey>('all')
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null)

  const tabIndicatorX = useRef(new Animated.Value(0)).current
  const TABS: TabKey[] = ['color', 'accessory', 'outfit', 'room_decoration']
  const TAB_WIDTH = (SCREEN_WIDTH - 32) / TABS.length

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
        CosmeticItem[], CosmeticItem[], EquippedState, { coins: number; gems: number }
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
      setGems(statsData.gems ?? 0)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load shop')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Tab animation ──────────────────────────────────────────────────────────

  function handleTabChange(tab: TabKey) {
    const idx = TABS.indexOf(tab)
    Animated.timing(tabIndicatorX, {
      toValue: idx * TAB_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start()
    setActiveTab(tab)
  }

  // ── Derived list ───────────────────────────────────────────────────────────

  const filtered = cosmetics
    .filter((c) => c.item_type === activeTab)
    .filter((c) => {
      if (sortBy === 'new') return isNewItem(c.created_at)
      if (sortBy === 'affordable') return c.cost_coins > 0 || (c.cost_coins === 0 && c.cost_gems === 0)
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'affordable') return a.cost_coins - b.cost_coins
      return 0
    })

  // ── Purchase ───────────────────────────────────────────────────────────────

  async function handleBuy(item: CosmeticItem, currencyType: 'coins' | 'gems') {
    if (!user) return
    const res = await fetch(`${API_BASE}/cosmetics/${user.id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cosmetic_id: item.id, currency_type: currencyType }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail ?? 'Purchase failed')
    }
    setCoins(data.remaining_coins)
    setGems(data.remaining_gems)
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
    if (!res.ok) {
      throw new Error(data.detail ?? 'Equip failed')
    }
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
    if (!res.ok) {
      throw new Error(data.detail ?? 'Unequip failed')
    }
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Shop</Text>
        <View style={styles.companionMini}>
          <Companion size={36} mood="idle" color={previewColor} />
        </View>
      </View>

      {/* Currency bar */}
      <CurrencyBar
        coins={coins}
        gems={gems}
        onBuyGems={() => {
          // stub — real money flow
        }}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={styles.tab}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {TAB_LABELS[tab]}
            </Text>
          </Pressable>
        ))}
        <Animated.View
          style={[
            styles.tabIndicator,
            { width: TAB_WIDTH, transform: [{ translateX: tabIndicatorX }] },
          ]}
        />
      </View>

      {/* Sort controls */}
      <View style={styles.sortRow}>
        {(['all', 'new', 'affordable'] as SortKey[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
            onPress={() => setSortBy(s)}
          >
            <Text style={[styles.sortBtnText, sortBy === s && styles.sortBtnTextActive]}>
              {s === 'all' ? 'All' : s === 'new' ? 'New' : 'Affordable'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Grid */}
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛍</Text>
          <Text style={styles.emptyText}>
            {sortBy !== 'all'
              ? 'No items match this filter'
              : `No ${TAB_LABELS[activeTab].toLowerCase()} available yet`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          numColumns={GRID_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <CosmeticGridItem item={item} onPress={setSelectedItem} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail modal */}
      <DetailModal
        item={selectedItem}
        equippedColor={equipped.color}
        coins={coins}
        gems={gems}
        onClose={() => setSelectedItem(null)}
        onBuy={handleBuy}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
      />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

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

  // Header
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
  companionMini: {
    marginLeft: 8,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.muted,
  },
  tabLabelActive: {
    color: colors.foreground,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    backgroundColor: colors.mint,
    borderRadius: 1,
  },

  // Sort
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnActive: {
    backgroundColor: colors.mint,
    borderColor: colors.mint,
  },
  sortBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.muted,
  },
  sortBtnTextActive: {
    color: colors.foreground,
  },

  // Grid
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 32,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
})
