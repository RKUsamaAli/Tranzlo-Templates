/* ==========================================================================
   demo-data.js — SYNTHETIC demonstration patient.
   No real patient data is used anywhere in this prototype.
   ========================================================================== */
window.DEMO = {
  patient: {
    mrn: 'MRN-2026-04871',
    name: 'Ayaan Khan',
    initials: 'AK',
    sex: 'Male',
    dob: '2021-11-04',
    guardian: 'Mrs. Sana Khan (Mother)',
    contact: '+92 300 1234567',
    address: 'Bahria Town, Sector C, Lahore',
    blood: 'B+'
  },
  visit: {
    no: 'V-2026-118432',
    date: '2026-08-18',
    time: '10:35',
    type: 'Follow-up',
    clinic: 'Paediatric OPD',
    consultant: 'Dr. Ahmed Raza (Paediatric Neurology)'
  },
  vitals: {
    recordedAt: '2026-08-18 10:42',
    recordedBy: 'Nurse Hina Aslam',
    hr: 104, rr: 24, temp: 36.9, spo2: 97, bp: '92/58',
    weight: 12.4, height: 92.5, headCirc: 47.2, painFlag: false
  },
  opd: {
    consultant: 'Dr. Ahmed Raza',
    date: '2026-08-18',
    primaryDiagnosis: 'Spastic Diplegic Cerebral Palsy (G80.1)',
    relevantHistory:
      'Born at 32 weeks gestation. NICU stay 21 days with ventilatory support for 6 days. ' +
      'HIE grade II documented. Recurrent chest infections in infancy (last admission Jan 2025). ' +
      'On Baclofen 5 mg TDS since March 2026. No known cardiac disease.',
    advice: 'Refer to Rehabilitation for physiotherapy assessment and management plan.',
    icd: 'G80.1'
  },
  referral: {
    id: 'REF-2026-00934',
    from: 'Paediatric OPD',
    to: 'Rehabilitation / Physiotherapy',
    by: 'Dr. Ahmed Raza',
    date: '2026-08-18',
    priority: 'Routine',
    reason: 'Spastic diplegia — assess tone, ROM and gait. Advise home programme and orthotic review.',
    status: 'Accepted'
  },
  allergies: [
    { name: 'Penicillin', reaction: 'Rash', severity: 'Moderate', recordedBy: 'OPD, 12-Mar-2025' },
    { name: 'Adhesive tape', reaction: 'Skin irritation', severity: 'Mild', recordedBy: 'Ward, 02-Jan-2025' }
  ],
  precautions: ['seiz'],
  therapist: { name: 'Ms. Fatima Nadeem', licence: 'PT-PK-40219', role: 'Senior Physiotherapist' },
  /* Values from the previous assessment, used by the comparison toggle (C16) */
  previous: {
    date: '12-Jul-2026',
    rom: { 'r-hp-abd': { lp:'32', rp:'28' }, 'r-an-df': { lp:'4', rp:'2' }, 'r-hp-pop': { lp:'48', rp:'52' } },
    strength: { 's-hp-flx': { l:'3', r:'3' }, 's-kn-ext': { l:'3', r:'2' } },
    tone: { 't-an-pf': { l:'2', r:'2' }, 't-hp-add': { l:'1+', r:'2' } }
  }
};
