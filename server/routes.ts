import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as ytService from "./ytService";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/search', async (req: Request, res: Response) => {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
    try {
      const tracks = await ytService.searchTracks(q);
      res.json({ tracks });
    } catch (err: any) {
      console.error('Search error:', err.message);
      res.status(500).json({ error: err.message, tracks: [] });
    }
  });

  app.get('/api/stream/:videoId', async (req: Request, res: Response) => {
    const { videoId } = req.params;
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' });
    try {
      const url = await ytService.getStreamUrl(videoId);
      res.json({ url });
    } catch (err: any) {
      console.error('Stream error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/recommendations', async (req: Request, res: Response) => {
    const videoId = req.query.videoId as string | undefined;
    const title = req.query.title as string | undefined;
    const artist = req.query.artist as string | undefined;
    try {
      const tracks = await ytService.getRecommendations(videoId, title, artist);
      res.json({ tracks });
    } catch (err: any) {
      console.error('Recommendations error:', err.message);
      res.status(500).json({ error: err.message, tracks: [] });
    }
  });

  app.get('/api/queue', async (req: Request, res: Response) => {
    const { videoId, listId } = req.query as { videoId?: string; listId?: string };
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' });
    try {
      let tracks;
      if (listId) {
        tracks = await ytService.getQueueFromPlaylist(videoId, listId);
      } else {
        const title = req.query.title as string | undefined;
        const artist = req.query.artist as string | undefined;
        tracks = await ytService.getRelatedTracks(videoId, title, artist);
      }
      res.json({ tracks });
    } catch (err: any) {
      console.error('Queue error:', err.message);
      res.status(500).json({ error: err.message, tracks: [] });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
