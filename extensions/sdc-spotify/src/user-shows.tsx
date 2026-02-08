import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getCacheEntry, isCacheFresh, setCacheEntry } from "./api/cache";
import { getAllUserShows, SimplifiedShow } from "./api/user-shows";
import { openSpotifyUri } from "./helpers/spotify-applescript";

type ViewState = {
  isLoading: boolean;
  shows: SimplifiedShow[];
  error?: string;
};

type LoadOptions = {
  forceRefresh?: boolean;
};

const CACHE_KEY = "spotify-podcasts-user-shows";
const CACHE_TTL_MS = 5 * 60 * 1000;

export default function UserShowsCommand() {
  const [state, setState] = useState<ViewState>({ isLoading: true, shows: [] });

  const loadShows = useCallback(async ({ forceRefresh = false }: LoadOptions = {}) => {
    let cachedShows: SimplifiedShow[] | null = null;
    const cachedEntry = await getCacheEntry<SimplifiedShow[]>(CACHE_KEY);
    const cacheIsFresh = cachedEntry ? isCacheFresh(cachedEntry, CACHE_TTL_MS) : false;

    if (cachedEntry) {
      cachedShows = cachedEntry.value ?? [];
      setState((previous) => ({
        ...previous,
        isLoading: !cacheIsFresh,
        shows: cachedShows ?? [],
        error: undefined,
      }));
    }

    if (cacheIsFresh && !forceRefresh) {
      return;
    }

    try {
      const { items } = await getAllUserShows();
      setState({ isLoading: false, shows: items });
      await setCacheEntry(CACHE_KEY, items);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: message,
        shows: cachedShows ?? previous.shows,
      }));

      await showToast({ style: Toast.Style.Failure, title: "Failed to load shows", message });
    }
  }, []);

  useEffect(() => {
    void loadShows();
  }, []);

  const emptyTitle = state.error ? "Unable to load shows" : "No saved shows";
  const emptyDescription = state.error
    ? "Check your Spotify connection and try again."
    : "Save podcasts in Spotify to see them here.";

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search saved shows">
      {state.shows.map((show) => (
        <List.Item
          key={show.id}
          title={show.name}
          subtitle={show.publisher}
          accessories={show.total_episodes ? [{ text: `${show.total_episodes} episodes` }] : undefined}
          icon={show.images?.[0]?.url ? { source: show.images[0].url } : Icon.Microphone}
          actions={
            <ActionPanel>
              {show.uri ? (
                <Action
                  title="Open in Spotify"
                  icon={Icon.Music}
                  onAction={() => void openSpotifyUri(show.uri!)}
                />
              ) : null}
              {show.external_urls?.spotify ? (
                <Action.OpenInBrowser title="Open in Web Browser" url={show.external_urls.spotify} />
              ) : null}
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadShows({ forceRefresh: true })} />
              <Action.CopyToClipboard title="Copy Show Name" content={show.name} />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title={emptyTitle}
        description={emptyDescription}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadShows({ forceRefresh: true })} />
          </ActionPanel>
        }
      />
    </List>
  );
}
