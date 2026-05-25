# SocialScravio

SocialScravio is an advanced Instagram follower extraction and management system. A comprehensive, open-source email scraper system for extracting and verifying emails from social media platforms. Built with modern technologies and designed to be scalable, reliable, and free.

![SocialScravio Banner](https://via.placeholder.com/1200x400/0ea5e9/ffffff?text=SocialScravio+Email+Scraper)

## 🚀 Features

### Supported Platforms
| Platform | Description | Status |
|----------|-------------|--------|
| 📸 **Instagram** | Extract emails from bios, hashtags, followers, commenters | ✅ Active |
| ▶️ **YouTube** | Extract creator emails from channel About pages | ✅ Active |
| 🎵 **TikTok** | Extract emails from TikTok creator profiles | ✅ Active |
| 💼 **LinkedIn** | Find work/business emails from LinkedIn profiles | ✅ Active |
| 🐦 **X (Twitter)** | Find emails from Twitter/X public profiles | ✅ Active |
| 👥 **Facebook** | Scrape public Facebook profile emails | ✅ Active |

### Key Features
- **4-Layer Email Verification**: Syntax, Domain/MX, SMTP, Catch-all Detection
- **96% Verified Rate** with less than 2% bounce rate
- **Deduplication Engine**: Never scrape the same email twice
- **Multiple Export Formats**: CSV, Excel (XLSX), JSON
- **CRM Integration**: Pre-configured for Instantly, Smartlead, Lemlist, HubSpot
- **Chrome Extension**: Free IG Follower Export with unlimited exports
- **GDPR Compliant**: Source tracking and suppression lists

## 🛠️ Tech Stack

### Backend
- **Framework**: Python FastAPI
- **Database**: PostgreSQL (via Supabase or self-hosted)
- **Task Queue**: Celery + Redis
- **Authentication**: JWT with Supabase Auth

### Frontend
- **Framework**: Next.js 14
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **HTTP Client**: Axios

### Infrastructure
- **Hosting**: Railway, Render, or Fly.io (free tiers)
- **Proxies**: Webshare.io (free tier) or ProxyScrape
- **AI Layer**: Groq API (free) for smart matching

## 📁 Project Structure

```
SocialScravio/
├── backend/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   │   ├── auth.py    # Authentication endpoints
│   │   │   ├── scraping.py # Scraper endpoints
│   │   │   └── exports.py  # Export endpoints
│   │   ├── core/          # Core configurations
│   │   │   ├── config.py  # Settings & environment
│   │   │   ├── database.py # Database connection
│   │   │   └── security.py # Auth utilities
│   │   ├── models/        # SQLAlchemy models
│   │   │   └── user.py    # User & email models
│   │   ├── schemas/       # Pydantic schemas
│   │   │   └── schemas.py # Request/Response models
│   │   ├── scrapers/      # Platform scrapers
│   │   │   ├── base_scraper.py
│   │   │   ├── instagram_scraper.py
│   │   │   ├── twitter_scraper.py
│   │   │   ├── youtube_scraper.py
│   │   │   ├── linkedin_scraper.py
│   │   │   ├── tiktok_scraper.py
│   │   │   └── facebook_scraper.py
│   │   ├── services/      # Business logic
│   │   │   ├── email_extractor.py
│   │   │   ├── email_verifier.py
│   │   │   ├── dedup_engine.py
│   │   │   ├── export_service.py
│   │   │   └── celery_tasks.py
│   │   └── main.py        # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Landing page
│   │   └── globals.css    # Global styles
│   ├── components/
│   │   ├── Hero.tsx
│   │   ├── PlatformSelector.tsx
│   │   ├── ScraperForm.tsx
│   │   ├── Dashboard.tsx
│   │   └── StatsBar.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
├── chrome-extension/
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   └── icons/
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL database
- Redis server (for Celery)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/SocialScravio

# Redis
REDIS_URL=redis://localhost:6379/0

# Supabase (for auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Groq AI (for smart matching - free tier available)
GROQ_API_KEY=your-groq-api-key

# Security
SECRET_KEY=your-secret-key-min-32-chars
```

## 📊 API Documentation

### Authentication

```bash
# Register
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "company": "Acme Inc"
}

# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Scraping

```bash
# Start scraping
POST /api/v1/scrape/start
{
  "platform": "instagram",
  "query": "@marketinggurus",
  "max_results": 50
}

# Get campaign status
GET /api/v1/scrape/campaign/{campaign_id}

# List emails
GET /api/v1/scrape/emails?platform=instagram&verification_status=verified
```

### Export

```bash
# Export to CSV
POST /api/v1/export/download
{
  "campaign_id": 1,
  "format": "csv",
  "include_unverified": false
}
```

## 🔐 Security & Compliance

### Data Privacy
- All scraped emails are stored with source attribution
- Users can delete their data and exports
- GDPR-compliant with data retention policies

### Anti-Scraping Considerations
- Only scrape publicly available information
- Respect robots.txt on target domains
- Implement rate limiting to avoid IP blocks
- Use rotating proxies for large-scale scraping

## 💰 Cost Comparison with SocialScravio

| Feature | SocialScravio | SocialScravio Clone |
|---------|---------|---------------|
| Monthly Credits | 100 (free) | 100+ (free tier) |
| Platform Access | 6 platforms | 6 platforms |
| Email Verification | 4-layer | 4-layer |
| Export Formats | CSV, Excel | CSV, Excel, JSON |
| API Access | Paid | Free tier |
| Chrome Extension | IG Only | IG Only |
| **Total Cost** | **$49+/month** | **$0-20/month** |

## 🧪 Testing

```bash
cd backend
pytest tests/ -v
```

## 📝 License

MIT License - feel free to use this for personal or commercial projects.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guide and submit PRs.

---

Built with ❤️ by the open-source community