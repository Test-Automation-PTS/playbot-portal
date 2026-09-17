# Development

Use this page to set up Playbot, run tests, or add a module.

## Local Setup

Python 3.10 through 3.14 and Poetry are supported.

```bash
# Core only
poetry install

# All development capabilities
poetry install --all-extras

# Focused Browser development
poetry install -E browser
poetry run rfbrowser init
```

Poetry extras install Python dependencies. Docker profiles additionally install
system dependencies such as browsers, Java, fonts, and command-line tools.

## Run Tests

```bash
poetry run pytest -q tests/unit
poetry run pytest -q tests/contract
poetry run pytest -q tests/integration
```

Use focused tests while implementing, then run all three groups. Changes to a
Docker profile also require the corresponding profile smoke workflow.

The generic consumer contract is
`tests/fixtures/full-regression-test/`. The `all-modules` Docker job runs its
Doctor, generated Gherkin, parallel Robot, Allure, and offline Xray paths. Keep
it minimal and generic; complete customer examples belong in
`playbot-demo-customer`.

## Add A Module

Use a module when a capability has its own dependency, system tool,
configuration, diagnostics, or public integration surface.

1. Choose a canonical kebab-case module name.
2. Add a failing unit or contract test for the intended boundary.
3. Create `playbot/modules/<python_name>/module.toml`.
4. Add Python code and public resources in the same module directory.
5. Put private Robot resources below `resources/internal/`.
6. Declare optional Python dependencies and a matching Poetry extra.
7. Add the module only to Docker profiles that own its runtime requirements.
8. Add or update its row in [Modules](modules.md).
9. Run focused, contract, integration, and profile tests.

Minimal manifest shape:

```toml
schema_version = 1

[module]
name = "example"
description = "Example capability"
extra = "example"
requires = []
local_only = false

[entrypoints]
robot_resource = "playbot/modules/example/resources/example.resource"

[configuration]
schema = "playbot/modules/example/resources/example.schema.json"
required = true

[diagnostics]
python_packages = []
commands = []
system_tools = []
environment_variables = []
```

## Acceptance Checklist

- Core imports and runs without the new extra.
- Manifest parsing and dependency resolution pass.
- Doctor reports every missing capability independently.
- A used but inactive module fails preflight.
- Customer code can use only the public entrypoint.
- Profile metadata matches installed module manifests.
- Unit, contract, integration, and required Docker smokes pass.

## Change Core Carefully

Core must remain technology-neutral. It may not import optional modules or
their dependencies. Shared behavior belongs in Core only when every Playbot
installation needs it; otherwise create or extend a module.

Detailed maintainer rules are in `.codex/skills/playbot-maintainer/` for AI
agents working on the repository.

PDF regression tests generate small documents with text and drawing primitives.
Run `pytest -q tests/unit/modules/test_pdf_finalisation.py` for masks, pixels,
page filters, reports and redaction. With `pdf-gui` installed,
`QT_QPA_PLATFORM=offscreen pytest -q tests/unit/modules/test_pdf_gui_finalisation.py`
also verifies GUI movement, resizing and percentage-mask export without opening a
window. Both release profiles run `docker/smoke/pdf.robot` against the built image.
