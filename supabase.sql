-- 港式麻雀:雲端存檔(Supabase)。喺 Supabase 專案 → SQL Editor 貼上並執行一次。
-- 設計:表格唔開放直接讀寫,只可以經下面三個函數,而且要用 16 位以上嘅私人存檔碼(玩家自己瀏覽器產生)。

create table if not exists public.mj_saves (
  code text primary key check (length(code) >= 16),
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.mj_saves enable row level security;   -- 冇 policy = anon 直接讀寫唔到
revoke all on public.mj_saves from anon, authenticated;

create or replace function public.save_game(p_code text, p_state jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_code is null or length(p_code) < 16 or length(p_code) > 64 then raise exception 'bad code'; end if;
  if pg_column_size(p_state) > 60000 then raise exception 'state too large'; end if;
  insert into mj_saves(code, state, updated_at) values (p_code, p_state, now())
  on conflict (code) do update set state = excluded.state, updated_at = now();
end $$;

create or replace function public.load_game(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if p_code is null or length(p_code) < 16 then return null; end if;
  select state into r from mj_saves where code = p_code;
  return r;
end $$;

create or replace function public.delete_game(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_code is null or length(p_code) < 16 then return; end if;
  delete from mj_saves where code = p_code;
end $$;

revoke all on function public.save_game(text, jsonb), public.load_game(text), public.delete_game(text) from public;
grant execute on function public.save_game(text, jsonb), public.load_game(text), public.delete_game(text) to anon;

-- 可選:清走 90 日冇更新嘅存檔(要啟用 pg_cron 先用得)
-- select cron.schedule('mj-clean', '0 3 * * *', $$delete from public.mj_saves where updated_at < now() - interval '90 days'$$);
