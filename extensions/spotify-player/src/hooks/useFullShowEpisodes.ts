import { useCachedPromise } from "@raycast/utils";
import { getMySavedShowsEpisodes } from "../api/getMySavedShowsEpisodes";
import { getMySavedEpisodes } from "../api/getMySavedEpisodes";

type UseFullShowEpisodesProps = {
  execute?: boolean;
  keepPreviousData?: boolean;
};

export function useFullShowEpisodes(options: UseFullShowEpisodesProps = {}) {
  const {
    data = [],
    error,
    isLoading,
  } = useCachedPromise(() => Promise.all([getMySavedShowsEpisodes(), getMySavedEpisodes()]), [], {
    keepPreviousData: options?.keepPreviousData,
  });

  let [subscribedEpisodesData, savedEpisodesData] = data;

  if (!subscribedEpisodesData) {
    subscribedEpisodesData = { items: [] };
  }

  if (!savedEpisodesData) {
    savedEpisodesData = { items: [] };
  }

  const combinedSortedEpisodesData = {
    items: [],
  };

  if (subscribedEpisodesData.items?.length > 0) {
    subscribedEpisodesData.items = subscribedEpisodesData.items.sort(sortPlayedAndDateReverseChrono);
  }

  if (savedEpisodesData.items?.length > 0) {
    savedEpisodesData.items = savedEpisodesData?.items.sort(sortPlayedAndDateChrono);
		savedEpisodesData.items = savedEpisodesData?.items.filter(e => e.id);
  }

  if (combinedSortedEpisodesData.items?.length > 0) {
    combinedSortedEpisodesData.items = combinedSortedEpisodesData.items.sort(sortPlayedAndDateReverseChrono);
  }

  return {
    fullShowEpisodesData: {
      subscribedEpisodes: subscribedEpisodesData,
      savedEpisodes: savedEpisodesData,
      combinedSortedEpisodes: combinedSortedEpisodesData,
    },
    fullShowEpisodesError: error,
    fullShowEpisodesIsLoading: isLoading,
  };
}

function sortPlayedAndDateReverseChrono(a, b) {
  return (
    (a.resume_point?.fully_played === b.resume_point?.fully_played ? 0 : a.resume_point?.fully_played ? 1 : -1) ||
    new Date(b.release_date) - new Date(a.release_date)
  );
}

function sortPlayedAndDateChrono(a, b) {
  return (
    (a.resume_point?.fully_played === b.resume_point?.fully_played ? 0 : a.resume_point?.fully_played ? 1 : -1) ||
    new Date(a.release_date) - new Date(b.release_date)
  );
}
