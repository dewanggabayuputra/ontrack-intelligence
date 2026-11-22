# OnTrack Backend API

NestJS-based REST API for the OnTrack Project Intelligence System.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your database credentials:

```bash
copy .env.example .env
```

Edit `.env` and set your PostgreSQL connection string:

```
DATABASE_URL="postgresql://username:password@localhost:5432/ontrack_intelligence?schema=public"
```

### 3. Database Setup

Create the database:

```sql
CREATE DATABASE ontrack_intelligence;
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

### 4. Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3001/api/v1`

## Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm test` - Run tests
- `npm run test:cov` - Run tests with coverage
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run lint` - Lint code
- `npm run format` - Format code

## Module Structure

```
src/
├── modules/
│   ├── projects/        # Project master data
│   ├── imports/         # Data ingestion
│   ├── evidence/        # Evidence management
│   ├── intelligence/    # Assessment engine
│   └── follow-ups/      # Action tracking
├── common/              # Shared utilities
│   ├── dto/             # Data transfer objects
│   ├── filters/         # Exception filters
│   └── guards/          # Authorization guards
└── prisma/              # Database schema
```

## API Documentation

Once running, API documentation is available at:
- Swagger UI: `http://localhost:3001/api/docs`

## Testing

Run unit tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:cov
```

Run e2e tests:
```bash
npm run test:e2e
```

## Database Management

View data with Prisma Studio:
```bash
npm run prisma:studio
```

Create a new migration:
```bash
npm run prisma:migrate
```

Reset database:
```bash
npx prisma migrate reset
```
