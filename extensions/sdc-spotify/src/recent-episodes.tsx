import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCacheEntry, isCacheFresh, setCacheEntry } from "./api/cache";
import { getEpisodesDetails } from "./api/episode-details";
import { getShowEpisodes, SimplifiedEpisode } from "./api/show-episodes";
import { getAllUserEpisodes } from "./api/user-episodes";
import { getAllUserShows, SimplifiedShow } from "./api/user-shows";
import { openSpotifyUri, playSpotifyUri } from "./helpers/spotify-applescript";

type EpisodeListItem = {
  episode: SimplifiedEpisode;
  showName?: string;
  showUrl?: string;
  isSaved?: boolean;
};

type ViewState = {
  isLoading: boolean;
  savedEpisodes: EpisodeListItem[];
  recentEpisodes: EpisodeListItem[];
  error?: string;
};

const filters = {
  all: "All",
  subscribed: "Subscribed Episodes",
  saved: "Saved Episodes",
} as const;

type FilterValue = keyof typeof filters;

const SHOW_BATCH_SIZE = 5;
const EPISODES_PER_SHOW = 3;
const CACHE_KEY = "spotify-podcasts-recent-episodes";
const CACHE_TTL_MS = 5 * 60 * 1000;

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function isValidEpisodeItem(item: EpisodeListItem | null | undefined): item is EpisodeListItem {
  return Boolean(item?.episode && item.episode.id && item.episode.name);
}

export default function RecentEpisodesCommand() {
  const [state, setState] = useState<ViewState>({
    isLoading: true,
    savedEpisodes: [],
    recentEpisodes: [],
  });
  const [searchFilter, setSearchFilter] = useState<FilterValue>("all");

  const loadEpisodes = useCallback(async (forceRefresh = false) => {
    let cachedValue: { savedEpisodes: EpisodeListItem[]; recentEpisodes: EpisodeListItem[] } | null = null;
    const cachedEntry = await getCacheEntry<typeof cachedValue>(CACHE_KEY);
    const cacheIsFresh = cachedEntry ? isCacheFresh(cachedEntry, CACHE_TTL_MS) : false;

    if (cachedEntry) {
      cachedValue = cachedEntry.value ?? { savedEpisodes: [], recentEpisodes: [] };
      const cachedSavedEpisodes = (cachedValue.savedEpisodes ?? []).filter(isValidEpisodeItem);
      const cachedRecentEpisodes = (cachedValue.recentEpisodes ?? []).filter(isValidEpisodeItem);
      setState((previous) => ({
        ...previous,
        isLoading: !cacheIsFresh,
        savedEpisodes: cachedSavedEpisodes,
        recentEpisodes: cachedRecentEpisodes,
        error: undefined,
      }));
    }

    if (cacheIsFresh && !forceRefresh) {
      return;
    }

    setState((previous) => ({ ...previous, isLoading: true }));

    try {
      const [{ items: shows }, { items: savedEpisodes }] = await Promise.all([
        getAllUserShows(),
        getAllUserEpisodes(),
      ]);

      const cleanedSavedEpisodes = savedEpisodes.filter((episode) => episode.id && episode.name);
      const savedEpisodeItems: EpisodeListItem[] = cleanedSavedEpisodes.map((episode) => ({
        episode,
        showName: episode.show?.name,
        showUrl: episode.show?.external_urls?.spotify,
        isSaved: true,
      }));
      const savedById = new Map(cleanedSavedEpisodes.map((episode) => [episode.id, episode]));
      const savedIds = new Set(cleanedSavedEpisodes.map((episode) => episode.id));

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
            if (entry.episode?.id && entry.episode.name) {
              recentEpisodeItems.push({
                episode: entry.episode,
                showName: entry.show.name,
                showUrl: entry.show.external_urls?.spotify,
                isSaved: savedIds.has(entry.episode.id),
              });
            }
          }
        }
      }

      // Fetch episode details to get resume_point data
      const allEpisodeIds = [
        ...cleanedSavedEpisodes.map((e) => e.id),
        ...recentEpisodeItems.map((e) => e.episode.id),
      ];
      const episodeDetailsMap = await getEpisodesDetails(allEpisodeIds);

      // Merge resume_point into saved episodes
      const savedEpisodeItemsWithDetails = savedEpisodeItems.map((item) => {
        const details = episodeDetailsMap.get(item.episode.id);
        return {
          ...item,
          episode: details ? { ...item.episode, resume_point: details.resume_point } : item.episode,
        };
      });

      // Merge resume_point into recent episodes
      const recentEpisodeItemsWithDetails = recentEpisodeItems.map((item) => {
        const details = episodeDetailsMap.get(item.episode.id);
        return {
          ...item,
          episode: details ? { ...item.episode, resume_point: details.resume_point } : item.episode,
        };
      });

      setState({
        isLoading: false,
        savedEpisodes: savedEpisodeItemsWithDetails,
        recentEpisodes: recentEpisodeItemsWithDetails,
      });
      await setCacheEntry(CACHE_KEY, {
        savedEpisodes: savedEpisodeItemsWithDetails,
        recentEpisodes: recentEpisodeItemsWithDetails,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: message,
        savedEpisodes: cachedValue?.savedEpisodes ?? previous.savedEpisodes,
        recentEpisodes: cachedValue?.recentEpisodes ?? previous.recentEpisodes,
      }));

      await showToast({ style: Toast.Style.Failure, title: "Failed to load episodes", message });
    }
  }, []);

  useEffect(() => {
    void loadEpisodes();
  }, []);

  const sortedSavedEpisodes = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return [...state.savedEpisodes]
      .filter(isValidEpisodeItem)
      .filter((item) => {
        // Exclude episodes that are fully played AND older than 1 month
        const isFullyPlayed = item.episode.resume_point?.fully_played;
        const releaseDate = item.episode.release_date ? new Date(item.episode.release_date) : null;
        const isOlderThanMonth = releaseDate ? releaseDate < oneMonthAgo : false;

        return !(isFullyPlayed && isOlderThanMonth);
      })
      .sort((a, b) => {
        // First, prioritize unfinished episodes
        const aFinished = a.episode.resume_point?.fully_played ?? false;
        const bFinished = b.episode.resume_point?.fully_played ?? false;
        if (aFinished !== bFinished) {
          return aFinished ? 1 : -1; // Unfinished first
        }

        // Then sort by date (newest first)
        const aDate = a.episode.release_date ? new Date(a.episode.release_date).getTime() : 0;
        const bDate = b.episode.release_date ? new Date(b.episode.release_date).getTime() : 0;
        return bDate - aDate;
      });
  }, [state.savedEpisodes]);

  const sortedRecentEpisodes = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return [...state.recentEpisodes]
      .filter(isValidEpisodeItem)
      .filter((item) => {
        // Exclude episodes that are fully played AND older than 1 month
        const isFullyPlayed = item.episode.resume_point?.fully_played;
        const releaseDate = item.episode.release_date ? new Date(item.episode.release_date) : null;
        const isOlderThanMonth = releaseDate ? releaseDate < oneMonthAgo : false;

        return !(isFullyPlayed && isOlderThanMonth);
      })
      .sort((a, b) => {
        // First, prioritize unfinished episodes
        const aFinished = a.episode.resume_point?.fully_played ?? false;
        const bFinished = b.episode.resume_point?.fully_played ?? false;
        if (aFinished !== bFinished) {
          return aFinished ? 1 : -1; // Unfinished first
        }

        // Then sort by date (newest first)
        const aDate = a.episode.release_date ? new Date(a.episode.release_date).getTime() : 0;
        const bDate = b.episode.release_date ? new Date(b.episode.release_date).getTime() : 0;
        return bDate - aDate;
      });
  }, [state.recentEpisodes]);

  const emptyTitle = state.error ? "Unable to load episodes" : "No recent episodes";
  const emptyDescription = state.error
    ? "Check your Spotify connection and try again."
    : "Save shows in Spotify to see their latest episodes.";

  const renderEpisodeItem = ({ episode, showName, showUrl, isSaved }: EpisodeListItem) => {
    const title = episode.name?.trim() || "Untitled Episode";

    const accessories: List.Item.Accessory[] = [];
    if (episode.duration_ms) {
      accessories.push({ text: formatEpisodeTime(episode.duration_ms) });
    }

    if (episode.resume_point) {
      if (episode.resume_point.fully_played) {
        accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Played" });
      } else if ((episode.resume_point.resume_position_ms ?? 0) > 0) {
        if (episode.duration_ms && accessories.length > 0) {
          const remaining = Math.max(0, episode.duration_ms - episode.resume_point.resume_position_ms);
          accessories[0].text = `${formatEpisodeTime(remaining)} remaining`;
        }
        accessories.push({ icon: { source: Icon.CircleProgress50, tintColor: Color.Blue }, tooltip: "In-progress" });
      }
    }

    return (
      <List.Item
        key={episode.id}
        title={title}
        subtitle={episode.release_date}
        icon={episode.images?.[0]?.url ? { source: episode.images[0].url } : Icon.Microphone}
        accessories={accessories}
        actions={
          <ActionPanel>
            {episode.uri ? (
              <Action
                title="Play in Spotify"
                icon={Icon.Play}
                onAction={() => void playSpotifyUri(episode.uri!)}
              />
            ) : null}
						{episode.uri ? (
							<Action
								title="Open in Spotify"
								icon={Icon.Music}
								onAction={() => void openSpotifyUri(episode.uri!)}
							/>
						) : null}
            {episode.external_urls?.spotify ? (
              <Action.OpenInBrowser
								title="Open in Web Browser"
								url={episode.external_urls.spotify}
								shortcut={{ modifiers: ["cmd"], key: "o" }}
							/>
            ) : null}
            {showUrl ? (
              <Action.OpenInBrowser
								title="Open Show in Web Browser"
								url={showUrl}
								shortcut={{ modifiers: ["cmd"], key: "s" }}
							/>
            ) : null}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
							shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => void loadEpisodes(true)}
            />
            <Action.CopyToClipboard
							title="Copy Episode Name"
							content={title}
							shortcut={{ modifiers: ["cmd"], key: "c" }}
						/>
          </ActionPanel>
        }
      />
    );
  };

  const hasAnyEpisodes = sortedSavedEpisodes.length > 0 || sortedRecentEpisodes.length > 0;
  const showSavedSection = (searchFilter === "all" || searchFilter === "saved") && sortedSavedEpisodes.length > 0;
  const showRecentSection =
    (searchFilter === "all" || searchFilter === "subscribed") && sortedRecentEpisodes.length > 0;
  const showEmptyView = !state.isLoading && !showSavedSection && !showRecentSection;

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search recent episodes"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter episodes"
          value={searchFilter}
          onChange={(newValue) => setSearchFilter(newValue as FilterValue)}
        >
          {Object.entries(filters).map(([value, label]) => (
            <List.Dropdown.Item key={value} title={label} value={value} />
          ))}
        </List.Dropdown>
      }
    >
			{showSavedSection ? (
				<List.Section title="Saved Episodes">
					{sortedSavedEpisodes.map((item) => renderEpisodeItem(item))}
				</List.Section>
			) : null}
      {showRecentSection ? (
        <List.Section title="Subscribed Episodes">
          {sortedRecentEpisodes.map((item) => renderEpisodeItem(item))}
        </List.Section>
      ) : null}
      {showEmptyView ? (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadEpisodes(true)} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function formatEpisodeTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours ? `${hours}h` : ""}${minutes}m`;
}
