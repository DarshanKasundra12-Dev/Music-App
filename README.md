# Wavely — YouTube Music-Style Streaming App

A full-stack music streaming app powered by yt-dlp. No database, no login required.

---

## Overview

| Layer | Tech |
|-------|------|
| Frontend | Expo (React Native) — iOS, Android, Web |
| Backend | Node.js + Express |
| Streaming | yt-dlp (YouTube audio extraction) |
| Storage | AsyncStorage (local, on-device only) |
| Caching | node-cache (in-memory, 5-min TTL) |

**No database is used.** All listening history and queue data is stored locally on the device using AsyncStorage. The backend is stateless.

---

## Prerequisites

Install these before anything else:

- **Node.js** v18+ — https://nodejs.org
- **yt-dlp** — https://github.com/yt-dlp/yt-dlp/releases
- **ffmpeg** — https://ffmpeg.org/download.html
- **Expo Go** app on your phone (for mobile testing) — App Store / Google Play

Verify installations:
```bash
node --version
yt-dlp --version
ffmpeg -version
```

---

## Installation

```bash
# 1. Clone the project
git clone <your-repo-url>
cd wavely

# 2. Install all dependencies
npm install
```

---

## Running the App

You need **two terminals** running simultaneously.

### Terminal 1 — Backend Server

```bash
npm run server:dev
```

Server starts on **http://localhost:5000**

### Terminal 2 — Frontend (Expo)

```bash
npm run expo:dev
```

- **Web preview:** http://localhost:8081
- **Mobile (Expo Go):** Scan the QR code shown in the terminal

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations?videoId=&title=&artist=` | Get track recommendations |
| GET | `/api/search?q=your+query` | Search YouTube Music |
| GET | `/api/stream/:videoId` | Get audio stream URL |
| GET | `/api/queue?videoId=&listId=` | Get playlist/queue |

---

## Environment Variables

No `.env` file needed for local development. In production (Replit), `EXPO_PUBLIC_DOMAIN` is set automatically.

For self-hosted deployment, set:
```bash
EXPO_PUBLIC_DOMAIN=your-backend-domain.com
PORT=5000
```

---

## No Database Setup Required

This app has **no database**. All data is:
- **Listening history** → stored in AsyncStorage on device
- **Queue** → stored in AsyncStorage on device
- **Stream URLs** → cached in server memory (auto-cleared every 5 min)

There are no migrations, no seeds, and no DB connection strings to configure.

---

## Building Android APK

### Step 1 — Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Step 2 — Configure EAS

```bash
eas build:configure
```

This creates `eas.json`. Make sure it has a `preview` profile:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Step 3 — Build the APK

```bash
eas build -p android --profile preview
```

This uploads your code to Expo's build servers and returns a download link for the `.apk` file. Build takes ~5–10 minutes.

### Step 4 — Install APK on Android Device

1. Download the `.apk` from the link provided by EAS
2. Transfer it to your Android device (USB, email, Google Drive, etc.)
3. On your Android device go to **Settings → Security → Install Unknown Apps** and enable it for your file manager
4. Open the `.apk` file on your device and tap **Install**
5. Once installed, open **Wavely** from your app drawer

> **Note:** The APK will connect to your backend. Make sure your backend is deployed to a public URL and set `EXPO_PUBLIC_DOMAIN` to that URL before building.

---

## Project Structure

```
├── app/
│   ├── _layout.tsx          # Root layout + providers
│   ├── player.tsx           # Full-screen player (modal)
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar with mini player
│       ├── index.tsx        # Home screen (recommendations)
│       ├── search.tsx       # Search screen
│       └── library.tsx      # Queue + history screen
├── components/
│   ├── SongCard.tsx         # Track list item
│   └── MiniPlayer.tsx       # Persistent bottom player bar
├── context/
│   └── PlayerContext.tsx    # Global audio state + queue
├── server/
│   ├── index.ts             # Express server entry
│   ├── routes.ts            # API route definitions
│   ├── ytService.ts         # yt-dlp integration
│   └── cache.ts             # In-memory cache
└── constants/
    └── colors.ts            # Theme colors
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `yt-dlp: command not found` | Install yt-dlp and ensure it's in your PATH |
| Stream returns 403 error | yt-dlp auto-retries; update yt-dlp if persistent: `yt-dlp -U` |
| App shows "No recommendations" | Backend is not reachable — check Terminal 1 is running |
| QR code not scanning | Make sure phone and computer are on the same Wi-Fi network |
| APK install blocked | Enable "Install from unknown sources" in Android settings |
