# Printer Card Redesign - M/L Design Contract

Baseline: `alex-custom`
Implementation branch: `feature/printer-card-redesign-v2`

## Core rule

M and L use the exact same composition. L only scales the same geometry and typography. No elements move and no extra information appears.

## Approved order

1. Printer header
2. AMS
3. Current job
4. Telemetry
5. Actions

## Visual rules

- AMS sits directly below printer identity.
- AMS humidity is explicitly labeled.
- Healthy diagnostic/status pills do not dominate the card.
- Job status and progress are the visual center.
- Telemetry is calmer and visually grouped.
- Rare controls use progressive disclosure.
- Avoid nested boxes and unnecessary section dividers.
- Preserve the existing theme engine and all printer behavior.

## Implementation plan

Each step is a separate commit and must pass CI before the next step.

1. Add M/L redesign flag and shared scale tokens only. No visible layout change.
2. Simplify header healthy-state presentation only.
3. Make AMS humidity label explicit only.
4. Move AMS section above job section, preserving its existing markup and behavior.
5. Remove redundant FILAMENTS/STATUS visual dividers for M/L only.
6. Restyle current-job surface only.
7. Restyle telemetry grouping only.
8. Restyle action/footer hierarchy only.
9. Bound M/L card widths in the page grid.
10. Full regression suite and manual P1S + AMS validation.

S and XL remain unchanged during this phase.
