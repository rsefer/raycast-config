import { provider } from "./oauth";

export type SimplifiedEpisode = {
  id: string;
  name: string;
  description?: string;
  html_description?: string;
  release_date?: string;
  duration_ms?: number;
  explicit?: boolean;
  resume_point?: { fully_played?: boolean; resume_position_ms?: number };
  images?: { url: string; height?: number; width?: number }[];
  external_urls?: { spotify?: string };
  uri?: string;
  type?: "episode";
};

type EpisodesResponse = {
  href?: string;
  items?: SimplifiedEpisode[];
  limit?: number;
  next?: string | null;
  offset?: number;
  previous?: string | null;
  total?: number;
};

type GetShowEpisodesOptions = {
  showId: string;
  limit?: number;
  offset?: number;
  market?: string;
};

export async function getShowEpisodes({ showId, limit = 3, offset = 0, market }: GetShowEpisodesOptions) {
  const accessToken = await provider.authorize();
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (offset > 0) {
    params.set("offset", String(offset));
  }
  if (market) {
    params.set("market", market);
  }

  const query = params.toString();
  const url = `https://api.spotify.com/v1/shows/${encodeURIComponent(showId)}/episodes${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify show episodes failed: ${response.status} ${body}`);
  }

  return (await response.json()) as EpisodesResponse;
}
