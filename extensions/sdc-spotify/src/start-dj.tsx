import { showToast, Toast } from "@raycast/api";
import { playSpotifyUri } from "./helpers/spotify-applescript";

const DJ_PLAYLIST_ID = "37i9dQZF1EYkqdzj48dyYq";
const DJ_PLAYLIST_URI = `spotify:playlist:${DJ_PLAYLIST_ID}`;

export default async function StartDJCommand() {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Starting DJ..." });
    await playSpotifyUri(DJ_PLAYLIST_URI);
    await showToast({ style: Toast.Style.Success, title: "DJ playlist started" });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to start DJ playlist" });
  }
}
