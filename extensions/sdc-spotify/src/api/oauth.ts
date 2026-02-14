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
  providerId: "sdc-spotify",
});

export const provider = new OAuthService({
  client: oauthClient,
  clientId: clientId,
  scope: scope,
  authorizeUrl: "https://accounts.spotify.com/authorize/",
  tokenUrl: "https://accounts.spotify.com/api/token",
  refreshTokenUrl: "https://accounts.spotify.com/api/token",
  bodyEncoding: "url-encoded",
});
