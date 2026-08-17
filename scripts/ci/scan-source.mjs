import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const forbiddenRoots = new Set([
  ".agents",
  ".astro",
  ".codex",
  ".impeccable",
  ".sanity",
  "dist",
  "node_modules",
]);

const forbiddenFiles = trackedFiles.filter((file) => {
  const normalized = file.replaceAll("\\", "/");
  const root = normalized.split("/")[0];
  if (forbiddenRoots.has(root)) return true;
  return root.startsWith(".env") && root !== ".env.example";
});

if (forbiddenFiles.length > 0) {
  throw new Error(
    `Local-only or generated paths are tracked:\n${forbiddenFiles.join("\n")}`,
  );
}

const binaryExtensions = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
]);

const privateKeyMarker = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
const githubClassicPrefix = ["gh", "p_"].join("");
const githubFineGrainedPrefix = ["github", "_pat_"].join("");
const sensitiveAssignments = [
  "SANITY_WRITE_TOKEN",
  "SANITY_AUTH_TOKEN",
  "SANITY_MIGRATION_TOKEN",
  "GITHUB_TOKEN",
];

const findings = [];

for (const file of trackedFiles) {
  if (file === "scripts/ci/scan-source.mjs") continue;
  const suffix = file.slice(file.lastIndexOf(".")).toLowerCase();
  if (binaryExtensions.has(suffix)) continue;

  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (content.includes(privateKeyMarker)) {
    findings.push(`${file}: private-key material`);
  }
  if (
    content.includes(githubClassicPrefix) ||
    content.includes(githubFineGrainedPrefix)
  ) {
    findings.push(`${file}: GitHub token-like value`);
  }

  for (const name of sensitiveAssignments) {
    const assignment = new RegExp(
      `(?:^|\\n)[ \\t]*${name}[ \\t]*=[ \\t]*["']?([^\\s"'\\r\\n]+)`,
      "m",
    );
    if (assignment.test(content)) {
      findings.push(`${file}: non-empty ${name}`);
    }
  }
}

if (findings.length > 0) {
  throw new Error(`Potential secrets detected:\n${findings.join("\n")}`);
}

console.log(`Source scan passed (${trackedFiles.length} tracked files).`);
