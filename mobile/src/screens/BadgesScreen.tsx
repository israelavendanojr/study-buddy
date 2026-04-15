import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import Companion from '../components/Companion'
import TabBar from '../components/TabBar'
import { colors, radius } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'
const SCREEN_WIDTH = Dimensions.get('window').width

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

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Post {
  id: number
  clerk_user_id: string
  photo_url: string
  caption: string | null
  lesson_key: string | null
  lesson_title: string | null
  chapter_title: string | null
  domain: string | null
  companion_color_key: string | null
  display_name: string | null
  created_at: string
  like_count: number
  comment_count: number
  liked_by_me: boolean
}

// ── PostCard ──────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: Post
  userId: string
  userDisplayName: string
  userColorKey: string | null
  onLike: (postId: number) => void
  onPress: (post: Post) => void
}

const PostCard = React.memo(({ post, userId, userDisplayName, userColorKey, onLike, onPress }: PostCardProps) => {
  const heartScale = useRef(new Animated.Value(1)).current

  const handleLike = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, friction: 3, tension: 200, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
    ]).start()
    onLike(post.id)
  }

  const photoUri = post.photo_url.startsWith('/')
    ? `${API_BASE}${post.photo_url}`
    : post.photo_url

  return (
    <Pressable style={cardStyles.card} onPress={() => onPress(post)}>
      {/* Header */}
      <View style={cardStyles.header}>
        <Companion size={40} color={getCompanionColor(post.companion_color_key)} mood="idle" />
        <View style={cardStyles.headerInfo}>
          <Text style={cardStyles.displayName}>{post.display_name ?? 'Learner'}</Text>
          {(post.domain || post.chapter_title) && (
            <Text style={cardStyles.lessonTag} numberOfLines={1}>
              {[post.domain, post.chapter_title].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <Text style={cardStyles.timestamp}>{timeAgo(post.created_at)}</Text>
      </View>

      {/* Photo */}
      <Image source={{ uri: photoUri }} style={cardStyles.photo} resizeMode="cover" />

      {/* Caption */}
      {post.caption ? <Text style={cardStyles.caption}>{post.caption}</Text> : null}

      {/* Lesson receipt */}
      {post.lesson_title ? (
        <View style={cardStyles.receiptRow}>
          <Text style={cardStyles.receiptText}>📚 {post.lesson_title}</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={cardStyles.footer}>
        <Pressable onPress={handleLike} style={cardStyles.actionBtn} hitSlop={8}>
          <Animated.Text
            style={[
              cardStyles.heartIcon,
              post.liked_by_me && cardStyles.heartFilled,
              { transform: [{ scale: heartScale }] },
            ]}
          >
            {post.liked_by_me ? '♥' : '♡'}
          </Animated.Text>
          <Text style={cardStyles.actionCount}>{post.like_count}</Text>
        </Pressable>
        <View style={cardStyles.actionBtn}>
          <Text style={cardStyles.commentIcon}>💬</Text>
          <Text style={cardStyles.actionCount}>
            {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
      </View>
    </Pressable>
  )
})

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  headerInfo: { flex: 1 },
  displayName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.foreground,
  },
  lessonTag: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  timestamp: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.muted,
  },
  photo: {
    width: '100%',
    height: SCREEN_WIDTH - 32,
  },
  caption: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.foreground,
    paddingHorizontal: 12,
    paddingTop: 10,
    lineHeight: 20,
  },
  receiptRow: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  receiptText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.foreground,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heartIcon: {
    fontSize: 20,
    color: colors.muted,
  },
  heartFilled: {
    color: '#FF8B7B',
  },
  commentIcon: {
    fontSize: 18,
  },
  actionCount: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.foreground,
  },
})

// ── FeedScreen ────────────────────────────────────────────────────────────────

export default function BadgesScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const { user } = useUser()
  const userId = user?.id ?? ''
  const displayName = user?.fullName ?? user?.firstName ?? 'Learner'

  const [filter, setFilter] = useState<'global' | 'friends'>('global')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [myColorKey, setMyColorKey] = useState<string | null>(null)

  const loadingRef = useRef(false)
  const cursorRef = useRef<string | null>(null)
  const hasMoreRef = useRef(true)

  useEffect(() => {
    if (!userId) return
    fetch(`${API_BASE}/companion/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.equipped?.color) setMyColorKey(data.equipped.color) })
      .catch(() => {})
  }, [userId])

  const fetchPosts = useCallback(async (reset: boolean) => {
    if (!userId) return
    if (loadingRef.current) return
    if (!reset && !hasMoreRef.current) return

    loadingRef.current = true
    setLoading(true)
    try {
      const cursor = reset ? null : cursorRef.current
      const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
      const res = await fetch(
        `${API_BASE}/social/feed?user_id=${userId}&filter=${filter}${cursorParam}&limit=20`
      )
      if (!res.ok) throw new Error('Feed fetch failed')
      const data = await res.json()
      const newPosts: Post[] = data.posts

      if (reset) {
        setPosts(newPosts)
      } else {
        setPosts(prev => {
          const ids = new Set(prev.map(p => p.id))
          return [...prev, ...newPosts.filter(p => !ids.has(p.id))]
        })
      }
      cursorRef.current = data.next_cursor
      hasMoreRef.current = !!data.next_cursor
      setHasMore(!!data.next_cursor)
    } catch { /* ignore */ } finally {
      loadingRef.current = false
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId, filter])

  useEffect(() => {
    cursorRef.current = null
    hasMoreRef.current = true
    fetchPosts(true)
  }, [filter, userId])

  const handleRefresh = () => {
    setRefreshing(true)
    cursorRef.current = null
    hasMoreRef.current = true
    fetchPosts(true)
  }

  const handleLike = async (postId: number) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p
        const liked = !p.liked_by_me
        return { ...p, liked_by_me: liked, like_count: p.like_count + (liked ? 1 : -1) }
      })
    )
    try {
      await fetch(`${API_BASE}/social/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerk_user_id: userId }),
      })
    } catch { /* ignore */ }
  }

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', {
      post,
      userId,
      userDisplayName: displayName,
      userColorKey: myColorKey,
    })
  }

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      userId={userId}
      userDisplayName={displayName}
      userColorKey={myColorKey}
      onLike={handleLike}
      onPress={handlePostPress}
    />
  )

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Companion size={100} mood="idle" />
      <Text style={styles.emptyTitle}>
        {filter === 'friends' ? 'No posts from friends yet' : 'The feed is quiet…'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'friends'
          ? 'Add friends and cheer each other on!'
          : 'Complete a lesson and share your progress to be the first!'}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeHeader}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Feed 🌍</Text>
          <Pressable
            onPress={() => navigation.navigate('FriendSearch')}
            style={styles.friendsBtn}
          >
            <Text style={styles.friendsBtnText}>Friends</Text>
          </Pressable>
        </View>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setFilter('global')}
            style={[styles.toggleBtn, filter === 'global' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleBtnText, filter === 'global' && styles.toggleBtnTextActive]}>
              Global
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('friends')}
            style={[styles.toggleBtn, filter === 'friends' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleBtnText, filter === 'friends' && styles.toggleBtnTextActive]}>
              Friends
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <FlatList
        data={posts}
        keyExtractor={item => String(item.id)}
        renderItem={renderPost}
        contentContainerStyle={
          posts.length === 0 ? { flex: 1 } : { paddingBottom: 80, paddingTop: 8 }
        }
        ListEmptyComponent={loading ? null : <EmptyState />}
        onEndReached={() => { if (hasMore && !loading) fetchPosts(false) }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.mint} />
        }
        showsVerticalScrollIndicator={false}
      />

      <TabBar activeTab="badges" />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeHeader: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 26,
    color: colors.foreground,
  },
  friendsBtn: {
    backgroundColor: colors.sky,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  friendsBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.foreground,
  },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm - 2,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.mint,
  },
  toggleBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.muted,
  },
  toggleBtnTextActive: {
    color: colors.foreground,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
})
