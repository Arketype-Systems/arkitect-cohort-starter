import type { StandardsVersion } from './types'

export const STARTER_STANDARDS: StandardsVersion = {
  id: 'starter-us-sc-v1', name: 'Editable U.S. S&C Starter Battery', version: '1.0.0', effectiveDate: '2026-08-08', synthetic: true,
  description: 'Synthetic coaching bands for workflow demonstration. These are editable starter standards and are not validated population norms.',
  metrics: [
    { id: 'vertical-jump', name: 'Countermovement Vertical Jump', shortName: 'Vertical jump', unit: 'in', direction: 'higher', weight: 25, required: true, attempts: 3, percentileContext: 'Starter context only. Use a validated cohort before interpreting population rank.', bands: [
      { label: 'Foundation', max: 18, points: 20, color: '#c8645b', meaning: 'Build force production fundamentals.' },
      { label: 'Developing', min: 18, max: 22, points: 40, color: '#d69745', meaning: 'Continue general power development.' },
      { label: 'Ready', min: 22, max: 26, points: 60, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Strong', min: 26, max: 30, points: 80, color: '#63a579', meaning: 'Strong expression of lower body power.' },
      { label: 'Exceptional', min: 30, points: 100, color: '#276f5b', meaning: 'Preserve quality and individualize loading.' }
    ]},
    { id: 'broad-jump', name: 'Standing Broad Jump', shortName: 'Broad jump', unit: 'in', direction: 'higher', weight: 20, required: true, attempts: 3, percentileContext: 'Starter context only. Bands are illustrative, not normative.', bands: [
      { label: 'Foundation', max: 78, points: 20, color: '#c8645b', meaning: 'Build horizontal force fundamentals.' },
      { label: 'Developing', min: 78, max: 90, points: 40, color: '#d69745', meaning: 'Progress horizontal power.' },
      { label: 'Ready', min: 90, max: 102, points: 60, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Strong', min: 102, max: 114, points: 80, color: '#63a579', meaning: 'Strong horizontal power expression.' },
      { label: 'Exceptional', min: 114, points: 100, color: '#276f5b', meaning: 'Preserve quality and monitor asymmetries.' }
    ]},
    { id: 'ten-yard', name: '10 Yard Sprint', shortName: '10 yard', unit: 's', direction: 'lower', weight: 20, required: true, attempts: 2, percentileContext: 'Hand and electronic timing are not interchangeable. Keep collection methods consistent.', bands: [
      { label: 'Exceptional', max: 1.65, points: 100, color: '#276f5b', meaning: 'Exceptional starter acceleration band.' },
      { label: 'Strong', min: 1.65, max: 1.75, points: 80, color: '#63a579', meaning: 'Strong starter acceleration band.' },
      { label: 'Ready', min: 1.75, max: 1.85, points: 60, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Developing', min: 1.85, max: 2.0, points: 40, color: '#d69745', meaning: 'Develop projection and early acceleration.' },
      { label: 'Foundation', min: 2.0, points: 20, color: '#c8645b', meaning: 'Build sprint positions and force application.' }
    ]},
    { id: 'pro-agility', name: '5-10-5 Pro Agility', shortName: 'Pro agility', unit: 's', direction: 'lower', weight: 20, required: true, attempts: 2, percentileContext: 'Surface, footwear, and timing method materially affect results.', bands: [
      { label: 'Exceptional', max: 4.35, points: 100, color: '#276f5b', meaning: 'Exceptional starter change of direction band.' },
      { label: 'Strong', min: 4.35, max: 4.6, points: 80, color: '#63a579', meaning: 'Strong change of direction expression.' },
      { label: 'Ready', min: 4.6, max: 4.85, points: 60, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Developing', min: 4.85, max: 5.15, points: 40, color: '#d69745', meaning: 'Develop braking and reacceleration.' },
      { label: 'Foundation', min: 5.15, points: 20, color: '#c8645b', meaning: 'Build deceleration positions and control.' }
    ]},
    { id: 'bench-reps', name: 'Bench Press Repetitions', shortName: 'Bench reps', unit: 'reps', direction: 'higher', weight: 15, required: true, attempts: 1, percentileContext: 'The load must be standardized for a real comparison. This starter demonstrates scoring mechanics only.', bands: [
      { label: 'Foundation', max: 5, points: 20, color: '#c8645b', meaning: 'Build upper body strength capacity.' },
      { label: 'Developing', min: 5, max: 10, points: 40, color: '#d69745', meaning: 'Continue general strength development.' },
      { label: 'Ready', min: 10, max: 15, points: 60, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Strong', min: 15, max: 20, points: 80, color: '#63a579', meaning: 'Strong upper body strength endurance.' },
      { label: 'Exceptional', min: 20, points: 100, color: '#276f5b', meaning: 'Preserve quality and progress deliberately.' }
    ]}
  ]
}
