-- Byter visningsnamnet för admin-kontot från e-postadressen till bara "Admin".
-- company_name används av UI:t som visningsnamn i headern/användarmenyn.

update public.profiles
set company_name = 'Admin'
where email = 'yonis_77@hotmail.com' and role = 'admin';
