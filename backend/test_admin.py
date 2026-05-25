from app.core.database import SessionLocal
from app.api.admin import get_system_stats, list_all_campaigns
import asyncio

async def test():
    db = SessionLocal()
    try:
        print("Testing stats...")
        stats = await get_system_stats(db=db, admin_user=None)
        print("Stats:", stats)
        
        print("Testing campaigns...")
        campaigns = await list_all_campaigns(skip=0, limit=10, db=db, admin_user=None)
        print("Campaigns:", campaigns)
    except Exception as e:
        print("ERROR:", e)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test())
