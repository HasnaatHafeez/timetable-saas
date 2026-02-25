# Frontend-Backend Integration Guide

## Overview
This document summarizes the connection between the Loveable frontend and the Node.js/Express backend.

## Changes Made

### Backend API Endpoints

#### 1. **Teachers** (`/api/teachers`)
- `GET /` - Get all teachers
- `GET /:id` - Get teacher by ID
- `POST /` - Create new teacher
- `PUT /:id` - Update teacher
- `DELETE /:id` - Delete teacher

#### 2. **Subjects** (`/api/subjects`)
- `GET /` - Get all subjects
- `GET /:id` - Get subject by ID
- `POST /` - Create new subject
- `PUT /:id` - Update subject
- `DELETE /:id` - Delete subject

#### 3. **Rooms** (`/api/rooms`)
- `GET /` - Get all rooms
- `GET /:id` - Get room by ID
- `POST /` - Create new room
- `PUT /:id` - Update room
- `DELETE /:id` - Delete room

#### 4. **Classes/Sections** (`/api/classes`)
- `GET /` - Get all sections
- `GET /:id` - Get section by ID
- `POST /` - Create new section
- `PUT /:id` - Update section
- `DELETE /:id` - Delete section

#### 5. **Timetable** (`/api/timetable`)
- `GET /` - Get generated timetable entries
- `POST /generate` - Generate new timetable (requires authentication)

#### 6. **Authentication** (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /signup` - Alternative signup endpoint

## Response Format

All endpoints return data in a normalized format with both `id` and `_id` fields for compatibility:

```json
{
  "_id": "uuid",
  "id": "uuid",
  "name": "Example Name",
  "email": "user@example.com",
  ...
}
```

## Frontend Configuration

### Environment Variables
Create `.env.local` in the frontend directory:
```
VITE_API_URL=http://localhost:5000
```

### API Client Location
`frontend/src/lib/api.ts` - Configured with automatic token handling and CORS headers.

## Running the Application

### Backend
```bash
cd backend
npm install
npm run dev  # Development mode with nodemon
# or
npm start    # Production mode
```
Backend will run on: `http://localhost:5000`

### Frontend
```bash
cd frontend
npm install
npm run dev   # Development mode
```
Frontend will run on: `http://localhost:8080`

## Database
The application uses Supabase PostgreSQL database configured in backend/.env:
```
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[database]
```

## Data Flow

1. **Dashboard** - Fetches aggregate statistics:
   - Teachers count: `GET /api/teachers`
   - Subjects count: `GET /api/subjects`
   - Rooms count: `GET /api/rooms`
   - Classes count: `GET /api/classes`

2. **Management Pages** - Full CRUD operations:
   - List → `GET /api/[resource]`
   - Create → `POST /api/[resource]`
   - Update → `PUT /api/[resource]/:id`
   - Delete → `DELETE /api/[resource]/:id`

3. **Timetable Generation**:
   - Generate → `POST /api/timetable/generate`
   - View → `GET /api/timetable`

4. **Authentication**:
   - Register → `POST /api/auth/register`
   - Login → `POST /api/auth/login`
   - Token stored in localStorage
   - Auto-included in all subsequent requests

## Notes

- All CRUD endpoints return `_id` field for MongoDB compatibility with frontend
- Authentication tokens are automatically managed by the frontend API client
- CORS is enabled on the backend for cross-origin requests
- The demo user credentials are available in LoginPage for testing without backend

