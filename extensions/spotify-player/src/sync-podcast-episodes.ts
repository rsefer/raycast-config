import { updateCommandMetadata } from "@raycast/api";
import { getMySavedShowsEpisodes } from "./api/getMySavedShowsEpisodes";
import { getMySavedEpisodes } from "./api/getMySavedEpisodes";
import { setSpotifyClient } from "./helpers/withSpotifyClient";

async function syncPodcastEpisodes() {
  await setSpotifyClient();

  try {
    const [subscribedEpisodes, savedEpisodes] = await Promise.all([
      getMySavedShowsEpisodes(),
      getMySavedEpisodes(),
    ]);

    const subscribedCount = subscribedEpisodes?.items?.length || 0;
    const savedCount = savedEpisodes?.items?.length || 0;
    const totalCount = subscribedCount + savedCount;
    return `Synced ${totalCount} episodes @ ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error("Error syncing podcast episodes:", error);
    return "Sync failed";
  }
}

export default async function Command() {
  const status = await syncPodcastEpisodes();
  await updateCommandMetadata({ subtitle: status });
}
