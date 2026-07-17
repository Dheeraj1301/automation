from pydantic import BaseModel


class ZohoConnectResponse(BaseModel):
    authorization_url: str


class ZohoStatusResponse(BaseModel):
    connected: bool
    connected_email: str | None = None
