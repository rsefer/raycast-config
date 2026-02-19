import { spotifyRequest } from "../helpers/spotify-client";
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

  const uniqueIds = [...new Set(episodeIds)];
  const chunks = chunkArray(uniqueIds, BATCH_SIZE);
  const results = new Map<string, EpisodeDetail>();

  for (const chunk of chunks) {
    const promises = chunk.map(async (episodeId) => {
			return await spotifyRequest(`episodes/${encodeURIComponent(episodeId)}`);
    });

    const episodes = await Promise.all(promises) as EpisodeDetail[];

    for (const episode of episodes) {
      if (episode?.id) {
        results.set(episode.id, episode);
      }
    }
  }

  return results;
}
