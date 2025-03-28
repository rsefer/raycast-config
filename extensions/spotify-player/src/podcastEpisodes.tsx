import { ComponentProps, useState } from "react";
import { List } from "@raycast/api";
import { View } from "./components/View";
import { useFullShowEpisodes } from "./hooks/useFullShowEpisodes";
import { EpisodesSection } from "./components/EpisodesSection";
import { getPreferenceValues } from "@raycast/api";

const filters = {
  all: "All",
  subscribed: "Subscribed Episodes",
  saved: "Saved Episodes",
};

type FilterValue = keyof typeof filters;

function PodcastEpisodesCommand() {
  const [searchText, setSearchText] = useState("");
  const [searchFilter, setSearchFilter] = useState<FilterValue>(getPreferenceValues()["Default-View"] ?? 'all');
  const { fullShowEpisodesData, fullShowEpisodesIsLoading } = useFullShowEpisodes({
    keepPreviousData: false,
  });

  const sharedProps: ComponentProps<typeof List> = {
    searchBarPlaceholder: "Search your podcast episodes",
    isLoading: fullShowEpisodesIsLoading,
    searchText,
    onSearchTextChange: setSearchText,
    filtering: true,
  };

  return (
    <List
      {...sharedProps}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter search"
          value={searchFilter}
          onChange={(newValue) => setSearchFilter(newValue as FilterValue)}
        >
          {Object.entries(filters).map(([value, label]) => (
            <List.Dropdown.Item key={value} title={label} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {(["all", "subscribed"].includes(searchFilter)) && (
        <EpisodesSection episodes={fullShowEpisodesData?.subscribedEpisodes?.items} title="Subscribed Episodes" />
      )}
      {(["all", "saved"].includes(searchFilter)) && (
        <EpisodesSection episodes={fullShowEpisodesData?.savedEpisodes?.items} title="Saved Episodes" />
      )}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <PodcastEpisodesCommand />
    </View>
  );
}
