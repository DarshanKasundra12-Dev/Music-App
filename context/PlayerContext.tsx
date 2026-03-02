import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '@/lib/query-client';

export interface Track {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  durationStr: string;
  listId?: string;
}

interface PlayerContextValue {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  history: Track[];
  error: string | null;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  setQueue: (tracks: Track[]) => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const HISTORY_KEY = '@wavely_history';
const QUEUE_KEY = '@wavely_queue';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [history, setHistory] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const queueRef = useRef<Track[]>([]);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    loadHistory();
    loadQueue();
  }, []);

  async function loadHistory() {
    try {
      const data = await AsyncStorage.getItem(HISTORY_KEY);
      if (data) setHistory(JSON.parse(data));
    } catch (_) {}
  }

  async function saveHistory(tracks: Track[]) {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(tracks));
    } catch (_) {}
  }

  async function loadQueue() {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      if (data) {
        const q = JSON.parse(data);
        setQueueState(q);
        queueRef.current = q;
      }
    } catch (_) {}
  }

  async function saveQueue(tracks: Track[]) {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(tracks));
    } catch (_) {}
  }

  function addToHistory(track: Track) {
    setHistory(prev => {
      const filtered = prev.filter(t => t.videoId !== track.videoId);
      const next = [track, ...filtered].slice(0, 50);
      saveHistory(next);
      return next;
    });
  }

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis ?? 0);
    setDuration(status.durationMillis ?? 0);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      const q = queueRef.current;
      const cur = currentTrackRef.current;
      if (q.length > 0) {
        const idx = cur ? q.findIndex(t => t.videoId === cur.videoId) : -1;
        const next = idx >= 0 && idx < q.length - 1 ? q[idx + 1] : q[0];
        if (next) {
          loadAndPlay(next);
        }
      }
    }
  }, []);

  async function unloadSound() {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (_) {}
      soundRef.current = null;
    }
  }

  async function loadAndPlay(track: Track) {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    await unloadSound();
    setCurrentTrack(track);
    currentTrackRef.current = track;
    setPosition(0);
    setDuration(0);

    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL(`/api/stream/${track.videoId}`, baseUrl).toString());
      if (!res.ok) throw new Error(`Failed to get stream: ${res.status}`);
      const data = await res.json();
      const streamUrl = data.url;

      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        onPlaybackStatusUpdate,
      );

      soundRef.current = sound;
      setIsPlaying(true);
      addToHistory(track);
    } catch (err: any) {
      setError(err.message || 'Failed to play track');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }

  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    if (newQueue) {
      setQueueState(newQueue);
      queueRef.current = newQueue;
      saveQueue(newQueue);
    }
    await loadAndPlay(track);
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (_) {}
  }, [isPlaying]);

  const skipToNext = useCallback(async () => {
    const q = queueRef.current;
    const cur = currentTrackRef.current;
    if (!cur || q.length === 0) return;
    const idx = q.findIndex(t => t.videoId === cur.videoId);
    const next = idx >= 0 && idx < q.length - 1 ? q[idx + 1] : q[0];
    if (next) await loadAndPlay(next);
  }, []);

  const skipToPrevious = useCallback(async () => {
    const q = queueRef.current;
    const cur = currentTrackRef.current;
    if (position > 3000) {
      await soundRef.current?.setPositionAsync(0);
      return;
    }
    if (!cur || q.length === 0) return;
    const idx = q.findIndex(t => t.videoId === cur.videoId);
    const prev = idx > 0 ? q[idx - 1] : q[q.length - 1];
    if (prev) await loadAndPlay(prev);
  }, [position]);

  const seekTo = useCallback(async (positionMs: number) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(positionMs);
    } catch (_) {}
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueueState(prev => {
      const next = [...prev, track];
      queueRef.current = next;
      saveQueue(next);
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState(prev => {
      const next = prev.filter((_, i) => i !== index);
      queueRef.current = next;
      saveQueue(next);
      return next;
    });
  }, []);

  const setQueue = useCallback((tracks: Track[]) => {
    setQueueState(tracks);
    queueRef.current = tracks;
    saveQueue(tracks);
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState([]);
    queueRef.current = [];
    saveQueue([]);
  }, []);

  useEffect(() => {
    return () => {
      unloadSound();
    };
  }, []);

  const value = useMemo<PlayerContextValue>(() => ({
    currentTrack,
    queue,
    isPlaying,
    isLoading,
    position,
    duration,
    history,
    error,
    playTrack,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    addToQueue,
    removeFromQueue,
    setQueue,
    clearQueue,
  }), [
    currentTrack, queue, isPlaying, isLoading, position, duration, history, error,
    playTrack, togglePlayPause, skipToNext, skipToPrevious, seekTo,
    addToQueue, removeFromQueue, setQueue, clearQueue,
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
