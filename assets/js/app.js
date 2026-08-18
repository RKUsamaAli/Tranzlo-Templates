/* ==========================================================================
   app.js — wires the assessment screen together.
   ========================================================================== */
(function () {
  const { $, $$, el, store, bus } = UI;
  const CFG = window.CFG, DEMO = window.DEMO;
  const age = UI.ageFromDob(DEMO.patient.dob);

  /* =======================================================================
     Patient header + precaution banner
     ======================================================================= */
  UI.patientHeader('#patientBar');

  /* =======================================================================
     Section 1 — inherited demographic cards
     ======================================================================= */
  function inheritedCard(source, label, value, multi) {
    return el('div', { class: 'inherited' }, [
      el('div', { class: 'src' }, [
        el('span', { class: 'dot' }), el('span', { text: source }),
        el('span', { class: 'amend', text: 'Request amendment', onclick: () =>
          alert('An amendment request would be sent to ' + source + '.\n\nThe original value is never overwritten by this department — the change is recorded as a dated addendum with an audit trail.') })
      ]),
      el('div', { class: 'lbl', style: 'margin-bottom:3px', text: label }),
      el('div', { class: 'val' + (multi ? ' multi' : ''), text: value })
    ]);
  }

  const p = DEMO.patient, v = DEMO.visit, vt = DEMO.vitals;
  const invP = $('#inheritedPatient');
  [['Registration', 'MRN', p.mrn], ['Registration', 'Patient name', p.name],
   ['Registration', 'Date of birth / age', UI.fmtDate(p.dob) + '  (' + age.label + ')'],
   ['Registration', 'Sex', p.sex], ['Registration', 'Guardian', p.guardian],
   ['Registration', 'Contact', p.contact],
   ['Visit', 'Visit no.', v.no], ['Visit', 'Visit date', UI.fmtDate(v.date) + ' ' + v.time],
   ['Visit', 'Referred from', DEMO.referral.from + ' — ' + DEMO.referral.by]
  ].forEach(r => invP.appendChild(inheritedCard(r[0], r[1], r[2])));

  /* =======================================================================
     Section 2 — inherited OPD fields, chipsets, precautions
     ======================================================================= */
  const invO = $('#inheritedOpd');
  const opdSrc = 'OPD — ' + DEMO.opd.consultant + ', ' + UI.fmtDate(DEMO.opd.date);
  invO.appendChild(inheritedCard(opdSrc, 'Primary diagnosis', DEMO.opd.primaryDiagnosis));
  invO.appendChild(inheritedCard(opdSrc, 'Relevant medical history', DEMO.opd.relevantHistory, true));

  store.secondaryDx = [{ name: 'Equinus deformity, bilateral', code: 'M21.6' }];
  const dxOpts = {
    label: d => d.name + (d.code ? ' · ' + d.code : ''),
    addLabel: '+ Add diagnosis', empty: 'None recorded',
    onAdd: () => {
      const n = prompt('Diagnosis (in the production system this is an ICD-10 code search):');
      if (!n) return;
      store.secondaryDx.push({ name: n, code: '' });
      dxOpts.redraw();
    }
  };
  UI.chipset('#secondaryDx', store.secondaryDx, dxOpts);

  store.surgeries = [];
  UI.repeater('#surgeries', [
    { key: 'proc', label: 'Procedure', w: '2fr', ph: 'e.g. Bilateral adductor tenotomy' },
    { key: 'date', label: 'Date', type: 'date', w: '1fr' },
    { key: 'place', label: 'Hospital / surgeon', w: '1.5fr' }
  ], store.surgeries, '+ Add surgery');

  store.allergies = DEMO.allergies.slice();
  const allergyOpts = {
    label: a => a.name + ' — ' + a.reaction,
    title: a => a.severity + ' · recorded ' + a.recordedBy,
    sevClass: a => a.severity === 'Severe' ? 'sev-high' : a.severity === 'Moderate' ? 'sev-med' : 'sev-low',
    addLabel: '+ Add allergy', empty: 'No known allergies',
    onAdd: () => {
      const n = prompt('Allergen:'); if (!n) return;
      const r = prompt('Reaction:') || '—';
      const s = prompt('Severity — Mild / Moderate / Severe:') || 'Mild';
      store.allergies.push({ name: n, reaction: r, severity: s, recordedBy: 'Rehab, today' });
      allergyOpts.redraw();
      alert('Recorded on the PATIENT record.\n\nThis allergy is now visible to OPD, the ward and pharmacy — not only to this assessment.');
    }
  };
  UI.chipset('#allergies', store.allergies, allergyOpts);

  UI.pills('#precautions', CFG.options.precautions, 'precautions', { onChange: UI.refreshPrecautions });
  $$('#precautions ~ .pill-details input').forEach(i => i.addEventListener('input', UI.refreshPrecautions));
  DEMO.precautions.forEach(v => {
    const inp = $('#precautions input[value="' + v + '"]');
    if (inp) { inp.checked = true; inp.closest('.pill').classList.add('on'); }
  });
  UI.refreshPrecautions();

  /* =======================================================================
     Section 3 — birth + milestones
     ======================================================================= */
  $('#gaWeeks').appendChild(UI.suffixInput('wks', { min: 22, max: 44, 'data-field': 'gaWeeks', placeholder: '—' }));
  $('#gaDays').appendChild(UI.suffixInput('days', { min: 0, max: 6, 'data-field': 'gaDays', placeholder: '—' }));
  $('#birthWeight').appendChild(UI.suffixInput('kg', { min: 0, max: 8, step: '0.01', 'data-field': 'birthWeight', placeholder: '—' }));
  $('#birthHc').appendChild(UI.suffixInput('cm', { min: 0, max: 60, step: '0.1', 'data-field': 'birthHc', placeholder: '—' }));
  $('#nicuDays').appendChild(UI.suffixInput('days', { min: 0, max: 365, 'data-field': 'nicuDays', placeholder: '—' }));
  $('#ventDays').appendChild(UI.suffixInput('days', { min: 0, max: 365, 'data-field': 'ventDays', placeholder: '—' }));

  const dm = $('#deliveryMode');
  CFG.options.deliveryMode.forEach(o => {
    const lab = el('label', {}, [ el('input', { type: 'radio', name: 'deliveryMode', value: o }), el('span', { text: o }) ]);
    $('input', lab).addEventListener('change', () => {
      $$('#deliveryMode label').forEach(l => l.classList.add('unchecked'));
      lab.classList.remove('unchecked');
      bus.emit('change');
    });
    lab.classList.add('unchecked');
    dm.appendChild(lab);
  });

  UI.pills('#birthComplications', CFG.options.birthComplications, 'birthComplications');

  const msHost = $('#milestones');
  CFG.milestones.forEach(m => {
    const box = el('div', { class: 'field' });
    msHost.appendChild(box);
    UI.milestone(box, m, age.months);
  });

  /* =======================================================================
     Section 4 — complaint, factors, goals
     ======================================================================= */
  UI.pills('#complaintPills', CFG.options.complaintSuggestions.map(t => ({ v: t, t: t })), 'complaintTags');
  UI.pills('#aggravatingPills', CFG.options.factorSuggestions.map(t => ({ v: t, t: t })), 'aggravatingTags');
  UI.pills('#relievingPills', CFG.options.factorSuggestions.map(t => ({ v: t, t: t })), 'relievingTags');

  store.goals = [{}];
  UI.repeater('#goals', [
    { key: 'goal', label: 'Goal (in the family’s words)', w: '3fr', ph: 'e.g. wants him to walk to the toilet on his own' },
    { key: 'priority', label: 'Priority', type: 'select', options: CFG.options.goalPriority, w: '1fr' }
  ], store.goals, '+ Add goal');

  $('#prevPhysio').addEventListener('change', e => {
    $$('.prev-physio').forEach(f => f.style.display = e.target.value === 'yes' ? '' : 'none');
    bus.emit('change');
  });

  const onsetEl = $('[data-field="onsetDate"]');
  onsetEl.addEventListener('change', () => {
    if (!onsetEl.value) return;
    const d = new Date(onsetEl.value), n = new Date();
    let m = (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth());
    $('[data-field="duration"]').value = m >= 12 ? Math.floor(m / 12) + ' yr ' + (m % 12) + ' mo' : m + ' months';
    bus.emit('change');
  });

  /* =======================================================================
     Section 5 — systems review
     ======================================================================= */
  UI.pills('#respiratory',    CFG.options.respiratory,    'respiratory');
  UI.pills('#consciousness',  CFG.options.consciousness,  'consciousness', { single: true });
  UI.pills('#neuroFindings',  CFG.options.neuroFindings,  'neuroFindings', { onChange: syncToneFromScreen });
  UI.pills('#skin',           CFG.options.skin,           'skin');
  UI.pills('#feeding',        CFG.options.feeding,        'feeding');
  UI.pills('#visionHearing',  CFG.options.visionHearing,  'visionHearing');

  /* =======================================================================
     Section 6 — pain (age-driven scale)
     ======================================================================= */
  const scale = CFG.painScales.find(s => age.months <= s.maxAgeMonths);
  $('#ageEcho').textContent = age.label;
  $('#scaleEcho').textContent = scale.label;
  $('#painInstrument').value = scale.label;
  $('#painScore').appendChild(UI.suffixInput('/10', { min: 0, max: 10, 'data-field': 'painScore', placeholder: '—' }));
  $('#painPresent').addEventListener('change', e => {
    $$('.pain-detail').forEach(f => f.style.display = e.target.value === 'yes' ? '' : 'none');
    bus.emit('change');
  });

  /* =======================================================================
     Section 7 — anthropometry (inherited + physio-owned)
     ======================================================================= */
  const an = $('#anthro');
  an.appendChild(inheritedCard('Vital Signs — ' + vt.recordedBy, 'Weight', vt.weight + ' kg'));
  an.appendChild(inheritedCard('Vital Signs', 'Height / length', vt.height + ' cm'));
  an.appendChild(inheritedCard('Vital Signs', 'Head circumference', vt.headCirc + ' cm'));
  an.appendChild(el('div', { class: 'field' }, [ el('label', { text: 'BMI (calculated)' }),
    el('input', { type: 'text', readonly: 'readonly', style: 'background:#f7fafb',
      value: (vt.weight / Math.pow(vt.height / 100, 2)).toFixed(1) }) ]));
  [['limbL', 'True leg length — Left', 'cm'], ['limbR', 'True leg length — Right', 'cm'],
   ['girthL', 'Thigh girth — Left', 'cm'], ['girthR', 'Thigh girth — Right', 'cm']
  ].forEach(f => {
    const box = el('div', { class: 'field' }, [ el('label', { text: f[1] }) ]);
    box.appendChild(UI.suffixInput(f[2], { min: 0, step: '0.1', 'data-field': f[0], placeholder: '—' }));
    an.appendChild(box);
  });

  /* =======================================================================
     Sections 8 & 9 — simple draft grids
     ======================================================================= */
  function simpleGrid(mount, rows, opts, header) {
    const t = el('table', { class: 'dgrid' });
    t.appendChild(el('thead', {}, [ el('tr', {}, [
      el('th', { class: 'rowname', text: header }),
      el('th', { text: 'Left' }), el('th', { text: 'Right' }), el('th', { text: 'Notes' }) ]) ]));
    const tb = el('tbody');
    rows.forEach(r => {
      const tr = el('tr', {}, [ el('td', { class: 'rowname', text: r }) ]);
      ['l', 'r'].forEach(() => tr.appendChild(el('td', {}, [
        el('select', {}, [ el('option', { value: '', text: '—' }) ].concat(opts.map(o => el('option', { value: o, text: o })))) ])));
      tr.appendChild(el('td', {}, [ el('input', { type: 'text', placeholder: '—' }) ]));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    $(mount).appendChild(el('div', { class: 'grid-wrap' }, [ t ]));
  }
  simpleGrid('#primitiveReflexes', ['ATNR', 'STNR', 'TLR', 'Moro', 'Palmar grasp', 'Plantar grasp'],
    ['Integrated', 'Present', 'Obligatory', 'Not tested'], 'Reflex');
  simpleGrid('#posturalReactions', ['Head righting', 'Protective extension — forward', 'Protective extension — sideways',
    'Protective extension — backward', 'Equilibrium in sitting', 'Equilibrium in standing'],
    ['Present', 'Emerging', 'Absent', 'Not tested'], 'Reaction');

  const sens = $('#sensory');
  ['Light touch', 'Pain / temperature', 'Proprioception', 'Stereognosis'].forEach(s => {
    sens.appendChild(el('div', { class: 'field' }, [ el('label', { text: s }),
      el('select', {}, [ el('option', { value: '', text: 'Select…' }) ]
        .concat(['Intact', 'Impaired', 'Absent', 'Unable to test'].map(o => el('option', { value: o, text: o })))) ]));
  });

  /* =======================================================================
     Sections 10 / 11 / 12 — reference tables and dynamic grids
     ======================================================================= */
  UI.refTable('#masRef', CFG.scales.mas);
  UI.refTable('#mrcRef', CFG.scales.mrc);
  if (CFG.romMode === 'graded') UI.refTable('#romRef', CFG.scales.romGraded);

  const toneGrid = UI.buildGrid({
    mount: '#grid-tone', key: 'tone', noun: 'muscle groups',
    pickerTitle: 'Select muscle groups to grade (Modified Ashworth)',
    catalogue: CFG.toneCatalogue, presets: CFG.presets.tone, rowHeader: 'Muscle group',
    columns: [
      { key: 'l', label: 'Left',  group: 'MAS GRADE', type: 'select', options: CFG.scales.mas.options, side: 'L', pair: 'mas' },
      { key: 'r', label: 'Right', group: 'MAS GRADE', type: 'select', options: CFG.scales.mas.options, side: 'R', pair: 'mas' },
      { key: 'notes', label: 'Notes', type: 'text', width: '200px' }
    ]
  });

  const romCols = CFG.romMode === 'degrees'
    ? [ { key: 'lp', label: 'PROM', group: 'LEFT',  type: 'measure', suffix: '°', min: 0, max: 200, side: 'L', pair: 'p' },
        { key: 'la', label: 'AROM', group: 'LEFT',  type: 'measure', suffix: '°', min: 0, max: 200, side: 'L', pair: 'a' },
        { key: 'rp', label: 'PROM', group: 'RIGHT', type: 'measure', suffix: '°', min: 0, max: 200, side: 'R', pair: 'p' },
        { key: 'ra', label: 'AROM', group: 'RIGHT', type: 'measure', suffix: '°', min: 0, max: 200, side: 'R', pair: 'a' } ]
    : [ { key: 'lp', label: 'PROM', group: 'LEFT',  type: 'select', options: CFG.scales.romGraded.options, suffix: '/4', side: 'L', pair: 'p' },
        { key: 'la', label: 'AROM', group: 'LEFT',  type: 'select', options: CFG.scales.romGraded.options, suffix: '/4', side: 'L', pair: 'a' },
        { key: 'rp', label: 'PROM', group: 'RIGHT', type: 'select', options: CFG.scales.romGraded.options, suffix: '/4', side: 'R', pair: 'p' },
        { key: 'ra', label: 'AROM', group: 'RIGHT', type: 'select', options: CFG.scales.romGraded.options, suffix: '/4', side: 'R', pair: 'a' } ];

  const romGrid = UI.buildGrid({
    mount: '#grid-rom', key: 'rom', noun: 'motions',
    pickerTitle: 'Select the motions you tested',
    catalogue: CFG.romCatalogue, presets: CFG.presets.rom, rowHeader: 'Joint / motion',
    columns: romCols.concat([
      { key: 'pain', label: 'Pain', type: 'pain' },
      { key: 'notes', label: 'Notes', type: 'text', width: '180px' }
    ])
  });

  const strengthGrid = UI.buildGrid({
    mount: '#grid-strength', key: 'strength', noun: 'muscle groups',
    pickerTitle: 'Select the muscle groups you tested',
    catalogue: CFG.strengthCatalogue, presets: CFG.presets.strength, rowHeader: 'Muscle group',
    columns: [
      { key: 'l', label: 'Left',  group: 'MRC GRADE', type: 'select', options: CFG.scales.mrc.options, suffix: '/5', side: 'L', pair: 'g' },
      { key: 'r', label: 'Right', group: 'MRC GRADE', type: 'select', options: CFG.scales.mrc.options, suffix: '/5', side: 'R', pair: 'g' },
      { key: 'notes', label: 'Notes', type: 'text', width: '220px' }
    ]
  });

  /* ---- section 10 general tone, with prefill + conflict check (C08) ----- */
  UI.pills('#overallTone',    CFG.options.overallTone,    'overallTone', { onChange: checkToneConflict });
  UI.pills('#postureLying',   CFG.options.postureLying,   'postureLying');
  UI.pills('#postureSitting', CFG.options.postureSitting, 'postureSitting');

  function syncToneFromScreen() {
    const screen = UI.getPills('#neuroFindings');
    const map = { hypotonia: 'hypotonia', hypertonia: 'hypertonia', spasticity: 'hypertonia', none: 'normal' };
    const target = screen.map(s => map[s]).filter(Boolean)[0];
    if (!target) return;
    const inp = $('#overallTone input[value="' + target + '"]');
    if (inp && !UI.getPills('#overallTone').length) {
      inp.checked = true; inp.closest('.pill').classList.add('on');
    }
    checkToneConflict();
  }
  function checkToneConflict() {
    const box = $('#toneConflict');
    const screen = UI.getPills('#neuroFindings'), detail = UI.getPills('#overallTone');
    if (!screen.length || !detail.length) { box.style.display = 'none'; return; }
    const conflict =
      (screen.includes('hypotonia') && detail.includes('hypertonia')) ||
      (screen.includes('hypertonia') && detail.includes('hypotonia')) ||
      (screen.includes('none') && !detail.includes('normal'));
    box.style.display = conflict ? '' : 'none';
    if (conflict) box.innerHTML = '<b>This differs from your Systems Review answer.</b> Section 5 recorded &ldquo;' +
      screen.join(', ') + '&rdquo;. This section is the source of truth, so the record will use what you enter here — but please confirm section 5 is still correct.';
  }

  /* =======================================================================
     Navigation rail
     ======================================================================= */
  const order = ['1','2','3','4','5','6','7','8','9','10','11','12','13','99'];
  let current = '1';
  function show(sec) {
    current = sec;
    $$('.section').forEach(s => s.classList.remove('active'));
    const target = $('#sec-' + sec);
    if (target) target.classList.add('active');
    $$('.rail-item').forEach(r => r.classList.toggle('active', r.dataset.sec === sec));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const i = order.indexOf(sec);
    $('#btnPrev').disabled = i <= 0;
    $('#btnNext').disabled = i >= order.length - 1;
  }
  $$('.rail-item').forEach(r => r.addEventListener('click', () => show(r.dataset.sec)));
  $('#btnPrev').addEventListener('click', () => show(order[Math.max(0, order.indexOf(current) - 1)]));
  $('#btnNext').addEventListener('click', () => show(order[Math.min(order.length - 1, order.indexOf(current) + 1)]));
  show('1');

  /* =======================================================================
     Validation  (C04 / C12)
     ======================================================================= */
  const gridSpecs = { tone: toneGrid, rom: romGrid, strength: strengthGrid };
  const gridSection = { tone: '10', rom: '11', strength: '12' };
  const gridLabel = { tone: 'Muscle tone', rom: 'Range of motion', strength: 'Muscle strength' };

  function gridIssues(key) {
    const spec = gridSpecs[key], out = [];
    spec.catalogue.filter(i => store.selected[key].includes(i.id)).forEach(item => {
      spec.columns.filter(c => c.type === 'measure' || c.type === 'select').forEach(col => {
        const st = (store.grid[key][item.id] || {})[col.key] || {};
        if (st.nt && !st.reason) out.push(item.label + ' — ' + (col.group || '') + ' ' + col.label + ': "Not tested" needs a reason');
        else if (!st.nt && (st.v === '' || st.v === undefined)) out.push(item.label + ' — ' + (col.group || '') + ' ' + col.label + ' is empty');
      });
    });
    return out;
  }

  function validate() {
    const issues = [];
    $$('[data-required]').forEach(f => {
      const sec = f.closest('.section').id.replace('sec-', '');
      const ok = f.value && f.value.trim();
      f.classList.toggle('invalid', !ok);
      f.closest('.field').classList.toggle('has-error', !ok);
      if (!ok) issues.push({ sec, msg: (f.closest('.field').querySelector('label').textContent.replace('*', '').trim()) + ' is required', el: f });
    });
    if (!UI.getPills('#precautions').length)
      issues.push({ sec: '2', msg: 'Precautions must be answered — tick "No precautions" if there are none', el: $('#precautions') });
    if (!store.goals.filter(g => g.goal && g.goal.trim()).length)
      issues.push({ sec: '4', msg: 'At least one parent / child goal is required', el: $('#goals') });
    if (UI.getPills('#birthComplications').includes('nicu')) {
      const nd = $('[data-field="nicuDays"]');
      if (!nd.value) issues.push({ sec: '3', msg: 'NICU duration is required when NICU admission is ticked', el: nd });
    }
    if (!UI.getPills('#overallTone').length)
      issues.push({ sec: '10', msg: 'Overall tone is required', el: $('#overallTone') });
    Object.keys(gridSpecs).forEach(k => {
      if (!store.selected[k].length)
        issues.push({ sec: gridSection[k], msg: gridLabel[k] + ': nothing selected — load the groups you tested, or state why this was not assessed' });
      gridIssues(k).forEach(m => issues.push({ sec: gridSection[k], msg: m }));
    });
    return issues;
  }

  function complete() {
    const issues = validate();
    const box = $('#vsummary');
    if (!issues.length) {
      box.classList.remove('show');
      $('#statusPill').textContent = 'Signed';
      $('#statusPill').classList.add('signed');
      alert('Assessment complete and signed.\n\nIn the production system the record now becomes read-only. Any later correction is stored as a dated addendum, not an edit.');
      return;
    }
    box.classList.add('show');
    box.innerHTML = '';
    box.appendChild(el('h4', { text: issues.length + ' item' + (issues.length > 1 ? 's' : '') + ' still outstanding' }));
    const ul = el('ul');
    issues.slice(0, 40).forEach(i => {
      const a = el('a', { text: 'Section ' + i.sec + ' — ' + i.msg });
      a.addEventListener('click', () => {
        show(i.sec);
        if (i.el) setTimeout(() => {
          if (i.el.scrollIntoView) i.el.scrollIntoView({ block: 'center' });
          if (i.el.focus) i.el.focus();
        }, 260);
      });
      ul.appendChild(el('li', {}, [ a ]));
    });
    if (issues.length > 40) ul.appendChild(el('li', { class: 'hint', text: '…and ' + (issues.length - 40) + ' more' }));
    box.appendChild(ul);
    $$('.rail-item').forEach(r => r.classList.toggle('state-error', issues.some(i => i.sec === r.dataset.sec)));
    show(current);
    if (box.scrollIntoView) box.scrollIntoView({ block: 'center' });
  }
  $('#btnComplete').addEventListener('click', complete);
  $('#btnComplete2').addEventListener('click', complete);

  /* =======================================================================
     Section completion state + autosave
     ======================================================================= */
  function sectionFilled(sec) {
    const s = $('#sec-' + sec);
    if (!s) return 0;
    let n = 0;
    $$('input, select, textarea', s).forEach(f => {
      if (f.type === 'checkbox' || f.type === 'radio') { if (f.checked) n++; }
      else if (f.value && !f.readOnly) n++;
    });
    return n;
  }
  let saveTimer = null;
  function refresh() {
    let started = 0;
    ['1','2','3','4','5','6','7','8','9','10','11','12'].forEach(sec => {
      const item = $('.rail-item[data-sec="' + sec + '"]');
      if (!item) return;
      const n = sectionFilled(sec);
      item.classList.remove('state-complete', 'state-partial');
      if (n > 0) { started++; item.classList.add(n > 3 ? 'state-complete' : 'state-partial'); }
    });
    $('#progTxt').textContent = started + ' of 12 sections started';
    $('#progBar').style.width = Math.round(started / 12 * 100) + '%';
    clearTimeout(saveTimer);
    $('#saveMsg').textContent = 'Saving…';
    saveTimer = setTimeout(() => {
      try { localStorage.setItem('rehab-proto-draft', JSON.stringify({ selected: store.selected, grid: store.grid })); } catch (e) {}
      $('#saveMsg').textContent = 'Draft saved automatically';
    }, 700);
  }
  bus.on('change', refresh);
  document.addEventListener('input', refresh);
  document.addEventListener('change', refresh);
  refresh();

  /* =======================================================================
     Toolbar toggles
     ======================================================================= */
  $('#toggleNotes').addEventListener('change', e => document.body.classList.toggle('hide-notes', !e.target.checked));
  $('#toggleCompare').addEventListener('change', e => {
    store.compare = e.target.checked;
    Object.values(gridSpecs).forEach(g => g.render());
    if (e.target.checked && !store.selected.rom.length)
      alert('Comparison is on.\n\nLoad some rows (try the "CP baseline" preset in section 11) and previous values from ' +
            DEMO.previous.date + ' appear beside each cell.');
  });

  /* =======================================================================
     Print preparation (C14) — hide what was never filled
     ======================================================================= */
  window.addEventListener('beforeprint', () => {
    $$('input, select, textarea').forEach(f => {
      if (f.type === 'checkbox' || f.type === 'radio') return;
      const empty = !f.value || !String(f.value).trim();
      f.classList.toggle('is-empty', empty);
      const fld = f.closest('.field');
      if (fld && !fld.querySelector('.pill.on')) {
        const anyFilled = $$('input, select, textarea', fld).some(x =>
          (x.type === 'checkbox' || x.type === 'radio') ? x.checked : (x.value && String(x.value).trim()));
        fld.classList.toggle('is-empty', !anyFilled);
      }
    });
  });
})();
