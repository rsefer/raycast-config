import { LaunchType, environment, showHUD } from "@raycast/api";
import { setCacheEntry } from "./api/cache";
import { getEpisodesDetails } from "./api/episode-details";
import { getShowEpisodes, SimplifiedEpisode } from "./api/show-episodes";
import { getAllUserEpisodes } from "./api/user-episodes";
import { getAllUserShows, SimplifiedShow } from "./api/user-shows";

const SHOWS_CACHE_KEY = "spotify-podcasts-user-shows";
const EPISODES_CACHE_KEY = "spotify-podcasts-recent-episodes";
const SHOW_BATCH_SIZE = 5;
const EPISODES_PER_SHOW = 3;

type EpisodeListItem = {
  episode: SimplifiedEpisode;
  showName?: string;
  showUrl?: string;
  isSaved?: boolean;
};

function isWithinActiveHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 7 && hour < 19; // 7am to 7pm
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function refreshData() {
  console.log("Background refresh started");

  // Only refresh during active hours
  if (!isWithinActiveHours()) {
    console.log("Outside active hours (7am-7pm), skipping refresh");
    return;
  }

  try {
    // Fetch fresh data from Spotify API
    const [showsResult, episodesResult] = await Promise.all([
      getAllUserShows(),
      getAllUserEpisodes(),
    ]);

    // Update shows cache
    await setCacheEntry(SHOWS_CACHE_KEY, showsResult.items);
    console.log(`Refreshed ${showsResult.items.length} shows`);

    // Build episodes cache with the same logic as recent-episodes.tsx
    const shows = showsResult.items;
    const savedEpisodes = episodesResult.items.filter((episode) => episode.id && episode.name);

    const savedEpisodeItems: EpisodeListItem[] = savedEpisodes.map((episode) => ({
      episode,
      showName: episode.show?.name,
      showUrl: episode.show?.external_urls?.spotify,
      isSaved: true,
    }));

    const savedIds = new Set(savedEpisodes.map((episode) => episode.id));
    const recentEpisodeItems: EpisodeListItem[] = [];
    const batches = chunkArray(shows, SHOW_BATCH_SIZE);

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (show) => {
          try {
            const response = await getShowEpisodes({ showId: show.id, limit: EPISODES_PER_SHOW });
            return (response.items ?? []).map((episode) => ({
              show,
              episode,
            }));
          } catch (error) {
            return [];
          }
        }),
      );

      for (const result of batchResults) {
        for (const entry of result) {
          recentEpisodeItems.push({
            episode: entry.episode,
            showName: entry.show.name,
            showUrl: entry.show.external_urls?.spotify,
            isSaved: savedIds.has(entry.episode.id),
          });
        }
      }
    }

    // Fetch episode details to get resume_point data
    const allEpisodeIds = [
      ...savedEpisodes.map((e) => e.id),
      ...recentEpisodeItems.map((e) => e.episode.id),
    ];
    const episodeDetailsMap = await getEpisodesDetails(allEpisodeIds);

    // Merge resume_point into episodes
    const savedEpisodeItemsWithDetails = savedEpisodeItems.map((item) => {
      const details = episodeDetailsMap.get(item.episode.id);
      return {
        ...item,
        episode: details ? { ...item.episode, resume_point: details.resume_point } : item.episode,
      };
    });

    const recentEpisodeItemsWithDetails = recentEpisodeItems.map((item) => {
      const details = episodeDetailsMap.get(item.episode.id);
      return {
        ...item,
        episode: details ? { ...item.episode, resume_point: details.resume_point } : item.episode,
      };
    });

    await setCacheEntry(EPISODES_CACHE_KEY, {
      savedEpisodes: savedEpisodeItemsWithDetails,
      recentEpisodes: recentEpisodeItemsWithDetails,
    });
    console.log(`Refreshed ${savedEpisodes.length} saved episodes and ${recentEpisodeItems.length} recent episodes`);

    if (environment.launchType === LaunchType.UserInitiated) {
      await showHUD("✓ Spotify data refreshed");
    }
  } catch (error) {
    console.error("Background refresh failed:", error);
    if (environment.launchType === LaunchType.UserInitiated) {
      await showHUD("✗ Failed to refresh Spotify data");
    }
  }
}

export default async function Command() {
  await refreshData();
}
