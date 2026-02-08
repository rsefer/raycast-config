import { provider } from "./oauth";
import { SimplifiedEpisode } from "./show-episodes";

type EpisodeDetail = SimplifiedEpisode & {
  resume_point?: { fully_played?: boolean; resume_position_ms?: number };
};

const BATCH_SIZE = 50;

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function getEpisodesDetails(episodeIds: string[]): Promise<Map<string, EpisodeDetail>> {
  if (episodeIds.length === 0) {
    return new Map();
  }

  const accessToken = await provider.authorize();
  const uniqueIds = [...new Set(episodeIds)];
  const chunks = chunkArray(uniqueIds, BATCH_SIZE);
  const results = new Map<string, EpisodeDetail>();

  // The batch endpoint GET /episodes?ids=... is being removed
  // Use individual GET /episodes/{id} calls instead
  for (const chunk of chunks) {
    const promises = chunk.map(async (episodeId) => {
      const url = `https://api.spotify.com/v1/episodes/${encodeURIComponent(episodeId)}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        // Skip episodes that fail (e.g., not available in market)
        return null;
      }

      return (await response.json()) as EpisodeDetail;
    });

    const episodes = await Promise.all(promises);

    for (const episode of episodes) {
      if (episode?.id) {
        results.set(episode.id, episode);
      }
    }
  }

  return results;
}
