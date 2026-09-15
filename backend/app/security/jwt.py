from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:
            return None

        return int(user_id)

    except (JWTError, ValueError, TypeError):
        return None