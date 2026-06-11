import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await mkdir(path.join(root, "dist", "icons"), { recursive: true });
await cp(path.join(root, "icons"), path.join(root, "dist", "icons"), {
  recursive: true,
});
