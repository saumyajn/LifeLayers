import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const distDir = join(process.cwd(), "dist");
const indexPath = join(distDir, "index.html");

function fail(message) {
  console.error(`Smoke test failed: ${message}`);
  process.exit(1);
}

if (!existsSync(distDir)) {
  fail("dist directory does not exist. Run the production build first.");
}

if (!existsSync(indexPath)) {
  fail("dist/index.html was not generated.");
}

const indexHtml = readFileSync(indexPath, "utf8");

if (!indexHtml.includes('<div id="root"></div>')) {
  fail("dist/index.html is missing the React root element.");
}

if (!indexHtml.includes("/assets/")) {
  fail("dist/index.html is missing bundled asset references.");
}

console.log("Smoke test passed: production dist contains index and bundled assets.");
