import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const clientId = "70d8d7021f0141419953c7c6570b20a9";

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
  providerIcon: "spotify-icon.svg",
  description: "Connect your Spotify account",
  providerId: "spotify",
});

export const provider = new OAuthService({
  client: oauthClient,
  clientId,
  scope,
  authorizeUrl: "https://accounts.spotify.com/authorize/",
  tokenUrl: "https://accounts.spotify.com/api/token",
  refreshTokenUrl: "https://accounts.spotify.com/api/token",
  bodyEncoding: "url-encoded",
});
