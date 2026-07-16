"""
Billing provider interface. ProfitPilot has no live payment gateway yet -
BillingProviderMock always reports the organization's stored `plan` column
as an active subscription. When a real provider (Stripe/Razorpay/etc) is
wired up, it implements BillingProvider and gets swapped in wherever
`billing_provider` is used - callers never change.
"""

from abc import abstractmethod
from dataclasses import dataclass

from app.models.organization import Organization
from app.services.base import ExternalServiceInterface

PLAN_SEAT_LIMITS: dict[str, int | None] = {"free": 1, "pro": 5, "enterprise": None}
PLANS = tuple(PLAN_SEAT_LIMITS.keys())


@dataclass
class SubscriptionStatus:
    plan: str
    is_active: bool
    seat_limit: int | None


class BillingProvider(ExternalServiceInterface):
    @abstractmethod
    def get_subscription(self, organization: Organization) -> SubscriptionStatus: ...


class BillingProviderMock(BillingProvider):
    def get_subscription(self, organization: Organization) -> SubscriptionStatus:
        return SubscriptionStatus(
            plan=organization.plan,
            is_active=True,
            seat_limit=PLAN_SEAT_LIMITS.get(organization.plan),
        )


billing_provider: BillingProvider = BillingProviderMock()
