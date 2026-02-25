# 🔮 Pandora's Vault

### An adaptive AI-powered coding tutor that meets you exactly where you are.

## Live Demo at: https://pandorasvault.netlify.app/

## ✨ What is this?

Pandora's Vault is a **5-tier adaptive coding tutor** powered by Groq's LLaMA model. Instead of dumping a wall of text at you, it first checks what you actually know — then teaches you exactly what you need next.

You pick a topic. You pick a language. Vera (your AI guide) locks you out of the lesson until you prove you have the foundations. Pass → lesson unlocks. Fail → you get hints, diagrams, and a second chance. Fail 3 times → Vera drops you to the right level and teaches you from there.

No skipping. No padding. Just real learning.

---

## 🎥 Features

### 🗝️ The Gatekeeper System
Every level (except Level I) is locked behind a gatekeeper question. Vera asks you to prove you understand the level *below* before she teaches you the one you want. If you get it wrong:
- **Attempt 1 wrong** → Mermaid diagram visual hint
- **Attempt 2 wrong** → Pseudocode scaffold hint  
- **Attempt 3 wrong** → Full reveal + drop to the right level

### 📚 5 Learning Tiers
| Level | Title | Focus |
|-------|-------|-------|
| I — Novice | Foundations | Syntax, mental models, flashcards |
| II — Practitioner | Implementation | Working code, broken code to fix |
| III — Architect | Design | Real-world scenarios, trade-off decisions |
| IV — Optimizer | Performance | Big-O, naive vs optimised approaches |
| V — Engineer | Systems | Architecture diagrams, live code sandbox |

### 🧠 Inline Quiz System
Two types of quizzes fire automatically during the lesson:
- **Pop Quiz** — 1-2 quick checks mid-lesson. Vera decides when you're ready.
- **Level-Up Exam** — 5-8 questions at the end of the level. Score ≥ 70% → next level unlocks automatically.

### 💬 Multi-turn Chat with Vera
Ask follow-up questions, request examples, go deeper on any concept — all in context of your current lesson. Vera remembers everything you've covered in the session.

### 🖥️ Live Code Sandbox (Level V)
Run code directly in the browser via the Piston API. Supports Python, JavaScript, Java, Go, C++, Rust and TypeScript.

### 🌌 Nebula Codex UI
- Animated multi-layer star field canvas (dust, field stars, bright stars, giants with spike diffraction)
- 20 real constellations (Orion, Leo, Scorpius, Cassiopeia, Sagittarius...) that slowly drift, fade in and out
- Shooting stars every ~4 seconds
- Cinzel Decorative + IM Fell English fonts
- Full dark theme with gold and violet accents

---

## 🛠️ Tech Stack

### Frontend
- Vanilla HTML / CSS / JavaScript (zero frameworks)
- Mermaid.js v10 for diagram rendering
- Canvas API for star field + constellation animations
- Piston API for live code execution

### Backend
- **FastAPI** — Python web framework
- **Groq** — LLM inference (llama-3.3-70b-versatile)
- **Supabase** — PostgreSQL database
- **python-jose** — Custom JWT auth
- **bcrypt** — Password hashing
- **httpx** — Async HTTP client

### Deployed On
- **Frontend** → Netlify
- **Backend** → Render
- **Database** → Supabase (free tier)
- **Keep-alive** → cron-job.org (pings `/ping` every 10 minutes)

---

## 🗂️ Project Structure

```
pandoras_vault/
│
├── backend/
│   ├── main.py              # FastAPI app, CORS, keep-alive endpoint
│   ├── auth.py              # JWT creation, bcrypt password hashing, get_current_user
│   ├── database.py          # Supabase client init
│   ├── llm.py               # Groq LLM calls, prompt builders, quiz generation
│   ├── schemas.py           # Pydantic models for all request/response types
│   ├── requirements.txt     # Python dependencies
│   ├── render.yaml          # Render deployment config
│   ├── setup.sql            # Supabase table creation script
│   ├── rls_policies.sql     # Row Level Security policies
│   ├── .env.example         # Environment variable template
│   └── routes/
│       ├── users.py         # /auth/* — signup, login, onboard, profile
│       ├── session.py       # /session/* — get, patch, delete progress
│       └── vault.py         # /vault/* — gatekeeper, submit, chat, quiz
│
└── frontend/
    ├── index.html           # Single page app shell
    ├── style.css            # Full Nebula Codex design system
    └── app.js               # All frontend logic — canvas, auth, vault, chat, quiz
```

---

## 🚀 Running Locally

### Prerequisites
- Python 3.10+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Groq](https://console.groq.com) API key (free tier works)

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/pandoras-vault.git
cd pandoras-vault
```

### 2. Set up the database
Go to your Supabase project → SQL Editor → paste and run `backend/setup.sql`:
```sql
-- Creates the user_progress table + auto-update trigger
-- See backend/setup.sql for the full script
```

### 3. Configure environment variables
```bash
cd backend
cp .env.example .env
```

Fill in your `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key   # use service role, NOT anon key
JWT_SECRET=any-long-random-string-you-choose
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GROQ_API_KEY=your-groq-api-key
```

> ⚠️ Use the **service role key** from Supabase → Settings → API, not the anon key.

### 4. Install dependencies and run
```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Open the frontend
Open `frontend/index.html` in a browser, or serve it with Live Server in VS Code.

The frontend points to `http://localhost:8000` by default — no config needed for local dev.

---

## 🌐 API Reference

All protected routes require `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login, get JWT token |
| POST | `/auth/onboard` | Set username after signup |
| GET | `/auth/me` | Get current user profile |
| PATCH | `/auth/profile` | Update username / profile pic |

### Session
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/session/` | Load saved topic + level |
| PATCH | `/session/` | Save progress |
| DELETE | `/session/` | Reset all progress |

### Vault (Learning)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/vault/gatekeeper` | Start a level — L1 gets lesson directly, L2-L5 get gatekeeper question |
| POST | `/vault/submit` | Submit gatekeeper answer — returns pass/hint/reveal |
| POST | `/vault/chat` | Multi-turn chat with Vera |
| POST | `/vault/quiz/start` | Generate quiz questions |
| POST | `/vault/quiz/answer` | Submit quiz answer |
| GET | `/vault/quiz/next` | Get next quiz question |

### Utility
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/ping` | Keep-alive — hits DB to prevent Supabase + Render sleep |

---

## ☁️ Deploying to Production

### Backend → Render
1. Push `backend/` to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. Render auto-detects `render.yaml`
4. Add environment variables in Render dashboard
5. Deploy

### Frontend → Netlify
1. Go to [netlify.com](https://netlify.com) → Add new site → Deploy manually
2. Drag and drop the `frontend/` folder
3. Update `const API` in `app.js` to your Render URL before deploying

### Keep-alive (prevents free tier sleep)
Set up a free cron job at [cron-job.org](https://cron-job.org):
- URL: `https://your-render-url.onrender.com/ping`
- Schedule: every 10 minutes
- This keeps both Render and Supabase active simultaneously

---

## 🗄️ Database Schema

### `users`
```sql
id               UUID PRIMARY KEY
email            TEXT UNIQUE NOT NULL
hashed_password  TEXT NOT NULL
username         TEXT UNIQUE
profile_pic_url  TEXT
is_onboarded     BOOLEAN DEFAULT FALSE
created_at       TIMESTAMPTZ DEFAULT NOW()
```

### `user_progress`
```sql
id                   UUID PRIMARY KEY REFERENCES users(id)
topic                TEXT
current_level        INT (1-5)
diagnostic_attempts  INT (0-3)
diagnostic_passed    BOOLEAN
hint_stage           INT (0=none, 1=mermaid, 2=pseudocode)
updated_at           TIMESTAMPTZ (auto-updated via trigger)
```

---

## 🔒 Auth Architecture

Pandora's Vault uses **fully custom JWT auth** — no Supabase Auth, no OAuth, no magic links.

- Passwords are pre-hashed with SHA-256 (to bypass bcrypt's 72-byte limit) then hashed with bcrypt
- JWTs are signed with your `JWT_SECRET` using HS256
- All protected endpoints use FastAPI's `Depends(get_current_user)` which decodes the JWT and fetches the user from Supabase
- The Supabase service role key is only used server-side — never exposed to the frontend

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create your branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

MIT — do whatever you want with it. Just don't blame me if Jio blocks your Supabase.

---

# Built with way too much caffeine and a deeply personal grudge against Mermaid v10's colon parser.
## Made by Veda
