/* ==========================================================================
   app.js — wires the assessment screen together.
   ========================================================================== */
(function () {
  const { $, $$, el, store, bus } = UI;
  const CFG = window.CFG, DEMO = window.DEMO;
  const age = UI.ageFromDob(DEMO.patient.dob);
  const SET = CFG.settings;
  const hide = (sel) => $$(sel).forEach(e => e.remove());

  /* =======================================================================
     Patient header + precaution banner
     ======================================================================= */
  UI.shell({ active: 'REH' });
  UI.patientHeader('#patientBar', { actions: [
    el('a',      { class: 'btn sm', href: 'journey/referral.html', html: '&#9776; Referral' }),
    el('a',      { class: 'btn sm', href: 'change-notes.html',     html: '&#128203; What we changed' }),
    el('span',   { class: 'spacer' }),
    el('button', { class: 'btn sm purple', type: 'button', html: '&#9670; Refer onward',
                   onclick: () => alert('Onward referral (e.g. to Orthopaedics or Speech Therapy) — not in scope for this round.') }),
    el('button', { class: 'btn sm blue', type: 'button', html: '&#8635; History (1)',
                   onclick: () => alert('Previous assessment: 12-Jul-2026.\n\nSwitch on "Compare with 12-Jul-2026" at the top of the page to see those values beside each measurement.') }),
    el('button', { class: 'btn sm', type: 'button', html: '&#128424; Print', onclick: () => window.print() })
  ]});

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

  /* Patient identity, visit and vitals live in the patient header at the top of
     the page — they are deliberately NOT repeated inside section 1. */
  const p = DEMO.patient, vt = DEMO.vitals;

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

  /* Section 1 — the therapist is whoever is signed in, not a choice (client request) */
  $('#therapistField').value = DEMO.therapist.name + '  ·  ' + DEMO.therapist.licence;

  /* Section 2 — surgical history: free text or structured rows, per setting */
  store.surgeries = [];
  if (SET.surgicalHistoryFormat === 'text') {
    $('#surgeryModeHint').textContent = '— free text (switch to structured rows in settings)';
    $('#surgeries').appendChild(el('textarea', {
      'data-field': 'surgicalHistoryText',
      placeholder: 'e.g. Bilateral adductor tenotomy, Mar 2025, Children\u2019s Hospital Lahore'
    }));
  } else UI.repeater('#surgeries', [
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
  if (!SET.showGestationalAgeDays)     hide('.opt-gaDays');
  if (!SET.showBirthHeadCircumference) hide('.opt-birthHc');
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

  /* Schooling — yes/no first, grade only when relevant */
  const schoolBox = $('#schoolAttending');
  ['Yes', 'No'].forEach(o => {
    const lab = el('label', {}, [ el('input', { type: 'radio', name: 'schoolAttending', value: o }), el('span', { text: o }) ]);
    $('input', lab).addEventListener('change', () => {
      $$('.school-detail').forEach(f => f.style.display = o === 'Yes' ? '' : 'none');
      $$('#schoolAttending label').forEach(l => l.classList.add('unchecked'));
      lab.classList.remove('unchecked');
      bus.emit('change');
    });
    lab.classList.add('unchecked');
    schoolBox.appendChild(lab);
  });

  /* Therapies currently received — your own rehab departments, not free text */
  UI.pills('#otherTherapy', CFG.options.rehabDepartments.map(t => ({ v: t, t: t })), 'otherTherapy');

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

  if (SET.showPreviousPhysiotherapy) {
    $('.prev-physio-block').style.display = '';
    $('#prevPhysio').addEventListener('change', e => {
      $$('.prev-physio').forEach(f => f.style.display = e.target.value === 'yes' ? '' : 'none');
      bus.emit('change');
    });
  } else hide('.prev-physio-block');

  /* Onset date and duration each derive the other — enter whichever the
     family actually gave you (client request). */
  const DAYS = { Days: 1, Weeks: 7, Months: 30.44, Years: 365.25 };
  const dVal = $('#durationValue'), dUnit = $('#durationUnit'), onsetEl = $('#onsetDate');
  CFG.options.durationUnits.forEach(u => dUnit.appendChild(el('option', { value: u, text: u })));
  dUnit.value = 'Months';
  let syncing = false;

  function durationToDate() {
    if (syncing || !dVal.value) return;
    syncing = true;
    const d = new Date();
    d.setDate(d.getDate() - Math.round(parseFloat(dVal.value) * DAYS[dUnit.value]));
    onsetEl.value = d.toISOString().slice(0, 10);
    syncing = false; bus.emit('change');
  }
  function dateToDuration() {
    if (syncing || !onsetEl.value) return;
    syncing = true;
    const days = Math.max(0, Math.round((Date.now() - new Date(onsetEl.value).getTime()) / 86400000));
    const unit = days >= 730 ? 'Years' : days >= 61 ? 'Months' : days >= 14 ? 'Weeks' : 'Days';
    dUnit.value = unit;
    dVal.value = Math.round(days / DAYS[unit] * 10) / 10;
    syncing = false; bus.emit('change');
  }
  dVal.addEventListener('input', durationToDate);
  dUnit.addEventListener('change', durationToDate);
  onsetEl.addEventListener('change', dateToDuration);

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
     Section 9 — sensory (draft)
     ======================================================================= */
  const sens = $('#sensory');
  ['Light touch', 'Pain / temperature', 'Proprioception', 'Stereognosis'].forEach(x => {
    sens.appendChild(el('div', { class: 'field' }, [ el('label', { text: x }),
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

  /* =======================================================================
     Section 8 — Pediatric Reflex Screening (client image 5)
     ======================================================================= */
  const reflexGrid = UI.buildGrid({
    mount: '#grid-reflex', key: 'reflex', noun: 'reflexes',
    pickerTitle: 'Select the reflexes you screened',
    catalogue: CFG.reflexCatalogue, presets: CFG.presets.reflex, rowHeader: 'Reflex',
    rowNote: item => ({
      text: 'integrates by ~' + item.by + ' mo' + (age.months > item.by ? ' — past due for this child' : ''),
      cls: age.months > item.by ? 'overdue' : ''
    }),
    columns: [
      { key: 'status',  label: 'Status',   type: 'select', options: CFG.options.reflexStatus, nt: false },
      { key: 'resp',    label: 'Response', type: 'select', options: CFG.options.reflexResponse, nt: false, optional: true },
      { key: 'sig',     label: 'Clinical significance', type: 'select', options: CFG.options.reflexSignificance, nt: false, optional: true },
      { key: 'remarks', label: 'Remarks',  type: 'text', width: '200px' }
    ]
  });

  /* =======================================================================
     Section 13 — WHO gross motor milestones (client image 4)
     ======================================================================= */
  function buildWho() {
    const t = el('table', { class: 'dgrid' });
    t.appendChild(el('thead', {}, [ el('tr', {}, [
      el('th', { class: 'rowname', text: 'Gross motor skill' }),
      el('th', { text: 'WHO window' }),
      el('th', { text: 'Assessment' }),
      el('th', { text: 'Age achieved' }),
      el('th', { text: 'Interpretation' })
    ]) ]));
    const tb = el('tbody');
    CFG.whoMilestones.forEach(m => {
      const tr = el('tr', { 'data-who': m.id });
      tr.appendChild(el('td', { class: 'rowname', text: m.label }));
      tr.appendChild(el('td', { class: 'hint', text: m.win[0] + ' – ' + m.win[1] + ' mo' }));

      const st = el('select', { 'data-field': m.id + '-status' },
        [ el('option', { value: '', text: 'Select…' }) ]
        .concat(CFG.options.grossMotorStatus.map(o => el('option', { value: o, text: o }))));
      tr.appendChild(el('td', {}, [ st ]));

      const si = UI.suffixInput('mo', { min: 0, max: 120, step: '0.5', 'data-field': m.id + '-age', placeholder: '—' });
      const inp = $('input', si);
      tr.appendChild(el('td', {}, [ si ]));

      const flag = el('span', { class: 'ms-flag' });
      tr.appendChild(el('td', {}, [ flag ]));

      function evaluate() {
        const v = parseFloat(inp.value);
        if (st.value === 'Not achieved') {
          flag.className = 'ms-flag show ' + (age.months > m.win[1] ? 'delay' : 'mild');
          flag.textContent = age.months > m.win[1] ? 'Overdue — past the WHO window' : 'Not yet — still within window';
          return;
        }
        if (st.value === 'Unable to test') { flag.className = 'ms-flag show mild'; flag.textContent = 'Not tested'; return; }
        if (isNaN(v)) { flag.className = 'ms-flag'; flag.textContent = ''; return; }
        if (v <= m.win[1]) { flag.className = 'ms-flag show ok';    flag.textContent = 'Within WHO window'; }
        else               { flag.className = 'ms-flag show delay'; flag.textContent = 'Late — beyond ' + m.win[1] + ' mo'; }
      }
      st.addEventListener('change', () => { evaluate(); bus.emit('change'); });
      inp.addEventListener('input', () => { evaluate(); bus.emit('change'); });

      /* pre-fill from the matching milestone in section 3 — never typed twice */
      if (m.from) {
        const src = $('input[data-field="' + m.from + '"]');
        if (src) src.addEventListener('input', () => {
          if (!inp.value && src.value) { inp.value = src.value; if (!st.value) st.value = 'Achieved'; evaluate(); }
        });
      }
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    $('#grid-who').appendChild(el('div', { class: 'grid-wrap' }, [ t ]));
    $('#grid-who').appendChild(el('div', { class: 'grid-legend' }, [
      el('span', { html: '<b>WHO window</b> = 1st&ndash;99th percentile from the WHO Multicentre Growth Reference Study.' }),
      el('span', { html: 'Values from section 3 pre-fill here automatically.' })
    ]));
  }
  buildWho();

  /* =======================================================================
     Section 14 — Fine motor (client images 1-3)
     ======================================================================= */
  const domBox = $('#handDominance');
  CFG.options.handDominance.forEach(o => {
    const lab = el('label', {}, [ el('input', { type: 'radio', name: 'handDominance', value: o }), el('span', { text: o }) ]);
    $('input', lab).addEventListener('change', () => {
      $$('#handDominance label').forEach(l => l.classList.add('unchecked'));
      lab.classList.remove('unchecked'); bus.emit('change');
    });
    lab.classList.add('unchecked');
    domBox.appendChild(lab);
  });
  UI.refTable('#fmRef', CFG.scales.fineMotor);

  const fineMotorGrid = UI.buildGrid({
    mount: '#grid-finemotor', key: 'fineMotor', noun: 'domains',
    pickerTitle: 'Select the fine motor domains you assessed',
    catalogue: CFG.fineMotorCatalogue, presets: CFG.presets.fineMotor, rowHeader: 'Domain',
    columns: [
      { key: 'score', label: 'Score', type: 'select', options: CFG.scales.fineMotor.options, suffix: '/3' },
      { key: 'notes', label: 'Notes', type: 'text', width: '260px' }
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
     Toggle Sections — show / hide any card, and jump to it.
     Every section stays on one scrolling page; there is no Back / Next.
     ======================================================================= */
  const SECTIONS = $$('section.card').map(c => ({
    id: c.id, num: c.dataset.num, title: c.dataset.title, elm: c,
    draft: /Draft/.test((c.querySelector('.ch .tag') || {}).textContent || '')
  }));

  const menu = $('#secMenu');
  menu.appendChild(el('div', { class: 'mhead' }, [
    el('span', { text: 'Sections on this page' }),
    el('a', { text: 'Show all', onclick: () => setAll(true) }),
    el('a', { text: 'Hide all', onclick: () => setAll(false) })
  ]));
  SECTIONS.forEach(sec => {
    const row = el('div', {
      class: 'sec-item' + (sec.draft ? ' is-draft' : '') + (sec.elm.dataset.hidden ? ' is-off' : ''),
      'data-sec': sec.num
    });
    const cb = el('input', { type: 'checkbox' });
    cb.checked = !sec.elm.dataset.hidden;      // cards marked data-hidden start collapsed
    cb.addEventListener('change', () => sec.elm.classList.toggle('hidden', !cb.checked));
    sec.cb = cb;
    row.appendChild(cb);
    row.appendChild(el('span', { class: 'jump', onclick: () => { cb.checked = true; sec.elm.classList.remove('hidden'); jump(sec.elm); } }, [
      el('span', { class: 'n', text: sec.num }), el('span', { class: 't', text: sec.title })
    ]));
    menu.appendChild(row);
  });
  function setAll(on) { SECTIONS.forEach(s2 => { s2.cb.checked = on; s2.elm.classList.toggle('hidden', !on); }); }
  function jump(target) {
    const top = target.getBoundingClientRect().top + window.pageYOffset - 118;
    if (window.scrollTo) window.scrollTo({ top: top, behavior: 'smooth' });
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 900);
  }
  const toggle = $('#secToggle');
  $('#secToggleBtn').addEventListener('click', e => { e.stopPropagation(); toggle.classList.toggle('open'); });
  document.addEventListener('click', e => { if (!toggle.contains(e.target)) toggle.classList.remove('open'); });

  /* =======================================================================
     Validation  (C04 / C12)
     ======================================================================= */
  const gridSpecs   = { reflex: reflexGrid, tone: toneGrid, rom: romGrid, strength: strengthGrid, fineMotor: fineMotorGrid };
  const gridSection = { reflex: '8',  tone: '10',          rom: '11',              strength: '12',             fineMotor: '14' };
  const gridLabel   = { reflex: 'Reflex screening', tone: 'Muscle tone', rom: 'Range of motion', strength: 'Muscle strength', fineMotor: 'Fine motor' };

  function gridIssues(key) {
    const spec = gridSpecs[key], out = [];
    spec.catalogue.filter(i => store.selected[key].includes(i.id)).forEach(item => {
      spec.columns.filter(c => (c.type === 'measure' || c.type === 'select') && !c.optional).forEach(col => {
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
      const host = f.closest('section.card');
      if (!host || host.classList.contains('hidden')) return;   // skip hidden cards
      const sec = host.dataset.num;
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
      const card = $('#sec-' + gridSection[k]);
      if (card && card.classList.contains('hidden')) return;
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
        const sec = SECTIONS.find(x => x.num === i.sec);
        if (sec) { sec.cb.checked = true; sec.elm.classList.remove('hidden'); }
        if (i.el && i.el.scrollIntoView) i.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        else if (sec) jump(sec.elm);
        if (i.el && i.el.focus) setTimeout(() => i.el.focus(), 260);
      });
      ul.appendChild(el('li', {}, [ a ]));
    });
    if (issues.length > 40) ul.appendChild(el('li', { class: 'hint', text: '…and ' + (issues.length - 40) + ' more' }));
    box.appendChild(ul);
    $$('.sec-item').forEach(r => r.classList.toggle('state-error', issues.some(i => i.sec === r.dataset.sec)));
    if (box.scrollIntoView) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
  const DATA_SECTIONS = SECTIONS.filter(x => x.num !== '15' && x.num !== '99').map(x => x.num);
  function refresh() {
    let started = 0;
    DATA_SECTIONS.forEach(sec => {
      const item = $('.sec-item[data-sec="' + sec + '"]');
      if (!item) return;
      const n = sectionFilled(sec);
      item.classList.remove('state-complete', 'state-partial');
      if (n > 0) { started++; item.classList.add(n > 3 ? 'state-complete' : 'state-partial'); }
    });
    $('#progTxt').textContent = started + ' of ' + DATA_SECTIONS.length + ' sections started';
    $('#progBar').style.width = Math.round(started / DATA_SECTIONS.length * 100) + '%';
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
  /* Change notes are HIDDEN by default and revealed for the whole page at once. */
  const btnNotes = $('#btnNotes');
  $('#notesCount').textContent = $$('.change-note').length;
  btnNotes.addEventListener('click', () => {
    const showing = document.body.classList.toggle('hide-notes') === false;
    btnNotes.classList.toggle('on', showing);
    btnNotes.setAttribute('aria-pressed', showing);
    btnNotes.innerHTML = (showing ? '\u25CF Hide change notes ' : '\u25CF Show change notes ') +
      '<span class="cnt">' + $$('.change-note').length + '</span>';
  });

  const btnCompare = $('#btnCompare');
  btnCompare.addEventListener('click', () => {
    store.compare = !store.compare;
    btnCompare.classList.toggle('on', store.compare);
    btnCompare.setAttribute('aria-pressed', store.compare);
    Object.values(gridSpecs).forEach(g => g.render());
    if (store.compare && !store.selected.rom.length)
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
