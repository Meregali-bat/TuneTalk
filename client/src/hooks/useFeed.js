import { postsApi } from '../api/index.js';
import { usePaginatedPosts } from './usePaginatedPosts.js';

// Feed "Para você" ou "Seguindo", em páginas.
export function useFeed(feed) {
  return usePaginatedPosts((depois) => (depois ? postsApi.feed(feed, depois) : postsApi.feed(feed)), feed);
}
