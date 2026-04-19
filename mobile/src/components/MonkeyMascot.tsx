import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import Svg, { Circle, Ellipse, Path, G } from 'react-native-svg'

type Mood = 'idle' | 'happy' | 'excited' | 'sad'

interface Props {
  mood?: Mood
  size?: number
}

// Animated SVG wrapper
const AnimatedSvg = Animated.createAnimatedComponent(Svg)

export default function MonkeyMascot({ mood = 'idle', size = 100 }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const translateYAnim = useRef(new Animated.Value(0)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    scaleAnim.stopAnimation()
    translateYAnim.stopAnimation()
    rotateAnim.stopAnimation()

    if (mood === 'idle') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
        ])
      ).start()
    } else if (mood === 'happy') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateYAnim, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(translateYAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start()
    } else if (mood === 'excited') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ])
      ).start()
    } else if (mood === 'sad') {
      Animated.timing(translateYAnim, { toValue: 4, duration: 400, useNativeDriver: true }).start()
    }

    return () => {
      scaleAnim.stopAnimation()
      translateYAnim.stopAnimation()
      rotateAnim.stopAnimation()
    }
  }, [mood])

  const rotate = rotateAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] })

  const isHappy = mood === 'happy' || mood === 'excited'
  const faceColor = isHappy ? '#ffb22c' : '#f0d5c0'
  const mouthPath = mood === 'sad'
    ? 'M 34 58 Q 40 54 46 58'   // frown
    : 'M 34 56 Q 40 62 46 56'   // smile

  return (
    <Animated.View
      style={{
        transform: [
          { scale: scaleAnim },
          { translateY: translateYAnim },
          { rotate },
        ],
        width: size,
        height: size,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 80 90">
        {/* Garlic crown cloves */}
        <G>
          {/* Left clove */}
          <Ellipse cx="28" cy="14" rx="8" ry="10" fill="#f5f0e8" stroke="#854836" strokeWidth="2.5" />
          {/* Center clove */}
          <Ellipse cx="40" cy="8" rx="9" ry="11" fill="#f5f0e8" stroke="#854836" strokeWidth="2.5" />
          {/* Right clove */}
          <Ellipse cx="52" cy="14" rx="8" ry="10" fill="#f5f0e8" stroke="#854836" strokeWidth="2.5" />
          {/* Stem lines on cloves */}
          <Path d="M 28 4 Q 28 1 30 0" stroke="#854836" strokeWidth="2" strokeLinecap="round" fill="none" />
          <Path d="M 40 -3 Q 40 -5 42 -6" stroke="#854836" strokeWidth="2" strokeLinecap="round" fill="none" />
          <Path d="M 52 4 Q 52 1 54 0" stroke="#854836" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Crown base band */}
          <Path d="M 22 20 Q 40 24 58 20" stroke="#854836" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </G>

        {/* Ears */}
        <Circle cx="12" cy="44" r="10" fill={faceColor} stroke="#854836" strokeWidth="2.5" />
        <Circle cx="68" cy="44" r="10" fill={faceColor} stroke="#854836" strokeWidth="2.5" />
        <Circle cx="12" cy="44" r="6" fill="#e8b89a" stroke="none" />
        <Circle cx="68" cy="44" r="6" fill="#e8b89a" stroke="none" />

        {/* Head */}
        <Ellipse cx="40" cy="48" rx="28" ry="26" fill={faceColor} stroke="#854836" strokeWidth="2.5" />

        {/* Muzzle */}
        <Ellipse cx="40" cy="58" rx="12" ry="9" fill="#e8b89a" stroke="#854836" strokeWidth="2" />

        {/* Eyes */}
        <Circle cx="31" cy="44" r="4" fill="#854836" />
        <Circle cx="49" cy="44" r="4" fill="#854836" />
        <Circle cx="32.5" cy="42.5" r="1.5" fill="white" />
        <Circle cx="50.5" cy="42.5" r="1.5" fill="white" />

        {/* Mouth */}
        <Path d={mouthPath} stroke="#854836" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Nostrils */}
        <Circle cx="37" cy="58" r="1.5" fill="#c4896a" />
        <Circle cx="43" cy="58" r="1.5" fill="#c4896a" />

        {/* Happy blush */}
        {isHappy && (
          <>
            <Ellipse cx="24" cy="51" rx="5" ry="3" fill="#ffb22c" opacity={0.5} />
            <Ellipse cx="56" cy="51" rx="5" ry="3" fill="#ffb22c" opacity={0.5} />
          </>
        )}
      </Svg>
    </Animated.View>
  )
}

// Full-body celebration variant
export function MonkeyCelebrate({ size = 140 }: { size?: number }) {
  const bounceAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 350, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ])
    ).start()
    return () => bounceAnim.stopAnimation()
  }, [])

  const aspectRatio = 120 / 160
  const h = size
  const w = size * aspectRatio

  return (
    <Animated.View style={{ transform: [{ translateY: bounceAnim }], width: w, height: h }}>
      <Svg width={w} height={h} viewBox="0 0 120 160">
        {/* Garlic crown */}
        <G>
          <Ellipse cx="40" cy="18" rx="8" ry="10" fill="#f5f0e8" stroke="#854836" strokeWidth="2.5" />
          <Ellipse cx="60" cy="12" rx="9" ry="11" fill="#f5f0e8" stroke="#854836" strokeWidth="2.5" />
          <Ellipse cx="80" cy="18" rx="8" ry="10" fill="#f5f0e8" stroke="#854836" strokeWidth="2.5" />
          <Path d="M 58 28 Q 60 30 82 26" stroke="#854836" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </G>

        {/* Ears */}
        <Circle cx="22" cy="54" r="11" fill="#ffb22c" stroke="#854836" strokeWidth="2.5" />
        <Circle cx="98" cy="54" r="11" fill="#ffb22c" stroke="#854836" strokeWidth="2.5" />
        <Circle cx="22" cy="54" r="7" fill="#e8b89a" />
        <Circle cx="98" cy="54" r="7" fill="#e8b89a" />

        {/* Head */}
        <Ellipse cx="60" cy="58" rx="32" ry="30" fill="#ffb22c" stroke="#854836" strokeWidth="2.5" />

        {/* Muzzle */}
        <Ellipse cx="60" cy="70" rx="14" ry="10" fill="#e8b89a" stroke="#854836" strokeWidth="2" />

        {/* Eyes (happy squint) */}
        <Path d="M 47 52 Q 52 47 57 52" stroke="#854836" strokeWidth="3" strokeLinecap="round" fill="none" />
        <Path d="M 63 52 Q 68 47 73 52" stroke="#854836" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Big smile */}
        <Path d="M 47 68 Q 60 80 73 68" stroke="#854836" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Nostrils */}
        <Circle cx="56" cy="70" r="1.8" fill="#c4896a" />
        <Circle cx="64" cy="70" r="1.8" fill="#c4896a" />

        {/* Blush */}
        <Ellipse cx="37" cy="63" rx="6" ry="4" fill="#ff8c42" opacity={0.5} />
        <Ellipse cx="83" cy="63" rx="6" ry="4" fill="#ff8c42" opacity={0.5} />

        {/* Body */}
        <Ellipse cx="60" cy="120" rx="22" ry="28" fill="#ffb22c" stroke="#854836" strokeWidth="2.5" />

        {/* Belly */}
        <Ellipse cx="60" cy="118" rx="14" ry="18" fill="#e8b89a" stroke="#854836" strokeWidth="1.5" />

        {/* Left arm raised */}
        <Path d="M 38 100 Q 15 80 10 65" stroke="#854836" strokeWidth="5" strokeLinecap="round" fill="none" />
        <Circle cx="10" cy="63" r="7" fill="#ffb22c" stroke="#854836" strokeWidth="2.5" />

        {/* Right arm raised */}
        <Path d="M 82 100 Q 105 80 110 65" stroke="#854836" strokeWidth="5" strokeLinecap="round" fill="none" />
        <Circle cx="110" cy="63" r="7" fill="#ffb22c" stroke="#854836" strokeWidth="2.5" />

        {/* Legs */}
        <Path d="M 48 145 Q 42 158 38 160" stroke="#854836" strokeWidth="5" strokeLinecap="round" fill="none" />
        <Path d="M 72 145 Q 78 158 82 160" stroke="#854836" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Sparkles */}
        <Path d="M 15 40 L 15 48 M 11 44 L 19 44" stroke="#ffb22c" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M 105 40 L 105 48 M 101 44 L 109 44" stroke="#ffb22c" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M 20 110 L 20 116 M 17 113 L 23 113" stroke="#ffb22c" strokeWidth="2" strokeLinecap="round" />
        <Path d="M 100 110 L 100 116 M 97 113 L 103 113" stroke="#ffb22c" strokeWidth="2" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  )
}
