# Algomhoria Admin Dashboard

A production-ready admin dashboard built with Next.js 14, TypeScript, Supabase, and modern UI components.

## Features

- 🔐 **Authentication** - Supabase Auth with email/password
- 👥 **User Management** - Full CRUD operations for users
- 🎭 **Role-Based Access Control (RBAC)** - Admin, Manager, Moderator, Data Entry roles
- 📝 **Activity Logging** - Comprehensive audit trail for all user actions
- 📰 **Content Management** - Posts, Categories, Post Gallery management
- 🏠 **Property Management** - Complete property management system with 15+ related entities
- 📞 **Lead Management** - Leads, Direct Leads, Assignments, Property Owners
- 🌍 **Internationalization** - English and Arabic with RTL support
- 🎨 **Theme System** - Light, Dark, and System theme modes
- 📊 **Dashboard Analytics** - Charts and statistics using Recharts
- 📱 **Responsive Design** - Mobile-first, fully responsive layout
- ⚡ **Performance** - Optimized with TanStack Query for data fetching
- 🔒 **Security** - Supabase Row Level Security (RLS) enforced
- 📤 **Export Features** - CSV export for all data tables
- 🎯 **30+ Management Pages** - Comprehensive admin interface

See [PROJECT_FEATURES.md](./PROJECT_FEATURES.md) for a complete list of all features and pages.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Backend**: Supabase (Auth + PostgreSQL + Storage)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React
- **i18n**: Custom implementation with RTL support

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd algomhoria-admin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the database migration:
   - Use the provided `supabase_migration_full.sql` file to set up your database schema
   - Run it in your Supabase SQL editor

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/
│   ├── [locale]/          # Internationalized routes
│   ├── auth/               # Authentication pages
│   ├── dashboard/          # Dashboard pages
│   ├── layout.tsx          # Root layout
│   └── providers.tsx       # Global providers
├── components/
│   ├── ui/                 # Shadcn/UI components
│   ├── layout/             # Layout components
│   ├── tables/             # Table components
│   └── charts/             # Chart components
├── lib/
│   ├── supabase/           # Supabase client setup
│   ├── i18n/               # Internationalization
│   ├── constants.ts        # App constants
│   └── permissions.ts      # Permission utilities
├── store/                  # Zustand stores
├── hooks/                  # Custom React hooks
├── messages/               # Translation files
└── middleware.ts           # Next.js middleware
```

## User Roles & Permissions

### Admin
- Full access to all features
- Can create, update, and delete users
- Can manage all settings

### Manager
- Can view and update users
- Can view dashboard and settings
- Cannot delete users

### Moderator
- Can view users
- Can view dashboard
- Limited access

### Data Entry
- Can only view dashboard
- No user management access

## Database Schema

The application uses the following main tables:
- `users` - User accounts and profiles
- `posts` - Blog posts/articles
- `properties` - Real estate properties
- `categories` - Post categories
- `activity_logs` - Activity and audit trail logs
- And more...

See `database_schema_arabic.md` for complete schema documentation.

## Activity Logs

The dashboard includes a comprehensive activity logging system that tracks all user actions:

- **Automatic Logging**: Create, Update, Delete operations are automatically logged
- **Authentication Events**: Login and logout events are tracked
- **Audit Trail**: View complete history of all actions with user information
- **Admin Access**: Only admins can view activity logs

### Setup Activity Logs

1. Run the SQL migration: `supabase_activity_logs.sql` in Supabase SQL Editor
2. See [ACTIVITY_LOGS_SETUP.md](./ACTIVITY_LOGS_SETUP.md) for detailed setup and usage guide

Activity logging is already integrated into:
- Posts management
- Users management
- Properties management
- Authentication (login/logout)

## Key Features

### Authentication Flow
1. User logs in with email/password
2. Supabase Auth validates credentials
3. User profile fetched from database
4. Role and permissions loaded into Zustand store
5. Redirect to dashboard

### Route Protection
- Middleware checks authentication status
- Redirects unauthenticated users to login
- Role-based access control on pages

### Internationalization
- English and Arabic support
- Automatic RTL layout for Arabic
- Language persisted in localStorage
- All UI text translated

### Theme System
- Light, Dark, and System themes
- Theme persisted in localStorage
- Smooth transitions
- CSS variables for theming

## Development

### Adding a New Page

1. Create a new file in `app/dashboard/[page-name]/page.tsx`
2. Add navigation link in `components/layout/sidebar.tsx`
3. Add translations to `messages/en.json` and `messages/ar.json`
4. Implement permission checks if needed

### Adding a New Component

1. Create component in `components/` directory
2. Use Shadcn/UI components as base
3. Follow existing patterns for styling
4. Add TypeScript types

### Adding Translations

1. Add key-value pairs to `messages/en.json`
2. Add corresponding translations to `messages/ar.json`
3. Use `useTranslations()` hook in components

## Building for Production

```bash
npm run build
npm start
```

## Security Notes

- **Never commit** `.env.local` file
- Supabase RLS policies are the final security authority
- All API calls go through Supabase client (never use service role key in frontend)
- User roles are stored in database and checked on every request

## Troubleshooting

### Authentication Issues
- Verify Supabase URL and keys are correct
- Check that user exists in both `auth.users` and `public.users` tables
- Ensure RLS policies allow access

### i18n Not Working
- Check that language is set in Zustand store
- Verify translation files exist
- Clear browser cache and localStorage

### Theme Not Applying
- Check browser console for errors
- Verify CSS variables are loaded
- Clear localStorage and reload

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub.

