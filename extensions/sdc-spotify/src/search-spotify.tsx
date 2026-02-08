import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { searchSpotify, SearchResultItem } from "./api/search";
import { openSpotifyUri } from "./helpers/spotify-applescript";

type ViewState = {
  isLoading: boolean;
  results: SearchResultItem[];
  error?: string;
};

const SEARCH_DEBOUNCE_MS = 300;
const TYPE_ORDER: Record<string, number> = {
  track: 0,
  artist: 1,
  album: 2,
  show: 3,
  episode: 4,
  audiobook: 5,
  playlist: 6,
};

const TYPE_LABELS: Record<string, string> = {
  track: "Tracks",
  artist: "Artists",
  album: "Albums",
  audiobook: "Audiobooks",
  playlist: "Playlists",
  show: "Podcasts",
  episode: "Episodes",
};

export default function SearchSpotifyCommand() {
  const [state, setState] = useState<ViewState>({ isLoading: false, results: [] });
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback(async (query: string) => {
    // Clear any pending searches
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setState({ isLoading: false, results: [], error: undefined });
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoading: true,
    }));

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchSpotify(query);
        setState({ isLoading: false, results, error: undefined });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({
          ...previous,
          isLoading: false,
          error: message,
        }));
        await showToast({ style: Toast.Style.Failure, title: "Search failed", message });
      }
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "track":
        return Icon.Music;
      case "artist":
        return Icon.Person;
      case "album":
        return Icon.HardDrive;
      case "audiobook":
        return Icon.Book;
      case "playlist":
        return Icon.List;
      case "show":
        return Icon.Microphone;
      case "episode":
        return Icon.Megaphone;
      default:
        return Icon.Dot;
    }
  };

  const getSubtitle = (item: SearchResultItem) => {
    switch (item.type) {
      case "track":
        return item.artists?.map((a) => a.name).join(", ") || "Unknown Artist";
      case "artist":
        return "Artist";
      case "album":
        return item.artists?.map((a) => a.name).join(", ") || "Unknown Artist";
      case "audiobook":
        return item.publisher || "Audiobook";
      case "playlist":
        return "Playlist";
      case "show":
        return item.publisher || "Show";
      case "episode":
        return item.description ? item.description.substring(0, 50) : "Episode";
      default:
        return "";
    }
  };

  const groupedResults = state.results.reduce(
    (acc, result) => {
      const type = result.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(result);
      return acc;
    },
    {} as Record<string, SearchResultItem[]>
  );

  const sortedTypes = Object.keys(groupedResults).sort(
    (a, b) => (TYPE_ORDER[a] ?? 999) - (TYPE_ORDER[b] ?? 999)
  );

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={handleSearch}
      searchBarPlaceholder="Search Spotify..."
      throttle
    >
      {sortedTypes.map((type) => (
        <List.Section key={type} title={TYPE_LABELS[type] || type}>
          {groupedResults[type]?.slice(0, 5).map((result) => (
            <List.Item
              key={`${result.type}-${result.id}`}
              title={result.name || "Unknown"}
              subtitle={getSubtitle(result)}
              icon={result.images?.[0]?.url ? { source: result.images[0].url } : getIcon(result.type)}
              actions={
                <ActionPanel>
                  {result.uri ? (
                    <Action
                      title="Open in Spotify"
                      icon={Icon.Music}
                      onAction={() => void openSpotifyUri(result.uri!)}
                    />
                  ) : null}
                  {result.external_urls?.spotify ? (
                    <Action.OpenInBrowser title="Open in Web Browser" url={result.external_urls.spotify} />
                  ) : null}
                  {result.preview_url ? (
                    <Action.OpenInBrowser title="Listen Preview" url={result.preview_url} />
                  ) : null}
                  <Action.CopyToClipboard
                    title={`Copy ${result.type.charAt(0).toUpperCase() + result.type.slice(1)} Name`}
                    content={result.name || "Unknown"}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {state.results.length === 0 && !state.isLoading && (
        <List.EmptyView
          title="No results"
          description="Search for songs, artists, albums, playlists, shows, or episodes"
        />
      )}
    </List>
  );
}
