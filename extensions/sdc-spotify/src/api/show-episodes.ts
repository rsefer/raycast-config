import { spotifyRequest } from "../helpers/spotify-client";

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
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (offset > 0) {
    params.set("offset", String(offset));
  }
  if (market) {
    params.set("market", market);
  }

  const query = params.toString();

	const response = await spotifyRequest(`shows/${encodeURIComponent(showId)}/episodes${query ? `?${query}` : ""}`);

  return (response) as EpisodesResponse;
}
