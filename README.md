# Khabo Ki?

Office lunch ordering. A restaurant sends a different menu each day; staff enter what's
coming, employees pick one dish before a cutoff, and staff read off the final counts.

Next.js (App Router) + Supabase (Postgres, Auth, RLS).

## Roles

| Role | Can do |
| --- | --- |
| **Employee** | Registers themselves (name + phone), sees today's menu, picks one dish, edits it until cutoff, bans dishes, ranks auto-pick preferences, sees own history |
| **Staff** | Keeps the item library, builds and publishes the day's menu, sets the cutoff, sees per-item counts and who ordered what |
| **Admin** | Approves registrations, deactivates accounts, creates staff/admin accounts, views and exports all history |

## How a day runs

1. Staff starts today's menu and adds what the restaurant is bringing — from the item
   library, or typed fresh (a new dish joins the library for next time).
2. Staff publishes. Publishing immediately seats everyone whose ranked preferences match
   something on the menu and isn't banned.
3. Everyone else picks by hand. A pick can be changed or cleared any time before cutoff.
4. At cutoff, ordering closes. No pick and no auto-pick match means no lunch — by design,
   there is no fallback dish.
5. Staff reads the per-item counts off `/staff/orders` and tells the restaurant.

The cutoff is enforced in the database (`is_menu_open()` inside the RLS policies), so it
needs no cron job — orders simply stop being writable once the clock passes.

## Setup

### 1. Supabase project

Create a project, then in **SQL Editor** run the migrations in order:

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_functions.sql
supabase/migrations/0003_rls.sql
```

Or, with the CLI:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

### 2. Auth settings

Login is by **phone number and password**, no OTP. Supabase's phone provider needs an SMS
gateway even with OTP off, so the app maps a phone number onto a synthetic email address
(`01712345678@khaboki.local`) and uses the email/password provider. Nothing is ever sent to
that address.

In **Authentication → Providers → Email**, turn **Confirm email** *off*. Otherwise
self-registration creates an account that can never sign in.

### 3. Environment

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API). The service-role key is used only
server-side, to mint staff and admin accounts.

### 4. First admin

Nobody can approve anybody until one admin exists. Either run `supabase/seed_demo.sql` for
three ready-made accounts, or register through `/register` and then run
`supabase/bootstrap_admin.sql` with your phone number. After that, staff and further admins
are created from the admin **People** page.

### 5. Run

```bash
npm install
npm run dev
```

## Demo accounts

`supabase/seed_demo.sql` creates one account per role, all active, plus a starter item
library. Change these passwords before the app sees real use.

| Role | Phone | Password |
| --- | --- | --- |
| Admin | `01700000001` | `KhaboAdmin123` |
| Staff | `01700000002` | `KhaboStaff123` |
| Employee | `01700000003` | `KhaboEmp123` |

A five-minute walkthrough: sign in as **staff**, start today's menu, add three or four
items, publish. Sign in as **employee**, pick one, change it, ban something, rank two items
in Preferences. Back as **staff**, read the counts on Orders. As **admin**, export the CSV.
To see auto-pick fire, set the employee's preferences *before* staff publishes.

## Deployment

Hosted on Vercel, built from the `main` branch of this repo.

`.env.production` is committed on purpose: it holds only the project URL and the anon key,
both of which ship inside the browser bundle regardless. RLS is what protects the data.

`SUPABASE_SERVICE_ROLE_KEY` is **not** committed and must be set in the Vercel project
settings (Settings → Environment Variables). Until it is, sign-in and ordering work fine,
but self-registration and creating staff/admin accounts will fail — those two paths are the
only ones that need it.

## Schema

| Table | Holds |
| --- | --- |
| `profiles` | Name, phone, role, status (`pending`/`active`/`inactive`), extends `auth.users` |
| `items` | The item library — every dish ever offered, unique by name |
| `daily_menus` | One row per day: cutoff, draft/published, early lock |
| `daily_menu_items` | Which library items are on a given day's menu |
| `orders` | One pick per employee per day, `manual` or `auto` |
| `employee_bans` | Dishes an employee never wants shown |
| `employee_pick_rules` | Ranked auto-pick preferences |
| `menu_audit` | Publish/lock/add/remove trail for staff menu changes |

### Notable behaviour

- **Auto-pick** (`run_auto_picks`) only ever fills employees who have *no* order yet, so it
  can never overwrite a manual choice. It picks the highest-ranked item that is on the menu
  and not banned; no match means no order.
- **Adding an item after publish** re-runs auto-pick — late additions can still seat people
  who had no match before.
- **Removing an item** drops the orders for it, re-runs auto-pick, and returns whoever was
  left with nothing so staff can chase them.
- **Banning an item** removes it from the employee's ranking and clears a same-day order for
  it.
- Timezone is fixed at `Asia/Dhaka` in both the database (`app.tz()`) and the app
  (`APP_TZ`). Change both together.

## Not built yet

- **Cutoff reminders.** Employees have no email address, so this needs in-app nudges, web
  push (PWA), or SMS. The unpicked list is already on `/staff/orders`.
- **Holidays.** A day with no menu simply shows "no menu published" — there is no calendar.
- **Capacity limits.** Out of scope by decision: the restaurant cooks to the office count.
- **Item metadata** (category, allergens, photos). Items are name-only.
