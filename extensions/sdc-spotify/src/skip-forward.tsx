import { getPreferenceValues } from "@raycast/api";
import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./helpers/spotify-applescript";

interface Preferences {
  skipForwardSeconds: string;
}

export default async () => {
  const preferences = getPreferenceValues<Preferences>();
  const secondsToSkip = parseInt(preferences.skipForwardSeconds, 10) || 15;

  const script = buildScriptEnsuringSpotifyIsRunning(`
    if player state is playing then
      set playPos to player position + ${secondsToSkip}
      set player position to playPos
    end if
  `);
  await runAppleScriptSilently(script);
};
