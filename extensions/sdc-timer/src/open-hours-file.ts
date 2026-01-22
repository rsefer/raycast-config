import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences } from "./types";
import { exec } from "child_process";

export function openHoursFile() {
	const preferences = getPreferenceValues<Preferences>();
	exec(`open -a TextEdit ${preferences.hoursFile}`, (error, stdout, stderr) => {
		if (error) {
			showToast({
				style: Toast.Style.Failure,
				title: "Failed to open hours file",
				message: "Please check the file path in preferences"
			});
			return;
		}
		if (stderr) {
			return;
		}
	});
}
