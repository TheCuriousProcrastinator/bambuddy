import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import InventoryPageRouter from '../../pages/InventoryPage';
import { render } from '../utils';
import { server } from '../mocks/server';

const BASE_SPOOL = {
  id: 1,
  material: 'PLA',
  subtype: 'Basic',
  brand: 'Bambu Lab',
  color_name: 'Orange',
  rgba: 'FF6A00FF',
  extra_colors: null,
  effect_type: null,
  label_weight: 1000,
  core_weight: 250,
  core_weight_catalog_id: null,
  weight_used: 0,
  weight_used_baseline: 0,
  slicer_filament: null,
  slicer_filament_name: null,
  nozzle_temp_min: null,
  nozzle_temp_max: null,
  note: null,
  tag_uid: null,
  tray_uuid: null,
  data_origin: null,
  tag_type: null,
  cost_per_kg: null,
  weight_locked: false,
  last_scale_weight: null,
  last_weighed_at: null,
  category: null,
  low_stock_threshold_pct: null,
  storage_location: null,
  location_id: null,
  added_full: null,
  last_used: null,
  encode_time: null,
  archived_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  k_profiles: [],
};

const COLUMN_CONFIG = JSON.stringify([
  { id: 'note', visible: true },
  { id: 'rgba', visible: true },
  { id: 'material', visible: true },
  { id: 'brand', visible: true },
  { id: 'location', visible: true },
  { id: 'label_weight', visible: true },
  { id: 'net', visible: true },
  { id: 'remaining', visible: true },
]);

describe('InventoryPage inline aggregate stock editing', () => {
  let spools: Array<Record<string, any>>;
  let lastPatch: Record<string, unknown> | null;
  let lastMerge: Record<string, unknown> | null;

  beforeEach(() => {
    localStorage.clear();
    spools = [];
    lastPatch = null;
    lastMerge = null;

    server.use(
      http.get('/api/v1/settings/', () => HttpResponse.json({
        currency: 'USD',
        date_format: 'system',
        low_stock_threshold: 20,
        location_sensor_poll_interval: 120,
        inventory_column_config: COLUMN_CONFIG,
      })),
      http.get('/api/v1/settings/spoolman', () => HttpResponse.json({
        spoolman_enabled: 'false',
        spoolman_url: '',
        spoolman_sync_mode: 'auto',
        spoolman_disable_weight_sync: 'false',
        spoolman_report_partial_usage: 'true',
        auto_add_unknown_rfid: 'false',
      })),
      http.get('/api/v1/inventory/spools', () => HttpResponse.json(spools)),
      http.get('/api/v1/inventory/assignments', () => HttpResponse.json([])),
      http.get('/api/v1/inventory/catalog', () => HttpResponse.json([])),
      http.get('/api/v1/inventory/locations', () => HttpResponse.json([])),
      http.get('/api/v1/location-ha-sensors/', () => HttpResponse.json([])),
      http.patch('/api/v1/inventory/spools/:id', async ({ params, request }) => {
        const id = Number(params.id);
        const payload = await request.json() as Record<string, unknown>;
        lastPatch = payload;
        const index = spools.findIndex((spool) => spool.id === id);
        if (index < 0) return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
        spools[index] = { ...spools[index], ...payload };
        return HttpResponse.json(spools[index]);
      }),
      http.post('/api/v1/inventory/spools/:id/merge', async ({ params, request }) => {
        const sourceId = Number(params.id);
        const payload = await request.json() as { target_spool_id: number; code: string };
        lastMerge = payload;
        const target = spools.find((spool) => spool.id === payload.target_spool_id);
        if (!target) return HttpResponse.json({ detail: 'Target not found' }, { status: 404 });
        spools = spools.filter((spool) => spool.id !== sourceId);
        return HttpResponse.json(target);
      }),
    );
  });

  it('edits Net as aggregate stock while preserving consumed grams', async () => {
    const user = userEvent.setup();
    spools = [{
      ...BASE_SPOOL,
      id: 11,
      brand: 'Net Test',
      label_weight: 1000,
      weight_used: 200,
    }];

    render(<InventoryPageRouter />);

    const row = (await screen.findByText('Net Test')).closest('tr');
    expect(row).not.toBeNull();

    await user.click(within(row!).getByRole('button', { name: 'Edit Net weight' }));
    const input = within(row!).getByRole('spinbutton', { name: 'Net weight' });
    await user.clear(input);
    await user.type(input, '1500{enter}');

    await waitFor(() => {
      expect(lastPatch).toEqual({ label_weight: 1700 });
    });
    expect(lastPatch).not.toHaveProperty('weight_used');
  });

  it('assigns a new F-code without changing the row weight', async () => {
    const user = userEvent.setup();
    spools = [{
      ...BASE_SPOOL,
      id: 12,
      brand: 'New Code Test',
      label_weight: 1000,
      weight_used: 150,
    }];

    render(<InventoryPageRouter />);

    const row = (await screen.findByText('New Code Test')).closest('tr');
    expect(row).not.toBeNull();

    await user.click(within(row!).getByRole('button', { name: 'Edit Filament code or note' }));
    const input = within(row!).getByRole('textbox', { name: 'Filament code or note' });
    await user.type(input, 'F0099{enter}');

    await waitFor(() => {
      expect(lastPatch).toEqual({ note: 'F0099' });
    });
    expect(lastPatch).not.toHaveProperty('label_weight');
    expect(lastPatch).not.toHaveProperty('weight_used');
  });

  it('merges an unassigned duplicate into an existing F-code without adding weight', async () => {
    const user = userEvent.setup();
    spools = [
      {
        ...BASE_SPOOL,
        id: 20,
        brand: 'Duplicate Row',
        label_weight: 1000,
        weight_used: 0,
        note: null,
      },
      {
        ...BASE_SPOOL,
        id: 21,
        brand: 'Aggregate Row',
        label_weight: 2000,
        weight_used: 987,
        note: 'F0001',
      },
    ];

    render(<InventoryPageRouter />);

    const sourceRow = (await screen.findByText('Duplicate Row')).closest('tr');
    expect(sourceRow).not.toBeNull();

    await user.click(within(sourceRow!).getByRole('button', { name: 'Edit Filament code or note' }));
    const input = within(sourceRow!).getByRole('textbox', { name: 'Filament code or note' });
    await user.type(input, 'F0001{enter}');

    await waitFor(() => {
      expect(lastMerge).toEqual({ target_spool_id: 21, code: 'F0001' });
    });

    expect(lastPatch).toBeNull();
    await waitFor(() => {
      expect(screen.queryByText('Duplicate Row')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Aggregate Row')).toBeInTheDocument();
  });
});
