import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useUser } from '@clerk/clerk-expo'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

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

function getCompanionColor(key: string | null | undefined): string {
  if (!key) return colors.mint
  return COLOR_MAP[key] ?? colors.mint
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserResult {
  clerk_user_id: string
  display_name: string | null
  companion_color_key: string | null
  level: number
}

interface PendingRequest {
  friendship_id: number
  requester_id: string
  display_name: string | null
  companion_color_key: string | null
  level: number
  created_at: string
}

type RelationStatus = 'none' | 'pending_sent' | 'friends'

// ── FriendSearchScreen ────────────────────────────────────────────────────────

export default function FriendSearchScreen() {
  const navigation = useNavigation()
  const { user } = useUser()
  const userId = user?.id ?? ''

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [friends, setFriends] = useState<UserResult[]>([])
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load pending incoming requests and friends list on mount
  useEffect(() => {
    if (!userId) return
    loadRequests()
    loadFriends()
  }, [userId])

  const loadRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/friends/${userId}/requests`)
      if (res.ok) {
        const data = await res.json()
        setPendingRequests(data.requests)
      }
    } catch { /* ignore */ }
  }

  const loadFriends = async () => {
    try {
      const res = await fetch(`${API_BASE}/friends/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setFriends(data.friends)
        setAcceptedIds(new Set(data.friends.map((f: UserResult) => f.clerk_user_id)))
      }
    } catch { /* ignore */ }
  }

  // Debounced search
  const handleQueryChange = (text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => {
      searchUsers(text.trim())
    }, 400)
  }

  const searchUsers = async (q: string) => {
    setSearching(true)
    try {
      const res = await fetch(`${API_BASE}/friends/search?username=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        // Filter out self
        setResults(data.users.filter((u: UserResult) => u.clerk_user_id !== userId))
      }
    } catch { /* ignore */ } finally {
      setSearching(false)
    }
  }

  const getStatus = (targetId: string): RelationStatus => {
    if (acceptedIds.has(targetId)) return 'friends'
    if (sentRequests.has(targetId)) return 'pending_sent'
    return 'none'
  }

  const handleAddFriend = async (targetId: string) => {
    setSentRequests(prev => new Set([...prev, targetId]))
    try {
      await fetch(`${API_BASE}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_id: userId, addressee_id: targetId }),
      })
    } catch {
      // Revert on failure
      setSentRequests(prev => {
        const next = new Set(prev)
        next.delete(targetId)
        return next
      })
    }
  }

  const handleAccept = async (requesterId: string) => {
    try {
      const res = await fetch(`${API_BASE}/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, requester_id: requesterId }),
      })
      if (res.ok) {
        setAcceptedIds(prev => new Set([...prev, requesterId]))
        setPendingRequests(prev => prev.filter(r => r.requester_id !== requesterId))
      }
    } catch { /* ignore */ }
  }

  const handleDecline = async (requesterId: string) => {
    try {
      const res = await fetch(`${API_BASE}/friends/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, requester_id: requesterId }),
      })
      if (res.ok) {
        setDeclinedIds(prev => new Set([...prev, requesterId]))
        setPendingRequests(prev => prev.filter(r => r.requester_id !== requesterId))
      }
    } catch { /* ignore */ }
  }

  const visibleRequests = pendingRequests.filter(r => !declinedIds.has(r.requester_id))

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Find Friends</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search input */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={handleQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={colors.mint} style={styles.searchSpinner} />}
        </View>

        {/* Search results */}
        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Results</Text>
            {results.map(u => {
              const status = getStatus(u.clerk_user_id)
              return (
                <View key={u.clerk_user_id} style={styles.userRow}>
                  <Companion size={44} color={getCompanionColor(u.companion_color_key)} mood="idle" />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.display_name ?? 'Learner'}</Text>
                    <Text style={styles.userLevel}>Lv {u.level}</Text>
                  </View>
                  {status === 'friends' ? (
                    <View style={[styles.statusBadge, styles.friendsBadge]}>
                      <Text style={styles.statusBadgeText}>Friends ✓</Text>
                    </View>
                  ) : status === 'pending_sent' ? (
                    <View style={[styles.statusBadge, styles.pendingBadge]}>
                      <Text style={styles.statusBadgeText}>Pending</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleAddFriend(u.clerk_user_id)}
                      style={[styles.addBtn, shadows.mint]}
                    >
                      <Text style={styles.addBtnText}>Add Friend</Text>
                    </Pressable>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {!query.trim() && results.length === 0 && visibleRequests.length === 0 && (
          <View style={styles.emptyState}>
            <Companion size={80} mood="idle" />
            <Text style={styles.emptyText}>Search for friends by name</Text>
          </View>
        )}

        {/* Pending incoming requests */}
        {visibleRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Friend Requests</Text>
            {visibleRequests.map(req => (
              <View key={req.friendship_id} style={styles.requestRow}>
                <Companion size={44} color={getCompanionColor(req.companion_color_key)} mood="happy" />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{req.display_name ?? 'Learner'}</Text>
                  <Text style={styles.userLevel}>Lv {req.level}</Text>
                </View>
                <View style={styles.requestActions}>
                  <Pressable
                    onPress={() => handleAccept(req.requester_id)}
                    style={[styles.acceptBtn, acceptedIds.has(req.requester_id) && styles.acceptedBtn]}
                  >
                    <Text style={styles.acceptBtnText}>
                      {acceptedIds.has(req.requester_id) ? '✓' : 'Accept'}
                    </Text>
                  </Pressable>
                  {!acceptedIds.has(req.requester_id) && (
                    <Pressable
                      onPress={() => handleDecline(req.requester_id)}
                      style={styles.declineBtn}
                    >
                      <Text style={styles.declineBtnText}>✕</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Friends list */}
        {friends.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your Friends</Text>
            {friends.map(f => (
              <View key={f.clerk_user_id} style={styles.userRow}>
                <Companion size={44} color={getCompanionColor(f.companion_color_key)} mood="idle" />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{f.display_name ?? 'Learner'}</Text>
                  <Text style={styles.userLevel}>Lv {f.level}</Text>
                </View>
                <View style={[styles.statusBadge, styles.friendsBadge]}>
                  <Text style={styles.statusBadgeText}>Friends ✓</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  backBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22,
    color: colors.foreground,
  },
  headerTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 24,
    color: colors.foreground,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchSpinner: {
    marginLeft: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.foreground,
  },
  userLevel: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: colors.mint,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  addBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.foreground,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  friendsBadge: {
    backgroundColor: colors.mint,
    opacity: 0.85,
  },
  pendingBadge: {
    backgroundColor: colors.border,
  },
  statusBadgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.foreground,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: colors.mint,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  acceptedBtn: {
    backgroundColor: colors.mint,
    opacity: 0.7,
  },
  acceptBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.foreground,
  },
  declineBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  declineBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
})
