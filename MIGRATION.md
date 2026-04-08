# Intelli Campus AI - Migration to Custom Backend

## Summary of Changes

### 1. Supabase Removed
- Deleted `src/integrations/supabase/` (client.ts, types.ts)
- Removed `@supabase/supabase-js` from package.json
- Removed Supabase env vars from `.env`

### 2. AI Integration (Gemini)
- **Backend**: Uses `GEMINI_API_KEY` in backend `.env` - all AI runs server-side
- **Frontend**: No AI API keys - all AI calls go through backend (`/api/ai/*`)
- AI features: Chat, Homework generator, Analytics

### 3. Global API Service (`src/services/api.js`)
- Axios-based client with `VITE_API_BASE_URL`
- Auto-attaches JWT from `localStorage`
- Global error handling (401 → redirect to login)

### 4. AI Service (`src/services/aiService.js`)
- `chat()` - POST /api/ai/chat
- `generateHomework()` - POST /api/ai/homework/generate
- `getClassHomework()` - GET /api/ai/homework/class/:classId
- `getStudentPerformance()`, `getPerformanceTrends()`, etc.

### 5. Environment Variables
Create `.env` in frontend root:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

Backend `.env` should include:
```
GEMINI_API_KEY=your-gemini-api-key
```

### 6. Hooks Created
- `useAuth` - re-exports from AuthContext
- `useAdminStudents`, `useHomeroomStudents` - students
- `useTeachers` - teachers
- `useAIChat`, `useAIHomework` - AI
- `useAnalytics`, `useStudentPerformance`, `useSchoolOverview` - analytics

### 7. Pages Updated
- AdminStudents - fetches from GET /api/admin/students
- AdminTeachers - fetches from GET /api/admin/teachers
- StudentHomework - fetches from GET /api/ai/homework/class/:classId
- ChatWindow - uses POST /api/ai/chat instead of Supabase Edge Functions

### 8. Backend Additions
- `GET /api/admin/students` - School admin lists all students
