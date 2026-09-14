import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("Starting WEB-UX-004 People submit guard tests...");

const PEOPLE_DIR = path.join(__dirname, "../features/people");
const BOARDS = ["students-board.tsx", "parents-board.tsx", "teachers-board.tsx"] as const;

const REQUIRED_PATTERNS = [
  "savingCreate",
  "savingEdit",
  "if (savingCreate) return",
  "savingEdit) return",
  "setSavingCreate(true)",
  "setSavingEdit(true)",
  "setSavingCreate(false)",
  "setSavingEdit(false)",
  "disabled={savingCreate}",
  "disabled={savingEdit}",
  '"Saving…"',
] as const;

for (const file of BOARDS) {
  const src = fs.readFileSync(path.join(PEOPLE_DIR, file), "utf8");
  for (const pattern of REQUIRED_PATTERNS) {
    assert.ok(src.includes(pattern), `${file} missing submit guard pattern: ${pattern}`);
  }
}

console.log("✓ WEB-UX-004 people board submit guard pattern tests passed");
