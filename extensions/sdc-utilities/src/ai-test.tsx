import { AI, Clipboard, showHUD } from "@raycast/api";

export default async function Command() {
  const answer = await AI.ask("Generate a random latin paragraph, between 50 and 70 words. It should end in a period. The answer should include only the paragraph");
	await Clipboard.copy(answer);
	await showHUD("Copied paragraph to clipboard");
}
