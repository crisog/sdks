import { spawnSync } from "node:child_process";
import { version } from "./bumper.js";

const { stdout } = spawnSync(
  "pnpm",
  ["version", version, "--no-git-tag-version"],
  { encoding: "utf8" },
);

if (stdout) console.log(stdout); // Ignore versioning errors.
