import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Track } from '@/context/PlayerContext';
import { usePlayer } from '@/context/PlayerContext';

interface SongCardProps {
  track: Track;
  queue?: Track[];
  isActive?: boolean;
  showIndex?: number;
  onLongPress?: (track: Track) => void;
}

export default function SongCard({
  track,
  queue,
  isActive = false,
  showIndex,
  onLongPress,
}: SongCardProps) {
  const { playTrack, isLoading, currentTrack } = usePlayer();

  const isCurrent = currentTrack?.videoId === track.videoId;
  const isCurrentLoading = isCurrent && isLoading;

  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const trackQueue = queue ?? [track];
    await playTrack(track, trackQueue);
  }, [track, queue, playTrack]);

  const handleLongPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.(track);
  }, [track, onLongPress]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        isActive && styles.active,
      ]}
    >
      <View style={styles.thumbnailWrapper}>
        <Image
          source={{ uri: track.thumbnail }}
          style={styles.thumbnail}
          contentFit="cover"
        />
        {isCurrent && (
          <View style={styles.activeOverlay}>
            {isCurrentLoading ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <View style={styles.playingDots}>
                <View style={[styles.dot, styles.dotAnimated]} />
                <View style={[styles.dot, styles.dotAnimated, { animationDelay: '0.2s' }]} />
                <View style={[styles.dot, styles.dotAnimated, { animationDelay: '0.4s' }]} />
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.title, isCurrent && styles.activeTitle]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.duration}>{track.durationStr || '--:--'}</Text>
        <Ionicons name="ellipsis-vertical" size={16} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  pressed: {
    backgroundColor: Colors.surface2,
  },
  active: {
    backgroundColor: Colors.accentGlow,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: Colors.surface2,
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingDots: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
    height: 16,
  },
  dot: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  dotAnimated: {
    opacity: 0.9,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  activeTitle: {
    color: Colors.accent,
  },
  artist: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  duration: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textMuted,
  },
});
