const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";
const branch = process.env.VERCEL_GIT_COMMIT_REF || "";
const isRelease = /\[(deploy|release)\]/i.test(message);

if (branch && branch !== "main") {
  console.log(`Skipping Vercel build for non-production branch: ${branch}`);
  process.exit(0);
}

if (isRelease) {
  console.log("Release marker found. Allowing Vercel build.");
  process.exit(1);
}

console.log(
  "Skipping automatic Vercel build. Use a final commit containing [deploy] or [release] when the release is ready."
);
process.exit(0);
