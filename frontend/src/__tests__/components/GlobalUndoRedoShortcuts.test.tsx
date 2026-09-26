import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, waitFor } from '../utils';
import { http, HttpResponse } from 'msw';

import { GlobalUndoRedoShortcuts } from '../../components/GlobalUndoRedoShortcuts';
import { server } from '../mocks/server';


describe('GlobalUndoRedoShortcuts', () => {
  let undoCalls = 0;
  let redoCalls = 0;

  beforeEach(() => {
    undoCalls = 0;
    redoCalls = 0;
    server.use(
      http.post('/api/v1/inventory/undo', () => {
        undoCalls += 1;
        return HttpResponse.json({
          changed: true,
          action: 'inventory.merge',
          message: 'Undid merge',
        });
      }),
      http.post('/api/v1/inventory/redo', () => {
        redoCalls += 1;
        return HttpResponse.json({
          changed: true,
          action: 'inventory.merge',
          message: 'Redid merge',
        });
      }),
    );
  });

  it('uses Cmd+Z for global undo', async () => {
    render(<GlobalUndoRedoShortcuts />);
    fireEvent.keyDown(document, { key: 'z', metaKey: true });
    await waitFor(() => expect(undoCalls).toBe(1));
    expect(redoCalls).toBe(0);
  });

  it('uses Cmd+Shift+Z for global redo', async () => {
    render(<GlobalUndoRedoShortcuts />);
    fireEvent.keyDown(document, { key: 'z', metaKey: true, shiftKey: true });
    await waitFor(() => expect(redoCalls).toBe(1));
    expect(undoCalls).toBe(0);
  });

  it('leaves native text-field undo alone', async () => {
    const { container } = render(
      <>
        <GlobalUndoRedoShortcuts />
        <input aria-label="editor" />
      </>,
    );
    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    fireEvent.keyDown(input!, { key: 'z', metaKey: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(undoCalls).toBe(0);
    expect(redoCalls).toBe(0);
  });
});
