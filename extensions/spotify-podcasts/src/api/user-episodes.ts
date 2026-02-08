import { provider } from "./oauth";
import { SimplifiedShow } from "./user-shows";

const DEFAULT_LIMIT = 50;

type EpisodeShow = Pick<SimplifiedShow, "id" | "name" | "external_urls" | "images">;

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
  show?: EpisodeShow;
};

type SavedEpisodeItem = {
  added_at?: string;
  episode?: SimplifiedEpisode | null;
};

type SavedEpisodesResponse = {
  href?: string;
  items?: SavedEpisodeItem[];
  limit?: number;
  next?: string | null;
  offset?: number;
  previous?: string | null;
  total?: number;
};

type GetUserEpisodesOptions = {
  limit?: number;
  offset?: number;
  market?: string;
};

type GetAllUserEpisodesOptions = {
  limit?: number;
  market?: string;
};

type SavedEpisodesPage = Omit<SavedEpisodesResponse, "items"> & { items: SimplifiedEpisode[] };

type FetchPageOptions = {
  limit?: number;
  offset?: number;
  market?: string;
  url?: string;
};

async function fetchEpisodesPage(
  accessToken: string,
  { limit = DEFAULT_LIMIT, offset = 0, market, url }: FetchPageOptions = {},
): Promise<SavedEpisodesPage> {
  let requestUrl = url;

  if (!requestUrl) {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (offset > 0) {
      params.set("offset", String(offset));
    }
    if (market) {
      params.set("market", market);
    }

    const query = params.toString();
    requestUrl = `https://api.spotify.com/v1/me/episodes${query ? `?${query}` : ""}`;
  }

  const response = await fetch(requestUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify /me/episodes failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as SavedEpisodesResponse;

  // Normalize to just the episode objects, since the endpoint returns saved episode items.
  const episodes = (data.items ?? [])
    .map((item) => item.episode ?? null)
    .filter((episode): episode is SimplifiedEpisode => Boolean(episode && episode.id && episode.name));

  return {
    ...data,
    items: episodes,
  } as SavedEpisodesPage;
}

export async function getUserEpisodes({ limit = DEFAULT_LIMIT, offset = 0, market }: GetUserEpisodesOptions = {}) {
  const accessToken = await provider.authorize();
  return fetchEpisodesPage(accessToken, { limit, offset, market });
}

export async function getAllUserEpisodes({ limit = DEFAULT_LIMIT, market }: GetAllUserEpisodesOptions = {}) {
  const accessToken = await provider.authorize();
  let page = await fetchEpisodesPage(accessToken, { limit, offset: 0, market });
  const items = [...page.items];
  let nextUrl = page.next ?? null;

  while (nextUrl) {
    page = await fetchEpisodesPage(accessToken, { url: nextUrl });
    if (page.items.length > 0) {
      items.push(...page.items);
    }
    nextUrl = page.next ?? null;
  }

  return {
    items,
    total: page.total ?? items.length,
  };
}
