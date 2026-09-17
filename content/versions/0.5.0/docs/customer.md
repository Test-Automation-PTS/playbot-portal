# Customer Workflow

Use this page to create, run, or update a customer automation repository.

## 1. Start From The Reference

Use
[`playbot-demo-customer`](https://github.com/Test-Automation-PTS/playbot-demo-customer)
as the executable reference. A customer repository owns this shape:

```text
.github/workflows/ or .gitlab-ci.yml
config/playbot.toml
config/modules/
robot/resources/
robot/tests/
reports/                 generated
```

Do not copy `playbot/core` or `playbot/modules` into the customer repository.

For UI demonstrations, start with the reference repository's
[local UI Workshop methodology](https://github.com/Test-Automation-PTS/playbot-demo-customer/blob/main/docs/ui-demonstration.md).
It shows the same booking at business, grouped-action and technical keyword
levels, automatic selection from registered page/locator mappings, customer
method overrides, and focused Playwright examples. The customer owns the local
website and suites; no external HUK site is required. Four real participant
bookings also demonstrate sequential execution, Pabot and measured overlap.

## 2. Choose And Pin A Profile

Choose the smallest profile containing every required module. Pin a complete
Playbot version in customer CI, read its OCI release manifest, and pull the
recorded image digest.

For GHCR, GitHub Actions uses a short-lived `GITHUB_TOKEN` with `packages: read`
and explicit package access for the customer repository. GitLab CI uses a
masked registry credential or a customer-controlled Artifactory mirror. A
mirror copies the approved digest; it must not rebuild Playbot.

## 3. Activate Modules

Create one selected configuration:

```toml
schema_version = 1

[playbot]
project = "customer"
active_modules = ["browser"]

[modules.browser]
config = "modules/browser.toml"
```

Paths are relative to `config/playbot.toml`. Store non-secret settings and
environment-variable names in TOML. Store credential values only in the
customer CI secret store.

## 4. Import Public APIs

```robotframework
*** Settings ***
Resource    %{PLAYBOT_HOME}/playbot/core/resources/core.resource
Resource    %{PLAYBOT_HOME}/playbot/modules/browser/resources/browser.resource
Resource    ${EXECDIR}/robot/resources/customer.resource
```

Never import a Playbot `internal/` resource. Customer pages, locators, and
business keywords remain below the customer `robot/` directory.

## 5. Validate And Run

The customer pipeline mounts its checkout at `/workspace`:

```bash
docker run --rm \
  --volume "$PWD:/workspace" \
  --workdir /workspace \
  <approved-image>@sha256:<digest> \
  doctor --config /workspace/config/playbot.toml

docker run --rm --shm-size=2g \
  --volume "$PWD:/workspace" \
  --workdir /workspace \
  <approved-image>@sha256:<digest> \
  run --config /workspace/config/playbot.toml -- \
  --outputdir /workspace/reports /workspace/robot/tests
```

Expected result: Doctor passes before Robot starts, all imports resolve to
active modules, and reports are written into the customer checkout.

## 6. Publish Reports

Playbot can produce Robot, JUnit, Allure, and offline Xray artifacts. The
customer repository owns retention and publication:

- GitHub customers deploy `reports/allure-report` with GitHub Pages or a
  dedicated report repository.
- GitLab customers publish the same directory with GitLab Pages.

No hosting credential or provider URL belongs in Playbot Core.

## 7. Update Or Roll Back

For an update:

1. Change the pinned semantic version.
2. Resolve and record the new manifest and image digest.
3. Review release and migration notes.
4. Run Doctor and the complete customer regression.
5. Merge only after required approvals.

Record old and new tags, digests, migration decisions, and regression evidence
in the pull request. Rollback restores the previous manifest version and digest.

Common failures:

- **Module not installed:** select a profile containing it.
- **Module not active:** update `active_modules` and required module config.
- **Package denied:** grant the repository read access to the private GHCR package.
- **Dynamic or private import:** replace it with a resolvable public entrypoint.

See [Modules](modules.md) for profile selection and [Concepts](concepts.md) for
the ownership model.
