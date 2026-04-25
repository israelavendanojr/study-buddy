import React from 'react'
import { Image, StyleSheet, View, ViewStyle } from 'react-native'

interface Props {
  size?: number
  style?: ViewStyle
}

// Renders the GarlicMonkey mascot at a given size.
// Uses Monkey.png for cross-platform reliability at all sizes.
export default function MonkeyMascot({ size = 80, style }: Props) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../assets/Monkey.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
})
