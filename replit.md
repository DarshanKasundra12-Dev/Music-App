# Wavely - YouTube Music-Style Streaming App

## Overview
A full-stack YouTube Music-style streaming app built with Expo (React Native) + Express backend. Features music search, streaming via yt-dlp, recommendations, queue management, and a full-screen player with gesture controls.

## Architecture

### Frontend (Expo/React Native)
- **Framework**: Expo Router with file-based routing
- **Audio Playback**: expo-av (Audio API)
- **State Management**: React Context (PlayerContext) + AsyncStorage
- **Fonts**: Nunito (@expo-google-fonts/nunito)
- **UI**: Dark YouTube Music-inspired theme (black/red)

### Backend (Express + Node.js)
- **API**: REST endpoints at `/api/`
- **Streaming**: yt-dlp via child_process to extract YouTube stream URLs
- **Caching**: node-cache with 5-min TTL for search results, stream URLs

## Routes

### Frontend (Expo Router)
- `app/(tabs)/index.tsx` - Home screen with recommendations
- `app/(tabs)/search.tsx` - Music search screen
- `app/(tabs)/library.tsx` - Queue and listening history
- `app/player.tsx` - Full-screen player modal

### Backend API
- `GET /api/recommendations?videoId=&title=&artist=` - Track recommendations
- `GET /api/search?q=` - Search YouTube Music
- `GET /api/stream/:videoId` - Get audio stream URL
- `GET /api/queue?videoId=&listId=` - Get queue/playlist

## Key Components
- `context/PlayerContext.tsx` - Global audio state, queue, history management
- `components/MiniPlayer.tsx` - Persistent mini player at bottom of tabs
- `components/SongCard.tsx` - Reusable track list item
- `app/player.tsx` - Full-screen player with swipe gestures

## Tech Stack
- **Frontend**: Expo SDK 54, expo-av, expo-linear-gradient, react-native-reanimated, react-native-gesture-handler
- **Backend**: Express, yt-dlp (system), node-cache
- **Fonts**: @expo-google-fonts/nunito

## Configuration
- Backend runs on port 5000
- Frontend (Expo) runs on port 8081
- `EXPO_PUBLIC_DOMAIN` env var set automatically by Replit workflow

## Design
- Dark theme: #0A0A0A background, #FF0033 accent (YouTube red)
- Nunito font family throughout
- Gesture-driven player: swipe up/down to expand/minimize, swipe left/right for next/prev
