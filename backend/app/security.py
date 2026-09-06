import bcrypt

# bcrypt truncates silently at 72 bytes; we cap explicitly so a very long
# password does not behave surprisingly.
_MAX_BYTES = 72


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:_MAX_BYTES]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    pw = password.encode("utf-8")[:_MAX_BYTES]
    try:
        return bcrypt.checkpw(pw, password_hash.encode("utf-8"))
    except ValueError:
        # Malformed/legacy hash in the throwaway DB - treat as no match.
        return False
