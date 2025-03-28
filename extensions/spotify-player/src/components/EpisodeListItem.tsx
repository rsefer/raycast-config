import { Image, List, Icon, Color } from "@raycast/api";
import { formatMs } from "../helpers/formatMs";
import { ShowBase, SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { EpisodeActionPanel } from "./EpisodeActionPanel";

type EpisodeListItemProps = {
  episode: SimplifiedEpisodeObject;
  show?: ShowBase;
};

export default function EpisodeListItem({ episode, show }: EpisodeListItemProps) {
  const title = episode.name || "";

  let icon: Image.ImageLike | undefined = undefined;
  if (show?.images) {
    icon = {
      source: show.images[show.images.length - 1]?.url,
    };
  } else if (episode.images) {
    icon = {
      source: episode.images[episode.images.length - 1]?.url,
    };
  }

	const accessories = [{ text: episode.duration_ms ? formatMs(episode.duration_ms) : undefined }];
  if (episode.resume_point) {
    if (episode.resume_point.fully_played) {
      accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Played" });
    } else if (episode.resume_point.resume_position_ms > 0) {
      if (accessories.length > 0 && episode.duration_ms) {
        accessories[0].text = `${formatMs(episode.duration_ms - episode.resume_point.resume_position_ms)} remaining`;
      }
      accessories.push({ icon: { source: Icon.CircleProgress50, tintColor: Color.Blue }, tooltip: "In-progress" });
    }
  }

  return (
    <List.Item
      icon={icon}
      title={title}
      subtitle={episode.release_date}
      accessories={accessories}
      actions={<EpisodeActionPanel title={title} episode={episode} />}
    />
  );
}
