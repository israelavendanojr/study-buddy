import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors } from '../theme'
import TabBar from '../components/TabBar'

export default function BadgesScreen() {
  return (
    <View style={styles.container}>
      {/* Header space */}
      <View style={styles.header} />

      {/* Content area (blank) */}
      <View style={styles.content} />

      <TabBar activeTab="badges" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  content: { flex: 1 },
})
