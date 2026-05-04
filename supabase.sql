create table if not exists user_states (
  user_id text primary key,
  data jsonb not null
);
