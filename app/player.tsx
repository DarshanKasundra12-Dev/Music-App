import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { usePlayer } from '@/context/PlayerContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export default function FullPlayerScreen() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    position,
    duration,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
  } = usePlayer();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);
  const [likeScale, setLikeScale] = useState(1);
  const progress = duration > 0 ? position / duration : 0;

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const likeAnim = useSharedValue(1);

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);

  const goBack = useCallback(() => {
    router.back();
  }, []);

  const swipeDownGesture = Gesture.Pan()
    .onUpdate(e => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd(e => {
      if (e.translationY > 80) {
        runOnJS(goBack)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const swipeHorizontalGesture = Gesture.Pan()
    .onUpdate(e => {
      if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
        translateX.value = e.translationX * 0.3;
      }
    })
    .onEnd(e => {
      if (e.translationX < -60) {
        runOnJS(skipToNext)();
      } else if (e.translationX > 60) {
        runOnJS(skipToPrevious)();
      }
      translateX.value = withSpring(0);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      likeAnim.value = withTiming(1.4, { duration: 150 }, () => {
        likeAnim.value = withSpring(1);
      });
      runOnJS(setLiked)(true);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
    });

  const imageGestures = Gesture.Race(doubleTapGesture, Gesture.Simultaneous(swipeDownGesture, swipeHorizontalGesture));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: likeAnim.value },
    ],
  }));

  const handleSeek = useCallback(async (xPosition: number, barWidth: number) => {
    const ratio = Math.max(0, Math.min(1, xPosition / barWidth));
    const ms = ratio * duration;
    await seekTo(ms);
  }, [duration, seekTo]);

  const barWidth = SCREEN_WIDTH - 48;

  if (!currentTrack) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.noTrack}>No track playing</Text>
      </View>
    );
  }

  const displayProgress = isSeeking ? seekProgress : progress;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={['#1A0005', '#0A0A0A', '#0A0A0A']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) + 16, paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.headerBtn} hitSlop={12}>
            <Ionicons name="chevron-down" size={28} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <Pressable style={styles.headerBtn} hitSlop={12}>
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <GestureDetector gesture={imageGestures}>
          <Animated.View style={[styles.artworkContainer, imageStyle]}>
            <Image
              source={{ uri: currentTrack.thumbnail }}
              style={styles.artwork}
              contentFit="cover"
            />
            {liked && (
              <View style={styles.likeOverlay} pointerEvents="none">
                <Ionicons name="heart" size={80} color={Colors.accent} />
              </View>
            )}
          </Animated.View>
        </GestureDetector>

        <View style={styles.trackInfo}>
          <View style={styles.trackText}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setLiked(l => !l);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hitSlop={8}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={26}
              color={liked ? Colors.accent : Colors.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.progressSection}>
          <Pressable
            style={styles.progressBar}
            onPress={e => {
              handleSeek(e.nativeEvent.locationX, barWidth);
            }}
          >
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${displayProgress * 100}%` }]} />
              <View
                style={[
                  styles.progressThumb,
                  { left: `${displayProgress * 100}%` },
                ]}
              />
            </View>
          </Pressable>
          <View style={styles.progressTimes}>
            <Text style={styles.timeText}>{formatMs(position)}</Text>
            <Text style={styles.timeText}>{formatMs(duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); skipToPrevious(); }}
            style={styles.controlBtn}
            hitSlop={8}
          >
            <Ionicons name="play-skip-back" size={32} color={Colors.text} />
          </Pressable>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); togglePlayPause(); }}
            style={styles.playBtn}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#000" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#000"
              />
            )}
          </Pressable>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); skipToNext(); }}
            style={styles.controlBtn}
            hitSlop={8}
          >
            <Ionicons name="play-skip-forward" size={32} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.extraControls}>
          <Pressable hitSlop={8}>
            <Ionicons name="shuffle" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Pressable hitSlop={8}>
            <Ionicons name="repeat" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/library')} hitSlop={8}>
            <Ionicons name="list" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Pressable hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0005',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 20,
  },
  noTrack: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  artworkContainer: {
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  artwork: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_WIDTH - 48,
    borderRadius: 16,
    backgroundColor: Colors.surface2,
  },
  likeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trackText: {
    flex: 1,
    gap: 4,
  },
  trackTitle: {
    fontSize: 22,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
  },
  trackArtist: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: Colors.textSecondary,
  },
  progressSection: {
    gap: 8,
  },
  progressBar: {
    paddingVertical: 10,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surface2,
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  controlBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  extraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
});
