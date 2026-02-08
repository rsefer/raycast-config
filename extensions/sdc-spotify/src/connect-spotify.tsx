import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { provider } from "./api/oauth";

type Profile = {
  display_name?: string;
  id?: string;
  email?: string;
  product?: string;
  country?: string;
};

type ViewState = {
  isLoading: boolean;
  error?: string;
  profile?: Profile;
  accessToken?: string;
};

export default function ConnectSpotify() {
  const [state, setState] = useState<ViewState>({ isLoading: true });

  useEffect(() => {
    let cancelled = false;

    async function authenticate() {
      try {
        const accessToken = await provider.authorize();
        if (cancelled) {
          return;
        }

        const response = await fetch("https://api.spotify.com/v1/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Spotify /me failed: ${response.status} ${body}`);
        }

        const profile = (await response.json()) as Profile;

        if (!cancelled) {
          setState({ isLoading: false, profile, accessToken });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (!cancelled) {
          setState({ isLoading: false, error: message });
        }

        await showToast({ style: Toast.Style.Failure, title: "Spotify auth failed", message });
      }
    }

    authenticate();

    return () => {
      cancelled = true;
    };
  }, []);

  const markdown = useMemo(() => {
    const status = state.isLoading ? "Authenticating..." : state.error ? "Failed" : "Connected";
    const profile = state.profile;

    if (state.error) {
      return `# Spotify Authentication\n\nStatus: ${status}\n\nError: ${state.error}`;
    }

    if (!profile) {
      return `# Spotify Authentication\n\nStatus: ${status}`;
    }

    return `# Spotify Authentication\n\nStatus: ${status}\n\nUser: ${profile.display_name ?? "Unknown"}\nID: ${profile.id ?? "Unknown"}\nPlan: ${profile.product ?? "Unknown"}\nCountry: ${profile.country ?? "Unknown"}\nEmail: ${profile.email ?? "Unknown"}`;
  }, [state.error, state.isLoading, state.profile]);

  return (
    <Detail
      isLoading={state.isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {state.accessToken ? (
            <Action.CopyToClipboard title="Copy Access Token" content={state.accessToken} />
          ) : null}
          <Action.OpenInBrowser title="Open Spotify Web Player" url="https://open.spotify.com" />
        </ActionPanel>
      }
    />
  );
}
