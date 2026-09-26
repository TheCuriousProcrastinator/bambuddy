"""Integration coverage for aggregate F-code inventory merge semantics."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.spool import Spool
from backend.app.models.spool_assignment import SpoolAssignment
from backend.app.models.spool_usage_history import SpoolUsageHistory


async def _spool(db: AsyncSession, **overrides) -> Spool:
    data = {
        "material": "PLA",
        "subtype": "Basic",
        "brand": "Bambu Lab",
        "rgba": "FF6A00FF",
        "label_weight": 1000,
        "weight_used": 0,
    }
    data.update(overrides)
    row = Spool(**data)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@pytest.mark.asyncio
@pytest.mark.integration
async def test_merge_duplicate_into_existing_fcode_keeps_target_stock(
    async_client: AsyncClient,
    db_session: AsyncSession,
    printer_factory,
):
    """Duplicate row disappears without adding its grams to the F-code bucket."""
    printer = await printer_factory(name="P1S")
    target = await _spool(
        db_session,
        note="F0001",
        label_weight=2000,
        weight_used=987,
    )
    source = await _spool(
        db_session,
        note=None,
        label_weight=1000,
        weight_used=0,
    )

    # Existing F-code is already the bucket assigned to the printer.
    db_session.add(
        SpoolAssignment(
            spool_id=target.id,
            printer_id=printer.id,
            ams_id=0,
            tray_id=2,
        )
    )
    # Historical rows on the duplicate must not be deleted by the merge.
    usage = SpoolUsageHistory(
        spool_id=source.id,
        printer_id=printer.id,
        print_name="old-print.3mf",
        weight_used=7,
        percent_used=1,
        status="completed",
    )
    db_session.add(usage)
    await db_session.commit()
    await db_session.refresh(usage)

    response = await async_client.post(
        f"/api/v1/inventory/spools/{source.id}/merge",
        json={"target_spool_id": target.id, "code": "F0001"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == target.id
    assert body["note"] == "F0001"
    assert body["label_weight"] == 2000
    assert body["weight_used"] == 987
    assert body["label_weight"] - body["weight_used"] == 1013

    missing_source = await async_client.get(f"/api/v1/inventory/spools/{source.id}")
    assert missing_source.status_code == 404

    moved_usage = (
        await db_session.execute(
            select(SpoolUsageHistory).where(SpoolUsageHistory.id == usage.id)
        )
    ).scalar_one()
    assert moved_usage.spool_id == target.id

    assignments = await async_client.get("/api/v1/inventory/assignments")
    target_slots = [
        row for row in assignments.json()
        if row["spool_id"] == target.id
    ]
    assert {(row["ams_id"], row["tray_id"]) for row in target_slots} == {(0, 2)}


@pytest.mark.asyncio
@pytest.mark.integration
async def test_merge_refuses_source_that_is_still_assigned(
    async_client: AsyncClient,
    db_session: AsyncSession,
    printer_factory,
):
    """Live-slot rows must be moved with the printer F-code picker first."""
    printer = await printer_factory(name="P1S")
    target = await _spool(db_session, note="F0001", label_weight=2000, weight_used=500)
    source = await _spool(db_session, note=None, label_weight=1000, weight_used=0)

    db_session.add(
        SpoolAssignment(
            spool_id=source.id,
            printer_id=printer.id,
            ams_id=0,
            tray_id=3,
        )
    )
    await db_session.commit()

    response = await async_client.post(
        f"/api/v1/inventory/spools/{source.id}/merge",
        json={"target_spool_id": target.id, "code": "F0001"},
    )
    assert response.status_code == 409

    source_still_exists = await async_client.get(f"/api/v1/inventory/spools/{source.id}")
    assert source_still_exists.status_code == 200


@pytest.mark.asyncio
@pytest.mark.integration
async def test_merge_rejects_mismatched_filament_identity(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Typing the wrong existing F-code must not delete a different material row."""
    target = await _spool(
        db_session,
        material="PLA",
        note="F0001",
        label_weight=2000,
        weight_used=500,
    )
    source = await _spool(
        db_session,
        material="PETG",
        note=None,
        label_weight=1000,
        weight_used=0,
    )

    response = await async_client.post(
        f"/api/v1/inventory/spools/{source.id}/merge",
        json={"target_spool_id": target.id, "code": "F0001"},
    )
    assert response.status_code == 409

    source_still_exists = await async_client.get(f"/api/v1/inventory/spools/{source.id}")
    assert source_still_exists.status_code == 200
