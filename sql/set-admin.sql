-- ================================================================
-- ML Tracker — Set Admin
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ================================================================

-- Ganti 'USERNAME_DISINI' dengan username yang ingin dijadikan admin
UPDATE public.profiles
SET    is_admin = true
WHERE  username = 'USERNAME_DISINI';

-- Verifikasi siapa saja yang sudah jadi admin
SELECT id, username, display_name, is_admin
FROM   public.profiles
ORDER  BY username;
