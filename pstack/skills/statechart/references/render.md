# Render a chart

Render each `.mmd` file that you show with the `pstack_chart` tool. Pass `input` as the path to `chart.mmd`; the tool writes `<input>.svg` by default, or the path you pass as `output`. The Mermaid text stays authoritative.

`pstack_chart` draws the subset the statechart backend emits: states, groups, parallel regions, labelled transitions, and the `breaks`/`mayBreak`/`bugPath`/`repeats` marks. It reads `classDef` and `class` lines from the `.mmd`, so the chart keeps its declared colours. It needs no browser, no external binary, and no network. If it reports a syntax error at a line, fix the `.mmd` at that line; do not guess a different renderer.

The tool has no theme parameter and always uses its light palette. That is enough for the normal reply. Do not install Pele or any other renderer unless the user asks for a different one. When the tool rejects a chart, show the user the Mermaid text and the error line.
