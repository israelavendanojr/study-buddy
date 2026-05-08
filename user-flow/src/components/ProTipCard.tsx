import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface ProTipCardProps {
  text: string;
}

export default function ProTipCard({ text }: ProTipCardProps) {
  return (
    <View style={styles.proTipRow}>
      <View style={styles.proTipBox}>
        <View style={styles.proTipIcon}>
          <MaterialIcons name="lightbulb" size={16} color={colors.white} />
        </View>
        <Text style={styles.proTipText}>* Pro Tip: {text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
