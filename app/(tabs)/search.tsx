import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import SongCard from '@/components/SongCard';
import { usePlayer, Track } from '@/context/PlayerContext';
import { getApiUrl } from '@/lib/query-client';

const GENRES = [
  { label: 'Pop', color: '#E91E63' },
  { label: 'Hip-Hop', color: '#9C27B0' },
  { label: 'Rock', color: '#F44336' },
  { label: 'Electronic', color: '#2196F3' },
  { label: 'R&B', color: '#FF9800' },
  { label: 'Jazz', color: '#4CAF50' },
  { label: 'Classical', color: '#795548' },
  { label: 'Lo-fi', color: '#607D8B' },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { addToQueue } = usePlayer();

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setTracks([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/search?q=${encodeURIComponent(q)}`, baseUrl);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setTracks([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(text), 600);
  }, [performSearch]);

  const handleGenrePress = useCallback((genre: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(genre);
    performSearch(genre);
  }, [performSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setTracks([]);
    setHasSearched(false);
    setError(null);
  }, []);

  const handleLongPress = useCallback((track: Track) => {
    addToQueue(track);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [addToQueue]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 120 : 140;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Songs, artists, albums..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(query)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {!hasSearched ? (
        <FlatList
          data={GENRES}
          numColumns={2}
          keyExtractor={item => item.label}
          contentContainerStyle={[styles.genreGrid, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.browseTitle}>Browse Genres</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.genreCard,
                { backgroundColor: item.color },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handleGenrePress(item.label)}
            >
              <Text style={styles.genreLabel}>{item.label}</Text>
              <Ionicons name="musical-note" size={28} color="rgba(255,255,255,0.3)" />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={item => item.videoId}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={tracks.length > 0}
          renderItem={({ item }) => (
            <SongCard
              track={item}
              queue={tracks}
              onLongPress={handleLongPress}
            />
          )}
          ListEmptyComponent={
            isSearching ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.stateText}>Searching...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerState}>
                <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.stateText}>Search unavailable</Text>
                <Text style={styles.stateSubtext}>{error}</Text>
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => performSearch(query)}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.centerState}>
                <Ionicons name="musical-notes-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.stateText}>No results found</Text>
                <Text style={styles.stateSubtext}>Try a different search</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: Colors.text,
    padding: 0,
  },
  browseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  genreGrid: {
    padding: 16,
    gap: 12,
  },
  genreCard: {
    flex: 1,
    height: 100,
    borderRadius: 12,
    padding: 14,
    margin: 6,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  genreLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: 32,
  },
  stateText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stateSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.accent,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
