"""Validate room tickets issued by the Express API, never client-supplied roles."""
import re

import jwt


def verify_ticket(token, secret):
    if not isinstance(token, str) or not secret or len(secret.encode()) < 32:
        raise jwt.InvalidTokenError("Invalid interview access")
    claims = jwt.decode(
        token, secret, algorithms=["HS256"], audience="asl-interview",
        issuer="careerconnect-api",
        options={"require": ["exp", "iat", "sub", "room_id", "role"]},
    )
    if claims["role"] not in ("Employer", "Job Seeker"):
        raise jwt.InvalidTokenError("Invalid role")
    if not all(isinstance(claims[key], str) and re.fullmatch(r"[0-9a-f]{24}", claims[key])
               for key in ("room_id", "sub")):
        raise jwt.InvalidTokenError("Invalid room or subject")
    return claims
