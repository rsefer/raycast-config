import fs from "fs";
import path from "path";
import { homedir } from "os";

export interface ObsidianNote {
  id: string;
  title: string;
  path: string;
  modifiedTime: number;
}

function findVaultPath(): string | null {
  const homeDir = homedir();
  const possibleLocations = [
    path.join(homeDir, "Vault"),
    path.join(homeDir, "Documents", "Vault"),
    path.join(homeDir, "Documents", "Obsidian"),
    path.join(homeDir, "Obsidian"),
		path.join(homeDir, "Library", "Mobile Documents", "com~apple~CloudDocs", "Notes"),
  ];

  for (const location of possibleLocations) {
    if (fs.existsSync(location) && fs.statSync(location).isDirectory()) {
      return location;
    }
  }

  return null;
}

function getMarkdownFiles(dir: string, baseDir: string = dir): ObsidianNote[] {
  let notes: ObsidianNote[] = [];

  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      if (file.startsWith(".")) {
        continue;
      }

      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        notes = notes.concat(getMarkdownFiles(filePath, baseDir));
      } else if (file.endsWith(".md")) {
        const relativePath = path.relative(baseDir, filePath);
        const title = file.replace(/\.md$/, "");

        notes.push({
          id: relativePath,
          title,
          path: relativePath,
          modifiedTime: stat.mtimeMs,
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return notes;
}

export async function getObsidianNotes(): Promise<ObsidianNote[]> {
  const vaultPath = findVaultPath();
  if (!vaultPath) {
    throw new Error(
      "Obsidian vault not found. Please ensure your vault is at ~/Vault, ~/Documents/Vault, ~/Documents/Obsidian, or ~/Obsidian"
    );
  }
  const notes = getMarkdownFiles(vaultPath);
  notes.sort((a, b) => b.modifiedTime - a.modifiedTime);
  return notes;
}

export async function openNoteInObsidian(notePath: string): Promise<void> {
  const { execSync } = require("child_process");

  const vaultPath = findVaultPath();
  if (!vaultPath) {
    throw new Error("Obsidian vault not found");
  }

  const fullPath = path.join(vaultPath, notePath);
  const noteUri = encodeURI(`obsidian://open?path=${fullPath}`);

  try {
    execSync(`open "${noteUri}"`);
  } catch (error) {
    console.error("Error opening note:", error);
    throw new Error("Failed to open note in Obsidian");
  }
}
