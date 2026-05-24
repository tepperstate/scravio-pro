import os
import sys

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.models.user import User
from app.core.security import get_password_hash

def seed_db():
    print("Starting database seed process...")
    
    # 1. Add is_admin column to users table if it doesn't exist
    with engine.begin() as conn:
        print("Checking if is_admin column exists and adding it if missing...")
        # NeonDB is PostgreSQL
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;"))
        print("Column is_admin ensured.")

    db = SessionLocal()
    try:
        # 2. Create 2 Admin users with 10 million credits
        admins = [
            {"email": "admin1@scravio.com", "full_name": "Admin One", "credits": 10000000},
            {"email": "admin2@scravio.com", "full_name": "Admin Two", "credits": 10000000},
        ]
        
        for admin_data in admins:
            user = db.query(User).filter(User.email == admin_data["email"]).first()
            if not user:
                user = User(
                    email=admin_data["email"],
                    hashed_password=get_password_hash("admin123"),
                    full_name=admin_data["full_name"],
                    is_active=True,
                    is_premium=True,
                    is_admin=True,
                    credits_remaining=admin_data["credits"]
                )
                db.add(user)
                print(f"Created Admin: {admin_data['email']} with {admin_data['credits']} credits.")
            else:
                # Update existing user to ensure they are admin and have credits
                user.is_admin = True
                user.credits_remaining = admin_data["credits"]
                print(f"Updated existing Admin: {admin_data['email']}")
                
        # 3. Create 5 Regular users with 1 million credits
        for i in range(1, 6):
            email = f"user{i}@example.com"
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    hashed_password=get_password_hash("user123"),
                    full_name=f"User {i}",
                    is_active=True,
                    is_premium=True,
                    is_admin=False,
                    credits_remaining=1000000
                )
                db.add(user)
                print(f"Created User: {email} with 1,000,000 credits.")
            else:
                user.credits_remaining = 1000000
                print(f"Updated existing User: {email}")

        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
