import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const dist = new URL("../../dist/", import.meta.url);
const distPath = dist.pathname.replace(/^\/(?:[A-Za-z]:)/, (match) => match.slice(1));

const requiredFiles = ["index.html", "CNAME", ".nojekyll"];
for (const file of requiredFiles) {
  if (!existsSync(join(distPath, file))) {
    throw new Error(`Missing required build output: dist/${file}`);
  }
}

const cname = readFileSync(join(distPath, "CNAME"), "utf8").trim();
if (cname !== "sidsareen.com") {
  throw new Error(`Unexpected CNAME value: ${JSON.stringify(cname)}`);
}

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".svg",
  ".txt",
  ".xml",
]);

const forbiddenReferences = [
  { label: "localhost", pattern: /localhost/i },
  { label: "loopback IPv4", pattern: /127\.0\.0\.1/ },
  { label: "wildcard IPv4", pattern: /0\.0\.0\.0/ },
  { label: "file URL", pattern: /file:\/\//i },
  { label: "Windows local path", pattern: /[A-Z]:\\\\(?:Users|Codex)\\\\/i },
];

const files = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) walk(absolute);
    else files.push(absolute);
  }
};
walk(distPath);

const findings = [];
let sanityReferences = 0;

for (const file of files) {
  if (!textExtensions.has(extname(file).toLowerCase()) && file !== join(distPath, "CNAME")) {
    continue;
  }
  const content = readFileSync(file, "utf8");
  const displayPath = `dist/${relative(distPath, file).replaceAll("\\", "/")}`;
  for (const { label, pattern } of forbiddenReferences) {
    if (pattern.test(content)) findings.push(`${displayPath}: ${label}`);
  }
  sanityReferences += content.match(/cdn\.sanity\.io/g)?.length ?? 0;
}

if (findings.length > 0) {
  throw new Error(`Forbidden deployment references detected:\n${findings.join("\n")}`);
}

if (sanityReferences === 0) {
  throw new Error("Build contains no published Sanity CDN references.");
}

console.log(
  `Deployment validation passed (${files.length} files, ${sanityReferences} Sanity CDN references, CNAME preserved).`,
);
