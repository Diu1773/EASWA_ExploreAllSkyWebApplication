import type { RecordTemplate } from '../types/record';

// Mirror of backend/survey_templates/transit_record.json (v3) — used to seed
// recordAnswers defaults. v3 trimmed the form to the four interpretation
// questions rendered in the block's Step 6; the title is auto-generated, and
// the quality/confidence/free-note questions were removed as duplicates of the
// fit-step diagnostics.
export const defaultTransitRecordTemplate: RecordTemplate = {
  id: 'transit_record',
  workflow: 'transit_lab',
  title: 'Transit Analysis Record',
  description:
    'Interpretation record for the transit block (Step 6): visibility judgement, observed issues, reference comparison, and a follow-up plan.',
  version: 3,
  questions: [
    {
      id: 'transit_visible',
      label: 'Is a transit-like dip visible in the light curve?',
      type: 'radio',
      required: true,
      options: [
        { value: 'clear', label: 'Yes, clearly visible' },
        { value: 'possible', label: 'Possibly visible' },
        { value: 'unclear', label: 'Unclear / noisy' },
        { value: 'not_seen', label: 'No obvious dip' },
      ],
    },
    {
      id: 'issues_observed',
      label: 'What issues did you notice?',
      type: 'checkbox',
      options: [
        { value: 'few_comparisons', label: 'Too few good comparison stars' },
        { value: 'blended_field', label: 'Nearby stars appear blended' },
        { value: 'noisy_curve', label: 'Light curve is noisy' },
        { value: 'field_too_small', label: 'Field of view felt too small' },
        { value: 'none', label: 'No major issues' },
      ],
    },
    {
      id: 'reference_comparison',
      label:
        'How does your measured result compare with the NASA reference value, and what causes the difference?',
      type: 'textarea',
      required: true,
      placeholder:
        'Compare Rp/R*, transit depth, or period. Explain possible causes of the difference using evidence from the data and analysis conditions.',
      help_text:
        'Consider comparison-star quality, blending, aperture choice, selected time range, noise, and model assumptions.',
      options: [],
    },
    {
      id: 'next_step',
      label: 'If you repeated this analysis, what would you change?',
      type: 'textarea',
      placeholder: 'Example: use a larger field, different comparison stars, or try another sector.',
      options: [],
    },
  ],
};
