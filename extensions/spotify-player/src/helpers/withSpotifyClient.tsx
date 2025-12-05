import { provider } from "../api/oauth";
import * as api from "../helpers/spotify.api";
import nodeFetch from "node-fetch";
import { withAccessToken } from "@raycast/utils";
import { showHUD } from "@raycast/api";

export let spotifyClient: typeof api | undefined;

provider.onAuthorize = ({ token }) => {
  // Send this header with each request
  api.defaults.headers = {
    Authorization: `Bearer ${token}`,
  };

  // Use this instead of the global fetch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.defaults.fetch = nodeFetch as any;

  spotifyClient = api;
};

export const withSpotifyClient = withAccessToken(provider);

export function getSpotifyClient() {
  if (!spotifyClient) {
    throw new Error("getSpotifyClient must be used when authenticated");
  }

  return {
    spotifyClient,
  };
}

export async function setSpotifyClient() {

	// retry fix from https://github.com/raycast/extensions/issues/9988#issuecomment-2403142878

	const isConnected = await checkNetworkConnectivity();
  if (!isConnected) {
    await showHUD("Network is not available. Please check your VPN connection.");
    return;
  }

	let retries = 3;
  while (retries > 0) {
    try {
			const accessToken = await provider.authorize();

			// Send this header with each request
			api.defaults.headers = {
				Authorization: `Bearer ${accessToken}`,
			};

			// Use this instead of the global fetch
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			api.defaults.fetch = nodeFetch as any;

			spotifyClient = api;
			return;
		} catch (error) {
			console.error("Error during authentication:", error);
			retries--;
			if (retries === 0) {
				await showHUD("Failed to authenticate with Spotify. Please try again.");
				throw error;
			}
			await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
		}
	}
}

async function checkNetworkConnectivity() {
  try {
		const fetched = await nodeFetch('https://api.spotify.com');
    return true;
  } catch (error) {
		console.error(error);
    return false;
  }
}
