import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import SongCard from '@/components/SongCard';
import { usePlayer, Track } from '@/context/PlayerContext';
import { getApiUrl } from '@/lib/query-client';
import { Image } from 'expo-image';

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function FeaturedCard({ track, queue }: { track: Track; queue: Track[] }) {
  const { playTrack } = usePlayer();
  return (
    <Pressable
      style={({ pressed }) => [styles.featuredCard, pressed && { opacity: 0.85 }]}
      onPress={async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await playTrack(track, queue);
      }}
    >
      <Image
        source={{ uri: track.thumbnail }}
        style={styles.featuredImage}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.featuredGradient}
      />
      <View style={styles.featuredInfo}>
        <Text style={styles.featuredTitle} numberOfLines={2}>{track.title}</Text>
        <Text style={styles.featuredArtist} numberOfLines={1}>{track.artist}</Text>
      </View>
      <View style={styles.featuredPlay}>
        <Ionicons name="play-circle" size={44} color={Colors.accent} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { history } = usePlayer();

  const lastTrack = history.length > 0 ? history[0] : undefined;
  const lastPlayedId = lastTrack?.videoId;

  const { data, isLoading, refetch, isRefetching } = useQuery<{ tracks: Track[] }>({
    queryKey: ['/api/recommendations', lastPlayedId ?? 'default'],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const params = new URLSearchParams();
      if (lastTrack?.videoId) params.set('videoId', lastTrack.videoId);
      if (lastTrack?.title) params.set('title', lastTrack.title);
      if (lastTrack?.artist) params.set('artist', lastTrack.artist);
      const url = new URL(`/api/recommendations?${params.toString()}`, baseUrl);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const tracks = data?.tracks ?? [];

  const topTrack = tracks[0];
  const moreTracks = tracks.slice(1);

  const handleLongPress = useCallback((track: Track) => {
    // Long press to add to queue handled elsewhere
  }, []);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 120 : 140;

  return (
    <View style={styles.container}>
      <FlatList
        data={moreTracks}
        keyExtractor={item => item.videoId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topInset + 80, paddingBottom: bottomPad }}
        scrollEnabled={moreTracks.length > 0}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.accent}
            progressViewOffset={topInset + 80}
          />
        }
        ListHeaderComponent={
          <>
            {topTrack && (
              <View style={styles.featuredSection}>
                <FeaturedCard track={topTrack} queue={tracks} />
              </View>
            )}
            {history.length > 0 && (
              <>
                <SectionHeader title="Recently Played" />
                {history.slice(0, 5).map(track => (
                  <SongCard
                    key={track.videoId}
                    track={track}
                    queue={history}
                    onLongPress={handleLongPress}
                  />
                ))}
              </>
            )}
            {moreTracks.length > 0 && <SectionHeader title="Recommended" />}
          </>
        }
        renderItem={({ item }) => (
          <SongCard
            track={item}
            queue={tracks}
            onLongPress={handleLongPress}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <View style={styles.loadingDots}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[styles.loadDot, { opacity: 0.3 + i * 0.3 }]} />
                ))}
              </View>
              <Text style={styles.emptyText}>Finding music for you...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No recommendations yet</Text>
              <Text style={styles.emptySubtext}>Search for a song to get started</Text>
            </View>
          )
        }
      />

      <View style={[styles.topBar, { paddingTop: topInset + 16 }]}>
        <Text style={styles.brandName}>wavely</Text>
        <Pressable style={styles.avatarBtn} hitSlop={8}>
          <Ionicons name="person-circle-outline" size={30} color={Colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
    backgroundColor: 'rgba(10,10,10,0.92)',
  },
  brandName: {
    fontSize: 24,
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  featuredSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 200,
    position: 'relative',
    backgroundColor: Colors.surface2,
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 64,
    gap: 4,
  },
  featuredTitle: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
    lineHeight: 24,
  },
  featuredArtist: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  featuredPlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 60,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: Colors.textMuted,
  },
});
