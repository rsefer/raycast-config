import { spotifyPost } from "../helpers/spotify-client";

export async function addToQueue(uri: string) {
  await spotifyPost(`me/player/queue?uri=${encodeURIComponent(uri)}`);
}
