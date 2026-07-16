import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_membership, require_role
from app.db.session import get_db
from app.models.membership import Membership
from app.models.setting import Setting
from app.schemas.ai_config import AIConfigData

router = APIRouter()

CATALOG_ROLES = ("owner", "admin", "staff")
AI_CONFIG_KEY = "ai_config"


def _get_setting(db: Session, org_id: uuid.UUID) -> Setting | None:
    return db.query(Setting).filter(Setting.organization_id == org_id, Setting.key == AI_CONFIG_KEY).first()


@router.get("", response_model=AIConfigData)
def get_ai_config(
    org_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> AIConfigData:
    setting = _get_setting(db, org_id)
    if setting is None:
        return AIConfigData()
    return AIConfigData.model_validate(setting.value)


@router.put("", response_model=AIConfigData)
def update_ai_config(
    org_id: uuid.UUID,
    payload: AIConfigData,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> AIConfigData:
    value = payload.model_dump(mode="json")
    setting = _get_setting(db, org_id)
    if setting is None:
        setting = Setting(organization_id=org_id, key=AI_CONFIG_KEY, value=value)
        db.add(setting)
    else:
        setting.value = value
    db.commit()
    db.refresh(setting)
    return AIConfigData.model_validate(setting.value)
