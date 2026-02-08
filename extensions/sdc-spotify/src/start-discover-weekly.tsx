import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { playSpotifyUri } from "./helpers/spotify-applescript";

interface Preferences {
  playlistId?: string;
}

const DISCOVER_WEEKLY_ID = "37i9dQZEVXcVtTQ6a45WtP";

export default async function StartDiscoverWeeklyCommand() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const playlistId = preferences.playlistId || DISCOVER_WEEKLY_ID;
    const playlistUri = `spotify:playlist:${playlistId}`;

    await showToast({ style: Toast.Style.Animated, title: "Starting playlist..." });
    await playSpotifyUri(playlistUri);
    await showToast({ style: Toast.Style.Success, title: "Playlist started" });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to start playlist" });
  }
}
