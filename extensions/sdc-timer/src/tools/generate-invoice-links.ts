import { Tool, getPreferenceValues } from "@raycast/api";
import { getClients } from "../get-clients";
import { Preferences, Client } from "../types";

type Input = {
  query: string;
};

const preferences = getPreferenceValues<Preferences>();

export default async function (input: Input) {
	let clients = await getClients();
	return clients.map(client => {
		return {
			name: client.name,
			url: `${preferences.domain}/invoices/new?client_id=${client.id}`,
			time: client.timeFormatted,
			lastEntryDateTime: client.lastEntryDateTime
		};
	});
}
