import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native'
import { colors, radius } from '../theme'

interface SourceCited {
  source_id: string
  title?: string
  author?: string
  page_start?: number
}

interface AnnotatedTextProps {
  text: string
  source_ids: string[]
  sourceMap: Record<string, SourceCited>
  textStyle?: object
  bulletDotStyle?: object
  quote?: string
  quote_author?: string
  quote_book?: string
  quote_page?: number
}

export default function AnnotatedText({
  text,
  source_ids,
  sourceMap,
  textStyle,
  bulletDotStyle,
  quote,
  quote_author,
  quote_book,
  quote_page,
}: AnnotatedTextProps) {
  const [modalSource, setModalSource] = useState<SourceCited | null>(null)

  // Resolve source_ids to actual SourceCited objects, filtering out any
  // source_ids that aren't in the map (defensive against LLM hallucination)
  const resolvedSources = source_ids
    .map(id => sourceMap[id])
    .filter(Boolean)

  return (
    <>
      {/* Bullet row — mimics existing hookBulletRow / bulletRow layout */}
      <View style={styles.row}>
        <Text style={[styles.dot, bulletDotStyle]}>•</Text>
        <View style={styles.textWrap}>
          <Text style={[styles.text, textStyle]}>
            {text}
          </Text>
          {!!quote && (
            <View style={styles.inlineQuote}>
              <Text style={styles.inlineQuoteText}>"{quote}"</Text>
              <Text style={styles.inlineQuoteAttrib}>
                — {quote_author ?? 'Source'}{quote_book ? `, ${quote_book}` : ''}{quote_page ? `, p. ${quote_page}` : ''}
              </Text>
            </View>
          )}
          {!quote && resolvedSources.length > 0 && (
            <View style={styles.citationRow}>
              {resolvedSources.map((src, idx) => (
                <Pressable
                  key={src.source_id}
                  onPress={() => {
                    setModalSource(src)
                  }}
                  hitSlop={8}
                  style={styles.citationBadge}
                >
                  <Text style={styles.citationBadgeText}>
                    {idx + 1}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Source detail modal */}
      <Modal
        visible={!!modalSource}
        transparent
        animationType="fade"
        onRequestClose={() => setModalSource(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalSource(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetLabel}>Source</Text>
            {modalSource?.title ? (
              <Text style={styles.sheetTitle}>{modalSource.title}</Text>
            ) : (
              <Text style={styles.sheetTitle}>{modalSource?.source_id}</Text>
            )}
            {modalSource?.author && (
              <Text style={styles.sheetAuthor}>{modalSource.author}</Text>
            )}
            {modalSource?.page_start != null && (
              <Text style={styles.sheetPage}>Page {modalSource.page_start}</Text>
            )}
            <Pressable onPress={() => setModalSource(null)} style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  dot: {
    color: colors.mint,
    fontSize: 14,
    lineHeight: 22,
  },
  textWrap: {
    flex: 1,
  },
  text: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 22,
    flex: 1,
  },
  citationRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  citationBadge: {
    backgroundColor: colors.sky + '33',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  citationBadgeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: colors.foreground,
  },
  inlineQuote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.sky,
    paddingLeft: 10,
    marginTop: 6,
    marginBottom: 2,
  },
  inlineQuoteText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.foreground,
    lineHeight: 18,
    marginBottom: 2,
  },
  inlineQuoteAttrib: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.2,
  },
  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61,44,30,0.45)',
    justifyContent: 'flex-end',
  },
  // Bottom sheet card
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 24,
    paddingBottom: 36,
  },
  sheetLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
    marginBottom: 4,
    lineHeight: 26,
  },
  sheetAuthor: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  sheetPage: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.sky,
    marginBottom: 16,
  },
  sheetClose: {
    backgroundColor: colors.mint,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sheetCloseText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.foreground,
  },
})
