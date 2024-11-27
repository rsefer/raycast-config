import { WindowManagement } from "@raycast/api";
import * as fs from "node:fs/promises";
import { homedir } from 'os';

export default async function Command() {
	const desktops = await WindowManagement.getDesktops();
	console.log(desktops);
  const screens = new Set(desktops.map((desktop) => desktop.screenId));
	console.log(screens);
	const windows = await WindowManagement.getWindowsOnActiveDesktop();
  console.log(windows);
	for (var window of windows) {
		console.log(window.application?.name);
		console.log(window.desktopId, window.bounds?.position, window.bounds?.size);
		if (!window.positionable) { continue; }
		// WindowManagement.setWindowBounds({
		// 	id: window.id,
		// 	bounds: {
		// 		position: {
		// 			x: 1000
		// 		},
		// 		size: {
		// 			width: 500
		// 		},
		// 		// desktopId: 1
		// 	}
		// });
	}
	// try {
  //   const layoutsRaw = await fs.readFile(`${homedir()}/dotfiles/mac-scripts/layouts.json`, { encoding: 'utf8' });
	// 	const layouts = JSON.parse(layoutsRaw);
  //   console.log(layouts);
  // } catch (err) {
  //   console.log(err);
  // }
  // const windows = await getWindowsOnActiveDesktop();
  // const chrome = windows.find((x) => x.application?.bundleId === "com.google.Chrome");
  // if (!chrome) {
  //   showToast({ title: "Couldn't find chrome", style: Toast.Style.Failure });
  //   return;
  // }
  // setWindowBounds({ id: chrome.id, bounds: { position: { x: 100 } } });
}
