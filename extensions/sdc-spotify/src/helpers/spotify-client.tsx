import { provider } from "../api/oauth";

export const apiBase = "https://api.spotify.com/v1/";

export const error404 = new Error("Not found");

export async function spotifyRequest(path: string) {
	if (!path) {
		throw new Error("Path is required for spotifyRequest");
	}
	const accessToken = await provider.authorize();
	const response = await fetch(`${apiBase}${path}`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		}
	});
	if (response.status !== 200) {
		if (response.status === 404) {
			return error404;
		}
		return new Error(`Spotify API request failed with status ${response.status}: ${response.statusText}`);
	}
	return await response.json();
}
