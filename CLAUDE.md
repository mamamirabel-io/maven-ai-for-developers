# Claude Instructions

## Database Operations

**IMPORTANT: Never run database migration commands in this project.**

When working with Supabase migrations:
- Use `supabase migration new <name>` to create new migration files only
- DO NOT run `supabase db reset` - it will wipe all data
- DO NOT run `supabase db push` - migrations should be applied manually by the developer

Only create migration files. Let the developer apply them manually.
