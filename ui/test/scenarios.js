// Interaction scenarios, driven through the DOM only (no app globals).
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
const key = (name, code) => document.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, keyCode: code, which: code, bubbles: true }));
window.__scenarios = {
  initial: async () => {},

  changeScenarioSSP226: async () => {
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 0;
    fire(s, 'change');
  },

  changeScenarioSSP245: async () => {
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 2;
    fire(s, 'change');
  },

  interpolationLinear: async () => {
    const el = document.getElementById('interpolation');
    el.selectedIndex = 0;
    fire(el, 'change');
  },

  interpolationExponential: async () => {
    const el = document.getElementById('interpolation');
    el.selectedIndex = 1;
    fire(el, 'change');
  },

  interpolationCatmullRom: async () => {
    const el = document.getElementById('interpolation');
    el.selectedIndex = 6;
    fire(el, 'change');
  },

  interpolationSteffen: async () => {
    const el = document.getElementById('interpolation');
    el.selectedIndex = 4;
    fire(el, 'change');
  },

  advancedMode: async () => {
    document.getElementById('modetoggle').click();
  },

  advancedModeThenRegions3: async () => {
    document.getElementById('modetoggle').click();
    const nr = document.getElementById('numberregions');
    nr.selectedIndex = 2;
    fire(nr, 'change');
  },

  advancedModeRegionsAndPick: async () => {
    document.getElementById('modetoggle').click();
    const nr = document.getElementById('numberregions');
    nr.selectedIndex = 2;
    fire(nr, 'change');
    const btns = document.getElementById('regionbuttons').getElementsByTagName('button');
    btns[1].click();
  },

  advancedThenBackToBasic: async () => {
    const t = document.getElementById('modetoggle');
    t.click();
    t.click();
  },

  harmonization05: async () => {
    document.getElementById('harmonizationSlider').noUiSlider.set(0.5);
  },

  harmonization0: async () => {
    document.getElementById('harmonizationSlider').noUiSlider.set(0);
  },

  yearSelection: async () => {
    document.getElementById('yearSelectionSlider').noUiSlider.set([1960, 2020, 2100]);
  },

  yearSelectionWide: async () => {
    document.getElementById('yearSelectionSlider').noUiSlider.set([1980, 2010, 2100]);
  },

  openCloseSettings: async () => {
    document.getElementById('settingsopen').dispatchEvent(new MouseEvent('click', {bubbles:true}));
    document.getElementById('settingsclose').dispatchEvent(new MouseEvent('click', {bubbles:true}));
  },

  lockCO2ThenChangeScenario: async () => {
    const b = document.getElementById('lockCO2box1');
    b.checked = true;
    fire(b, 'change');
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 0;
    fire(s, 'change');
  },

  clearFigures: async () => {
    document.getElementById('clearfigures').click();
  },

  sspModelChange: async () => {
    const m = document.getElementById('SSPmodel');
    m.selectedIndex = 1;
    fire(m, 'change');
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 1;
    fire(s, 'change');
  },

  fixDrag: async () => {
    document.getElementById('fixdrag').click();
  },

  enlargeEmissionsFigure: async () => {
    window.__toggleEnlarge('open');
    await new Promise(r => setTimeout(r, 400));
  },

  enlargeThenClose: async () => {
    window.__toggleEnlarge('open');
    await new Promise(r => setTimeout(r, 400));
    window.__toggleEnlarge('close');
  },

  dragHandle: async () => {
    window.__toggleEnlarge('open');
    await new Promise(r => setTimeout(r, 400));
    window.__dragHandleTo(2, 2050, 20);
    window.__toggleEnlarge('close');
  },

  dragHandleToTrash: async () => {
    window.__toggleEnlarge('open');
    await new Promise(r => setTimeout(r, 400));
    window.__dragHandleTo(3, 1990, 20);
    window.__toggleEnlarge('close');
  },

  spawnNewHandle: async () => {
    window.__toggleEnlarge('open');
    await new Promise(r => setTimeout(r, 400));
    window.__dragSpawnTo(2060, 25);
    window.__toggleEnlarge('close');
  },

  carouselNextPrev: async () => {
    key('ArrowRight', 39);
    key('ArrowRight', 39);
    key('ArrowLeft', 37);
    await new Promise(r => setTimeout(r, 600));
  },

  toggleLogRowHide: async () => {
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 0; fire(s, 'change');
    const rows = document.getElementById('runlog').rows;
    const row = rows[0];
    // simulate clicking the colour swatch cell (hide toggle)
    row.firstChild.firstChild.dispatchEvent(new MouseEvent('click', {bubbles:true}));
  },

  clearHiddenAfterHide: async () => {
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 0; fire(s, 'change');
    const rows = document.getElementById('runlog').rows;
    const row = rows[0];
    row.firstChild.firstChild.dispatchEvent(new MouseEvent('click', {bubbles:true}));
    document.getElementById('clearhidden').click();
  }
};
// --- scenarios that exercise the model-run path (mock backend) ---
Object.assign(window.__scenarios, {
  runModelOnce: async () => {
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
  },

  runModelTwice: async () => {
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
  },

  runModelThenChangeScenario: async () => {
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 0; fire(s, 'change');
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
  },

  runModelThenHideRow: async () => {
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 0; fire(s, 'change');
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
    const rows = document.getElementById('runlog').rows;
    rows[1].firstChild.firstChild.dispatchEvent(new MouseEvent('click', {bubbles:true}));
  },

  runModelThenClearHidden: async () => {
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 0; fire(s, 'change');
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
    const rows = document.getElementById('runlog').rows;
    rows[1].firstChild.firstChild.dispatchEvent(new MouseEvent('click', {bubbles:true}));
    document.getElementById('clearhidden').click();
  },

  runModelThenActivateOlderRow: async () => {
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
    const s = document.getElementsByClassName('scenario')[0];
    s.selectedIndex = 0; fire(s, 'change');
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
    const rows = document.getElementById('runlog').rows;
    rows[1].cells[1].dispatchEvent(new MouseEvent('click', {bubbles:true}));
  },

  runModelThenClearAll: async () => {
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 600));
    document.getElementById('clearfigures').click();
  },

  runModelAdvanced: async () => {
    document.getElementById('modetoggle').click();
    document.querySelector('input[type=submit]').click();
    await new Promise(r => setTimeout(r, 700));
  },

  regionsThreeThenTwo: async () => {
    document.getElementById('modetoggle').click();
    const nr = document.getElementById('numberregions');
    nr.selectedIndex = 2; fire(nr, 'change');
    document.getElementById('regionbuttons').getElementsByTagName('button')[3].click();
    nr.selectedIndex = 1; fire(nr, 'change');
  },

  regionsTwoPickNonOECD: async () => {
    document.getElementById('modetoggle').click();
    const nr = document.getElementById('numberregions');
    nr.selectedIndex = 1; fire(nr, 'change');
    document.getElementById('regionbuttons').getElementsByTagName('button')[1].click();
  },

  regionButtonHover: async () => {
    document.getElementById('modetoggle').click();
    const nr = document.getElementById('numberregions');
    nr.selectedIndex = 2; fire(nr, 'change');
    const b = document.getElementById('regionbuttons').getElementsByTagName('button')[2];
    b.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    window.__hoverBg = b.style.backgroundColor;
    b.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    window.__outBg = b.style.backgroundColor;
  }
});

// --- scenarios covering the bug fixes (see ../BUGS.md) ---
Object.assign(window.__scenarios, {
    // BUGS.md #1: the row added by a second model run must carry an emissions snapshot.
    runModelTwiceThenActivateTopRow: async () => {
        const run = document.querySelector('input[type=submit]');
        run.click();
        await new Promise(r => setTimeout(r, 600));
        run.click();
        await new Promise(r => setTimeout(r, 600));
        const rows = document.getElementById('runlog').rows;
        rows[0].cells[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    },

    // BUGS.md #1: the same row must survive a full redraw.
    runModelTwiceThenMoveYearSlider: async () => {
        const run = document.querySelector('input[type=submit]');
        run.click();
        await new Promise(r => setTimeout(r, 600));
        run.click();
        await new Promise(r => setTimeout(r, 600));
        document.getElementById('yearSelectionSlider').noUiSlider.set([1980, 2010, 2100]);
    }
});
