import React, { useEffect, useRef } from 'react'
import { Animated, ViewStyle } from 'react-native'
import Svg, { Ellipse, Circle, Path, Line } from 'react-native-svg'
import { colors } from '../theme'

type Mood = 'idle' | 'happy' | 'excited' | 'thinking' | 'sad'

interface CompanionProps {
  size?: number
  color?: string
  mood?: Mood
  style?: ViewStyle
}

const Companion: React.FC<CompanionProps> = ({
  size = 120,
  color = colors.mint,
  mood = 'idle',
  style,
}) => {
  const animValue = useRef(new Animated.Value(0)).current
  const scaleValue = useRef(new Animated.Value(1)).current
  const translateY = useRef(new Animated.Value(0)).current
  const rotateValue = useRef(new Animated.Value(0)).current
  const currentMood = useRef(mood)

  useEffect(() => {
    currentMood.current = mood
    // Reset all
    scaleValue.setValue(1)
    translateY.setValue(0)
    rotateValue.setValue(0)
    animValue.stopAnimation()
    scaleValue.stopAnimation()
    translateY.stopAnimation()
    rotateValue.stopAnimation()

    if (mood === 'idle') {
      // Breathe: scale 1.0 -> 1.04 -> 1.0 over 3s
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.04,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else if (mood === 'happy') {
      // Bounce up and down 3 times
      const bounce = (toVal: number, dur: number) =>
        Animated.timing(translateY, { toValue: toVal, duration: dur, useNativeDriver: true })
      Animated.sequence([
        bounce(-12, 150), bounce(0, 150),
        bounce(-10, 130), bounce(0, 130),
        bounce(-6, 110), bounce(0, 110),
      ]).start()
    } else if (mood === 'excited') {
      // Gentle wiggle rotation
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateValue, { toValue: -4, duration: 150, useNativeDriver: true }),
          Animated.timing(rotateValue, { toValue: 4, duration: 150, useNativeDriver: true }),
          Animated.timing(rotateValue, { toValue: -3, duration: 150, useNativeDriver: true }),
          Animated.timing(rotateValue, { toValue: 3, duration: 150, useNativeDriver: true }),
          Animated.timing(rotateValue, { toValue: 0, duration: 150, useNativeDriver: true }),
        ])
      ).start()
    } else if (mood === 'thinking') {
      // Slow tilt -8 -> 8 -> 0
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateValue, { toValue: -8, duration: 800, useNativeDriver: true }),
          Animated.timing(rotateValue, { toValue: 8, duration: 1600, useNativeDriver: true }),
          Animated.timing(rotateValue, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start()
    } else if (mood === 'sad') {
      // Droop: scale down + translateY down
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleValue, { toValue: 0.96, duration: 1500, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 4, duration: 1500, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleValue, { toValue: 1, duration: 1500, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ]),
        ])
      ).start()
    }
  }, [mood])

  const rotate = rotateValue.interpolate({
    inputRange: [-8, 0, 8],
    outputRange: ['-8deg', '0deg', '8deg'],
  })

  // Mouth paths based on mood — using viewBox 0 0 200 200
  const getMouth = () => {
    switch (mood) {
      case 'excited':
        // Open oval mouth
        return <Ellipse cx="100" cy="120" rx="8" ry="6" fill="#3a3a3a" />
      case 'thinking':
        // Small dot
        return <Ellipse cx="100" cy="120" rx="5" ry="4" fill="#3a3a3a" />
      case 'sad':
        // Frown
        return (
          <Path
            d="M 88 122 Q 100 114 112 122"
            stroke="#3a3a3a"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        )
      case 'happy':
        // Big smile
        return (
          <Path
            d="M 88 118 Q 100 132 112 118"
            stroke="#3a3a3a"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        )
      default:
        // Gentle smile (idle)
        return (
          <Path
            d="M 90 118 Q 100 126 110 118"
            stroke="#3a3a3a"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        )
    }
  }

  // Darker shade for arms
  const armColor = color === colors.mint ? '#8DD4AE' : color

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          transform: [
            { scale: scaleValue },
            { translateY },
            { rotate },
          ],
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {/* Body */}
        <Ellipse cx="100" cy="115" rx="70" ry="65" fill={color} />
        {/* Belly */}
        <Ellipse cx="100" cy="125" rx="45" ry="40" fill="#FFFDF7" opacity={0.7} />
        {/* Left arm */}
        <Ellipse cx="38" cy="120" rx="14" ry="10" fill={armColor} />
        {/* Right arm */}
        <Ellipse cx="162" cy="120" rx="14" ry="10" fill={armColor} />
        {/* Left eye */}
        <Ellipse cx="78" cy="95" rx="12" ry="14" fill="white" />
        <Ellipse cx="80" cy="96" rx="7" ry="8" fill="#3a3a3a" />
        <Ellipse cx="82" cy="93" rx="3" ry="3" fill="white" />
        {/* Right eye */}
        <Ellipse cx="122" cy="95" rx="12" ry="14" fill="white" />
        <Ellipse cx="124" cy="96" rx="7" ry="8" fill="#3a3a3a" />
        <Ellipse cx="126" cy="93" rx="3" ry="3" fill="white" />
        {/* Mouth */}
        {getMouth()}
        {/* Blush */}
        <Ellipse cx="68" cy="112" rx="10" ry="6" fill="#FFCBA4" opacity={0.4} />
        <Ellipse cx="132" cy="112" rx="10" ry="6" fill="#FFCBA4" opacity={0.4} />
      </Svg>
    </Animated.View>
  )
}

export default Companion
