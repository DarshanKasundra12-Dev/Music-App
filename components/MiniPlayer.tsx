import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { usePlayer } from '@/context/PlayerContext';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, isLoading, togglePlayPause, skipToNext } = usePlayer();
  const translateY = useSharedValue(0);

  const swipeGesture = Gesture.Pan()
    .onUpdate(e => {
      if (e.translationY < 0) {
        translateY.value = e.translationY * 0.3;
      }
    })
    .onEnd(e => {
      if (e.translationY < -40) {
        router.push('/player');
      }
      translateY.value = withSpring(0);
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      router.push('/player');
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePlayPause = useCallback(async (e: any) => {
    e.stopPropagation?.();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await togglePlayPause();
  }, [togglePlayPause]);

  const handleNext = useCallback(async (e: any) => {
    e.stopPropagation?.();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await skipToNext();
  }, [skipToNext]);

  if (!currentTrack) return null;

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[styles.container, animStyle]}>
        <Pressable style={styles.inner} onPress={() => router.push('/player')}>
          <Image
            source={{ uri: currentTrack.thumbnail }}
            style={styles.thumbnail}
            contentFit="cover"
          />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <View style={styles.controls}>
            <Pressable onPress={handlePlayPause} style={styles.controlBtn} hitSlop={8}>
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={24}
                  color={Colors.text}
                />
              )}
            </Pressable>
            <Pressable onPress={handleNext} style={styles.controlBtn} hitSlop={8}>
              <Ionicons name="play-skip-forward" size={22} color={Colors.text} />
            </Pressable>
          </View>
        </Pressable>
        <View style={styles.indicator} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: Colors.surface2,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
  },
  artist: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 6,
  },
});
