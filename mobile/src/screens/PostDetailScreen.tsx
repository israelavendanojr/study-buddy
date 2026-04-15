import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { useUser } from '@clerk/clerk-expo'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

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

interface Post {
  id: number
  clerk_user_id: string
  photo_url: string
  caption: string | null
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

interface Liker {
  clerk_user_id: string
  display_name: string | null
  companion_color_key: string | null
}

interface Comment {
  id: number
  clerk_user_id: string
  display_name: string
  companion_color_key: string | null
  body: string
  created_at: string
}

// ── PostDetailScreen ──────────────────────────────────────────────────────────

interface RouteParams {
  post: Post
  userId: string
  userDisplayName: string
  userColorKey: string | null
}

export default function PostDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>()
  const { post: initialPost, userId, userDisplayName, userColorKey } = route.params

  const [post, setPost] = useState<Post>(initialPost)
  const [likers, setLikers] = useState<Liker[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)

  const heartScale = useRef(new Animated.Value(1)).current
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    fetchLikes()
    fetchComments()
  }, [])

  const fetchLikes = async () => {
    try {
      const res = await fetch(`${API_BASE}/social/posts/${post.id}/likes`)
      if (res.ok) {
        const data = await res.json()
        setLikers(data.likes)
      }
    } catch { /* ignore */ }
  }

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API_BASE}/social/posts/${post.id}/comments?limit=100`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments)
      }
    } catch { /* ignore */ }
  }

  const handleLike = async () => {
    const liked = !post.liked_by_me
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, friction: 3, tension: 200, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
    ]).start()

    // Optimistic update
    setPost(p => ({ ...p, liked_by_me: liked, like_count: p.like_count + (liked ? 1 : -1) }))
    if (liked) {
      setLikers(prev => {
        const alreadyIn = prev.some(l => l.clerk_user_id === userId)
        if (alreadyIn) return prev
        return [...prev, { clerk_user_id: userId, display_name: userDisplayName, companion_color_key: userColorKey }]
      })
    } else {
      setLikers(prev => prev.filter(l => l.clerk_user_id !== userId))
    }

    try {
      await fetch(`${API_BASE}/social/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerk_user_id: userId }),
      })
    } catch { /* ignore */ }
  }

  const handlePostComment = async () => {
    if (!newComment.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`${API_BASE}/social/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: userId,
          display_name: userDisplayName,
          companion_color_key: userColorKey,
          body: newComment.trim().slice(0, 300),
        }),
      })
      if (res.ok) {
        const created: Comment = await res.json()
        setComments(prev => [...prev, created])
        setPost(p => ({ ...p, comment_count: p.comment_count + 1 }))
        setNewComment('')
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
      }
    } catch { /* ignore */ } finally {
      setPosting(false)
    }
  }

  const photoUri = post.photo_url.startsWith('/')
    ? `${API_BASE}${post.photo_url}`
    : post.photo_url

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post header */}
          <View style={styles.postHeader}>
            <Companion size={44} color={getCompanionColor(post.companion_color_key)} mood="idle" />
            <View style={styles.postHeaderInfo}>
              <Text style={styles.displayName}>{post.display_name ?? 'Learner'}</Text>
              {(post.domain || post.chapter_title) && (
                <Text style={styles.lessonTag} numberOfLines={1}>
                  {[post.domain, post.chapter_title].filter(Boolean).join(' · ')}
                </Text>
              )}
              <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
            </View>
          </View>

          {/* Photo */}
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

          {/* Caption */}
          {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

          {/* Lesson receipt */}
          {post.lesson_title ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptText}>📚 {post.lesson_title}</Text>
            </View>
          ) : null}

          {/* ── Like bar ── */}
          {likers.length > 0 && (
            <View style={styles.likeBarSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.likeBarScroll}
              >
                {likers.map((liker, i) => (
                  <View key={liker.clerk_user_id} style={styles.likerItem}>
                    <Companion
                      size={36}
                      color={getCompanionColor(liker.companion_color_key)}
                      mood="idle"
                    />
                    <Text style={styles.likerName} numberOfLines={1}>
                      {liker.display_name ?? 'Learner'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Action row (LinkedIn-style) ── */}
          <View style={styles.actionRow}>
            <Pressable onPress={handleLike} style={styles.actionBtn}>
              <Animated.Text
                style={[
                  styles.actionIcon,
                  post.liked_by_me && styles.actionIconActive,
                  { transform: [{ scale: heartScale }] },
                ]}
              >
                {post.liked_by_me ? '♥' : '♡'}
              </Animated.Text>
              <Text style={[styles.actionLabel, post.liked_by_me && styles.actionLabelActive]}>
                {post.like_count} {post.like_count === 1 ? 'Like' : 'Likes'}
              </Text>
            </Pressable>

            <View style={styles.actionDivider} />

            <Pressable
              onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
              style={styles.actionBtn}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionLabel}>
                {post.comment_count} {post.comment_count === 1 ? 'Comment' : 'Comments'}
              </Text>
            </Pressable>
          </View>

          {/* ── Comments section ── */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>Comments</Text>
            {comments.length === 0 ? (
              <Text style={styles.noComments}>No comments yet. Be the first!</Text>
            ) : (
              comments.map(c => (
                <View key={c.id} style={styles.commentRow}>
                  <Companion
                    size={34}
                    color={getCompanionColor(c.companion_color_key)}
                    mood="idle"
                  />
                  <View style={styles.commentBubble}>
                    <View style={styles.commentBubbleTop}>
                      <Text style={styles.commentAuthor}>{c.display_name}</Text>
                      <Text style={styles.commentTime}>{timeAgo(c.created_at)}</Text>
                    </View>
                    <Text style={styles.commentBody}>{c.body}</Text>
                  </View>
                </View>
              ))
            )}
            {/* Bottom padding so last comment isn't hidden behind input */}
            <View style={{ height: 16 }} />
          </View>
        </ScrollView>

        {/* ── Comment input (sticky at bottom) ── */}
        <View style={styles.inputBar}>
          <Companion size={32} color={getCompanionColor(userColorKey)} mood="idle" />
          <TextInput
            style={styles.input}
            placeholder="Write a comment…"
            placeholderTextColor={colors.muted}
            value={newComment}
            onChangeText={setNewComment}
            maxLength={300}
            multiline
          />
          <Pressable
            onPress={handlePostComment}
            disabled={posting || !newComment.trim()}
            style={[styles.postBtn, (!newComment.trim() || posting) && styles.postBtnDisabled]}
          >
            <Text style={styles.postBtnText}>Post</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
    width: 36,
  },
  backBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22,
    color: colors.foreground,
  },
  headerTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },

  // Post header
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  postHeaderInfo: {
    flex: 1,
  },
  displayName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
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
    marginTop: 2,
  },

  // Photo
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },

  // Caption + receipt
  caption: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.foreground,
    paddingHorizontal: 16,
    paddingTop: 12,
    lineHeight: 22,
  },
  receiptRow: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  receiptText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.foreground,
  },

  // Like bar
  likeBarSection: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  likeBarScroll: {
    gap: 12,
    paddingRight: 8,
  },
  likerItem: {
    alignItems: 'center',
    gap: 4,
    width: 52,
  },
  likerName: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  actionDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  actionIcon: {
    fontSize: 18,
    color: colors.muted,
  },
  actionIconActive: {
    color: '#FF8B7B',
  },
  actionLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.muted,
  },
  actionLabelActive: {
    color: '#FF8B7B',
  },

  // Comments section
  commentsSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  commentsSectionTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 12,
  },
  noComments: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commentBubbleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.foreground,
  },
  commentTime: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    color: colors.muted,
  },
  commentBody: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 19,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.foreground,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postBtn: {
    backgroundColor: colors.mint,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.foreground,
  },
})
