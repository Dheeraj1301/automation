import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_membership, require_role
from app.core.theme_recommendation import recommend_theme_with_ai
from app.db.session import get_db
from app.models.membership import Membership
from app.models.setting import Setting
from app.schemas.ai_config import AIConfigData
from app.schemas.storefront_config import StorefrontConfigData, ThemeId

router = APIRouter()

CATALOG_ROLES = ("owner", "admin", "staff")
STOREFRONT_CONFIG_KEY = "storefront_config"
AI_CONFIG_KEY = "ai_config"


def _get_setting(db: Session, org_id: uuid.UUID) -> Setting | None:
    return db.query(Setting).filter(Setting.organization_id == org_id, Setting.key == STOREFRONT_CONFIG_KEY).first()


@router.get("", response_model=StorefrontConfigData)
def get_storefront_config(
    org_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> StorefrontConfigData:
    setting = _get_setting(db, org_id)
    if setting is None:
        return StorefrontConfigData()
    return StorefrontConfigData.model_validate(setting.value)


@router.put("", response_model=StorefrontConfigData)
def update_storefront_config(
    org_id: uuid.UUID,
    payload: StorefrontConfigData,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> StorefrontConfigData:
    value = payload.model_dump(mode="json")
    setting = _get_setting(db, org_id)
    if setting is None:
        setting = Setting(organization_id=org_id, key=STOREFRONT_CONFIG_KEY, value=value)
        db.add(setting)
    else:
        setting.value = value
    db.commit()
    db.refresh(setting)
    return StorefrontConfigData.model_validate(setting.value)


@router.get("/recommend-theme", response_model=dict[str, str])
def recommend_theme(
    org_id: uuid.UUID,
    industry: str = Query(default=""),
    description: str = Query(default=""),
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> dict[str, ThemeId]:
    """Reads the live form values from query params when given (so the
    editing UI can preview a recommendation before saving anything); falls
    back to the org's already-saved AI Config business description.
    """
    if not industry and not description:
        ai_setting = db.query(Setting).filter(Setting.organization_id == org_id, Setting.key == AI_CONFIG_KEY).first()
        if ai_setting is not None:
            ai_config = AIConfigData.model_validate(ai_setting.value)
            description = ai_config.business_description
            industry = ai_config.target_audience

    theme = recommend_theme_with_ai(industry, description)
    return {"theme": theme}
