# Modules And Profiles

Use this page to choose a capability, install it locally, and activate it in a
customer project.

## Module Matrix

| Module | Use it for | Poetry extra | Public interface or command |
| --- | --- | --- | --- |
| `api` | HTTP sessions, REST/SOAP bodies and OpenAPI contracts | `api` | `playbot/modules/api/resources/api.resource` |
| `api-mocks` | Isolated WireMock services, matching and request verification | `api-mocks` (also install `api`) | `playbot/modules/api_mocks/resources/api_mocks.resource` |
| `browser` | Browser and Playwright automation | `browser` | `playbot/modules/browser/resources/browser.resource` |
| `xml` | XML comparison, tag filters and modifications | `xml` | `playbot/modules/xml/resources/xml.resource` |
| `json` | Deterministic JSON comparison | `json` | `playbot/modules/json/resources/json.resource` |
| `pdf-text` | PDF text extraction and masking | `pdf-text` | `playbot/modules/pdf_text/resources/pdf_text.resource` |
| `pdf-visual` | Headless PDF rendering and visual diffs | `pdf-visual` | `playbot/modules/pdf_visual/resources/pdf_visual.resource` |
| `pdf-gui` | Local interactive PDF mask authoring | `pdf-gui` | `playbot/modules/pdf_gui/resources/pdf_gui.resource` |
| `datadriven` | CSV-driven Robot suites | `datadriven` | `playbot/modules/datadriven/resources/datadriven.resource` |
| `parallel` | Pabot execution | `parallel` | `playbot run --parallel` |
| `gherkin` | Generate Robot suites or feature files | `gherkin` | `playbot gherkin` |
| `allure` | Generate static Allure reports | `allure` | `playbot allure` |
| `xray` | Export, select, synchronize, or upload Xray data | `xray` | `playbot xray` |

`pdf-gui` requires `pdf-text` and `pdf-visual` and is local-only. Optional
compositions such as Xray plus Gherkin are activated independently unless a
manifest declares a hard dependency.

## Docker Profiles

| Profile | Included modules | Typical use |
| --- | --- | --- |
| `all-modules` | Every non-GUI module | Projects needing the complete supported CI set |
| `all-modules-no-browser` | Every non-GUI module except Browser | Headless JSON, PDF, data and reporting suites |

Select the smallest profile containing every active module. Activating a module
in `playbot.toml` cannot install missing software into an image.

## Activate A Module

1. Install its Poetry extra locally or choose a compatible Docker profile.
2. Add its canonical name to `active_modules`.
3. Add `[modules.<name>]` when its manifest requires configuration.
4. Import only the public Robot resource or use its public command.
5. Run `playbot doctor`, then the affected tests.

Example:

```toml
schema_version = 1

[playbot]
project = "customer"
active_modules = ["browser", "parallel"]

[modules.browser]
config = "modules/browser.toml"
```

```bash
poetry install -E browser -E parallel
poetry run rfbrowser init
poetry run playbot doctor --config config/playbot.toml
poetry run playbot run --config config/playbot.toml \
  --parallel --processes 4 -- robot/tests
```

## Important Module Notes

- **Browser:** Doctor checks the Python package, `rfbrowser`, Chromium, and the
  initialized Browser wrapper. Pages and locators remain customer-owned.
- **Allure:** Playbot generates `reports/allure-report`; the customer pipeline
  owns GitHub Pages, GitLab Pages, credentials, visibility, and retention.
- **Xray:** TOML stores environment-variable names, never credential values.
  Local exports work without network credentials; upload can be disabled.
- **PDF:** `pdf-text` has no rendering or GUI dependency. `pdf-visual` is
  headless. `pdf-gui` requires a display and is excluded from standard images.
- **DataDriver and Gherkin:** Concrete CSV and feature files are customer-owned.

The machine-readable sources of truth are `playbot/modules/*/module.toml` and
`docker/profiles.toml`.

## Browser Routing And Demonstration

Import the public Browser resource and register the customer's page resources
with `Register Project Pages From Folder`. Each page supplies a unique
`*_PAGE_ID` and a `&{*_LOCATORS}` dictionary mapping semantic names to selectors.
`Keys.Click`, `Keys.Fill Text` and the other routed actions use the detected page
to resolve those names. An imported `<project> <action>` keyword overrides the
default action and receives the resolved selector; otherwise Playbot selects
`Default <action>`.

This is deterministic selection from authored mappings, not automatic creation
of locators or inference of business workflows. Direct technical selectors
bypass semantic lookup. The executable
[UI Workshop](https://github.com/Test-Automation-PTS/playbot-demo-customer/blob/main/docs/ui-demonstration.md)
proves that the same `Continue` name selects different buttons after a page
change and verifies both customer and default action paths. Its local website,
keyword levels, browser contexts and parallel participant cases belong to the
customer repository and run against the released `all-modules` image.

## JSON And XML Comparison

Activate `json` for JSON, and both `json` and `xml` for XML. The XML module
uses the JSON module's deterministic diff/report engine. Import the respective
public resource, then compare values, UTF-8 files, or document strings:

```robotframework
Resource    %{PLAYBOT_HOME}/playbot/modules/json/resources/json.resource
Resource    %{PLAYBOT_HOME}/playbot/modules/xml/resources/xml.resource

${diff}=    Compare JSON Files    ${CURDIR}/expected.json    ${CURDIR}/actual.json
...    config=${CURDIR}/rules.json    output_path=${OUTPUT DIR}/json/diff_result.json
JSON Documents Should Be Equal    ${expected}    ${actual}    config=${rules}
${copy}=    Set JSON Value    ${expected}    user.id    ${42}
${copy}=    Remove JSON Key    ${copy}    debug
XML Documents Should Be Equal    <root a="1" b="2"/>    <root b="2" a="1"/>
```

`Get JSON Differences` / `Get XML Differences` return `{}` for equality.
`Compare JSON Files` / `Compare XML Files` also write a JSON result and a unique,
timestamped process log under `logs/` next to that result. Assertions fail on
any difference and accept `output_path` to save the report before failing. Use a
separate output path per test when running in parallel. Inputs are never overwritten.

Example JSON rules (all fields are optional):

```json
{
  "set": {"values": {"user.region": "test"}, "types_by_key": {"amount": "number"}},
  "remove": {"values": ["debug"], "types": ["null"]},
  "whitelist": {"values": [], "types": []},
  "blacklist": {"values": ["timestamp"], "types": []},
  "max_differences": 10
}
```

`Modify JSON Document` applies `set` and `remove` to a copy; comparisons apply
these operations to both inputs before filtering. Set paths use dots and numeric
list indices (`items.0.id`). A plain remove key matches recursively; a dotted
remove path addresses one location. `types_by_key` converts matching keys;
`types_by_type` converts matching value types. Conversion failures are errors.
Supported types are `string`, `number`, `boolean`, `null`, `array`, and `object`.

Filter `values` select key names at any depth. Non-empty whitelist names and
types must both match; blacklist rules take precedence. Containers preserve the
route to nested selected keys; blacklisting a container type removes that subtree.
Type filters apply to dictionary values, preserving array positions. `0` or `""`
means no discrepancy limit. An explicit keyword limit overrides the config.
`limit_reached: true` records that traversal stopped at the reported count; it
never claims to know an unvisited total. Deterministic traversal follows sorted
object keys and original array order. JSON type changes remain significant.

XML rules use the same `max_differences` setting. Whitelist/blacklist `values`
contain tag names (use `{namespace-uri}name` for namespaced tags). XML `set.values`
maps an ElementTree selection path such as `.//status` to replacement text;
`remove.values` lists paths. `Set XML Value`, `Remove XML Elements` and
`Modify XML Document` return new XML text. XML type-conversion rules are unsupported.
Attribute order, namespace prefix spelling and indentation-only whitespace do
not matter; child order, attributes and non-blank text do. Reports describe a
canonical element tree (`tag`, `attributes`, `text`, `tail`, `children`). DTDs and
entity declarations are rejected. XML schema validation is outside this module.

## PDF Comparison And Masks

Use `pdf-text` to compare extractable text and `pdf-visual` to compare rendered
pixels, including images, colors and layout. Both work without a display. A
text-only comparison does not recognize scanned text; choose visual comparison
for scanned pages. Inputs stay in the customer repository and are never overwritten.

```robotframework
Resource    %{PLAYBOT_HOME}/playbot/modules/pdf_text/resources/pdf_text.resource
Resource    %{PLAYBOT_HOME}/playbot/modules/pdf_visual/resources/pdf_visual.resource

PDF Texts Should Be Equal    ${expected}    ${actual}
...    mask_config=${CURDIR}/masks.json    output_dir=${OUTPUT DIR}/text
PDFs Should Be Visually Equal    ${expected}    ${actual}
...    mask_json=${CURDIR}/masks.json    output_dir=${OUTPUT DIR}/visual
```

The assertion keywords fail after saving reports. `Compare PDF Texts` returns a
dictionary of differing pages; `Compare Pdfs` returns a list of visual differences.
They retain their data-returning behavior. A missing page differs even when it is
blank; different page sizes also differ visually. Visual reports contain expected,
actual and highlighted PNGs plus `diff_result.json`. Text reports contain masked
text in JSON and escaped HTML. Use a dedicated output directory per test/run.

Optional keyword settings are `pages` (or `compare_pages`), `exclude_pages`,
`max_differences`, and, visually, `tolerance` (0–255 per color channel; default 0).
Pages are 1-based, accept `1,3-5`, lists, `all`, or `n` for the last page of the
comparison pair. Include/exclude apply to original page numbers. Selecting no
pages or a page outside the pair's page count is an error. A discrepancy limit
counts differing pages, stops processing, and sets `limit_reached` in the report.
Explicit keyword settings override the JSON configuration; `0` means unlimited.

A mask file accepts the legacy list of page blocks, or this envelope:

```json
{
  "compare_pages": "1-2",
  "exclude_pages": "2",
  "max_differences": 5,
  "masks": [
    {
      "page_numbers": [1],
      "text_ignore_patterns": ["Issued [DATE]", {"regex": "ID-[0-9]+"}],
      "area_masks": ["[HEADER]", "[TOP-RIGHT: 20%, 10%]"]
    }
  ]
}
```

All fields are optional. A block without `page_numbers` applies to all pages;
`text_ignore_global_patterns` also applies globally. `description` may document
the envelope, block or pattern object. Unknown fields/tags, invalid regexes,
non-positive rectangles and percentages outside page bounds fail clearly.

Plain text is literal and its regex punctuation is escaped. Embedded tags are
expanded: `[DATE]`, `[NUM]` (including decimals), `[ALPHA]`, `[ALPHANUM]`, `[ANY]`,
`[EMAIL]`, `[PHONE]`, `[CURRENCY]` / `[PRICE]`, `[PERCENTAGE]`, `[TIME]`.
For raw regex use `regex:...` or `{"regex":"..."}`; for literal brackets use
`literal:...` or `{"literal":"..."}`. `Translate PDF Text Pattern` returns the
resolved regex. The existing file translator keywords accept the same format.
Existing unprefixed regex patterns must gain the `regex:` prefix. Already
translated `word_pattern` records remain raw regex for compatibility.

Areas use a top-left origin. `[HEADER]` / `[FOOTER]` mask 10%; `[LEFT]` / `[RIGHT]`
mask 15%. Corner tags take width and height percentages. `[AREA: x, y, w, h]`
and `area:[x, y, w, h]` use pixels; four `%` values create a percentage rectangle.
An explicit coordinate object uses `type: "coordinates"`, `x`, `y`, `width`,
`height`, and `unit: "percent"`, `"pt"` or `"px"`. For pixels, `dpi` may identify
the source rendering resolution. Otherwise pixels refer to the comparison DPI
(text uses 72 DPI). Legacy coordinate records without a unit retain PDF-point
semantics. Prefer percentages or points for reusable masks. GUI exports use
percentages. Text masks remove intersecting glyphs; visual text masks cover all
matched characters in both documents before pixel comparison.

### Redacted Outputs

`Redact Image    input.png    output.png    masks.json` creates a fresh PNG with
opaque black areas and no copied image metadata. Screenshots require coordinate
or area masks; there is no OCR or automatic personal-data detection.
`Redact PDF    input.pdf    output.pdf    masks.json` produces a new PDF containing
only rendered, masked pages. It retains no original text layer, attachments or
source objects; searchability, forms and digital signatures are not preserved.
Masks identify what is hidden. PDF text patterns that find no extractable text
are errors; use coordinates for scanned content. Redaction uses page-scoped masks
and rejects comparison page filters or limits. Source files remain unchanged.

### Local Mask Authoring

Install the `pdf-gui` extra and activate `pdf-gui`, `pdf-text`, `pdf-visual` locally.
`Run Text Blocking    input.pdf    output-directory    page_number=2` returns the
selected page image and block JSON. Pass each side's image/JSON to `Run PDF Mask
Viewer`. Click blocks to select/deselect, drag to move, Shift-drag to resize, or
add a manual area. `Create Mask` exports page-scoped percentage masks usable by
both comparison modules. The GUI remains excluded from standard images.

## API Testing

Install `poetry install -E api -E api-mocks` and activate `api`, `api-mocks`.
Activate `json` and `xml` when comparing payloads. The HTTP module returns a
Requests response: pass `${response.json()}` to `JSON Documents Should Be Equal`
or `${response.text}` to `XML Documents Should Be Equal`.

```robotframework
*** Settings ***
Resource    %{PLAYBOT_HOME}/playbot/modules/api/resources/api.resource
Resource    %{PLAYBOT_HOME}/playbot/modules/json/resources/json.resource

*** Test Cases ***
Read An Order
    Create API Session    orders    %{ORDER_API_URL}    bearer_token_env=ORDER_API_TOKEN
    ${response}=    API Request    orders    GET    /orders/42    expected_status=200
    API Response Should Match Contract    ${response}    robot/data/orders.openapi.json
    JSON Documents Should Be Equal    robot/data/expected-order.json    ${response.json()}
```

Sessions verify TLS, default to a 10-second connect/read timeout, disable
implicit retries and return redirects for explicit assertion. Set `ca_bundle`
for a private CA and `trust_env=True` to use environment proxies/.netrc.
Use `basic_user_env`/`basic_password_env`, `bearer_token_env`, or
`secret_headers_env` (header -> env name) for credentials. Do not pass credentials
as literal Robot arguments or use them in exported payload comparisons.
`Export API Evidence` includes only method, status and measured duration.
Response-time assertions measure full downloaded responses; they are not a
load-testing facility. Connect/read timeouts are not an overall wall-time budget.

WireMock needs Java 11+ and the checksum-pinned standalone JAR. Both release
profiles include them. For local setup, install Java, then:

```bash
python docker/install_wiremock.py /tmp/wiremock.jar
export PLAYBOT_WIREMOCK_JAR=/tmp/wiremock.jar
```

`Start API Mock` returns a loopback URL. `Add API Mock Mapping` accepts a native
WireMock JSON file or dictionary. `API Mock Should Have Received` asserts exact
request counts; `API Mock Should Have No Unmatched Requests` rejects unexpected
traffic. `Remove API Mock Mapping` and `Reset API Mock` change only the owned
server. Default `scope=test` cleans up after each test; choose `suite` in suite
setup or `run` for one Robot worker. Pabot workers always have separate processes,
ports and state. The request journal retains the latest 1,000 requests; reset it
between long scenarios. Requests to a stopped alias should fail, not reconnect.

OpenAPI 3.0/3.1 JSON contracts validate real request/response pairs. Bundle external
references first; local `#` references work offline. Invalid requests can be
intentional: `validate_request=False` validates only their error responses.
SOAP-over-HTTP uses `body` plus `Content-Type`/`SOAPAction`; WSDL generation and
XSD validation are outside this version.

The [customer API examples](https://github.com/Test-Automation-PTS/playbot-demo-customer/tree/main/robot/tests/api)
show JSON/XML composition, WireMock failures/delays/scenarios and provider
contracts. OpenAPI conformance does not prove consumer compatibility. Pact
consumer generation, provider-state callbacks, Broker publishing and
`can-i-deploy` are tracked separately in
[the Pact follow-up](https://github.com/Test-Automation-PTS/playbot/issues/151).
