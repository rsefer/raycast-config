import { List, Toast, showToast, Action, ActionPanel, Icon, popToRoot, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";
import { getObsidianNotes, openNoteInObsidian, ObsidianNote } from "./helpers/obsidian";

type ViewState = {
  isLoading: boolean;
  notes: ObsidianNote[];
  error?: string;
};

export default function GetNotesCommand() {
  const [state, setState] = useState<ViewState>({
    isLoading: true,
    notes: [],
  });

  useEffect(() => {
    async function loadNotes() {
      try {
        const notes = await getObsidianNotes();
        setState({
          isLoading: false,
          notes,
          error: undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState({
          isLoading: false,
          notes: [],
          error: message,
        });
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load notes",
          message,
        });
      }
    }

    loadNotes();
  }, []);

  const handleOpenNote = async (notePath: string) => {
    try {
      await openNoteInObsidian(notePath);
			await closeMainWindow();
			await popToRoot();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open note",
        message,
      });
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInDays = Math.floor(diffInSeconds / 86400);
    if (diffInDays < 7) {
      const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });
      if (diffInSeconds < 60) {
        return rtf.format(-Math.floor(diffInSeconds), "second");
      } else if (diffInSeconds < 3600) {
        return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
      } else if (diffInSeconds < 86400) {
        return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
      } else {
        return rtf.format(-diffInDays, "day");
      }
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search notes...">
      {state.error ? (
        <List.EmptyView
          title="Error"
          description={state.error}
          icon={{ source: Icon.ExclamationMark }}
        />
      ) : state.notes.length === 0 && !state.isLoading ? (
        <List.EmptyView
          title="No notes found"
          description="Make sure your Obsidian vault exists in one of the expected locations"
          icon={{ source: Icon.Document }}
        />
      ) : (
        state.notes.map((note) => {
          const pathKeywords = [
            note.path,
            ...note.path
              .replace(/\//g, " ")
              .split(" ")
              .filter((keyword) => keyword.length > 0),
          ];
					const pathWithoutExtension = note.path.replace(/\.md$/, "");

          return (
            <List.Item
              key={note.id}
              title={pathWithoutExtension}
              icon={Icon.Document}
              keywords={pathKeywords}
              accessories={[{ text: formatDate(note.modifiedTime) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open in Obsidian"
                    icon={Icon.ArrowRight}
                    onAction={() => handleOpenNote(note.path)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Note Path"
                    content={note.path}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Note Title"
                    content={note.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
