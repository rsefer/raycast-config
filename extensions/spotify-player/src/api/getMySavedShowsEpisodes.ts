import { getErrorMessage } from "../helpers/getError";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getShowEpisodes } from "./getShowEpisodes";

type GetMySavedShowsEpisodesProps = { limitPerShow?: number };

export async function getMySavedShowsEpisodes({ limitPerShow = 3 }: GetMySavedShowsEpisodesProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const episodes = [];
    const shows = await spotifyClient.getMeShows({ limit: 50 });
    if (shows?.items?.length > 0) {
      for (const show of shows?.items) {
				try {
					const audiobook = await spotifyClient.getAudiobooksById(show.show?.id);
					continue; // is audiobook, so skip
				} catch (err) {
					// Is not audiobook, so this audiobook call errors. Keep going
				}
				const showEpisodes = await getShowEpisodes({ showId: show.show?.id, limit: limitPerShow });
					if (showEpisodes.items?.length > 0) {
						for (const episode of showEpisodes.items) {
							episodes.push(episode);
						}
					}
      }
    }
    return { items: episodes as SimplifiedEpisodeObject[] };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("GetMySavedShowsEpisodes.ts Error:", error);
    throw new Error(error);
  }
}
