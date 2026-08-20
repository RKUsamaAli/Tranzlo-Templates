/* ==========================================================================
   assessment.config.js
   SINGLE SOURCE OF TRUTH for every option list, catalogue, scale and rule.
   Nothing clinical is hard-coded in the HTML. At implementation time this
   file becomes the form schema + reference tables, unchanged.
   ========================================================================== */
window.CFG = (function () {

  /* ---- Q1 (open question): ROM capture mode --------------------------------
     'degrees'  = goniometry in degrees, compared against normal range  [DEFAULT]
     'graded'   = the 0-4 scale as drawn on the client's original form
     Flip this one value to switch the whole of section 11.               */
  const romMode = 'degrees';

  /* ---- Deployment settings -------------------------------------------------
     Fields the client asked to be switchable per site rather than removed.
     Flip a value here and the form changes — no code edit.               */
  const settings = {
    restrictTherapistToLoggedInUser : true,   // therapist is the logged-in user, not a dropdown
    showSupervisingConsultant       : false,  // removed on request
    surgicalHistoryFormat           : 'text', // 'text' (free box) | 'structured' (rows)
    showGestationalAgeDays          : false,  // weeks only
    showBirthHeadCircumference      : false,
    showDevelopmentalConcerns       : false,  // duplicated by Chief Complaint (section 4)
    showPreviousPhysiotherapy       : false,  // removed on request
    precautionDetailNotes           : false   // no free-text note per precaution
  };

  /* ---- Grading scales ---------------------------------------------------- */
  const scales = {
    mas: {
      name: 'Modified Ashworth Scale (MAS)',
      options: ['0', '1', '1+', '2', '3', '4'],
      rows: [
        ['0',  'No increase in muscle tone'],
        ['1',  'Slight increase; catch and release or minimal resistance at end range'],
        ['1+', 'Slight increase; catch followed by minimal resistance through remainder (<1/2 ROM)'],
        ['2',  'More marked increase; muscle still moved easily'],
        ['3',  'Considerable increase; passive movement difficult'],
        ['4',  'Affected part rigid in flexion or extension']
      ]
    },
    mrc: {
      name: 'MRC / Kendall Muscle Strength',
      suffix: '/5',
      options: ['0', '1', '2', '3', '3+', '4-', '4', '4+', '5'],
      rows: [
        ['0', 'No muscle contraction'],
        ['1', 'Flicker / trace contraction'],
        ['2', 'Active movement, gravity eliminated'],
        ['3', 'Active movement against gravity'],
        ['4', 'Active movement against gravity and resistance'],
        ['5', 'Normal strength']
      ]
    },
    fineMotor: {
      name: 'Fine Motor Performance',
      suffix: '/3',
      options: ['0', '1', '2', '3'],
      rows: [
        ['0', 'Unable / does not initiate'],
        ['1', 'Requires significant assistance'],
        ['2', 'Performs with cues / assistance or reduced accuracy'],
        ['3', 'Independent / age-appropriate performance']
      ]
    },
    romGraded: {
      name: 'Range of Motion (graded)',
      suffix: '/4',
      options: ['0', '1', '2', '3', '4'],
      rows: [
        ['0', 'No movement'],
        ['1', 'Up to 25% of expected range'],
        ['2', 'Up to 50% of expected range'],
        ['3', 'Up to 75% of expected range'],
        ['4', 'Full expected range']
      ]
    }
  };

  /* ---- Not-Tested reasons (C04) ------------------------------------------ */
  const ntReasons = [
    'Unable to cooperate', 'Pain limiting', 'Fixed contracture',
    'Not applicable / absent limb', 'Refused by child', 'Medical precaution',
    'Cast / splint in situ', 'Deferred to next session'
  ];

  /* ---- Catalogue: muscle groups for tone (section 10) -------------------- */
  const toneCatalogue = [
    { id:'t-sh-add', region:'Upper limb', label:'Shoulder Adductors' },
    { id:'t-el-flx', region:'Upper limb', label:'Elbow Flexors' },
    { id:'t-el-ext', region:'Upper limb', label:'Elbow Extensors' },
    { id:'t-fa-pro', region:'Upper limb', label:'Forearm Pronators' },
    { id:'t-wr-flx', region:'Upper limb', label:'Wrist Flexors' },
    { id:'t-wr-ext', region:'Upper limb', label:'Wrist Extensors' },
    { id:'t-fi-flx', region:'Upper limb', label:'Finger Flexors' },
    { id:'t-th-add', region:'Upper limb', label:'Thumb Adductors' },
    { id:'t-hp-flx', region:'Lower limb', label:'Hip Flexors' },
    { id:'t-hp-add', region:'Lower limb', label:'Hip Adductors' },
    { id:'t-hp-ext', region:'Lower limb', label:'Hip Extensors' },
    { id:'t-kn-flx', region:'Lower limb', label:'Knee Flexors (hamstrings)' },
    { id:'t-kn-ext', region:'Lower limb', label:'Knee Extensors (quadriceps)' },
    { id:'t-an-pf',  region:'Lower limb', label:'Ankle Plantarflexors' },
    { id:'t-an-inv', region:'Lower limb', label:'Ankle Invertors' },
    { id:'t-tr-flx', region:'Trunk / neck', label:'Trunk Flexors' },
    { id:'t-tr-ext', region:'Trunk / neck', label:'Trunk Extensors' },
    { id:'t-nk-ext', region:'Trunk / neck', label:'Neck Extensors' }
  ];

  /* ---- Catalogue: ROM motions (section 11) -------------------------------
     C03 — each direction is its own row with its own normal range.
     'norm' = adult/adolescent reference, shown as helper text.            */
  const romCatalogue = [
    { id:'r-sh-flx', region:'Shoulder', label:'Shoulder Flexion',        norm:[0,180] },
    { id:'r-sh-ext', region:'Shoulder', label:'Shoulder Extension',      norm:[0,60]  },
    { id:'r-sh-abd', region:'Shoulder', label:'Shoulder Abduction',      norm:[0,180] },
    { id:'r-sh-add', region:'Shoulder', label:'Shoulder Adduction',      norm:[0,45]  },
    { id:'r-sh-ir',  region:'Shoulder', label:'Shoulder Internal Rot.',  norm:[0,70]  },
    { id:'r-sh-er',  region:'Shoulder', label:'Shoulder External Rot.',  norm:[0,90]  },
    { id:'r-el-flx', region:'Elbow / forearm', label:'Elbow Flexion',    norm:[0,150] },
    { id:'r-el-ext', region:'Elbow / forearm', label:'Elbow Extension',  norm:[0,0], neg:true },
    { id:'r-fa-sup', region:'Elbow / forearm', label:'Forearm Supination', norm:[0,80] },
    { id:'r-fa-pro', region:'Elbow / forearm', label:'Forearm Pronation', norm:[0,80] },
    { id:'r-wr-flx', region:'Wrist', label:'Wrist Flexion',              norm:[0,80]  },
    { id:'r-wr-ext', region:'Wrist', label:'Wrist Extension',            norm:[0,70]  },
    { id:'r-hp-flx', region:'Hip',   label:'Hip Flexion',                norm:[0,120] },
    { id:'r-hp-ext', region:'Hip',   label:'Hip Extension',              norm:[0,30]  },
    { id:'r-hp-abd', region:'Hip',   label:'Hip Abduction',              norm:[0,45]  },
    { id:'r-hp-add', region:'Hip',   label:'Hip Adduction',              norm:[0,30]  },
    { id:'r-hp-ir',  region:'Hip',   label:'Hip Internal Rotation',      norm:[0,45]  },
    { id:'r-hp-er',  region:'Hip',   label:'Hip External Rotation',      norm:[0,45]  },
    { id:'r-hp-pop', region:'Hip',   label:'Popliteal Angle',            norm:[0,20]  },
    { id:'r-kn-flx', region:'Knee',  label:'Knee Flexion',               norm:[0,135] },
    { id:'r-kn-ext', region:'Knee',  label:'Knee Extension',             norm:[0,0]   },
    { id:'r-an-df',  region:'Ankle / foot', label:'Ankle Dorsiflexion (knee ext.)', norm:[0,20] },
    { id:'r-an-dff', region:'Ankle / foot', label:'Ankle Dorsiflexion (knee flex.)', norm:[0,25] },
    { id:'r-an-pf',  region:'Ankle / foot', label:'Ankle Plantarflexion', norm:[0,50] },
    { id:'r-st-inv', region:'Ankle / foot', label:'Subtalar Inversion',   norm:[0,35] },
    { id:'r-st-ev',  region:'Ankle / foot', label:'Subtalar Eversion',    norm:[0,15] },
    { id:'r-cv-flx', region:'Cervical / trunk', label:'Cervical Flexion',   norm:[0,45] },
    { id:'r-cv-ext', region:'Cervical / trunk', label:'Cervical Extension', norm:[0,45] },
    { id:'r-cv-rot', region:'Cervical / trunk', label:'Cervical Rotation',  norm:[0,80] },
    { id:'r-cv-lat', region:'Cervical / trunk', label:'Cervical Lateral Flexion', norm:[0,45] }
  ];

  /* ---- Catalogue: muscle groups for strength (section 12) ---------------- */
  const strengthCatalogue = [
    { id:'s-sh-flx', region:'Upper limb', label:'Shoulder Flexors' },
    { id:'s-sh-abd', region:'Upper limb', label:'Shoulder Abductors' },
    { id:'s-el-flx', region:'Upper limb', label:'Elbow Flexors' },
    { id:'s-el-ext', region:'Upper limb', label:'Elbow Extensors' },
    { id:'s-wr-flx', region:'Upper limb', label:'Wrist Flexors' },
    { id:'s-wr-ext', region:'Upper limb', label:'Wrist Extensors' },
    { id:'s-grip',   region:'Upper limb', label:'Grip Strength' },
    { id:'s-hp-flx', region:'Lower limb', label:'Hip Flexors' },
    { id:'s-hp-ext', region:'Lower limb', label:'Hip Extensors' },
    { id:'s-hp-abd', region:'Lower limb', label:'Hip Abductors' },
    { id:'s-hp-add', region:'Lower limb', label:'Hip Adductors' },
    { id:'s-kn-flx', region:'Lower limb', label:'Knee Flexors' },
    { id:'s-kn-ext', region:'Lower limb', label:'Knee Extensors' },
    { id:'s-an-df',  region:'Lower limb', label:'Ankle Dorsiflexors' },
    { id:'s-an-pf',  region:'Lower limb', label:'Ankle Plantarflexors' },
    { id:'s-tr-flx', region:'Trunk / neck', label:'Trunk Flexors' },
    { id:'s-tr-ext', region:'Trunk / neck', label:'Trunk Extensors' },
    { id:'s-nk-flx', region:'Trunk / neck', label:'Neck Flexors' }
  ];

  /* ---- Catalogue: fine motor domains (client images 1-3) ----------------- */
  const fineMotorCatalogue = [
    { id:'fm-grasp',      region:'Grasp & manipulation',        label:'Grasping' },
    { id:'fm-pincer',     region:'Grasp & manipulation',        label:'Pincer Grasp' },
    { id:'fm-bilateral',  region:'Grasp & manipulation',        label:'Bilateral Hand Use' },
    { id:'fm-manip',      region:'Grasp & manipulation',        label:'Hand Manipulation' },
    { id:'fm-vmi',        region:'Visual-motor & functional use', label:'Visual-Motor Integration' },
    { id:'fm-prewrite',   region:'Visual-motor & functional use', label:'Pre-Writing Skills' },
    { id:'fm-tool',       region:'Visual-motor & functional use', label:'Tool Use' },
    { id:'fm-functional', region:'Visual-motor & functional use', label:'Functional Fine Motor' }
  ];

  /* ---- Catalogue: primitive reflex screening (client image 5) -------------
     `by` = age in months by which the reflex is normally integrated.
     Retention past that age is the clinical finding.                      */
  const reflexCatalogue = [
    { id:'rf-moro',    region:'Primitive reflexes', label:'Moro',          by:6  },
    { id:'rf-atnr',    region:'Primitive reflexes', label:'ATNR',          by:6  },
    { id:'rf-stnr',    region:'Primitive reflexes', label:'STNR',          by:11 },
    { id:'rf-tlr',     region:'Primitive reflexes', label:'TLR',           by:6  },
    { id:'rf-palmar',  region:'Primitive reflexes', label:'Palmar Grasp',  by:6  },
    { id:'rf-plantar', region:'Primitive reflexes', label:'Plantar Grasp', by:12 },
    { id:'rf-galant',  region:'Primitive reflexes', label:'Galant',        by:9  },
    { id:'rf-rooting', region:'Feeding reflexes',   label:'Rooting',       by:4  },
    { id:'rf-sucking', region:'Feeding reflexes',   label:'Sucking',       by:4  }
  ];

  /* ---- WHO gross motor milestones (client image 4) -----------------------
     `win` = WHO Multicentre Growth Reference Study achievement window,
     1st to 99th percentile, in months. `from` links the milestone to the
     matching field in section 3 so nothing is typed twice.               */
  const whoMilestones = [
    { id:'who-sit',         label:'Sitting without support',   win:[3.8, 9.2],  from:'ms-sit'   },
    { id:'who-crawl',       label:'Hands-and-knees crawling',  win:[5.2, 13.5], from:'ms-crawl' },
    { id:'who-standassist', label:'Standing with assistance',  win:[4.8, 11.4] },
    { id:'who-walkassist',  label:'Walking with assistance',   win:[5.9, 13.7] },
    { id:'who-standalone',  label:'Standing alone',            win:[6.9, 16.9], from:'ms-stand' },
    { id:'who-walkalone',   label:'Walking alone',             win:[8.2, 17.6], from:'ms-walk'  }
  ];

  /* ---- Presets (C15) — load a whole screen in one click ------------------ */
  const presets = {
    tone: {
      'Upper limb':  ['t-el-flx','t-el-ext','t-fa-pro','t-wr-flx','t-fi-flx','t-th-add'],
      'Lower limb':  ['t-hp-flx','t-hp-add','t-kn-flx','t-kn-ext','t-an-pf'],
      'CP baseline': ['t-el-flx','t-wr-flx','t-hp-flx','t-hp-add','t-kn-flx','t-an-pf'],
      'Full body':   toneCatalogue.map(i => i.id)
    },
    rom: {
      'Upper limb':  ['r-sh-flx','r-sh-abd','r-sh-er','r-el-flx','r-el-ext','r-fa-sup','r-wr-flx','r-wr-ext'],
      'Lower limb':  ['r-hp-flx','r-hp-abd','r-hp-ext','r-hp-pop','r-kn-flx','r-kn-ext','r-an-df','r-an-pf'],
      'Spine / neck':['r-cv-flx','r-cv-ext','r-cv-rot','r-cv-lat'],
      'CP baseline': ['r-hp-abd','r-hp-ext','r-hp-pop','r-kn-ext','r-an-df','r-el-ext','r-wr-ext'],
      'Full body':   romCatalogue.map(i => i.id)
    },
    fineMotor: {
      'Early years':      ['fm-grasp','fm-pincer','fm-bilateral','fm-manip'],
      'School readiness': ['fm-vmi','fm-prewrite','fm-tool','fm-functional'],
      'Full screen':      fineMotorCatalogue.map(i => i.id)
    },
    reflex: {
      'Infant screen':  ['rf-moro','rf-rooting','rf-sucking','rf-palmar','rf-atnr'],
      'Postural set':   ['rf-atnr','rf-stnr','rf-tlr','rf-galant'],
      'Full screen':    reflexCatalogue.map(i => i.id)
    },
    strength: {
      'Upper limb':  ['s-sh-flx','s-sh-abd','s-el-flx','s-el-ext','s-wr-ext','s-grip'],
      'Lower limb':  ['s-hp-flx','s-hp-ext','s-hp-abd','s-kn-flx','s-kn-ext','s-an-df','s-an-pf'],
      'Core / trunk':['s-tr-flx','s-tr-ext','s-nk-flx'],
      'Full body':   strengthCatalogue.map(i => i.id)
    }
  };

  /* ---- Developmental milestone normatives (C09) --------------------------
     [typical, mild-concern threshold, referral threshold] in months.      */
  const milestones = [
    { id:'ms-head',  label:'Head Control',  typical:3,  mild:4,  delay:6  },
    { id:'ms-roll',  label:'Rolling Over',  typical:5,  mild:7,  delay:9  },
    { id:'ms-sit',   label:'Sitting',       typical:6,  mild:9,  delay:12 },
    { id:'ms-crawl', label:'Crawling',      typical:9,  mild:11, delay:14 },
    { id:'ms-stand', label:'Standing',      typical:9,  mild:12, delay:15 },
    { id:'ms-walk',  label:'Walking',       typical:12, mild:15, delay:18 },
    { id:'ms-words', label:'First Words',   typical:12, mild:16, delay:20 }
  ];

  /* ---- Pain scales by age (C10) ----------------------------------------- */
  const painScales = [
    { id:'flacc', label:'FLACC (observational)', maxAgeMonths:36,  note:'Non-verbal / pre-verbal child' },
    { id:'faces', label:'Wong-Baker FACES',      maxAgeMonths:96,  note:'Ages 3 to 7 years' },
    { id:'nrs',   label:'Numeric Rating 0-10',   maxAgeMonths:9999,note:'Age 8 and above' }
  ];

  /* ---- Option lists for the review sections ------------------------------
     `exclusive:true` means selecting it clears every sibling (C07).       */
  const options = {
    precautions: [
      { v:'bone',  t:'Bone fragility', danger:true },
      { v:'card',  t:'Cardiac', danger:true },
      { v:'resp',  t:'Respiratory', danger:true },
      { v:'seiz',  t:'Seizures', danger:true },
      { v:'shunt', t:'Shunt (VP)', danger:true },
      { v:'ortho', t:'Orthopaedic', danger:true },
      { v:'skin',  t:'Skin integrity', danger:true },
      { v:'none',  t:'No precautions', exclusive:true }
    ],
    birthComplications: [
      { v:'nil',  t:'Nil', exclusive:true },
      { v:'asph', t:'Birth asphyxia' },
      { v:'nicu', t:'NICU admission', reveals:'nicu-detail' },
      { v:'jaun', t:'Jaundice' },
      { v:'mec',  t:'Meconium aspiration' },
      { v:'sepsis', t:'Neonatal sepsis' },
      { v:'seiz', t:'Neonatal seizures' },
      { v:'other', t:'Other', detail:true }
    ],
    respiratory: [
      { v:'clear', t:'Clear', exclusive:true },
      { v:'wheeze', t:'Wheeze' }, { v:'crackles', t:'Crackles' },
      { v:'secretions', t:'Secretions' }, { v:'trache', t:'Tracheostomy' },
      { v:'o2', t:'O2 support' }, { v:'vent', t:'Ventilator dependent' }
    ],
    consciousness: [
      { v:'alert', t:'Alert' }, { v:'drowsy', t:'Drowsy' },
      { v:'irritable', t:'Irritable' }, { v:'gcs', t:'GCS impaired' }
    ],
    neuroFindings: [
      { v:'none', t:'No abnormal findings', exclusive:true },
      { v:'hypotonia', t:'Hypotonia' }, { v:'hypertonia', t:'Hypertonia' },
      { v:'spasticity', t:'Spasticity' }, { v:'dystonia', t:'Dystonia' },
      { v:'ataxia', t:'Ataxia' }, { v:'seizures', t:'Seizures' },
      { v:'tremor', t:'Tremor' }
    ],
    skin: [
      { v:'intact', t:'Intact', exclusive:true },
      { v:'pressure', t:'Pressure areas' }, { v:'scar', t:'Scar' },
      { v:'oedema', t:'Oedema' }, { v:'rash', t:'Rash' }, { v:'wound', t:'Open wound' }
    ],
    feeding: [
      { v:'oral', t:'Oral' }, { v:'ng', t:'NG tube' }, { v:'peg', t:'PEG' },
      { v:'aspirating', t:'Aspirating' }, { v:'dysphagia', t:'Dysphagia' },
      { v:'drooling', t:'Drooling' }
    ],
    visionHearing: [
      { v:'normal', t:'Normal', exclusive:true },
      { v:'glasses', t:'Glasses' }, { v:'hearingaid', t:'Hearing aid' },
      { v:'cvi', t:'CVI' }, { v:'squint', t:'Squint' },
      { v:'hearingloss', t:'Hearing loss' }
    ],
    overallTone: [
      { v:'normal', t:'Normal', exclusive:true }, { v:'hypotonia', t:'Hypotonia' },
      { v:'hypertonia', t:'Hypertonia' }, { v:'fluctuating', t:'Fluctuating' },
      { v:'mixed', t:'Mixed' }
    ],
    postureLying: [
      { v:'symmetrical', t:'Symmetrical', exclusive:true }, { v:'atnr', t:'ATNR influence' },
      { v:'opisthotonus', t:'Opisthotonus' }, { v:'frogleg', t:'Frog-leg posture' },
      { v:'windswept', t:'Windswept' }, { v:'other', t:'Other', detail:true }
    ],
    postureSitting: [
      { v:'erect', t:'Erect / independent', exclusive:true }, { v:'kyphosis', t:'Kyphosis' },
      { v:'scoliosis', t:'Scoliosis' }, { v:'wsit', t:'W-sit' },
      { v:'propped', t:'Propped' }, { v:'unable', t:'Unable to sit' }
    ],
    reflexStatus:       ['Integrated', 'Retained', 'Absent', 'Asymmetrical', 'Not age appropriate', 'Not tested'],
    reflexResponse:     ['Normal', 'Delayed', 'Abnormal'],
    reflexSignificance: ['No concern', 'Monitor', 'Further assessment required'],
    grossMotorStatus:   ['Achieved', 'Not achieved', 'Unable to test'],
    handDominance:      ['Right', 'Left', 'Not yet established', 'Mixed / inconsistent'],
    rehabDepartments: [
      'Physiotherapy', 'Occupational Therapy', 'Speech & Language Therapy',
      'Clinical Psychology', 'Special Education', 'Hydrotherapy',
      'Orthotics & Prosthetics', 'Behavioural Therapy', 'Audiology', 'Nutrition & Dietetics'
    ],
    durationUnits: ['Days', 'Weeks', 'Months', 'Years'],
    deliveryMode: ['SVD', 'Instrumental', 'Elective C/S', 'Emergency C/S'],
    complaintSuggestions: [
      'Delayed motor milestones', 'Difficulty walking', 'Abnormal gait',
      'Muscle weakness', 'Muscle stiffness / tightness', 'Poor balance',
      'Unable to sit unsupported', 'Toe walking', 'Frequent falls',
      'Poor head control', 'Hand function difficulty', 'Post-operative rehabilitation',
      'Torticollis', 'Pain', 'Reduced endurance'
    ],
    factorSuggestions: [
      'Fatigue', 'Prolonged sitting', 'Prolonged standing', 'Cold weather',
      'Illness / fever', 'Physical activity', 'Rest', 'Stretching',
      'Orthosis use', 'Medication', 'Massage', 'Warm compress'
    ],
    allergySeverity: ['Mild', 'Moderate', 'Severe'],
    goalPriority: ['High', 'Medium', 'Low']
  };

  return { romMode, settings, scales, ntReasons, toneCatalogue, romCatalogue,
           strengthCatalogue, fineMotorCatalogue, reflexCatalogue, whoMilestones,
           presets, milestones, painScales, options };
})();
