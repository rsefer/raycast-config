import { LaunchProps, Form, popToRoot, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { logTime, formatDuration, minutesToMilliseconds } from "./Timer";
import { useForm, FormValidation } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();

interface SignUpFormValues {
  minutes: number;
}

export default function Command(context: LaunchProps) {
	let client = context.launchContext?.client;
	const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    onSubmit(values) {
      logTime(client.id, client.name, +values.minutes);
    },
    validation: {
      minutes: (value) => {
        if (!value || +value != value) {
          return "Must be an integer.";
        } else if (!value) {
					return "Minutes required.";
				}
      }
    }
  });
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
						onSubmit={handleSubmit}
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
				title="Minutes"
				placeholder="60"
				defaultValue="60"
				autoFocus={true}
				{...itemProps.minutes}
			/>
		</Form>
  );
}
