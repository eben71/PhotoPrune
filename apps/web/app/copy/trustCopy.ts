export const trustCopy = {
  landing: {
    header: 'Review Similar Photos — Safely',
    subheader:
      'This tool groups photos that appear visually similar so you can review them yourself.',
    safetyLines: [
      'It does not delete anything.',
      'Nothing is stored.',
      'This session is temporary.'
    ],
    doesTitle: 'What this tool does:',
    doesBullets: [
      'Groups photos that look similar',
      'Labels each group with a confidence band',
      'Lets you review results before taking any action'
    ],
    doesNotTitle: 'What this tool does not do:',
    doesNotBullets: [
      'It does not delete photos',
      'It does not make automatic decisions',
      'It does not permanently store your data',
      'It does not guarantee accuracy'
    ],
    sessionWarning: [
      'This is a single-session scan.',
      'If you refresh or close this page, results will be lost.'
    ],
    capNotice: [
      'To protect performance and cost, scans are capped per session.',
      'If the cap is reached, the scan will stop safely.'
    ],
    primaryButton: 'Start Review Session',
    secondaryButton: 'Cancel and Return'
  },
  run: {
    header: 'Scanning for visually similar photos…',
    subtext: [
      'Photos are being analyzed and grouped based on visual similarity patterns.',
      'This may take a moment.'
    ],
    transparency:
      'We group photos based on image structure and visual features — not file names or dates.',
    cancelButton: 'Stop Scan (No Changes Made)',
    cancelMicrocopy: 'Stopping will discard this session.'
  },
  capReached: {
    header: 'Scan limit reached',
    explanation: [
      'To keep this session responsive and cost-controlled, we stop scanning after a fixed number of items.',
      'Some photos may not have been analyzed.'
    ],
    primaryAction: 'Review Current Results',
    secondaryAction: 'End Session'
  },
  results: {
    header: 'Review Similar Photo Groups',
    intro: [
      'Photos are grouped by visual similarity.',
      'Each group is labeled with a confidence band.',
      'You are in full control — nothing is deleted automatically.'
    ],
    confidenceTitle: 'What the confidence bands mean:',
    confidenceBands: {
      HIGH: 'Images are very likely near-duplicates or visually identical.',
      MEDIUM:
        'Images appear similar but may differ in framing, lighting, or subject detail.',
      LOW: 'Images share some visual features but may represent different moments.'
    },
    confidenceFooter:
      'Confidence reflects visual similarity only — not quality, importance, or intent.',
    reasonTitle: 'Why these were grouped:',
    reasonBullets: [
      'Shared visual composition',
      'Matching dominant features',
      'Similar framing or perspective'
    ],
    reasonSummary: 'Reason: Strong visual match across structure and content',
    footnote: 'These are pattern-based matches, not perfect comparisons.',
    emptyHeader: 'No similar photo groups detected',
    emptyDescription: [
      'No groups met the minimum similarity threshold for this session.',
      'This does not mean your library has no duplicates — only that none met the current grouping criteria.'
    ]
  },
  groupDetail: {
    reviewLines: [
      'Review each image carefully.',
      'Visual similarity does not always mean duplication.'
    ],
    neutralSelection: 'Mark for potential removal (review externally)'
  },
  cancelModal: {
    title: 'Are you sure you want to end this session?',
    bullets: [
      'All results will be discarded',
      'No changes will be made to your photos',
      'Nothing has been deleted'
    ],
    primaryAction: 'End Session',
    secondaryAction: 'Continue Reviewing'
  },
  errors: {
    generic: {
      title: 'Something interrupted this session.',
      body: [
        'No photos were changed or deleted.',
        'You can safely start again.'
      ]
    },
    network: {
      title: 'Connection lost.',
      body: ['Your current session cannot continue.', 'No changes were made.']
    },
    processing: {
      title: 'Some images could not be analyzed.',
      body: [
        'This may happen with unsupported formats or corrupted files.',
        'Other results are still valid.'
      ]
    }
  },
  sessionBanner: [
    'This is a single-session scan.',
    'If you refresh or close this page, results will be lost.'
  ]
} as const;
