import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

function buildScriptEnsuringSpotifyIsRunning(commandsToRunAfterSpotifyIsRunning: string): string {
  return `
    tell application "Spotify"
      if not application "Spotify" is running then
        activate

        set _maxOpenWaitTimeInSeconds to 5
        set _openCounter to 1
        repeat until application "Spotify" is running
          delay 1
          set _openCounter to _openCounter + 1
          if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
        end repeat
      end if
      ${commandsToRunAfterSpotifyIsRunning}
    end tell`;
}

async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}

export async function openSpotifyUri(uri: string) {
  const script = buildScriptEnsuringSpotifyIsRunning(`open location "${uri}"`);
  await runAppleScriptSilently(script);
}

export async function playSpotifyUri(uri: string) {
  const script = buildScriptEnsuringSpotifyIsRunning(`
    delay 1
    play track "${uri}"`);
  await runAppleScriptSilently(script);
}
