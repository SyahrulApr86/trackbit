# Trackbit - Product Backlog Management System

Trackbit is a comprehensive web application for managing product backlogs, epics, and Product Backlog Items (PBIs) in agile development environments. Built with modern web technologies, it provides an intuitive interface for product owners and development teams to organize and track their work efficiently.

## Features

### Core Functionality
- **Product Backlog Management**: Create and manage multiple product backlogs
- **Epic Organization**: Group related PBIs under epics for better structure
- **PBI Management**: Comprehensive Product Backlog Item creation and editing
- **Export Capabilities**: Export PBI data to Excel format for reporting



## Tech Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **React 18**: Component-based UI library
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Modern React component library
- **Lucide React**: Icon library
- **Sonner**: Toast notification system

### Backend
- **Next.js API Routes**: Server-side API endpoints
- **NextAuth.js**: Authentication and session management
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Primary database
- **bcryptjs**: Password hashing

### Development Tools
- **ESLint**: Code linting and formatting
- **Drizzle Kit**: Database migration and management
- **XLSX**: Excel file generation

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SyahrulApr86/trackbit.git
cd trackbit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/trackbit
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

4. Set up the database:
```bash
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Database Setup

The application uses PostgreSQL with Drizzle ORM. The database schema includes:

- **users**: User authentication and profile data
- **productBacklogLists**: Product backlog containers
- **epics**: Epic groupings for PBIs
- **pbis**: Product Backlog Items with detailed specifications

## Usage

### User Registration and Login
1. Navigate to `/auth/register` to create a new account
2. Login at `/auth/login` with your credentials
3. Access the dashboard to begin managing your backlogs

### Managing Product Backlogs
1. Create product backlogs from the main dashboard
2. Add epics to organize related features
3. Create PBIs with detailed user stories and acceptance criteria
4. Export data to Excel for reporting and analysis

### PBI Management
- **Business Value**: Describe the business impact and value
- **User Stories**: Define functionality from user perspective
- **Acceptance Criteria**: Specify completion requirements
- **Story Points**: Estimate development effort
- **Priority**: Set importance level (High, Medium, Low)
- **Person in Charge**: Assign responsibility

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_URL`: Production domain (e.g., https://yourapp.vercel.app)
   - `NEXTAUTH_SECRET`: Random secret for JWT signing

3. Deploy automatically through Git integration

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build production application
- `npm run start`: Start production server
- `npm run lint`: Run ESLint code analysis
- `npm run db:push`: Push database schema changes
- `npm run db:studio`: Open Drizzle Studio for database management

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API route handlers
│   └── auth/              # Authentication pages
├── components/            # React components
│   ├── providers/         # Context providers
│   └── ui/                # UI component library
├── lib/                   # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Database connection
│   ├── schema.ts         # Database schema
│   └── session.ts        # Session management
└── middleware.ts          # Next.js middleware
```