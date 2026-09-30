"""Operator commands. Run inside the backend container, e.g.:

    docker compose exec backend python -m app.cli make-admin you@example.com
"""
import argparse
import asyncio
import sys

from sqlalchemy import func
from sqlalchemy.future import select

import app.models  # noqa: F401  (registers every model so relationships resolve)
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def set_admin(email: str, is_admin: bool) -> int:
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(func.lower(User.email) == email.strip().lower()))
        user = res.scalars().first()
        if not user:
            print(f"No registered user with email {email}", file=sys.stderr)
            return 1
        user.is_admin = is_admin
        await db.commit()
        print(f"{user.email} is {'now' if is_admin else 'no longer'} an administrator")
        return 0

def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli", description="CloudControl operator commands")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("make-admin", help="Grant administrator access to a registered user").add_argument("email")
    commands.add_parser("revoke-admin", help="Remove administrator access from a user").add_argument("email")
    args = parser.parse_args()
    return asyncio.run(set_admin(args.email, is_admin=args.command == "make-admin"))

if __name__ == "__main__":
    sys.exit(main())
