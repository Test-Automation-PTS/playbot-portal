# Release

Use this page to publish or roll back a Playbot version.

## 1. Prepare

Choose a semantic version and review migration impact. A released tag and image
version are immutable; never reuse or move them.

Run the local gates:

```bash
poetry check --lock
poetry run pytest -q tests/unit tests/contract tests/integration
```

## 2. Publish

Run `.github/workflows/release-artifacts.yml` with the version and prerelease
flag. The workflow:

1. validates package metadata and tests;
2. builds every profile once;
3. verifies labels and installed module boundaries;
4. generates SBOMs and runs vulnerability scans;
5. pushes verified images to GHCR;
6. records immutable image digests;
7. publishes the OCI release manifest;
8. creates the GitHub Release with checksums and evidence.

Supported coordinates are:

```text
ghcr.io/test-automation-pts/playbot/all-modules:<version>
ghcr.io/test-automation-pts/playbot/all-modules-no-browser:<version>
ghcr.io/test-automation-pts/playbot/release-manifest:<version>
```

Only these two image profiles are published. Both exclude local-only `pdf-gui`.
For a new release, customers of the former `core`, `browser`, `browser-xray`,
or `browser-pdf` images select one of these profiles in the release manifest.
Previously released tags and digests remain unchanged.

## 3. Verify

Check that:

- every profile job passed;
- no `HIGH` or `CRITICAL` vulnerability violated the configured gate;
- the release manifest lists the expected source revision, profiles, modules,
  image tags, and `sha256` digests;
- the GitHub Release contains manifest, checksums, SBOMs, scan reports, and
  migration notes;
- private customer repositories have read access to required GHCR packages.

Artifact attestations and SARIF upload may be unavailable on some private
GitHub plans. They are optional only when the mandatory digest, SBOM, scan,
checksum, and manifest gates passed.

## 4. Customer Adoption

Update the demo customer first. Its pipeline must resolve the new manifest,
pull the image by digest, pass Doctor, run all customer Robot groups, and
publish reports. Real customers then update through their normal pull-request
and approval flow.

If a customer uses Artifactory, copy the approved image digest without
rebuilding and verify the destination digest.

## Rollback

Do not modify the failed release. Restore the previous manifest version and
image digest in the customer repository, then rerun Doctor and the customer
regression. Fix Playbot centrally and publish a new semantic version.

Expected evidence for every release:

- source commit and semantic version;
- profile image digests;
- unit, contract, integration, profile, and security results;
- release manifest, SBOMs, checksums, and vulnerability reports;
- migration and rollback notes.
