// Observable-state fingerprint: reads only DOM + Plotly, never app globals.
window.__fp = function () {
  const h = (a) => {
    if (!a) return null;
    let s = 0;
    for (let i = 0; i < a.length; i++) {
      const v = typeof a[i] === 'number' ? Math.round(a[i] * 1e6) : 0;
      s = (s * 31 + v) % 2147483647;
    }
    return a.length + ':' + s;
  };
  const num = (a) => a && a.length ? [a[0], a[Math.floor(a.length / 2)], a[a.length - 1]].map(v => typeof v === 'number' ? +v.toFixed(6) : v) : null;
  const figs = {};
  const all = [...document.querySelectorAll('figure')];
  all.forEach((f, i) => {
    const key = f.id || ('fig' + i);
    if (!f.data) { figs[key] = 'no-plot'; return; }
    figs[key] = {
      title: (f.layout && f.layout.title && (f.layout.title.text || f.layout.title)) || null,
      yaxis: f.layout && f.layout.yaxis ? [f.layout.yaxis.title && (f.layout.yaxis.title.text || f.layout.yaxis.title), f.layout.yaxis.range && f.layout.yaxis.range.map(v => +v.toFixed(4))] : null,
      xrange: f.layout && f.layout.xaxis && f.layout.xaxis.range ? f.layout.xaxis.range.map(v => +v.toFixed(4)) : null,
      // The whole x-axis config, not just the range: the year slider used to replace it
      // wholesale and silently drop dtick, fixedrange and the tick padding (BUGS.md #4).
      xaxis: f.layout && f.layout.xaxis ? ['dtick', 'tick0', 'ticks', 'ticklen', 'tickcolor', 'fixedrange', 'hoverformat']
        .reduce((o, k) => (o[k] = f.layout.xaxis[k], o), {}) : null,
      traces: f.data.map(t => ({ x: h(t.x), y: h(t.y), ys: num(t.y), xs: num(t.x), op: t.opacity, vis: t.visible, mode: t.mode }))
    };
  });
  return {
    figs,
    runlog: document.getElementById('runlog').innerHTML.replace(/\s+/g, ' ').trim(),
    runlogRowClasses: [...document.getElementById('runlog').rows].map(r => r.className),
    emissionstext: document.getElementById('emissionstext').innerHTML.replace(/\s+/g, ' ').trim(),
    regionbuttons: [...document.getElementById('regionbuttons').getElementsByTagName('button')]
      .map(b => ({ text: b.textContent, bg: b.style.backgroundColor, color: b.style.color, type: b.type })),
    hoverBg: window.__hoverBg || null,
    outBg: window.__outBg || null,
    carouselIndex: document.querySelector('.flickity-enabled') ? document.querySelectorAll('#figuregroup .is-selected').length : 'n/a',
    figClasses: all.map(f => f.className),
    advancedDisplay: document.getElementById('advancedUI').style.display,
    simpleDisplay: document.getElementById('simpleUI').style.display,
    scenarioIdx: [...document.getElementsByClassName('scenario')].map(s => s.selectedIndex),
    cs: document.getElementById('csSlider').noUiSlider.get(),
    ysel: document.getElementById('yearSelectionSlider').noUiSlider.get(),
    harm: document.getElementById('harmonizationSlider').noUiSlider.get(),
    trashDisplay: document.getElementById('trash').getAttribute('display'),
    trashTransform: document.getElementById('trash').getAttribute('transform'),
    ghostDisplay: document.getElementById('ghostfigure').style.display,
    nPointHandles: document.querySelectorAll('#editemissions .scatterlayer .trace:nth-of-type(3) g path').length,
    handleData: [...document.querySelectorAll('#editemissions .scatterlayer .trace:nth-of-type(3) g path')].map(p => p.handle ? [+p.handle.x.toFixed(4), +p.handle.y.toFixed(4), p.handle.type] : null),
    gtitleY: [...document.querySelectorAll('figure .gtitle')].map(t => t.getAttribute('y'))
  };
};
