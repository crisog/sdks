import { spawnSync } from "node:child_process";
import { inc } from "semver";
import { branch, bumper, prefix, version, whatBump } from "./bumper.js";

let { releaseType } = await bumper.bump(whatBump);

if (releaseType) {
  if (branch !== "main") releaseType = "prerelease";

  const newVersion = inc(
    version,
    releaseType,
    branch !== "main" ? branch : undefined,
    "0",
  );

  console.debug(
    `Version bump from ${version} to ${newVersion} on branch ${branch} (release type: ${releaseType})`,
  );

  let { stderr, stdout, error } = spawnSync("pnpm", ["version", newVersion], {
    encoding: "utf8",
  });
  if (stdout) console.log(stdout); // Ignore versioning errors.

  ({ stderr, stdout, error } = spawnSync(
    "pnpm",
    [
      "publish",
      "--no-git-checks",
      "--access",
      "public",
      "--tag",
      branch !== "main" ? branch : "latest",
    ],
    { encoding: "utf8" },
  ));
  if (stdout) console.log(stdout);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (stderr) {
    console.error(stderr);
    process.exit(1);
  }

  const tag = `${prefix}v${version}`;
  const newTag = `${prefix}v${newVersion}`;

  const notesReq = await fetch(
    "https://api.github.com/repos/morpho-org/sdks/releases/generate-notes",
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        tag_name: newTag,
        target_commitish: branch,
        previous_tag_name: tag,
      }),
    },
  );

  const notes = await notesReq.json();
  if (!notesReq.ok) {
    console.error(notes);
    process.exit(1);
  }

  const createReq = await fetch(
    "https://api.github.com/repos/morpho-org/sdks/releases",
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ...notes,
        tag_name: newTag,
        target_commitish: branch,
        prerelease: branch !== "main",
        draft: false,
      }),
    },
  );

  if (!createReq.ok) {
    console.error(await createReq.json());
    process.exit(1);
  }
} else console.debug(`No version bump from ${version} on branch ${branch}`);