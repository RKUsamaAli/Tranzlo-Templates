/* ==========================================================================
   components.js — shared UI component library for the prototype.
   Every widget here is used in more than one place; nothing is bespoke.
   ========================================================================== */
window.UI = (function () {
  const CFG = window.CFG;

  /* ---------- tiny DOM helpers ------------------------------------------- */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => c && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }

  /* ---------- store ------------------------------------------------------- */
  const store = {
    fields: {},                 // simple field values
    selected: { tone: [], rom: [], strength: [] },
    grid: { tone: {}, rom: {}, strength: {} },
    allergies: [], precautions: [], secondaryDx: [], surgeries: [], goals: [],
    compare: false,
    dirty: false
  };

  /* ---------- age --------------------------------------------------------- */
  function ageFromDob(dob) {
    const d = new Date(dob), n = new Date();
    let months = (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth());
    if (n.getDate() < d.getDate()) months--;
    return { months, label: Math.floor(months / 12) + 'y ' + (months % 12) + 'm' };
  }

  /* ==========================================================================
     COMPONENT 1 — exclusive multi-select pills  (C07)
     One option may be flagged `exclusive`: choosing it clears all siblings,
     and choosing any sibling clears it.
     ========================================================================== */
  function pills(mount, list, name, opts) {
    opts = opts || {};
    const host = typeof mount === 'string' ? $(mount) : mount;
    if (!host) return;
    host.classList.add('pills');
    host.dataset.name = name;
    host.innerHTML = '';

    list.forEach(o => {
      const lab = el('label', {
        class: 'pill' + (o.exclusive ? ' exclusive' : '') + (o.danger ? ' danger' : ''),
        'data-v': o.v, title: o.exclusive ? 'Selecting this clears all other options' : ''
      });
      const inp = el('input', { type: opts.single ? 'radio' : 'checkbox', name: name, value: o.v });
      lab.appendChild(inp);
      lab.appendChild(el('span', { class: 'tick', text: '✓' }));
      lab.appendChild(el('span', { text: o.t }));
      inp.addEventListener('change', () => {
        if (!opts.single) {
          if (o.exclusive && inp.checked) {
            $$('input', host).forEach(i => { if (i !== inp) { i.checked = false; i.closest('.pill').classList.remove('on'); } });
          } else if (inp.checked) {
            list.forEach(x => {
              if (x.exclusive) {
                const ex = $('input[value="' + x.v + '"]', host);
                if (ex) { ex.checked = false; ex.closest('.pill').classList.remove('on'); }
              }
            });
          }
        } else {
          $$('.pill', host).forEach(p => p.classList.remove('on'));
        }
        lab.classList.toggle('on', inp.checked);
        syncDetails();
        host.classList.remove('invalid');
        if (opts.onChange) opts.onChange(getPills(host));
        bus.emit('change');
      });
      host.appendChild(lab);
    });

    // "Other / detail" free-text boxes revealed by specific options
    const detailWrap = el('div', { class: 'pill-details', style: 'margin-top:9px;display:grid;gap:8px' });
    list.filter(o => o.detail).forEach(o => {
      const f = el('div', { class: 'field', style: 'display:none', 'data-for': o.v }, [
        el('label', { class: 'req', text: o.t + ' — please specify' }),
        el('input', { type: 'text', placeholder: 'e.g. affected segment, weight-bearing status…', 'data-detail': name + '.' + o.v })
      ]);
      detailWrap.appendChild(f);
    });
    if (detailWrap.children.length) host.parentNode.insertBefore(detailWrap, host.nextSibling);

    // conditional blocks revealed by specific options (e.g. NICU duration)
    function syncDetails() {
      const on = getPills(host);
      $$('[data-for]', detailWrap).forEach(f => {
        f.style.display = on.includes(f.dataset.for) ? '' : 'none';
      });
      list.filter(o => o.reveals).forEach(o => {
        const t = document.getElementById(o.reveals);
        if (t) t.style.display = on.includes(o.v) ? '' : 'none';
      });
    }
    syncDetails();
    return host;
  }
  const getPills = host => $$('input:checked', typeof host === 'string' ? $(host) : host).map(i => i.value);

  /* ==========================================================================
     COMPONENT 2 — suffix input (value + fixed unit)  — used everywhere
     ========================================================================== */
  function suffixInput(suffix, attrs) {
    const w = el('div', { class: 'suffix-input' });
    w.appendChild(el('input', Object.assign({ type: 'number', inputmode: 'numeric' }, attrs || {})));
    w.appendChild(el('span', { class: 'sfx', text: suffix }));
    return w;
  }

  /* ==========================================================================
     COMPONENT 3 — milestone field  (C09)
     months + "Not achieved yet" + automatic delay flag vs normative age
     ========================================================================== */
  function milestone(mount, def, ageMonths) {
    const host = typeof mount === 'string' ? $(mount) : mount;
    if (!host) return;
    host.classList.add('milestone');
    host.innerHTML = '';
    host.appendChild(el('label', { class: 'lbl', html: def.label + ' <span class="hint">(typical ~' + def.typical + ' mo)</span>' }));

    const row = el('div', { class: 'ms-row' });
    const si = suffixInput('mo', { min: 0, max: 120, 'data-field': def.id, placeholder: '—' });
    const flag = el('span', { class: 'ms-flag' });
    row.appendChild(si); row.appendChild(flag);
    host.appendChild(row);

    const naWrap = el('label', { class: 'ms-na' });
    const na = el('input', { type: 'checkbox', 'data-field': def.id + '-na' });
    naWrap.appendChild(na);
    naWrap.appendChild(el('span', { text: 'Not achieved yet' }));
    host.appendChild(naWrap);

    const input = $('input', si);
    function evaluate() {
      if (na.checked) {
        host.classList.add('na');
        flag.className = 'ms-flag show delay';
        flag.textContent = ageMonths > def.delay ? 'NOT ACHIEVED — significant delay' : 'Not achieved';
        return;
      }
      host.classList.remove('na');
      const v = parseFloat(input.value);
      if (isNaN(v)) { flag.className = 'ms-flag'; flag.textContent = ''; return; }
      if (v <= def.mild)      { flag.className = 'ms-flag show ok';    flag.textContent = 'Within range'; }
      else if (v <= def.delay){ flag.className = 'ms-flag show mild';  flag.textContent = 'Mild delay'; }
      else                    { flag.className = 'ms-flag show delay'; flag.textContent = 'Significant delay'; }
    }
    input.addEventListener('input', () => { evaluate(); bus.emit('change'); });
    na.addEventListener('change', () => { evaluate(); bus.emit('change'); });
    return host;
  }

  /* ---- normal-range labels ------------------------------------------------
     Elbow and knee extension are normally 0°; a loss is recorded as a
     negative value ("extension lag"), so the label has to say so.        */
  function normLabel(item) {
    if (item.norm[0] === item.norm[1])
      return 'normal ' + item.norm[1] + '° — record any lag as a negative value';
    return 'normal ' + item.norm[0] + '–' + item.norm[1] + '°';
  }
  function shortNorm(item) {
    return item.norm[0] === item.norm[1] ? item.norm[1] + '°' : item.norm[0] + '–' + item.norm[1] + '°';
  }

  /* ==========================================================================
     COMPONENT 4 — catalogue picker  (C15)
     Multi-select from a catalogue, with search, group select-all and presets.
     ========================================================================== */
  let modalEl = null;
  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = el('div', { class: 'modal-back', id: 'catModal' }, [
      el('div', { class: 'modal' }, [
        el('header', {}, [
          el('h3', { id: 'catTitle', text: 'Select items' }),
          el('span', { class: 'close', text: '×', onclick: closeModal })
        ]),
        el('div', { class: 'mbody' }, [
          el('div', { class: 'search-box' }, [ el('input', { type: 'text', id: 'catSearch', placeholder: 'Search…' }) ]),
          el('div', { id: 'catBody' })
        ]),
        el('footer', {}, [
          el('span', { id: 'catCount', class: 'save-state' }),
          el('span', { class: 'spacer' }),
          el('button', { class: 'btn', text: 'Cancel', onclick: closeModal }),
          el('button', { class: 'btn primary', id: 'catApply', text: 'Apply selection' })
        ])
      ])
    ]);
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });
    return modalEl;
  }
  function closeModal() { if (modalEl) modalEl.classList.remove('open'); }

  function openPicker(title, catalogue, selectedIds, onApply) {
    ensureModal();
    $('#catTitle').textContent = title;
    $('#catSearch').value = '';
    const body = $('#catBody');
    body.innerHTML = '';
    const chosen = new Set(selectedIds);

    const regions = [];
    catalogue.forEach(i => { if (!regions.includes(i.region)) regions.push(i.region); });
    regions.forEach(rg => {
      const items = catalogue.filter(i => i.region === rg);
      const grp = el('div', { class: 'cat-group', 'data-region': rg });
      const all = el('span', { class: 'all', text: 'select all' });
      grp.appendChild(el('h5', {}, [ el('span', { text: rg }), all ]));
      const listEl = el('div', { class: 'cat-list' });
      items.forEach(it => {
        const lab = el('label', { class: 'cat-item' + (chosen.has(it.id) ? ' sel' : ''), 'data-id': it.id, 'data-label': it.label.toLowerCase() });
        const cb = el('input', { type: 'checkbox' });
        cb.checked = chosen.has(it.id);
        cb.addEventListener('change', () => {
          cb.checked ? chosen.add(it.id) : chosen.delete(it.id);
          lab.classList.toggle('sel', cb.checked);
          updCount();
        });
        lab.appendChild(cb);
        lab.appendChild(el('span', { text: it.label }));
        if (it.norm && CFG.romMode === 'degrees') lab.appendChild(el('span', { class: 'norm', text: shortNorm(it) }));
        listEl.appendChild(lab);
      });
      all.addEventListener('click', () => {
        const anyOff = items.some(i => !chosen.has(i.id));
        items.forEach(i => anyOff ? chosen.add(i.id) : chosen.delete(i.id));
        $$('.cat-item', grp).forEach(l => {
          const on = chosen.has(l.dataset.id);
          $('input', l).checked = on; l.classList.toggle('sel', on);
        });
        updCount();
      });
      grp.appendChild(listEl);
      body.appendChild(grp);
    });

    function updCount() { $('#catCount').textContent = chosen.size + ' selected'; }
    updCount();

    $('#catSearch').oninput = e => {
      const q = e.target.value.toLowerCase().trim();
      $$('.cat-item', body).forEach(l => l.style.display = (!q || l.dataset.label.includes(q)) ? '' : 'none');
      $$('.cat-group', body).forEach(g => {
        g.style.display = $$('.cat-item', g).some(l => l.style.display !== 'none') ? '' : 'none';
      });
    };
    $('#catApply').onclick = () => {
      onApply(catalogue.filter(i => chosen.has(i.id)).map(i => i.id));
      closeModal();
    };
    modalEl.classList.add('open');
  }

  /* ==========================================================================
     COMPONENT 5 — dynamic grid  (C01 / C03 / C04 / C16)
     Renders one row per SELECTED catalogue item. Columns come from config.
     ========================================================================== */
  function buildGrid(spec) {
    const wrap = $(spec.mount);
    if (!wrap) return;
    const key = spec.key;

    /* --- toolbar ------------------------------------------------------- */
    const bar = el('div', { class: 'picker-bar' });
    const count = el('span', { class: 'count', text: '0 selected' });
    bar.appendChild(el('span', { class: 'pb-title', text: spec.pickerTitle }));
    bar.appendChild(count);
    bar.appendChild(el('button', {
      class: 'btn primary sm', type: 'button', html: '＋ Select ' + spec.noun,
      onclick: () => openPicker(spec.pickerTitle, spec.catalogue, store.selected[key], ids => { store.selected[key] = ids; render(); })
    }));
    const presetWrap = el('div', { class: 'presets' });
    presetWrap.appendChild(el('span', { class: 'hint', text: 'Quick load:' }));
    Object.keys(spec.presets).forEach(p => {
      presetWrap.appendChild(el('button', {
        class: 'preset-btn', type: 'button', text: p,
        onclick: () => {
          const merged = new Set(store.selected[key].concat(spec.presets[p]));
          store.selected[key] = spec.catalogue.filter(i => merged.has(i.id)).map(i => i.id);
          render();
        }
      }));
    });
    presetWrap.appendChild(el('button', {
      class: 'preset-btn', type: 'button', text: '✕ Clear all',
      onclick: () => {
        if (store.selected[key].length && hasData(key) &&
            !confirm('Some rows contain data. Clearing removes those measurements. Continue?')) return;
        store.selected[key] = []; store.grid[key] = {}; render();
      }
    }));
    bar.appendChild(presetWrap);
    wrap.appendChild(bar);

    /* legend — explains the in-cell controls before the therapist meets them */
    const legend = el('div', { class: 'grid-legend' }, [
      el('span', {}, [ el('b', { class: 'lg-nt', text: 'NT' }),
        el('span', { html: ' <b>Not Tested</b> — press it in any cell when the measurement could not be taken, then pick a reason. A cell is complete with <b>either</b> a value <b>or</b> NT + reason.' }) ]),
      el('span', {}, [ el('b', { class: 'lg-icon', text: '⇄' }), el('span', { text: ' copy the left values across to the right' }) ]),
      el('span', {}, [ el('b', { class: 'lg-icon', text: '⊘' }), el('span', { text: ' mark the whole row Not Tested' }) ]),
      el('span', {}, [ el('b', { class: 'lg-icon', text: '✕' }), el('span', { text: ' remove the row' }) ])
    ]);
    wrap.appendChild(legend);

    const body = el('div');
    wrap.appendChild(body);

    function hasData(k) {
      return Object.keys(store.grid[k] || {}).some(id =>
        Object.keys(store.grid[k][id] || {}).some(c => {
          const v = store.grid[k][id][c];
          return v && v.v !== '' && v.v !== undefined;
        }));
    }

    function cellState(itemId, colKey) {
      store.grid[key][itemId] = store.grid[key][itemId] || {};
      store.grid[key][itemId][colKey] = store.grid[key][itemId][colKey] || { v: '', nt: false, reason: '' };
      return store.grid[key][itemId][colKey];
    }

    /* --- one measurement cell (value OR Not-Tested + reason) ------------ */
    function measureCell(item, col) {
      const st = cellState(item.id, col.key);
      const c = el('div', { class: 'mcell' + (st.nt ? ' nt' : ''), 'data-item': item.id, 'data-col': col.key });

      let input;
      if (col.type === 'select') {
        input = el('select', { class: 'grade' }, [ el('option', { value: '', text: '—' }) ]
          .concat(col.options.map(o => el('option', { value: o, text: o + (col.suffix || '') }))));
        input.value = st.v;
        c.appendChild(input);
      } else {
        const deg = CFG.romMode === 'degrees' && item.norm;
        const max = deg ? Math.max(item.norm[1] + 40, 60) : col.max;
        const min = (deg && item.neg) ? -40 : col.min;
        const si = suffixInput(col.suffix, { min: min, max: max, placeholder: '—' });
        input = $('input', si);
        input.value = st.v;
        c.appendChild(si);
      }
      input.addEventListener('input', () => {
        st.v = input.value;
        if (col.type !== 'select' && item.norm && CFG.romMode === 'degrees') {
          const v = parseFloat(input.value);
          const lo = item.neg ? -40 : item.norm[0];
          input.classList.toggle('out-of-range', !isNaN(v) && (v > item.norm[1] || v < lo));
        }
        c.classList.remove('missing');
        bus.emit('change');
      });
      input.addEventListener('change', () => bus.emit('change'));

      const reason = el('select', { class: 'nt-reason', title: 'Why could this measurement not be taken?' },
        [ el('option', { value: '', text: 'Not tested — why?' }) ]
        .concat(CFG.ntReasons.map(r => el('option', { value: r, text: r }))));
      reason.value = st.reason;
      reason.addEventListener('change', () => { st.reason = reason.value; reason.classList.remove('needs-reason'); bus.emit('change'); });
      c.appendChild(reason);

      const nt = el('button', {
        class: 'nt-btn', type: 'button', text: 'NT',
        title: 'NT = Not Tested.\nUse this when the measurement could not be taken — the child would not cooperate, ' +
               'pain limited it, a contracture blocked it, the limb is in a cast, or the side is unaffected.\n' +
               'You then choose a reason instead of entering a value. Click again to go back to entering a value.'
      });
      nt.addEventListener('click', () => {
        st.nt = !st.nt;
        c.classList.toggle('nt', st.nt);
        nt.setAttribute('aria-pressed', st.nt);
        if (st.nt) { st.v = ''; input.value = ''; if (!st.reason) reason.classList.add('needs-reason'); }
        bus.emit('change');
      });
      c.appendChild(nt);

      /* previous-value ghost for re-assessment comparison (C16) */
      const prev = (window.DEMO.previous[key] || {})[item.id];
      if (store.compare && prev && prev[col.key] !== undefined) {
        c.appendChild(el('span', { class: 'prev', title: 'Previous: ' + window.DEMO.previous.date, text: '◂ ' + prev[col.key] }));
      }
      return c;
    }

    /* --- render ---------------------------------------------------------- */
    function render() {
      count.textContent = store.selected[key].length + ' selected';
      body.innerHTML = '';
      const items = spec.catalogue.filter(i => store.selected[key].includes(i.id));

      if (!items.length) {
        body.appendChild(el('div', { class: 'grid-empty' }, [
          el('b', { text: 'Nothing selected yet' }),
          el('span', { html: 'Use <b>Select ' + spec.noun + '</b> or a quick-load preset above. Only what you select is loaded — you never scroll past rows you did not test.' })
        ]));
        bus.emit('change');
        return;
      }

      const table = el('table', { class: 'dgrid' });
      /* two-row header: grouped L / R columns */
      const thead = el('thead');
      const hasGroups = spec.columns.some(c => c.group);
      const r1 = el('tr'), r2 = el('tr');
      r1.appendChild(el('th', { class: 'rowname', rowspan: hasGroups ? 2 : 1, text: spec.rowHeader }));
      let i = 0;
      while (i < spec.columns.length) {
        const col = spec.columns[i];
        if (col.group) {
          let n = 1;
          while (i + n < spec.columns.length && spec.columns[i + n].group === col.group) n++;
          r1.appendChild(el('th', { class: 'grp', colspan: n, text: col.group }));
          for (let k = 0; k < n; k++) r2.appendChild(el('th', { text: spec.columns[i + k].label }));
          i += n;
        } else {
          r1.appendChild(el('th', { rowspan: hasGroups ? 2 : 1, text: col.label, style: col.width ? 'min-width:' + col.width : '' }));
          i++;
        }
      }
      r1.appendChild(el('th', { rowspan: hasGroups ? 2 : 1, text: '' }));
      thead.appendChild(r1);
      if (hasGroups) thead.appendChild(r2);
      table.appendChild(thead);

      const tbody = el('tbody');
      let lastRegion = null;
      items.forEach(item => {
        if (item.region !== lastRegion) {
          lastRegion = item.region;
          const rr = el('tr', { class: 'region-row' });
          rr.appendChild(el('td', { colspan: spec.columns.length + 2, text: item.region }));
          tbody.appendChild(rr);
        }
        const tr = el('tr', { 'data-item': item.id });
        const nameCell = el('td', { class: 'rowname' }, [ el('span', { text: item.label }) ]);
        if (item.norm && CFG.romMode === 'degrees')
          nameCell.appendChild(el('small', { text: normLabel(item) }));
        tr.appendChild(nameCell);

        spec.columns.forEach(col => {
          const td = el('td');
          if (col.type === 'pain') {
            td.appendChild(painCell(item));
          } else if (col.type === 'text') {
            const inp = el('input', { type: 'text', placeholder: '—' });
            const st = cellState(item.id, col.key);
            inp.value = st.v;
            inp.addEventListener('input', () => { st.v = inp.value; bus.emit('change'); });
            td.appendChild(inp);
          } else {
            td.appendChild(measureCell(item, col));
          }
          tr.appendChild(td);
        });

        const tools = el('td', {}, [ el('div', { class: 'row-tools' }) ]);
        const tl = $('.row-tools', tools);
        if (spec.columns.filter(c => c.side === 'L').length) {
          tl.appendChild(el('button', {
            class: 'icon-btn', type: 'button', title: 'Copy left values to right', text: '⇄',
            onclick: () => {
              spec.columns.filter(c => c.side === 'L').forEach(c => {
                const twin = spec.columns.find(x => x.side === 'R' && x.pair === c.pair);
                if (!twin) return;
                const a = cellState(item.id, c.key), b = cellState(item.id, twin.key);
                b.v = a.v; b.nt = a.nt; b.reason = a.reason;
              });
              render();
            }
          }));
        }
        tl.appendChild(el('button', {
          class: 'icon-btn', type: 'button', title: 'Mark the whole row Not Tested', text: '⊘',
          onclick: () => {
            spec.columns.filter(c => c.type === 'measure' || c.type === 'select').forEach(c => {
              const st = cellState(item.id, c.key); st.nt = true; st.v = '';
            });
            render();
          }
        }));
        tl.appendChild(el('button', {
          class: 'icon-btn del', type: 'button', title: 'Remove this row', text: '✕',
          onclick: () => {
            const dirty = Object.values(store.grid[key][item.id] || {}).some(c => c.v || c.nt);
            if (dirty && !confirm('"' + item.label + '" has data entered. Removing it discards those measurements. Continue?')) return;
            store.selected[key] = store.selected[key].filter(x => x !== item.id);
            delete store.grid[key][item.id];
            render();
          }
        }));
        tr.appendChild(tools);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      body.appendChild(el('div', { class: 'grid-wrap' }, [ table ]));
      bus.emit('change');
    }

    spec.render = render;
    render();
    return spec;
  }

  /* ---------- pain cell (C10) — age-appropriate scale --------------------- */
  function painCell(item) {
    const age = ageFromDob(window.DEMO.patient.dob).months;
    const scale = CFG.painScales.find(s => age <= s.maxAgeMonths);
    const w = el('div', { style: 'display:flex;align-items:center;gap:6px' });
    const cb = el('input', { type: 'checkbox', title: 'Pain reported during this movement' });
    const sel = el('select', { style: 'display:none;min-width:64px;padding:4px' },
      [ el('option', { value: '', text: '—' }) ].concat(
        Array.from({ length: 11 }, (_, i) => el('option', { value: i, text: String(i) }))));
    cb.addEventListener('change', () => {
      sel.style.display = cb.checked ? '' : 'none';
      sel.title = scale.label + ' — ' + scale.note;
      bus.emit('change');
    });
    w.appendChild(cb);
    w.appendChild(sel);
    w.appendChild(el('span', { class: 'hint', style: 'font-size:9.5px', text: scale.id.toUpperCase() }));
    return w;
  }

  /* ==========================================================================
     COMPONENT 6 — data chipset (allergies, diagnoses, goals)
     ========================================================================== */
  function chipset(mount, arr, opts) {
    const host = typeof mount === 'string' ? $(mount) : mount;
    if (!host) return;
    function draw() {
      host.innerHTML = '';
      if (!arr.length) host.appendChild(el('span', { class: 'hint', text: opts.empty || 'None recorded' }));
      arr.forEach((a, idx) => {
        const chip = el('div', { class: 'dchip ' + (opts.sevClass ? opts.sevClass(a) : ''), title: opts.title ? opts.title(a) : '' });
        chip.appendChild(el('span', { text: opts.label(a) }));
        chip.appendChild(el('span', {
          class: 'x', text: '×',
          onclick: () => { if (confirm('Remove "' + opts.label(a) + '"?')) { arr.splice(idx, 1); draw(); bus.emit('change'); } }
        }));
        host.appendChild(chip);
      });
      host.appendChild(el('button', { class: 'btn sm', type: 'button', text: opts.addLabel || '+ Add', onclick: opts.onAdd }));
    }
    opts.redraw = draw;
    draw();
    return { redraw: draw };
  }

  /* ==========================================================================
     COMPONENT 7 — repeater rows (surgical history, goals, previous physio)
     ========================================================================== */
  function repeater(mount, cols, arr, addLabel) {
    const host = typeof mount === 'string' ? $(mount) : mount;
    if (!host) return;
    function draw() {
      host.innerHTML = '';
      arr.forEach((row, i) => {
        const r = el('div', { class: 'rep-row', style: 'grid-template-columns:' + cols.map(c => c.w || '1fr').join(' ') + ' auto' });
        cols.forEach(c => {
          const f = el('div', { class: 'field' }, [ el('label', { text: c.label }) ]);
          let inp;
          if (c.type === 'select') inp = el('select', {}, [ el('option', { value: '', text: '—' }) ].concat(c.options.map(o => el('option', { value: o, text: o }))));
          else inp = el('input', { type: c.type || 'text', placeholder: c.ph || '' });
          inp.value = row[c.key] || '';
          inp.addEventListener('input', () => { row[c.key] = inp.value; bus.emit('change'); });
          inp.addEventListener('change', () => { row[c.key] = inp.value; bus.emit('change'); });
          f.appendChild(inp);
          r.appendChild(f);
        });
        r.appendChild(el('button', { class: 'icon-btn del rm', type: 'button', text: '✕', title: 'Remove row', onclick: () => { arr.splice(i, 1); draw(); bus.emit('change'); } }));
        host.appendChild(r);
      });
      host.appendChild(el('button', { class: 'btn sm', type: 'button', text: addLabel, onclick: () => { arr.push({}); draw(); } }));
    }
    draw();
    return { redraw: draw };
  }

  /* ==========================================================================
     COMPONENT 8 — reference table (MAS / MRC), collapsed by default
     ========================================================================== */
  function refTable(mount, scale) {
    const host = $(mount);
    if (!host) return;
    const d = el('details', { class: 'ref' });
    d.appendChild(el('summary', { text: 'Reference — ' + scale.name + ' (tap to expand)' }));
    const t = el('table', { class: 'ref-tbl' });
    t.appendChild(el('thead', {}, [ el('tr', {}, [ el('th', { text: 'Grade' }), el('th', { text: 'Description' }) ]) ]));
    const tb = el('tbody');
    scale.rows.forEach(r => tb.appendChild(el('tr', {}, [ el('td', { text: r[0] }), el('td', { text: r[1] }) ])));
    t.appendChild(tb);
    d.appendChild(t);
    host.appendChild(d);
  }

  /* ==========================================================================
     COMPONENT 9 — application shell (module rail + app bar)
     Mirrors the existing Tranzlo OPD chrome so the prototype reads as part of
     the product rather than a separate mock-up.
     ========================================================================== */
  const MODULES = [
    ['🏠', '', 'home'], ['⭐', '', 'fav'], ['🛡', 'IAM'], ['🏢', 'ORG'], ['🧾', 'FAS'],
    ['📦', 'IMS'], ['🛒', 'PMS'], ['📊', 'SMS'], ['🧪', 'HRM'], ['🗂', 'AMS'],
    ['💳', 'PAY'], ['💰', 'BMS'], ['🏥', 'OPD'], ['🔬', 'LAB'], ['📷', 'RAD'],
    ['👥', 'PRMS'], ['🦿', 'REH']
  ];
  function shell(opts) {
    opts = opts || {};
    const side = el('nav', { class: 'side' });
    MODULES.forEach(m => {
      const a = el('a', { href: opts.home || 'index.html', title: m[1] || m[2], class: m[1] === opts.active ? 'on' : '' });
      a.appendChild(el('span', { class: 'ico', text: m[0] }));
      if (m[1]) a.appendChild(el('span', { text: m[1] }));
      side.appendChild(a);
      if (m[2] === 'fav') side.appendChild(el('div', { class: 'sep' }));
    });

    const bar = el('div', { class: 'appbar' });
    bar.appendChild(el('span', { class: 'brand', text: 'Tranzlo' }));
    bar.appendChild(el('span', { class: 'spacer' }));
    (opts.links || []).forEach(l =>
      bar.appendChild(el('a', { class: 'lnk' + (l.solid ? ' solid' : ''), href: l.href, text: l.text })));
    bar.appendChild(el('span', { class: 'goto', html: 'Go to… <kbd>⌘K</kbd>' }));
    bar.appendChild(el('span', { class: 'company', html: '<i>Company</i>Karachi Institute of Ne…' }));
    bar.appendChild(el('span', { class: 'icobtn', text: '🌙' }));
    bar.appendChild(el('span', { class: 'usr', text: 'Mr. Administrator' }));

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.insertBefore(side, document.body.firstChild);
  }

  /* ==========================================================================
     COMPONENT 10 — patient header card + precaution banner (C06)
     ========================================================================== */
  function patientHeader(mount, opts) {
    const host = $(mount);
    if (!host) return;
    const p = window.DEMO.patient, v = window.DEMO.vitals, r = window.DEMO.referral;
    const a = ageFromDob(p.dob);

    const card = el('div', { class: 'pcard' });

    const r1 = el('div', { class: 'prow1' }, [
      el('span', { class: 'pname', text: p.name }),
      el('span', { class: 'badge mr', text: p.mrn }),
      el('span', { class: 'badge trg', text: r.priority + ' referral' }),
      el('span', { class: 'status-pill badge', id: 'statusPill',
        style: 'background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber-line)', text: 'Draft' }),
      el('div', { class: 'pmeta', html:
        'Referred By: <b>' + r.by + '</b><br>Referred At: <b>' + fmtDate(r.date) + ' at ' + window.DEMO.visit.time + '</b>' })
    ]);
    card.appendChild(r1);

    const r2 = el('div', { class: 'prow2' });
    [['⚥', p.sex], ['🎂', a.label], ['📞', p.contact], ['🏥', window.DEMO.visit.clinic]]
      .forEach(c => r2.appendChild(el('span', { class: 'pchip', html: '<span class="ic">' + c[0] + '</span>' + c[1] })));
    [['HR', v.hr, '/min'], ['RR', v.rr, '/min'], ['Temp', v.temp, '°C'], ['SpO₂', v.spo2, '%'],
     ['BP', v.bp, ''], ['Wt', v.weight, 'kg']]
      .forEach(x => r2.appendChild(el('span', { class: 'pchip', html: '<span class="ic">' + x[0] + '</span><b>' + x[1] + '</b>' + x[2] })));
    card.appendChild(r2);

    const r3 = el('div', { class: 'prow3' });
    (opts && opts.actions ? opts.actions : []).forEach(b => r3.appendChild(b));
    card.appendChild(r3);
    host.appendChild(card);

    host.appendChild(el('div', { class: 'precaution-banner empty sticky', id: 'precBanner' }, [
      el('span', { class: 'pb-label', html: '⚠ Active precautions' }),
      el('div', { class: 'pb-items', id: 'precItems' }),
      el('span', { class: 'hint', style: 'margin-left:auto', text: 'Follows you down the page and onto the printed record' })
    ]));
  }

  function refreshPrecautions() {
    const banner = $('#precBanner'), items = $('#precItems');
    if (!banner) return;
    const on = getPills('#precautions').filter(v => v !== 'none');
    items.innerHTML = '';
    on.forEach(v => {
      const def = CFG.options.precautions.find(o => o.v === v);
      const detail = $('[data-detail="precautions.' + v + '"]');
      const chip = el('span', { class: 'pb-chip', text: def.t });
      if (detail && detail.value) chip.appendChild(el('small', { text: detail.value }));
      items.appendChild(chip);
    });
    banner.classList.toggle('empty', on.length === 0);
  }

  /* ---------- misc -------------------------------------------------------- */
  function fmtDate(iso) {
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(iso);
    return String(d.getDate()).padStart(2, '0') + '-' + m[d.getMonth()] + '-' + d.getFullYear();
  }

  /* ---------- micro event bus -------------------------------------------- */
  const bus = {
    h: {},
    on(e, f) { (this.h[e] = this.h[e] || []).push(f); },
    emit(e, d) { (this.h[e] || []).forEach(f => f(d)); }
  };

  return { $, $$, el, store, bus, ageFromDob, fmtDate, pills, getPills, suffixInput,
           milestone, openPicker, buildGrid, chipset, repeater, refTable,
           shell, patientHeader, refreshPrecautions };
})();
