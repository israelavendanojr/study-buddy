import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Line, Svg } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import ProgressBar from '../../components/ProgressBar';
import { colors } from '../../theme';
import MonkeyMascot from '../../components/MonkeyMascot';

interface ConceptContent {
  quote: { before: string; highlight: string; after: string };
  whyItMatters: string;
  proTip: string;
}

interface ConceptBeatScreenProps {
  currentCard: number;
  totalCards: number;
  onNext: () => void;
  onClose: () => void;
  content?: ConceptContent;
}

const CONCEPT = {
  quote: {
    before: '"The pan needs to be hot before the oil goes in. Not warm. ',
    highlight: 'Hot.',
    after: " You're looking for the oil to shimmer and just start smoking at the edges.\"",
  },
  whyItMatters:
    'Cold pan = no crust. Protein sticks, tears, and steams instead of searing.',
  proTip: 'Use oil with a high smoke point, like grapeseed or avocado oil!',
};

export default function ConceptBeatScreen({
  currentCard,
  totalCards,
  onNext,
  onClose,
  content,
}: ConceptBeatScreenProps) {
  const insets = useSafeAreaInsets();
  const progress = currentCard / totalCards;
  const data = content ?? CONCEPT;

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        
        <ProgressBar progress={progress} onBack={onClose} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <MonkeyMascot size={100}></MonkeyMascot>

        {/* Quote card */}
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <Text style={styles.quoteText}>
              <Text>{data.quote.before}</Text>
              <Text style={styles.quoteHighlight}>{data.quote.highlight}</Text>
              <Text>{data.quote.after}</Text>
            </Text>

            <Svg width="100%" height={1}>
              <Line x1="0" y1="0" x2="2000" y2="0" stroke={colors.ink} strokeWidth={1} strokeDasharray="5,5" strokeOpacity={0.35} />
            </Svg>

            <Text style={styles.whyLabel}>WHY THIS MATTERS</Text>
            <Text style={styles.whyText}>{data.whyItMatters}</Text>
          </View>
        </View>

        {/* Pro tip */}
        <View style={styles.proTipRow}>
          <View style={styles.proTipBox}>
            <View style={styles.proTipIcon}>
              <MaterialIcons name="lightbulb" size={16} color={colors.white} />
            </View>
            <Text style={styles.proTipText}>
              * Pro Tip: {data.proTip}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton label="GOT IT →" onPress={onNext} />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  lessonLabel: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: colors.ink,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: 26,
    color: colors.ink,
    lineHeight: 30,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },

  diagLine1: {
    position: 'absolute',
    width: 155,
    height: 2,
    backgroundColor: colors.ink,
    top: 54,
    left: -22,
    transform: [{ rotate: '45deg' }],
    opacity: 0.4,
  },
  diagLine2: {
    position: 'absolute',
    width: 155,
    height: 2,
    backgroundColor: colors.ink,
    top: 54,
    left: -22,
    transform: [{ rotate: '-45deg' }],
    opacity: 0.4,
  },

  // Quote card
  cardShadow: {
    shadowColor: colors.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  card: {
    backgroundColor: colors.canvas,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderTopColor: colors.ink,
    borderRightColor: colors.ink,
    borderBottomColor: colors.ink,
    borderLeftWidth: 10,
    borderLeftColor: colors.amber,
    padding: 20,
    gap: 16,
  },
  quoteText: {
    fontFamily: 'Newsreader_700Bold',
    fontStyle: 'italic',
    fontSize: 26,
    lineHeight: 36,
    color: colors.ink,
  },
  quoteHighlight: {
    fontFamily: 'Newsreader_700Bold',
    fontStyle: 'italic',
    fontSize: 26,
    lineHeight: 36,
    color: colors.amber,
  },
  whyLabel: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
  },
  whyText: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },

  // Pro tip
  proTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    transform: [{ rotate: '-4deg' }],
    alignSelf: 'flex-end',
    width: '65%',
  },
  proTipIcon: {
    position: 'absolute',
    top: -14,
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTipBox: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    paddingTop: 22,
    paddingHorizontal: 12,
    paddingBottom: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 3.5, height: 3.5 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
  },
  proTipText: {
    fontFamily: 'Newsreader_400Regular_Italic',
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.canvasAlt,
  },
});
