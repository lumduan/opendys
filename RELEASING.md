# Releasing opendys

opendys ships as a Docker image (no npm publish). Releases are **tag-driven semver**: pushing a
`vMAJOR.MINOR.PATCH` tag triggers [`.github/workflows/release.yml`](.github/workflows/release.yml),
which builds and pushes the image to GHCR as `ghcr.io/lumduan/opendys:<version>` and `:latest`.

## Prerequisites

- `main` is green (lint → typecheck → test → build all pass in CI).
- You can push tags, and `gh` is authenticated.

## Steps

1. Bump the version in `package.json` (semver).
2. Move the `## [Unreleased]` items into a new `## [X.Y.Z] — YYYY-MM-DD` block in `CHANGELOG.md`.
3. Commit: `git commit -am "chore(release): vX.Y.Z"`.
4. Push main: `git push origin main`.
5. Tag and push the tag (this triggers the GHCR build):

   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

6. Watch the workflow: `gh run watch` (or the Actions tab). When green, the image is on GHCR.
7. Create the GitHub Release using the changelog block as the notes:

   ```sh
   gh release create vX.Y.Z --title "vX.Y.Z" --notes "…paste the CHANGELOG [X.Y.Z] block…"
   ```

8. Verify: `docker run --rm -p 8080:8080 ghcr.io/lumduan/opendys:vX.Y.Z` → open http://localhost:8080.

## Rules

- **Tags are immutable.** Don't delete a bad tag — cut a new patch (`vX.Y.(Z+1)`).
- The first GHCR publish may create a **private** package; make it public in the repo's package
  settings (or `gh api --method PATCH /user/packages/container/opendys -f visibility=public`).
