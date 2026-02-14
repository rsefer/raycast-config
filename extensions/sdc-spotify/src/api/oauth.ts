import { OAuth } from "@raycast/api";

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

const authorizeUrl = "https://accounts.spotify.com/authorize/";
const tokenUrl = "https://accounts.spotify.com/api/token";

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authorizationCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authorizationCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(tokenUrl, {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Spotify OAuth token request failed:", response.status, response.statusText, body);
    throw new Error(`Spotify OAuth token request failed: ${response.status} ${response.statusText}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  return tokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse | null> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(tokenUrl, {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Spotify OAuth refresh failed:", response.status, response.statusText, body);
    return null;
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export const provider = {
  authorize: async () => {
    const tokenSet = await oauthClient.getTokens();

    if (tokenSet?.accessToken) {
      if (tokenSet.refreshToken && tokenSet.isExpired()) {
        const refreshed = await refreshTokens(tokenSet.refreshToken);
        if (refreshed) {
          await oauthClient.setTokens(refreshed);
          return refreshed.access_token;
        }

        await oauthClient.removeTokens();
      } else {
        return tokenSet.accessToken;
      }
    }

    const authRequest = await oauthClient.authorizationRequest({
      endpoint: authorizeUrl,
      clientId: clientId,
      scope: scope,
    });

    const { authorizationCode } = await oauthClient.authorize(authRequest);
    const tokens = await fetchTokens(authRequest, authorizationCode);
    await oauthClient.setTokens(tokens);

    return tokens.access_token;
  },
};
