import { showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../helpers/getError";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getShowEpisodes } from "./getShowEpisodes";

type GetMySavedShowsEpisodesProps = { limitPerShow?: number };

export async function getMySavedShowsEpisodes({ limitPerShow = 3 }: GetMySavedShowsEpisodesProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const episodes = [];
		let showItems = [];
		let currentlyPaging = true;
		let showsOffset = 0;
		let showsLimit = 5;
		while (currentlyPaging) {
			let tmpShows;
			try {
				tmpShows = await spotifyClient.getMeShows({ limit: showsLimit, offset: showsOffset });
				if (tmpShows.items?.length ) {
					showItems = showItems.concat(tmpShows.items);
				}
				if (tmpShows.next) {
					const url = new URL(tmpShows.next);
					showsOffset = parseInt(url.searchParams.get('offset'));
					showsLimit = parseInt(url.searchParams.get('limit'));
					await new Promise((resolve) => setTimeout(resolve, 1 * 500));
				} else {
					currentlyPaging = false;
				}
			} catch (err) {
				showsOffset++;
			}
		}

    if (showItems?.length > 0) {
      for (const show of showItems) {
				try {
					const audiobook = await spotifyClient.getAudiobooksById(show.show?.id);
					continue; // is audiobook, so skip
				} catch (err) {
					// Is not audiobook, so this audiobook call errors. Keep going
				}

				try {
					const showEpisodes = await getShowEpisodes({ showId: show.show?.id, limit: limitPerShow });
					if (showEpisodes.items?.length > 0) {
						const oldEpisodeThreshold = new Date();
						oldEpisodeThreshold.setDate(oldEpisodeThreshold.getDate() - 7);

						for (const episode of showEpisodes.items) {
							// Skip episodes that are fully played and older than 2 weeks
							const episodeDate = new Date(episode.release_date);
							const isFullyPlayed = episode.resume_point?.fully_played === true;
							const isOlderThanTwoWeeks = episodeDate < oldEpisodeThreshold;

							if (isFullyPlayed && isOlderThanTwoWeeks) {
								continue;
							}

							episodes.push(episode);
						}
					}
				} catch (err) {
					// Continue with next show if this one fails
					continue;
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
