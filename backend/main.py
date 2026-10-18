"""AftabChange API: solar energy -> credits -> rewards."""
import hashlib
import hmac
import os
import random
import re
import secrets
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from pydantic import AfterValidator, BaseModel, Field

DB = os.getenv("DB_PATH", "aftab.db")
COOKIE_SECURE = os.getenv("COOKIE_SECURE") == "1"  # set to 1 behind HTTPS
SESSION_DAYS = 30
WELCOME_CREDITS = 200
CO2_G_PER_WH = 0.6  # Iran grid ~0.6 kg CO2 per kWh
DEMO_PHONE, DEMO_PASSWORD = "09120000000", "aftab1234"
KITS = {"basic": (8_900_000, 1, 5), "pro": (12_900_000, 1, 5), "community": (9_800_000, 10, 50)}  # Toman/kit, min, max qty

CITIES = {"Tehran": "تهران", "Isfahan": "اصفهان", "Shiraz": "شیراز", "Yazd": "یزد",
          "Kerman": "کرمان", "Mashhad": "مشهد", "Tabriz": "تبریز", "Kish": "کیش"}
PEOPLE = [("سارا", "Sara"), ("آرش", "Arash"), ("نگار", "Negar"), ("کیان", "Kian"), ("مهسا", "Mahsa"),
          ("امید", "Omid"), ("لیلا", "Leila"), ("بردیا", "Bardia"), ("ترانه", "Taraneh"), ("پویا", "Pouya"),
          ("یاسمن", "Yasaman"), ("رضا", "Reza"), ("شیما", "Shima"), ("داریوش", "Dariush")]
REWARDS = [  # title_fa, title_en, partner_fa, partner_en, cost, category, emoji
    ("یک ماه دوچرخه اشتراکی", "1 month of bike share", "دوچرخه شهری", "City Bikes", 900, "move", "🚲"),
    ("شارژ ۱۰ سفر مترو", "10 metro rides", "حمل‌ونقل عمومی", "Public Transit", 450, "move", "🚇"),
    ("قهوه ارگانیک", "Organic coffee", "کافه سبز", "Green Café", 180, "food", "☕"),
    ("سبد میوه محلی", "Local fruit box", "بازار کشاورز", "Farmers Market", 620, "food", "🍎"),
    ("کاشت یک درخت به نام شما", "A tree planted in your name", "جنگل‌کاران", "Forest Makers", 300, "planet", "🌳"),
    ("پاک‌سازی ساحل", "Beach clean-up pass", "دریا پاک", "Clean Sea", 150, "planet", "🌊"),
    ("۲۰٪ تخفیف تور کویر", "20% off a desert tour", "کویرگردی", "Desert Trails", 1200, "travel", "🏜️"),
    ("شب کمپینگ ستاره‌ها", "Stargazing camp night", "شب‌های کویر", "Desert Nights", 1500, "travel", "✨"),
    ("کتاب الکترونیکی", "An e-book of your choice", "کتاب‌خوان", "Readers", 250, "learn", "📚"),
    ("کارگاه سواد انرژی", "Energy literacy workshop", "آکادمی آفتاب", "Aftab Academy", 700, "learn", "💡"),
]


def now():
    return datetime.now(timezone.utc)


def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con


def hash_pw(pw: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    return salt.hex() + "$" + hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1).hex()


def check_pw(pw: str, stored: str | None) -> bool:
    return bool(stored) and hmac.compare_digest(hash_pw(pw, bytes.fromhex(stored.split("$")[0])), stored)


def sha(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def seed():
    with db() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS user(id INTEGER PRIMARY KEY, name_fa, name_en, city_fa, city_en,
            wh INTEGER DEFAULT 0, credits INTEGER DEFAULT 0, phone TEXT UNIQUE, pw TEXT, created TEXT);
        CREATE TABLE IF NOT EXISTS session(token TEXT PRIMARY KEY, user_id INTEGER, expires TEXT);
        CREATE TABLE IF NOT EXISTS energy(id INTEGER PRIMARY KEY, user_id, wh INTEGER, day TEXT);
        CREATE TABLE IF NOT EXISTS reward(id INTEGER PRIMARY KEY, title_fa, title_en, partner_fa, partner_en,
            cost INTEGER, category, emoji);
        CREATE TABLE IF NOT EXISTS redemption(id INTEGER PRIMARY KEY, user_id, reward_id, code, at TEXT);
        CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, user_id, kit, qty INTEGER, total INTEGER,
            name, phone, city, address, status TEXT DEFAULT 'pending', at TEXT);
        """)
        if con.execute("SELECT 1 FROM user").fetchone():
            return
        rnd = random.Random(45)
        today = now().date()
        people = [("سپیده", "Sepideh", "Isfahan", DEMO_PHONE, hash_pw(DEMO_PASSWORD))]
        people += [(*p, rnd.choice(list(CITIES)), None, None) for p in PEOPLE]
        for uid, (fa, en, city, phone, pw) in enumerate(people, 1):
            days = [(rnd.randint(100, 280) if phone else rnd.randint(40, 320), today - timedelta(d)) for d in range(30)]
            total = sum(w for w, _ in days)
            con.execute("INSERT INTO user VALUES(?,?,?,?,?,?,?,?,?,?)", (uid, fa, en, CITIES[city], city, total,
                        total - (400 if phone else 0), phone, pw, (now() - timedelta(90)).isoformat()))
            con.executemany("INSERT INTO energy(user_id, wh, day) VALUES(?,?,?)", [(uid, w, d.isoformat()) for w, d in days])
        con.executemany("INSERT INTO reward(title_fa,title_en,partner_fa,partner_en,cost,category,emoji) VALUES(?,?,?,?,?,?,?)", REWARDS)


@asynccontextmanager
async def lifespan(_):
    seed()
    yield


app = FastAPI(title="AftabChange API", lifespan=lifespan)


# ── Validation ─────────────────────────────────────
def phone_v(v: str) -> str:
    v = re.sub(r"[\s-]", "", v.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")))
    v = "0" + v[3:] if v.startswith("+98") else v
    if not re.fullmatch(r"09\d{9}", v):
        raise ValueError("invalid_phone")
    return v


def city_v(v: str) -> str:
    if v not in CITIES:
        raise ValueError("invalid_city")
    return v


Phone = Annotated[str, AfterValidator(phone_v)]
City = Annotated[str, AfterValidator(city_v)]
Name = Annotated[str, Field(min_length=2, max_length=40), AfterValidator(str.strip)]


class Login(BaseModel):
    phone: Phone
    password: str = Field(min_length=1, max_length=128)


class Register(BaseModel):
    name: Name
    phone: Phone
    password: str = Field(min_length=6, max_length=128)
    city: City


class ProfileIn(BaseModel):
    name: Name
    city: City


class OrderIn(BaseModel):
    kit: Literal["basic", "pro", "community"]
    qty: int
    name: Name
    phone: Phone
    city: City
    address: str = Field(min_length=10, max_length=300)


# ── Auth ───────────────────────────────────────────
def optional_user(sid: str | None = Cookie(None)) -> int | None:
    if not sid:
        return None
    with db() as con:
        row = con.execute("SELECT user_id FROM session WHERE token=? AND expires>?", (sha(sid), now().isoformat())).fetchone()
    return row[0] if row else None


def current_user(uid: int | None = Depends(optional_user)) -> int:
    if uid is None:
        raise HTTPException(401, "not_authenticated")
    return uid


User = Annotated[int, Depends(current_user)]


def start_session(con, uid: int, resp: Response):
    token = secrets.token_urlsafe(32)
    con.execute("INSERT INTO session VALUES(?,?,?)", (sha(token), uid, (now() + timedelta(SESSION_DAYS)).isoformat()))
    resp.set_cookie("sid", token, max_age=SESSION_DAYS * 86400, httponly=True, samesite="lax", secure=COOKIE_SECURE)


# ponytail: no login rate limiting; add a per-phone attempt counter before going public
@app.post("/api/auth/login")
def login(body: Login, resp: Response):
    with db() as con:
        u = con.execute("SELECT id, pw FROM user WHERE phone=?", (body.phone,)).fetchone()
        if not u or not check_pw(body.password, u["pw"]):
            raise HTTPException(401, "wrong_credentials")
        start_session(con, u["id"], resp)
    return {"ok": True}


@app.post("/api/auth/register", status_code=201)
def register(body: Register, resp: Response):
    with db() as con:
        try:
            uid = con.execute("INSERT INTO user(name_fa,name_en,city_fa,city_en,credits,phone,pw,created) VALUES(?,?,?,?,?,?,?,?)",
                              (body.name, body.name, CITIES[body.city], body.city, WELCOME_CREDITS, body.phone,
                               hash_pw(body.password), now().isoformat())).lastrowid
        except sqlite3.IntegrityError:
            raise HTTPException(409, "phone_taken")
        start_session(con, uid, resp)
    return {"ok": True}


@app.post("/api/auth/logout")
def logout(resp: Response, sid: str | None = Cookie(None)):
    if sid:
        with db() as con:
            con.execute("DELETE FROM session WHERE token=?", (sha(sid),))
    resp.delete_cookie("sid")
    return {"ok": True}


# ── Data ───────────────────────────────────────────
def stats(con, uid: int):
    u = dict(con.execute("SELECT id,name_fa,name_en,city_fa,city_en,wh,credits,phone,created FROM user WHERE id=?", (uid,)).fetchone())
    rank = con.execute("SELECT COUNT(*)+1 FROM user WHERE wh > ?", (u["wh"],)).fetchone()[0]
    return {**u, "co2_kg": round(u["wh"] * CO2_G_PER_WH / 1000, 2), "rank": rank}


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/community")
def community():
    with db() as con:
        users, wh = con.execute("SELECT COUNT(*), SUM(wh) FROM user").fetchone()
        today = con.execute("SELECT COALESCE(SUM(wh),0) FROM energy WHERE day=?", (now().date().isoformat(),)).fetchone()[0]
    k = 1400  # ponytail: demo multiplier so seeded numbers look like a real network; drop with real users
    return {"users": users * k, "wh": wh * k, "co2_kg": round(wh * k * CO2_G_PER_WH / 1000), "today_wh": today * k}


@app.get("/api/overview")
def overview(uid: User):
    with db() as con:
        days = [(now().date() - timedelta(6 - i)).isoformat() for i in range(7)]
        rows = dict(con.execute("SELECT day, SUM(wh) FROM energy WHERE user_id=? AND day>=? GROUP BY day", (uid, days[0])).fetchall())
        week = [{"day": d, "wh": rows.get(d, 0)} for d in days]
        m = stats(con, uid)
    challenges = [
        {"id": "week", "goal": 1000, "value": sum(d["wh"] for d in week)},
        {"id": "tree", "goal": 21000, "value": round(m["co2_kg"] * 1000)},  # grams; a tree ≈ 21 kg/yr
        {"id": "streak", "goal": 7, "value": sum(1 for d in week if d["wh"] > 0)},
    ]
    return {"me": m, "week": week, "challenges": challenges}


@app.get("/api/me")
def get_me(uid: User):
    with db() as con:
        orders = [dict(r) for r in con.execute("SELECT id,kit,qty,total,city,address,status,at FROM orders WHERE user_id=? ORDER BY id DESC", (uid,))]
        redemptions = [dict(r) for r in con.execute(
            "SELECT d.id,d.code,d.at,r.title_fa,r.title_en,r.emoji,r.category,r.cost FROM redemption d "
            "JOIN reward r ON r.id=d.reward_id WHERE d.user_id=? ORDER BY d.id DESC", (uid,))]
        return {**stats(con, uid), "orders": orders, "redemptions": redemptions}


@app.patch("/api/me")
def update_me(body: ProfileIn, uid: User):
    with db() as con:
        con.execute("UPDATE user SET name_fa=?, name_en=?, city_fa=?, city_en=? WHERE id=?",
                    (body.name, body.name, CITIES[body.city], body.city, uid))
        return stats(con, uid)


@app.post("/api/sync")
def sync(uid: User):
    """Simulates the solar kit uploading its latest reading: 1 Wh = 1 credit."""
    wh = random.randint(35, 140)  # ponytail: simulated; replace with the kit's signed reading when hardware exists
    with db() as con:
        con.execute("INSERT INTO energy(user_id, wh, day) VALUES(?,?,?)", (uid, wh, now().date().isoformat()))
        con.execute("UPDATE user SET wh=wh+?, credits=credits+? WHERE id=?", (wh, wh, uid))
        return {"added": wh, "me": stats(con, uid)}


@app.get("/api/leaderboard")
def leaderboard(uid: int | None = Depends(optional_user)):
    with db() as con:
        users = [dict(r) for r in con.execute("SELECT id,name_fa,name_en,city_fa,city_en,wh FROM user ORDER BY wh DESC LIMIT 15")]
        cities = [dict(r) for r in con.execute(
            "SELECT city_fa,city_en,SUM(wh) wh,COUNT(*) members FROM user GROUP BY city_en ORDER BY wh DESC")]
    return {"users": users, "cities": cities, "me": uid}


@app.get("/api/rewards")
def rewards():
    with db() as con:
        return [dict(r) for r in con.execute("SELECT * FROM reward ORDER BY cost")]


@app.post("/api/rewards/{rid}/redeem")
def redeem(rid: int, uid: User):
    with db() as con:
        r = con.execute("SELECT cost FROM reward WHERE id=?", (rid,)).fetchone()
        if not r:
            raise HTTPException(404, "reward_not_found")
        # Atomic check-and-spend: never lets credits go negative.
        if con.execute("UPDATE user SET credits=credits-? WHERE id=? AND credits>=?", (r["cost"], uid, r["cost"])).rowcount == 0:
            raise HTTPException(400, "not_enough_credits")
        code = "AFT-" + secrets.token_hex(3).upper()
        con.execute("INSERT INTO redemption(user_id,reward_id,code,at) VALUES(?,?,?,?)", (uid, rid, code, now().isoformat()))
        return {"code": code, "me": stats(con, uid)}


@app.post("/api/orders", status_code=201)
def create_order(body: OrderIn, uid: User):
    price, lo, hi = KITS[body.kit]
    if not lo <= body.qty <= hi:
        raise HTTPException(422, "invalid_qty")
    # ponytail: no payment gateway; staff call to arrange payment. Plug a PSP in here and set status from its callback.
    with db() as con:
        oid = con.execute("INSERT INTO orders(user_id,kit,qty,total,name,phone,city,address,at) VALUES(?,?,?,?,?,?,?,?,?)",
                          (uid, body.kit, body.qty, price * body.qty, body.name, body.phone, body.city,
                           body.address.strip(), now().isoformat())).lastrowid
    return {"id": oid, "total": price * body.qty, "status": "pending"}
