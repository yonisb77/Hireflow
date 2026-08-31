-- Byter visningsnamnet för admin-kontot från e-postadressen till bara "Admin".
-- company_name används av UI:t som visningsnamn i headern/användarmenyn.
-- Byt ut e-postadressen nedan mot ditt admin-kontos riktiga adress innan körning.

update public.profiles
set company_name = 'Admin'
where email = 'din@epost.se' and role = 'admin';
