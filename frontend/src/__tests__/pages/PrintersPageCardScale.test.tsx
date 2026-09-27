/**
 * Printer-card body scale (#1848, reporter @misterff1).
 *
 * S/M/L/XL already scaled the card's width, thumbnail and printer name, but
 * every label in the body was pinned at 8-11px, so an XL card carried the same
 * tiny text as an S one. The body now scales too, driven by custom properties
 * on the card root.
 *
 * S and M stay at 1.0 on purpose: an existing install must look identical
 * until the user reaches for a size that is already asking for more space.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { render } from '../utils';
import { PrintersPage } from '../../pages/PrintersPage';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

const mockPrinter = {
  id: 1,
  name: 'X1C',
  ip_address: '192.168.1.100',
  serial_number: '01P00A000000001',
  access_code: '12345678',
  model: 'X1C',
  enabled: true,
  nozzle_diameter: 0.4,
  nozzle_type: 'stainless_steel',
  location: 'Workshop',
  auto_archive: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const baseTray = {
  tray_color: 'FF0000FF',
  tray_type: 'PLA',
  tray_sub_brands: 'PLA Basic',
  tray_info_idx: 'GFA00',
  remain: 80,
  k: 0.02,
  cali_idx: null,
  tag_uid: null,
  tray_uuid: null,
  nozzle_temp_min: 190,
  nozzle_temp_max: 230,
  drying_temp: null,
  drying_time: null,
  state: 3,
};

const STATUS = {
  connected: true,
  state: 'IDLE',
  progress: 0,
  layer_num: 0,
  total_layers: 0,
  temperatures: { nozzle: 25, bed: 25, chamber: 25 },
  remaining_time: 0,
  filename: null,
  wifi_signal: -29,
  speed_level: 2,
  ams: [
    {
      id: 0,
      humidity: 30,
      temp: 28.2,
      is_ams_ht: false,
      serial_number: 'AMS00',
      sw_ver: '03.00.21.29',
      dry_time: 0,
      dry_status: 0,
      dry_sub_status: 0,
      dry_sf_reason: [],
      module_type: 'n3f',
      tray: [0, 1, 2, 3].map((id) => ({ id, ...baseTray })),
    },
    {
      // AMS-HT: a single tray, with its temperature and humidity readings
      // beside the slot rather than under it.
      id: 128,
      humidity: 52,
      temp: 28.6,
      is_ams_ht: true,
      serial_number: 'HT00',
      sw_ver: '03.00.21.29',
      dry_time: 0,
      dry_status: 0,
      dry_sub_status: 0,
      dry_sf_reason: [],
      module_type: 'n3s',
      tray: [{ id: 0, ...baseTray }],
    },
  ],
  vt_tray: [],
};

let store: Record<string, string>;

/** Render at a given card size and hand back the card root's inline style. */
async function cardStyleAt(cardSize: string) {
  store['printerCardSize'] = cardSize;
  render(<PrintersPage />);
  const card = await waitFor(() => {
    const el = document.getElementById('printer-card-1');
    if (!el) throw new Error('card not rendered');
    return el as HTMLElement;
  });
  return card.style;
}

/** The AMS slot grid's track sizing, once the status has populated the card. */
async function slotGridColumns(): Promise<string> {
  return waitFor(() => {
    const grid = document.querySelector<HTMLElement>('#printer-card-1 [style*="minmax"]');
    if (!grid) throw new Error('AMS slot grid not rendered');
    return grid.style.gridTemplateColumns;
  });
}

/** The AMS-HT card's own sizing — it is the unit whose readings sit beside the slot. */
async function htCardStyle(): Promise<CSSStyleDeclaration> {
  return waitFor(() => {
    const el = [...document.querySelectorAll<HTMLElement>('#printer-card-1 [class*="rounded-[10px]"]')]
      .find((d) => /^HT-/.test((d.textContent || '').trim()));
    if (!el) throw new Error('AMS-HT card not rendered');
    return el.style;
  });
}

/**
 * The single filament slot inside the AMS-HT card. Scoped through the card
 * itself, since the card carries a max-width of its own.
 */
async function htSlotStyle(): Promise<CSSStyleDeclaration> {
  return waitFor(() => {
    const card = [...document.querySelectorAll<HTMLElement>('#printer-card-1 [class*="rounded-[10px]"]')]
      .find((d) => /^HT-/.test((d.textContent || '').trim()));
    const el = card?.querySelector<HTMLElement>('[style*="max-width"]');
    if (!el) throw new Error('AMS-HT slot not rendered');
    return el.style;
  });
}

describe('PrintersPage — printer card body scale (#1848)', () => {
  beforeEach(() => {
    store = {};
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => store[key] ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key: string, value: string) => {
      store[key] = String(value);
    });
    server.use(
      http.get('/api/v1/printers/', () => HttpResponse.json([mockPrinter])),
      http.get('/api/v1/printers/:id/status', () => HttpResponse.json(STATUS)),
      http.get('/api/v1/queue/', () => HttpResponse.json([])),
    );
  });

  afterEach(() => {
    vi.mocked(localStorage.getItem).mockReset();
    vi.mocked(localStorage.setItem).mockReset();
  });

  it('leaves M — the default — at the sizes shipped before this change', async () => {
    const style = await cardStyleAt('2');

    expect(style.getPropertyValue('--pc-t10')).toBe('10px');
    expect(style.getPropertyValue('--pc-t8')).toBe('8px');
    expect(style.getPropertyValue('--pc-i3')).toBe('12px');
    expect(style.getPropertyValue('--pc-i4')).toBe('16px');
  });

  it('labels AMS humidity explicitly on the redesigned M card', async () => {
    await cardStyleAt('2');

    expect((await screen.findAllByText('Humidity')).length).toBeGreaterThan(0);
  });

  it('orders redesigned M content as printer header, AMS, then current job', async () => {
    server.use(
      http.get('/api/v1/printers/:id/status', () => HttpResponse.json({
        ...STATUS,
        state: 'RUNNING',
        current_print: 'order-test.3mf',
        subtask_name: 'Order Test Job',
        progress: 42,
        remaining_time: 30,
      })),
    );

    await cardStyleAt('2');

    const card = document.getElementById('printer-card-1');
    expect(card).not.toBeNull();

    const header = card!.querySelector('h3');
    expect(header).not.toBeNull();

    const humidity = (await screen.findAllByText('Humidity'))[0];
    const currentJob = await screen.findByText('Order Test Job');

    expect(header!.compareDocumentPosition(humidity) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(humidity.compareDocumentPosition(currentJob) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it.each(['2', '3'])('removes legacy FILAMENTS and STATUS dividers from redesigned size %s', async (cardSize) => {
    await cardStyleAt(cardSize);

    const card = document.getElementById('printer-card-1');
    expect(card).not.toBeNull();

    await within(card!).findAllByText('Humidity');

    expect(within(card!).queryByText('Filaments')).not.toBeInTheDocument();
    expect(within(card!).queryByText('Status')).not.toBeInTheDocument();
  });

  it('keeps legacy FILAMENTS and STATUS dividers on XL', async () => {
    await cardStyleAt('4');

    const card = document.getElementById('printer-card-1');
    expect(card).not.toBeNull();

    expect(await within(card!).findByText('Filaments')).toBeInTheDocument();
    expect(within(card!).getByText('Status')).toBeInTheDocument();
  });

  it.each([
    ['2', 'w-28', 'h-28'],
    ['3', 'w-32', 'h-32'],
  ])('emphasizes the current-job surface at redesigned size %s', async (cardSize, coverWidth, contentHeight) => {
    server.use(
      http.get('/api/v1/printers/:id/status', () => HttpResponse.json({
        ...STATUS,
        state: 'RUNNING',
        current_print: 'surface-test.3mf',
        subtask_name: 'Surface Test Job',
        cover_url: '/surface-test.jpg',
        progress: 42,
        remaining_time: 30,
      })),
    );

    await cardStyleAt(cardSize);

    const jobTitle = await screen.findByText('Surface Test Job');
    expect(jobTitle.className).toContain('text-base');
    expect(jobTitle.className).toContain('font-semibold');

    const surface = jobTitle.closest('div.relative.overflow-hidden');
    expect(surface).not.toBeNull();
    expect(surface!.className).toContain('rounded-xl');
    expect(surface!.className).toContain('border-bambu-dark-tertiary/70');
    expect(surface!.className).toContain('bg-black/10');
    expect(surface!.className).toContain('p-3');

    const coverWrapper = surface!.querySelector('img')?.parentElement;
    expect(coverWrapper).not.toBeNull();
    expect(coverWrapper!.className).toContain(coverWidth);

    const content = jobTitle.parentElement;
    expect(content).not.toBeNull();
    expect(content!.className).toContain(contentHeight);
  });

  it('keeps the legacy current-job surface on XL', async () => {
    server.use(
      http.get('/api/v1/printers/:id/status', () => HttpResponse.json({
        ...STATUS,
        state: 'RUNNING',
        current_print: 'legacy-surface-test.3mf',
        subtask_name: 'Legacy Surface Test Job',
        cover_url: '/legacy-surface-test.jpg',
        progress: 42,
      })),
    );

    await cardStyleAt('4');

    const jobTitle = await screen.findByText('Legacy Surface Test Job');
    expect(jobTitle.className).toContain('text-sm');
    expect(jobTitle.className).not.toContain('font-semibold');

    const surface = jobTitle.closest('div.relative.overflow-hidden');
    expect(surface).not.toBeNull();
    expect(surface!.className).toContain('p-2');
    expect(surface!.className).toContain('bg-bambu-dark');
    expect(surface!.className).toContain('rounded-[10px]');
    expect(surface!.className).not.toContain('bg-black/10');
  });

  it.each(['2', '3'])('groups telemetry into one calm M/L surface at size %s', async (cardSize) => {
    await cardStyleAt(cardSize);

    const temperatures = await screen.findByTestId('printer-telemetry-temperatures');
    const fans = await screen.findByTestId('printer-telemetry-fans');

    expect(temperatures.className).toContain('mt-4');
    expect(temperatures.className).toContain('gap-0');
    expect(temperatures.className).toContain('rounded-t-xl');
    expect(temperatures.className).toContain('border-b-0');
    expect(temperatures.className).toContain('bg-black/10');

    expect(fans.className).toContain('mt-0');
    expect(fans.className).toContain('gap-0');
    expect(fans.className).toContain('rounded-b-xl');
    expect(fans.className).toContain('bg-black/10');

    const firstTemperatureCell = temperatures.querySelector(':scope > div');
    expect(firstTemperatureCell).not.toBeNull();
    expect(firstTemperatureCell!.className).toContain('px-3');
    expect(firstTemperatureCell!.className).toContain('py-2');
    expect(firstTemperatureCell!.className).not.toContain('bg-bambu-dark');
    expect(firstTemperatureCell!.className).not.toContain('rounded-lg');
  });

  it('keeps legacy telemetry grouping on XL', async () => {
    await cardStyleAt('4');

    const temperatures = await screen.findByTestId('printer-telemetry-temperatures');
    const fans = await screen.findByTestId('printer-telemetry-fans');

    expect(temperatures.className).toContain('mt-2');
    expect(temperatures.className).toContain('gap-1.5');
    expect(temperatures.className).not.toContain('bg-black/10');
    expect(temperatures.className).not.toContain('rounded-t-xl');

    expect(fans.className).toContain('mt-2');
    expect(fans.className).toContain('gap-1.5');
    expect(fans.className).not.toContain('bg-black/10');

    const firstTemperatureCell = temperatures.querySelector(':scope > div');
    expect(firstTemperatureCell).not.toBeNull();
    expect(firstTemperatureCell!.className).toContain('bg-bambu-dark');
    expect(firstTemperatureCell!.className).toContain('rounded-lg');
  });

  it.each(['2', '3'])('uses progressive action hierarchy on redesigned size %s', async (cardSize) => {
    await cardStyleAt(cardSize);

    const card = document.getElementById('printer-card-1');
    expect(card).not.toBeNull();

    const section = within(card!).getByTestId('printer-controls-section');
    const trigger = within(card!).getByTestId('printer-controls-trigger');
    const secondary = within(card!).getByTestId('printer-secondary-controls');
    const headerActions = within(card!).getByTestId('printer-header-status-actions');
    const actionsMenu = within(card!).getByTestId('printer-actions-menu');
    const footer = within(card!).getByTestId('printer-footer-actions');

    expect(section.className).toContain('mt-4');
    expect(section.className).toContain('border-t');
    expect(section.className).toContain('pt-3');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(secondary.className).toContain('hidden');
    expect(secondary.className).toContain('absolute');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(secondary.className).toContain('flex');
    expect(secondary.className).not.toContain('hidden');

    expect(headerActions).toContainElement(actionsMenu);
    expect(footer).not.toContainElement(actionsMenu);
  });

  it('keeps legacy action hierarchy on XL', async () => {
    await cardStyleAt('4');

    const card = document.getElementById('printer-card-1');
    expect(card).not.toBeNull();

    const section = within(card!).getByTestId('printer-controls-section');
    const secondary = within(card!).getByTestId('printer-secondary-controls');
    const actionsMenu = within(card!).getByTestId('printer-actions-menu');
    const footer = within(card!).getByTestId('printer-footer-actions');

    expect(within(card!).queryByTestId('printer-controls-trigger')).not.toBeInTheDocument();
    expect(within(card!).queryByTestId('printer-header-status-actions')).not.toBeInTheDocument();

    expect(section.className).toContain('mt-3');
    expect(section.className).not.toContain('border-t');

    expect(secondary.className).toContain('flex');
    expect(secondary.className).not.toContain('absolute');

    expect(footer).toContainElement(actionsMenu);
  });

  it('leaves S at the same sizes — the dense fleet view wants density', async () => {
    const style = await cardStyleAt('1');

    expect(style.getPropertyValue('--pc-t10')).toBe('10px');
    expect(style.getPropertyValue('--pc-i3')).toBe('12px');
  });

  it('scales the body type and icons at L', async () => {
    const style = await cardStyleAt('3');

    expect(style.getPropertyValue('--pc-t10')).toBe('12px');
    expect(style.getPropertyValue('--pc-t8')).toBe('9.6px');
    expect(style.getPropertyValue('--pc-t11')).toBe('13.2px');
    expect(style.getPropertyValue('--pc-i3')).toBe('14.4px');
    expect(style.getPropertyValue('--pc-i4')).toBe('19.2px');
    // The H2C rack chips. They were a hard-coded 28px, so the rack read as a
    // shrunken strip beside neighbours that had grown 20%.
    expect(style.getPropertyValue('--pc-i7')).toBe('33.6px');
  });

  it('scales further at XL, where the card is full width', async () => {
    const style = await cardStyleAt('4');

    expect(style.getPropertyValue('--pc-t10')).toBe('14px');
    expect(style.getPropertyValue('--pc-i4')).toBe('22.4px');
    // Every property is set at every size, so a converted class can never
    // fall through to its fallback while sitting inside a card.
    for (const name of ['--pc-t8', '--pc-t9', '--pc-t10', '--pc-t11',
      '--pc-i2', '--pc-i25', '--pc-i3', '--pc-i35', '--pc-i4', '--pc-i5',
      '--pc-i7']) {
      expect(style.getPropertyValue(name)).not.toBe('');
    }
  });

  // Scaling these along with the type was tried and reverted. The AMS cards
  // already grow to fill their row, so 3.5rem is a floor they sit well above;
  // raising it only costs a unit its place on the row, and a wrapped AMS-HT is
  // then alone on its line where flex-grow stretches its single slot across the
  // whole card.
  it('leaves the AMS slot columns at their fixed floor, at every size', async () => {
    await cardStyleAt('2');
    expect(await slotGridColumns()).toContain('3.5rem');
  });

  it('still leaves them alone at XL, where the type is largest', async () => {
    await cardStyleAt('4');
    expect(await slotGridColumns()).toContain('3.5rem');
    expect(await slotGridColumns()).not.toContain('4.9rem');
  });

  // The AMS-HT does need its width scaled: its readings sit beside the slot,
  // so bigger type eats the room they occupy.
  it('widens the AMS-HT card with the type, and caps how wide it can get', async () => {
    await cardStyleAt('3');
    const ht = await htCardStyle();

    expect(ht.minWidth).toBe('13.2rem'); // 11rem * 1.2
    expect(ht.flex).toContain('13.2rem');
    // Without a ceiling, an AMS-HT that wraps onto a line of its own is the
    // only flex item there and grow stretches its single slot across the
    // entire card, stranding the readings at the far edge.
    expect(ht.maxWidth).toBe('calc(4 * 3.5rem + 3 * 0.25rem + 1rem)');
  });

  it('leaves the AMS-HT card as it was at M', async () => {
    await cardStyleAt('2');
    expect((await htCardStyle()).minWidth).toBe('11rem');
  });

  // The AMS-HT's single slot is the only growable item on its row, so it took
  // every spare pixel and pushed the readings beside it hard against the card
  // edge. Capping it is what keeps them clear.
  it('caps the AMS-HT slot so it cannot swallow the row', async () => {
    await cardStyleAt('2');
    expect((await htSlotStyle()).maxWidth).toBe('7.25rem');
  });

  it('scales that cap with the type, since the slot label scales too', async () => {
    await cardStyleAt('4');
    expect((await htSlotStyle()).maxWidth).toBe('10.15rem'); // 7.25rem * 1.4
  });

  it('drives real elements, not just the root variables', async () => {
    await cardStyleAt('3');

    // The printer name already scaled before this change and still does.
    const heading = await screen.findByRole('heading', { name: 'X1C' });
    expect(heading.className).toContain('text-xl');

    // Body labels now reference the scaled property rather than a fixed px.
    const scaled = document.querySelectorAll('#printer-card-1 [class*="--pc-t"]');
    expect(scaled.length).toBeGreaterThan(0);
  });
});
