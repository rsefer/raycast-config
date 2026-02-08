import { getPreferenceValues } from "@raycast/api";
import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./helpers/spotify-applescript";

interface Preferences {
  skipBackwardSeconds: string;
}

export default async () => {
  const preferences = getPreferenceValues<Preferences>();
  const secondsToSkip = parseInt(preferences.skipBackwardSeconds, 10) || 15;

  const script = buildScriptEnsuringSpotifyIsRunning(`
    if player state is playing then
      set playPos to player position - ${secondsToSkip}
      set player position to playPos
    end if
  `);
  await runAppleScriptSilently(script);
};
