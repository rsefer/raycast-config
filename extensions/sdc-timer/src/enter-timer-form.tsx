import { LaunchProps, Form, popToRoot, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { logTime, formatDuration, minutesToMilliseconds } from "./Timer";

const preferences = getPreferenceValues<Preferences>();

export default function Command(context: LaunchProps) {
	let client = context.launchContext?.client;
  return (
		<Form
			searchBarAccessory={
				<Form.LinkAccessory
					target={preferences.domain}
					text="Go to Biz"
				/>
			}
			actions={
				<ActionPanel>
					<Action.SubmitForm
						onSubmit={(values) => {
							logTime(client.id, client.name, +values.minutes);
							// popToRoot();
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.Description
				title="Client"
				text={ client.name }
			/>
			<Form.Description
				title="Logged Time"
				text={ formatDuration(minutesToMilliseconds(client.minutes), 'short') }
			/>
			<Form.Separator />
			<Form.TextField
				id="minutes"
				title="Minutes"
				placeholder="60"
				autoFocus={true}
			/>
		</Form>
  );
}
