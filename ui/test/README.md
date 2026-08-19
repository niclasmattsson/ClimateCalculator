# UI regression harness

A way to change the interface and prove that nothing moved. It loads two copies of the app
side by side, drives both through the same list of interactions, and diffs everything
observable afterwards — every Plotly trace, layout, log row, breakpoint position and
figure class name.

It was written to verify the August 2026 module refactor and is kept because the next
step, migrating off Plotly 1.39, needs exactly the same guarantee.

Node is the only requirement. Nothing is installed; there is no `package.json`.

## Running a comparison

Check out the version you want to compare against into a worktree, then serve both trees:

```bash
git worktree add ../ccc-before <commit-or-branch>
```

```bash
node ui/test/server.js ../ccc-before/ui ui
```

Open <http://localhost:8123/fp/driver.html> and, in the browser console:

```js
runBoth()          // takes about 90 seconds; watch the status line on the page
```

```js
cmpStatus()        // { done, report: { totalScenarios, differing, report } }
```

`report` is empty when the two versions are indistinguishable. Otherwise each entry names
a scenario and lists the specific values that changed, as `path: before -> after`.

To look at just one side:

```js
runAll('/live').then(r => console.log(r))
```

## What it checks

`fingerprint.js` reads only the DOM and Plotly's public state, never application
variables, so it is indifferent to how the code is organised internally. It captures:

- every figure's title, axis titles, axis ranges, and for each trace a hash of the full
  x and y arrays plus sample values, opacity, visibility and mode;
- the model-run log's HTML and per-row classes;
- the breakpoint readout, the region buttons' labels and colours, and their hover colours;
- slider values, settings-panel state, trash-can position and visibility;
- every breakpoint's year, value and type, as attached to the marker elements;
- the `y` attribute of every plot title (the app nudges these by hand).

`scenarios.js` holds the interaction list — currently 39 scenarios covering scenario and
model selection, all eight interpolation methods, basic/advanced mode, region counts and
region selection, the harmonization and year sliders, enlarging the emissions figure,
dragging a breakpoint, dragging one to the trash, spawning a new one, the carousel, the
model run (against the mock backend), and the log's hide / clear-hidden / clear-all paths.

Everything is driven with real DOM events — `element.click()`, dispatched `change` and
`keydown` events, and real `mousedown`/`mousemove`/`mouseup` sequences for dragging — so
the harness does not care whether handlers are attached as `onclick` or with
`addEventListener`.

Scenario errors are recorded rather than swallowed, and compared too: a version that stops
throwing where the other one throws counts as a difference. That is deliberate — several
known bugs (see `../BUGS.md`) crash, and while they are unfixed the crash is the expected
behaviour.

## Adding a scenario

Append to the object in `scenarios.js`. An entry is an async function that manipulates the
document; the fingerprint is taken 350 ms after it resolves. Use the `fire` and `key`
helpers at the top of the file, and `window.__dragHandleTo` / `window.__dragSpawnTo` from
`helpers.js` for breakpoint dragging.

## Limitations

- It compares state, not pixels. A purely visual change — a colour in a stylesheet, a font
  — passes silently.
- The mock `/runccc` is not the climate model. It confirms that the request is well formed
  and that the response is plotted correctly, nothing about the physics.
- Timing-dependent behaviour is covered only as far as the fixed waits allow.
