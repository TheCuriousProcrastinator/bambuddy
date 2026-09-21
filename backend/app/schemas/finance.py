import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class WalletBalanceResponse(BaseModel):
    user_id: int
    balance: float
    currency: str
    updated_at: datetime | None = None


class WalletTransactionResponse(BaseModel):
    id: int
    user_id: int
    cost_center_id: int | None = None
    transaction_type: Literal["print_charge", "deposit", "withdraw", "manual_adjustment"]
    amount: float
    balance_after: float | None = None
    description: str | None = None
    created_by_user_id: int | None = None
    print_run_id: str | None = None
    print_archive_id: int | None = None
    print_queue_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class WalletTransactionListResponse(BaseModel):
    items: list[WalletTransactionResponse]
    total: int
    limit: int
    offset: int


class CostCenterSummaryResponse(BaseModel):
    id: int
    name: str
    is_private: bool
    owner_user_id: int | None = None
    is_active: bool
    total_balance: float = 0.0
    total_budget: float | None = None
    monthly_budget: float | None = None
    budget_mode: str = "none"
    budget_limit: float | None = None
    budget_used: float | None = None
    budget_available: float | None = None
    can_print: bool = True

    class Config:
        from_attributes = True


class WalletAdjustmentRequest(BaseModel):
    amount: float = Field(..., gt=0)
    description: str | None = None
    cost_center_id: int | None = None


class WalletAdjustmentResponse(BaseModel):
    transaction: WalletTransactionResponse
    balance: WalletBalanceResponse


class TransactionEditRequest(BaseModel):
    user_id: int | None = None
    cost_center_id: int | None = None
    amount: float | None = None
    description: str | None = None


class ManualPrintRequest(BaseModel):
    user_id: int
    cost_center_id: int
    amount: float = Field(..., gt=0)
    description: str | None = None
    created_at: datetime | None = None


class CostCenterCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    total_budget: float | None = Field(default=None, ge=0)
    monthly_budget: float | None = Field(default=None, ge=0)
    is_active: bool = True


class CostCenterUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    is_active: bool | None = None


class CostCenterBudgetUpdateRequest(BaseModel):
    total_budget: float | None = Field(default=None, ge=0)
    monthly_budget: float | None = Field(default=None, ge=0)


class CostCenterMemberRequest(BaseModel):
    user_id: int
    can_print: bool = True


class CostCenterMemberResponse(BaseModel):
    id: int
    cost_center_id: int
    user_id: int
    can_print: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CostCenterDetailResponse(CostCenterSummaryResponse):
    members: list[CostCenterMemberResponse] = []

class FilamentFinanceSummaryResponse(BaseModel):
    opening_filament_purchases: float
    opening_filament_consumed_cost: float
    print_log_cutoff_id: int
    purchase_total: float
    cash_spent_total: float
    post_cutoff_consumed_cost: float
    consumed_cost_total: float
    purchase_count: int
    post_cutoff_print_count: int
    unpriced_post_cutoff_prints: int


class FilamentPurchaseCreateRequest(BaseModel):
    purchase_date: date
    amount_paid: float = Field(..., gt=0)
    quantity_kg: float = Field(..., gt=0)
    inventory_id: str | None = Field(default=None, max_length=32)
    vendor: str | None = Field(default=None, max_length=150)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("inventory_id")
    @classmethod
    def validate_inventory_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if not normalized:
            return None
        if not re.fullmatch(r"F\d{4}", normalized):
            raise ValueError("inventory_id must be F followed by four digits")
        return normalized

    @field_validator("vendor", "note")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class FilamentPurchaseResponse(BaseModel):
    id: int
    purchase_date: date
    amount_paid: float
    quantity_kg: float
    inventory_id: str | None = None
    vendor: str | None = None
    note: str | None = None
    price_per_kg: float
    created_at: datetime

    class Config:
        from_attributes = True


class FilamentPurchaseListResponse(BaseModel):
    items: list[FilamentPurchaseResponse]
    total: int
    limit: int
    offset: int
