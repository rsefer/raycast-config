import { spotifyRequest } from "../helpers/spotify-client";

export type SearchResultItem = {
  id: string;
  name?: string;
  type: "track" | "artist" | "album" | "playlist" | "show" | "episode" | "audiobook";
  artists?: { name: string }[];
  images?: { url: string; height?: number; width?: number }[];
  external_urls?: { spotify?: string };
  uri?: string;
  preview_url?: string | null;
  release_date?: string;
  total_tracks?: number;
  description?: string;
  publisher?: string;
  explicit?: boolean;
};

type SearchResponse = {
  tracks?: { items: SearchResultItem[] };
  artists?: { items: SearchResultItem[] };
  albums?: { items: SearchResultItem[] };
  playlists?: { items: SearchResultItem[] };
  shows?: { items: SearchResultItem[] };
  episodes?: { items: SearchResultItem[] };
  audiobooks?: { items: SearchResultItem[] };
};

export async function searchSpotify(query: string, types: string[] = ["track", "artist", "album", "playlist", "show", "episode", "audiobook"], limit: number = 50): Promise<SearchResultItem[]> {

  const typeString = types.join(",");
  const encodedQuery = encodeURIComponent(query);

  const response = await spotifyRequest(`search?q=${encodedQuery}&type=${typeString}&limit=${limit}`);

	const data = response as SearchResponse;

  const results: SearchResultItem[] = [];

  // Combine all results in order
  if (data.tracks?.items) results.push(...data.tracks.items.map((item) => ({ ...item, type: "track" as const })));
  if (data.artists?.items) results.push(...data.artists.items.map((item) => ({ ...item, type: "artist" as const })));
  if (data.albums?.items) results.push(...data.albums.items.map((item) => ({ ...item, type: "album" as const })));
  if (data.playlists?.items) results.push(...data.playlists.items.map((item) => ({ ...item, type: "playlist" as const })));
  if (data.shows?.items) results.push(...data.shows.items.map((item) => ({ ...item, type: "show" as const })));
  if (data.episodes?.items) results.push(...data.episodes.items.map((item) => ({ ...item, type: "episode" as const })));
  if (data.audiobooks?.items) results.push(...data.audiobooks.items.map((item) => ({ ...item, type: "audiobook" as const })));

  return results;
}
