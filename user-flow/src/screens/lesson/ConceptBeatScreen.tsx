import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Line, Svg } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccentCard from '../../components/AccentCard';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import ProTipCard from '../../components/ProTipCard';
import { colors } from '../../theme';
import MonkeyMascot from '../../components/MonkeyMascot';
import { ConceptContent } from '../../types/lesson';

interface ConceptBeatScreenProps {
  onNext: () => void;
  content: ConceptContent;
}

export default function ConceptBeatScreen({
  onNext,
  content,
}: ConceptBeatScreenProps) {
  const insets = useSafeAreaInsets();
  const data = content;

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
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <MonkeyMascot size={100}></MonkeyMascot>

        {/* Quote card */}
        <AccentCard contentStyle={{ gap: 16 }}>
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
        </AccentCard>

        {/* Pro tip */}
        <ProTipCard text={data.proTip} />
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
