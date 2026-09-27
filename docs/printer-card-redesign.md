# Printer Card Redesign - M/L Design Contract

Status: approved design direction, implementation branch
Baseline: `alex-custom` / v1.2.5.6
Branch: `feature/printer-card-redesign`

## Goal

Redesign the Printers page card without changing printer behavior, API behavior, MQTT state handling, permissions, mutations, or existing workflows.

M and L use the exact same composition. L is a proportional scale-up of M. No information moves and no extra information appears at L.

## Design principles

- One clear information hierarchy.
- Printer state and current job outrank diagnostics and configuration.
- AMS is treated as a physical subsystem attached to the printer and appears directly below printer identity.
- Common monitoring information stays visible.
- Secondary and rare controls use progressive disclosure.
- Whitespace and proximity do the grouping. Avoid nested boxes, excessive borders, pills, and section rules.
- Color is semantic. Green means active/good, amber means attention, red means danger/destructive.
- Theme engine and existing semantic CSS variables remain intact.

## Composition order

1. Printer header
2. AMS shelf
3. Current job / ready state
4. Telemetry strip
5. Footer actions

This order is identical for M and L.

## Card sizing

### M
- target width: ~720 px
- outer padding: 16 px
- major vertical gap: 16 px
- internal gap: 8 px
- card radius: 14 px
- control height: 36 px

### L
- target width: ~900 px
- same structure and proportions
- scale factor: about 1.2x
- outer padding: 20 px
- major vertical gap: 20 px
- internal gap: 10 px
- card radius: 16 px
- control height: 43 px

M/L scaling must come from shared tokens/custom properties rather than separate markup.

## 1. Printer header

Left:
- printer thumbnail
- printer name, primary
- model + installed nozzle size, secondary

Right:
- connection state as dot + text
- overflow menu

Do not show normal-state pills for:
- Wi-Fi strength
- HMS OK
- maintenance OK
- firmware version/up-to-date
- other routine health checks

Normal values belong in overflow/details.

Exception states surface contextually:
- connection failure
- HMS warning/error
- maintenance due
- firmware update if intentionally retained as actionable
- other genuine problems

A problem chip may appear without changing the geometry of the rest of the card.

## 2. AMS shelf

AMS appears immediately below the printer header to reflect the physical relationship between AMS and printer.

AMS header:
- left: `AMS-A` / actual unit label
- right: explicit `Humidity 17%` and `30.8°C`
- humidity must never be represented only by an unlabeled droplet/percentage

Slots:
- four equal bays
- external spool follows as a separate bay with a slightly larger spacing break
- slot number
- material
- F-code
- remaining-filament bar
- active slot uses restrained accent outline
- empty slots visually recede

Preserve all current hover cards, assignment interactions, RFID actions, loading states, backup indicators, runout states, F-code picker behavior, and drag/drop behavior.

## 3. Current job area

This is the visual center of the card.

Printing state:
- print thumbnail left
- right column:
  - state label
  - print name
  - progress bar + percentage
  - metadata line: remaining time, ETA, layers

Idle state uses the same footprint:
- `Ready to print`
- quiet placeholder/thumbnail
- no fake progress prominence

Paused/error states reuse the same structure with semantic status changes.

## 4. Telemetry strip

One continuous horizontal strip, not independent mini-cards.

Default visible telemetry:
- Nozzle
- Bed
- Fans

AMS humidity and AMS temperature stay in the AMS header and are not duplicated here.

Use:
- subtle vertical separators
- stronger values than labels
- neutral temperature colors in normal state
- semantic color only when state requires it

Existing heater history and control popovers remain reachable from the relevant telemetry item.

## 5. Footer actions

Left:
- Controls
- Camera

Right:
- while printing: Pause + Stop
- while idle: primary Print
- context-specific actions keep their existing permission and availability rules

`Controls` is the progressive-disclosure entry point for secondary commands such as:
- chamber light
- jog/movement
- fan overrides
- speed
- airduct controls
- other less-frequent printer commands

Destructive Stop remains visually distinct.

## Visual language

- page: near-black neutral
- card: one raised neutral surface
- internal grouping mostly by spacing
- avoid border around every metric
- avoid all-caps section labels where hierarchy already makes grouping obvious
- primary text: high contrast
- secondary text: muted but readable
- tertiary metadata: lower contrast
- accent green: active/primary state only
- amber/red reserved for attention/danger
- no decorative green pills for routine healthy state

## Typography

Use the existing self-hosted Inter family.

M reference:
- printer name: 20 px / semibold
- job name: 18 px / semibold
- primary values: 16 px / semibold
- labels: 11-12 px
- metadata: 12-13 px

L scales the same hierarchy by the shared M/L scale factor.

## Interaction and accessibility

- preserve native text selection/edit behavior
- minimum practical pointer target: 32 px, preferably 36+ px for card controls
- maintain visible keyboard focus
- icon-only controls require tooltips / accessible labels
- hover cannot be the only way to discover critical status
- responsive scaling must not change action order or meaning

## Functional contract

The redesign must not alter:
- printer status queries
- WebSocket/MQTT-derived state
- temperature mutations
- fan controls
- AMS load/unload
- RFID refresh
- F-code assignment
- inventory/Spoolman integration
- drying
- pause/resume/stop
- camera behavior
- drag/drop printing
- permissions
- diagnostics
- maintenance
- firmware operations
- heater/AMS history
- keyboard behavior

## Implementation strategy

1. Preserve `alex-custom` as stable.
2. Work only on `feature/printer-card-redesign`.
3. Extract presentation boundaries around existing logic before deleting/rearranging behavior.
4. Introduce shared M/L design tokens.
5. Implement the approved composition.
6. Keep S unchanged initially.
7. Run existing PrintersPage regression tests after each structural step.
8. Add focused tests for:
   - explicit AMS humidity label
   - identical M/L content/order
   - healthy-state badge suppression
   - warning/error surfacing
   - footer primary actions
9. Build production image only after frontend tests and typecheck pass.
10. Do not merge or deploy until manual P1S + AMS validation passes.
