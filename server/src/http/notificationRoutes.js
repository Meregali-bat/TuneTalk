import { Router } from 'express';
import { asyncRoute, currentUserId, requireAuth, requireUsername } from './middlewares.js';

export function createNotificationRoutes({ notifications }) {
  const router = Router();
  router.use(requireAuth, requireUsername);

  router.get('/', asyncRoute(async (req, res) => {
    res.json(await notifications.listForUser(currentUserId(req)));
  }));

  router.get('/unread-count', asyncRoute(async (req, res) => {
    res.json({ count: await notifications.countUnread(currentUserId(req)) });
  }));

  router.post('/read-all', asyncRoute(async (req, res) => {
    await notifications.markAllRead(currentUserId(req));
    res.status(204).end();
  }));

  return router;
}
