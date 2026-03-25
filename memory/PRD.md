# Job Tracker PRD

## Original Problem Statement
Build a Job Tracker dashboard that stores job application details with:
- Email/password authentication
- Provision to add custom columns with multiple types (text, date, dropdown, number, checkbox)
- Export/Import JSON functionality
- Analytics/Charts for application statistics
- Persistent data storage with MongoDB
- Dark theme following user's mockup

## User Personas
1. **Job Seeker** - Tracking multiple job applications across companies
2. **Admin** - Managing the platform and having full access

## Core Requirements (Static)
- User authentication (register/login/logout)
- CRUD operations for job applications
- Custom column management
- Contact management per job
- Search and filter capabilities
- Analytics dashboard with charts
- Export/Import JSON data
- Responsive dark theme UI

## What's Been Implemented (March 25, 2026)
- [x] JWT-based email/password authentication
- [x] User registration and login
- [x] Job application CRUD (create, read, update, delete)
- [x] Multi-type custom columns (text, number, date, dropdown, checkbox)
- [x] Contact management per job (name, role, email, LinkedIn, phone)
- [x] Status tracking (Pending, Applied, Interviewing, Offered, Rejected, Ghosted)
- [x] Priority levels (High, Medium, Low)
- [x] Search and filter by status/priority
- [x] Analytics dashboard with pie charts, bar charts, line charts
- [x] Export jobs to JSON
- [x] Import jobs from JSON
- [x] Dark brutalist theme with volt yellow accents
- [x] Responsive design
- [x] MongoDB persistence
- [x] Brute force protection on login

## Architecture
- **Backend**: FastAPI with Motor (async MongoDB driver)
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Database**: MongoDB
- **Auth**: JWT tokens (httpOnly cookies)

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
- GET /api/jobs
- POST /api/jobs
- GET /api/jobs/{id}
- PUT /api/jobs/{id}
- DELETE /api/jobs/{id}
- POST /api/jobs/import
- GET /api/jobs/export/all
- GET /api/columns
- POST /api/columns
- PUT /api/columns/{id}
- DELETE /api/columns/{id}
- GET /api/stats

## Prioritized Backlog
### P0 (Critical) - DONE
- Authentication ✅
- Job CRUD ✅
- Data persistence ✅

### P1 (Important) - DONE
- Custom columns ✅
- Analytics ✅
- Export/Import ✅

### P2 (Nice to Have)
- Email notifications for interview reminders
- Calendar integration for interview scheduling
- Resume attachment storage
- Job posting auto-fill from URL
- Team collaboration features

## Next Tasks
1. Add interview date reminders
2. Implement resume/document uploads
3. Add job board integration (auto-fetch job details)
4. Add team/sharing features
