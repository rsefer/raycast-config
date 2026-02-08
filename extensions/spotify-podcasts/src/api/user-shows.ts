import { provider } from "./oauth";

const DEFAULT_LIMIT = 50;
const AUDIOBOOKS_LOOKUP_LIMIT = 50;

export type SimplifiedShow = {
	id: string;
	name: string;
	description?: string;
	html_description?: string;
	total_episodes?: number;
	explicit?: boolean;
	media_type?: string;
	is_externally_hosted?: boolean;
	languages?: string[];
	images?: { url: string; height?: number; width?: number }[];
	external_urls?: { spotify?: string };
	uri?: string;
	type?: "show";
};

type SavedShowItem = {
	added_at?: string;
	show: SimplifiedShow;
};

type SavedShowsResponse = {
	href?: string;
	items?: SavedShowItem[];
	limit?: number;
	next?: string | null;
	offset?: number;
	previous?: string | null;
	total?: number;
};

type GetUserShowsOptions = {
	limit?: number;
	offset?: number;
	market?: string;
};

type GetAllUserShowsOptions = {
	limit?: number;
	market?: string;
};

type SavedShowsPage = Omit<SavedShowsResponse, "items"> & { items: SimplifiedShow[] };

type FetchPageOptions = {
	limit?: number;
	offset?: number;
	market?: string;
	url?: string;
};

function chunkArray<T>(items: T[], size: number) {
	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

async function getAudiobookIds(accessToken: string, ids: string[]) {
	const audiobookIds = new Set<string>();
	const chunks = chunkArray(ids, AUDIOBOOKS_LOOKUP_LIMIT);

	// The batch endpoint GET /audiobooks?ids=... is being removed
	// Use individual GET /audiobooks/{id} calls instead
	for (const chunk of chunks) {
		const promises = chunk.map(async (audiobookId) => {
			const url = `https://api.spotify.com/v1/audiobooks/${encodeURIComponent(audiobookId)}`;
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (!response.ok) {
				// Item is not an audiobook or not available
				return null;
			}

			const data = (await response.json()) as { id: string };
			return data.id;
		});

		const results = await Promise.all(promises);
		for (const id of results) {
			if (id) {
				audiobookIds.add(id);
			}
		}
	}

	return audiobookIds;
}

async function excludeAudiobooks(accessToken: string, shows: SimplifiedShow[]) {
	if (shows.length === 0) {
		return shows;
	}

	const ids = [...new Set(shows.map((show) => show.id))];
	const audiobookIds = await getAudiobookIds(accessToken, ids);

	return shows.filter((show) => !audiobookIds.has(show.id));
}

async function fetchShowsPage(
	accessToken: string,
	{ limit = DEFAULT_LIMIT, offset = 0, market, url }: FetchPageOptions = {},
): Promise<SavedShowsPage> {
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
		requestUrl = `https://api.spotify.com/v1/me/shows${query ? `?${query}` : ""}`;
	}

	const response = await fetch(requestUrl, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Spotify /me/shows failed: ${response.status} ${body}`);
	}

	const data = (await response.json()) as SavedShowsResponse;

	// Normalize to just the show objects, since the endpoint returns saved show items.
	const shows = (data.items ?? []).map((item) => item.show);

	return {
		...data,
		items: shows,
	} as SavedShowsPage;
}

export async function getUserShows({ limit = 50, offset = 0, market }: GetUserShowsOptions = {}) {
	const accessToken = await provider.authorize();
	const page = await fetchShowsPage(accessToken, { limit, offset, market });
	const items = await excludeAudiobooks(accessToken, page.items);

	return {
		...page,
		items,
	};
}

export async function getAllUserShows({ limit = DEFAULT_LIMIT, market }: GetAllUserShowsOptions = {}) {
	const accessToken = await provider.authorize();
	let page = await fetchShowsPage(accessToken, { limit, offset: 0, market });
	const items = [...page.items];
	let nextUrl = page.next ?? null;

	while (nextUrl) {
		page = await fetchShowsPage(accessToken, { url: nextUrl });
		if (page.items.length > 0) {
			items.push(...page.items);
		}
		nextUrl = page.next ?? null;
	}

	const filteredItems = await excludeAudiobooks(accessToken, items);

	return {
		items: filteredItems,
		total: filteredItems.length,
	};
}
