import { Cache, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences, CacheClients, Client } from "./types";
import { promises as fs, read } from "fs";
import { pipeline } from 'stream/promises';
import { parse } from 'csv-parse';

import { formatDuration, minutesToMilliseconds } from "./Timer";

const cache = new Cache();

export async function getClients(forceRefresh: Boolean = false) {
	let cacheKey = 'sdc-timer-clients';
	const cachedResponse = cache.get(cacheKey);
  if (cachedResponse && !forceRefresh) {
    const parsed: CacheClients = JSON.parse(cachedResponse);
    const elapsed = Date.now() - parsed.timestamp;
    if (elapsed <= 12 * 60 * 60 * 1_000) {
			await assignClientMinutes(parsed.clients);
      return parsed.clients;
    } else {
      console.log(`Cache expired for ${cacheKey}`);
    }
  }

	await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing client list",
  });

	let responseData: any[] = [];
	try {
		const preferences = getPreferenceValues<Preferences>();
		const endpoint = preferences.endpoint.replace(/^\/api(?=\/v1\/)/, "");
		const url = `${preferences.apiDomain}${endpoint}`;
		const invoicesUrl = url.replace(/\/clients\/?$/, "/invoices");
		const headers = { Authorization: `Bearer ${preferences.accessToken}` };
		const [clientsResponse, invoicesResponse] = await Promise.all([
			fetch(url, { headers }),
			fetch(invoicesUrl, { headers }),
		]);
		if (!clientsResponse.ok || !invoicesResponse.ok) {
			throw new Error(`HTTP error! status: ${clientsResponse.status}, ${invoicesResponse.status}`);
		}
		const [clientsPayload, invoicesPayload]: [unknown, unknown] = await Promise.all([
			clientsResponse.json(),
			invoicesResponse.json(),
		]);
		if (!Array.isArray(clientsPayload) || !Array.isArray(invoicesPayload)) {
			throw new Error("Unexpected client list response");
		}
		const latestInvoiceDateByClient = new Map<number, string>();
		for (const invoice of invoicesPayload) {
			if (invoice.client_id && invoice.created_at) {
				const clientId = Number(invoice.client_id);
				const currentDate = latestInvoiceDateByClient.get(clientId);
				if (!currentDate || new Date(invoice.created_at) > new Date(currentDate)) {
					latestInvoiceDateByClient.set(clientId, invoice.created_at);
				}
			}
		}
		responseData = clientsPayload.map((client) => {
			const latestInvoiceDate = latestInvoiceDateByClient.get(Number(client.id));
			const createdAt = client.created_at;
			const mostRecentActivityDate = latestInvoiceDate && (!createdAt || new Date(latestInvoiceDate) > new Date(createdAt))
				? latestInvoiceDate
				: createdAt;
			return { ...client, mostRecentActivityDate };
		});
		cache.set(cacheKey, JSON.stringify({ timestamp: Date.now(), clients: responseData }));
		await showToast({
			title: "Client list updated",
			message: `${responseData.length} clients`
		});
	} catch (err) {
		await showToast({
			style: Toast.Style.Failure,
			title: "Failed to refresh client list"
		});
	}
	await assignClientMinutes(responseData);
	return responseData;
}

export async function readCSV(filePath:string) {
	let rows: Array<any> = [];
	await pipeline(
    await fs.readFile(filePath, "utf8"),
    parse({
      skip_empty_lines: true,
      columns: true
    }),
    async function* (source) {
      for await (const chunk of source) {
        rows.push(chunk);
      }
    }
  )
	return rows;
}

export async function assignClientMinutes(clients:Array<Client>) {
	const preferences = getPreferenceValues<Preferences>();
	let rawRows = await readCSV(preferences.hoursFile);
	let uniqueClientIDs = Array.from(new Set(rawRows.map(client => +client['client id'])));
	for (var clientID of uniqueClientIDs) {
		let relevantRows = rawRows.filter(client => +client['client id'] == clientID);
		let totalMinutes = relevantRows.reduce((sum, client) => sum + +client.minutes, 0);
		let foundClient = clients.find(client => client.id == clientID);
		let lastEntry = relevantRows[relevantRows.length - 1];
		if (foundClient) {
			foundClient.minutes = totalMinutes;
			foundClient.timeFormatted = formatDuration(minutesToMilliseconds(foundClient.minutes), 'short');
			foundClient.lastEntryDateTime = `${lastEntry.date} ${lastEntry.timestamp}`;
		}
	}
	return clients;
}
