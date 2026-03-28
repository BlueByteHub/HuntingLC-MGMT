import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, "data", "cases.json");

export interface Case {
  id: number;
  userId: string;
  userTag: string;
  moderatorId: string;
  moderatorTag: string;
  action: string;
  reason: string;
  extra?: Record<string, string>;
  timestamp: string;
}

function loadCases(): Case[] {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_PATH)) return [];
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as Case[];
  } catch {
    return [];
  }
}

function saveCases(cases: Case[]): void {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(cases, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save cases:", err);
  }
}

let casesCache: Case[] = loadCases();

export function addCase(data: Omit<Case, "id" | "timestamp">): Case {
  const newCase: Case = {
    id: casesCache.length + 1,
    timestamp: new Date().toISOString(),
    ...data,
  };
  casesCache.push(newCase);
  saveCases(casesCache);
  return newCase;
}

export function getUserCases(userId: string): Case[] {
  return casesCache.filter((c) => c.userId === userId);
}

export function getCaseById(id: number): Case | undefined {
  return casesCache.find((c) => c.id === id);
}
