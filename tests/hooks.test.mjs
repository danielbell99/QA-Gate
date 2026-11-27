import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "qa-gate-"));
  mkdirSync(join(dir, ".githooks"));
  for (const hook of ["pre-commit", "pre-push"]) {
    copyFileSync(join(root, ".githooks", hook), join(dir, ".githooks", hook));
  }
  execFileSync("git", ["init", "-q", dir]);
  return dir;
}

test("installer activates local hooks and is safe to repeat", () => {
  const dir = fixture();
  try {
    for (let i = 0; i < 2; i++) execFileSync("node", [join(root, "scripts/install-hooks.mjs")], { cwd: dir });
    assert.equal(execFileSync("git", ["config", "--local", "--get", "core.hooksPath"], { cwd: dir, encoding: "utf8" }).trim(), ".githooks");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("installer preserves a different configured hooks path", () => {
  const dir = fixture();
  try {
    execFileSync("git", ["config", "--local", "core.hooksPath", "other-hooks"], { cwd: dir });
    const result = spawnSync("node", [join(root, "scripts/install-hooks.mjs")], { cwd: dir, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Existing hooks configuration preserved/);
    assert.equal(execFileSync("git", ["config", "--local", "--get", "core.hooksPath"], { cwd: dir, encoding: "utf8" }).trim(), "other-hooks");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

for (const [hook, expected] of [["pre-commit", "check:fast"], ["pre-push", "check"]]) {
  test(`${hook} propagates the QA command's exit status`, () => {
    const dir = fixture();
    try {
      mkdirSync(join(dir, "bin"));
      writeFileSync(join(dir, "bin/npm"), "#!/bin/sh\nprintf '%s\\n' \"$*\" > \"$QA_GATE_LOG\"\nexit \"$QA_GATE_STATUS\"\n", { mode: 0o755 });
      const env = { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}`, QA_GATE_LOG: join(dir, "called"), QA_GATE_STATUS: "7" };
      const result = spawnSync("sh", [join(dir, ".githooks", hook)], { cwd: dir, env });
      assert.equal(result.status, 7);
      assert.equal(readFileSync(join(dir, "called"), "utf8").trim(), `run ${expected}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
