import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const clientId = "c5db411f528a48cb810cb94ee001793d";

const scope = [
  "playlist-modify-private",
  "playlist-modify-public",
  "playlist-read-collaborative",
  "playlist-read-private",
  "user-follow-read",
  "user-library-modify",
  "user-library-read",
  "user-read-playback-position",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-private",
  "user-top-read",
].join(" ");

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Spotify",
  providerIcon: "icon.svg",
  description: "Connect your Spotify account",
});

export const provider = new OAuthService({
  client: oauthClient,
  clientId: clientId,
  scope: scope,
  authorizeUrl: "https://accounts.spotify.com/authorize",
  tokenUrl: "https://accounts.spotify.com/api/token",
  refreshTokenUrl: "https://accounts.spotify.com/api/token",
  bodyEncoding: "url-encoded",
});

let pendingAuthorization: Promise<string> | null = null;

async function authorizeWithRecovery(canRetry = true): Promise<string> {
  try {
    return await provider.authorize();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const canRecover =
      message.includes("code_verifier was incorrect") ||
      message.includes("Sign-in expired") ||
      message.includes("state mismatch");

    if (canRetry && canRecover) {
      await oauthClient.removeTokens();
      return authorizeWithRecovery(false);
		}

    throw error;
  }
}

export async function getSpotifyAccessToken() {
  if (pendingAuthorization) {
    return pendingAuthorization;
  }

  pendingAuthorization = authorizeWithRecovery()
    .finally(() => {
      pendingAuthorization = null;
    });

  return pendingAuthorization;
}
