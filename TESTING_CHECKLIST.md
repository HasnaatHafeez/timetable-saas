# Connection Testing Checklist

## Backend Setup
- [ ] Database connection verified in `.env`
- [ ] All dependencies installed (`npm install` in backend)
- [ ] Start backend: `npm run dev` from backend directory
- [ ] Verify backend running on `http://localhost:5000`

## Frontend Setup
- [ ] Environment variable set in `.env.local`: `VITE_API_URL=http://localhost:5000`
- [ ] All dependencies installed (`npm install` in frontend)
- [ ] Start frontend: `npm run dev` from frontend directory
- [ ] Verify frontend running on `http://localhost:8080`

## API Endpoints Testing

### Authentication
- [ ] Test registration: `POST /api/auth/register` with name, email, password, role
- [ ] Test login: `POST /api/auth/login` with email, password
- [ ] Verify token returned and stored in localStorage

### Teachers Management
- [ ] Create teacher: `POST /api/teachers`
- [ ] List teachers: `GET /api/teachers`
- [ ] Update teacher: `PUT /api/teachers/:id`
- [ ] Delete teacher: `DELETE /api/teachers/:id`

### Subjects Management
- [ ] Create subject: `POST /api/subjects`
- [ ] List subjects: `GET /api/subjects`
- [ ] Update subject: `PUT /api/subjects/:id`
- [ ] Delete subject: `DELETE /api/subjects/:id`

### Rooms Management
- [ ] Create room: `POST /api/rooms`
- [ ] List rooms: `GET /api/rooms`
- [ ] Update room: `PUT /api/rooms/:id`
- [ ] Delete room: `DELETE /api/rooms/:id`

### Classes Management
- [ ] Create class: `POST /api/classes`
- [ ] List classes: `GET /api/classes`
- [ ] Update class: `PUT /api/classes/:id`
- [ ] Delete class: `DELETE /api/classes/:id`

### Timetable
- [ ] Generate timetable: `POST /api/timetable/generate`
- [ ] View timetable: `GET /api/timetable`

## Frontend Feature Testing
- [ ] Dashboard loads and shows stats
- [ ] Login/Register pages work
- [ ] Teachers page CRUD operations work
- [ ] Subjects page CRUD operations work
- [ ] Rooms page CRUD operations work
- [ ] Classes page CRUD operations work
- [ ] Timetable generation button works
- [ ] Timetable view displays generated schedule

## Common Issues

### CORS Errors
- Ensure backend has CORS enabled (`cors()` middleware in app.js)
- Check that API_URL in frontend matches backend URL

### 404 Errors
- Verify endpoint paths match routes defined in backend
- Check that route middleware order is correct

### Authentication Errors
- Verify JWT_SECRET is set in backend `.env`
- Check that token is being sent in Authorization header
- Token format should be: `Bearer <token>`

### Database Errors
- Verify DATABASE_URL is correct in backend `.env`
- Ensure Supabase database is accessible
- Check that Prisma migrations have been run

