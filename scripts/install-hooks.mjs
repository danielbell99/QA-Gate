import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync } from "node:fs";

execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: "ignore" });
const existing = spawnSync("git", ["config", "--local", "--get", "core.hooksPath"], {
  encoding: "utf8",
});
if (existing.status !== 0 && existing.status !== 1) {
  throw new Error(existing.stderr || "Unable to read the repository's hooks path.");
}
const configured = existing.stdout.trim();
if (configured && configured !== ".githooks") {
  throw new Error("Existing hooks configuration preserved; integrate the QA gate manually.");
}
for (const hook of ["pre-commit", "pre-push"]) chmodSync(`.githooks/${hook}`, 0o755);
execFileSync("git", ["config", "--local", "core.hooksPath", ".githooks"]);
console.log("Repository-local QA hooks installed.");
