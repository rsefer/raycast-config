import { provider } from "./oauth";
import { SimplifiedEpisode } from "./show-episodes";

type EpisodeDetail = SimplifiedEpisode & {
  resume_point?: { fully_played?: boolean; resume_position_ms?: number };
};

type EpisodesDetailsResponse = {
  episodes?: (EpisodeDetail | null)[];
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

  for (const chunk of chunks) {
    const url = `https://api.spotify.com/v1/episodes?ids=${chunk.join(",")}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Spotify /episodes lookup failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as EpisodesDetailsResponse;

    for (const episode of data.episodes ?? []) {
      if (episode?.id) {
        results.set(episode.id, episode);
      }
    }
  }

  return results;
}
