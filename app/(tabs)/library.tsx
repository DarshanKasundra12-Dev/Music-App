import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import SongCard from '@/components/SongCard';
import { usePlayer, Track } from '@/context/PlayerContext';
import { Image } from 'expo-image';

type Tab = 'queue' | 'history';

function EmptyQueue() {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="list-outline" size={52} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>Queue is empty</Text>
      <Text style={styles.emptySubtext}>Play a song or search to fill the queue</Text>
    </View>
  );
}

function EmptyHistory() {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={52} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No listening history</Text>
      <Text style={styles.emptySubtext}>Songs you play will appear here</Text>
    </View>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('queue');
  const { queue, history, removeFromQueue, playTrack, clearQueue, currentTrack } = usePlayer();

  const handleTabSwitch = useCallback((tab: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const handleRemoveFromQueue = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeFromQueue(index);
  }, [removeFromQueue]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 120 : 140;

  const listData = activeTab === 'queue' ? queue : history;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.title}>Library</Text>

        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'queue' && styles.tabBtnActive]}
            onPress={() => handleTabSwitch('queue')}
          >
            <Text style={[styles.tabLabel, activeTab === 'queue' && styles.tabLabelActive]}>
              Queue
            </Text>
            {queue.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{queue.length}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            onPress={() => handleTabSwitch('history')}
          >
            <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>
              History
            </Text>
            {history.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{history.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {activeTab === 'queue' && queue.length > 0 && (
          <Pressable
            style={styles.clearBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              clearQueue();
            }}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.accent} />
            <Text style={styles.clearText}>Clear Queue</Text>
          </Pressable>
        )}
      </View>

      {currentTrack && activeTab === 'queue' && (
        <View style={styles.nowPlayingBar}>
          <View style={styles.nowPlayingDot} />
          <Image
            source={{ uri: currentTrack.thumbnail }}
            style={styles.nowPlayingThumb}
            contentFit="cover"
          />
          <View style={styles.nowPlayingInfo}>
            <Text style={styles.nowPlayingLabel}>NOW PLAYING</Text>
            <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentTrack.title}</Text>
          </View>
          <Ionicons name="musical-notes" size={18} color={Colors.accent} />
        </View>
      )}

      <FlatList
        data={listData}
        keyExtractor={(item, index) => `${item.videoId}-${index}`}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={listData.length > 0}
        renderItem={({ item, index }) =>
          activeTab === 'queue' ? (
            <View style={styles.queueItem}>
              <View style={styles.queueIndex}>
                <Text style={styles.queueIndexText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <SongCard
                  track={item}
                  queue={queue}
                  isActive={item.videoId === currentTrack?.videoId}
                />
              </View>
              <Pressable
                style={styles.removeBtn}
                onPress={() => handleRemoveFromQueue(index)}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <SongCard
              track={item}
              queue={history}
            />
          )
        }
        ListEmptyComponent={
          activeTab === 'queue' ? <EmptyQueue /> : <EmptyHistory />
        }
      />
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
    paddingBottom: 8,
    gap: 12,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: Colors.surface2,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  nowPlayingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    backgroundColor: Colors.accentGlow,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  nowPlayingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  nowPlayingThumb: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: Colors.surface2,
  },
  nowPlayingInfo: {
    flex: 1,
    gap: 2,
  },
  nowPlayingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1.2,
  },
  nowPlayingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  queueIndex: {
    width: 32,
    alignItems: 'center',
  },
  queueIndexText: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  removeBtn: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
