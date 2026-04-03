-- Supabase PostgreSQL schema for AI Budget-Aware Lifestyle Planner

create table if not exists users_auth (
  id bigserial primary key,
  username varchar(50) not null unique,
  password_hash varchar(256) not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id bigserial primary key,
  auth_id bigint not null unique references users_auth(id) on delete cascade,
  name varchar(100) not null,
  height_cm double precision not null,
  weight_kg double precision not null,
  age integer not null,
  body_type varchar(20) not null default 'mesomorph',
  goal varchar(20) not null,
  target_weight double precision,
  default_budget double precision not null,
  bmi double precision not null,
  calorie_target integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists food_items (
  id bigserial primary key,
  name varchar(100) not null unique,
  calories integer not null,
  cost double precision not null,
  protein double precision not null default 0,
  carbs double precision not null default 0,
  fat double precision not null default 0,
  category varchar(50) not null,
  is_custom boolean not null default false,
  created_by bigint references users_auth(id) on delete set null
);

create table if not exists meals_log (
  id bigserial primary key,
  user_id bigint not null references users_auth(id) on delete cascade,
  food_item varchar(100) not null,
  quantity integer not null default 1,
  meal_type varchar(20) not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  total_calories integer not null,
  total_cost double precision not null,
  total_protein double precision not null default 0,
  total_carbs double precision not null default 0,
  total_fat double precision not null default 0,
  logged_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists workout_log (
  id bigserial primary key,
  user_id bigint not null references users_auth(id) on delete cascade,
  activity varchar(100) not null,
  duration varchar(50) not null,
  description text,
  logged_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists daily_budget (
  id bigserial primary key,
  user_id bigint not null references users_auth(id) on delete cascade,
  budget_date date not null,
  amount double precision not null,
  constraint unique_user_date unique (user_id, budget_date)
);

create table if not exists receipt_scans (
  id bigserial primary key,
  user_id bigint not null references users_auth(id) on delete cascade,
  scanned_text text not null,
  extracted_total double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists challenges (
  id bigserial primary key,
  title varchar(120) not null,
  description text not null default '',
  target_budget double precision not null,
  duration_days integer not null default 7,
  created_by bigint not null references users_auth(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists challenge_members (
  id bigserial primary key,
  challenge_id bigint not null references challenges(id) on delete cascade,
  user_id bigint not null references users_auth(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint unique_challenge_user unique (challenge_id, user_id)
);

create index if not exists idx_meals_log_user_date on meals_log(user_id, logged_date);
create index if not exists idx_workout_log_user_date on workout_log(user_id, logged_date);
create index if not exists idx_daily_budget_user_date on daily_budget(user_id, budget_date);
