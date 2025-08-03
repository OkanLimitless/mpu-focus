# MPU-Focus Training Platform

A comprehensive training platform for MPU (Medizinisch-Psychologische Untersuchung) preparation, helping individuals regain their driving licenses through structured courses and document management.

## Overview

MPU-Focus is a dual-platform system consisting of:
- **User Platform**: Course delivery, progress tracking, and document upload
- **Admin Panel**: Client management, course administration, and document review

## Features

### User Platform
- **Course Management**: Structured chapters with video content
- **Progress Tracking**: Real-time monitoring of course completion
- **Document Upload**: PDF document submission for admin review
- **Dashboard**: Personal progress overview and course navigation

### Admin Panel
- **Client Management**: Create and manage user accounts
- **Course Administration**: Manage chapters, videos, and content
- **Document Review**: Access and review uploaded client documents
- **Analytics**: Track user progress and engagement

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **File Upload**: Uploadthing
- **Video Streaming**: Mux (for video progress tracking)
- **Deployment**: Vercel

## Project Structure

```
mpu-focus/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (user)/
│   │   ├── admin/
│   │   └── api/
│   ├── components/
│   │   ├── ui/
│   │   ├── admin/
│   │   └── user/
│   ├── lib/
│   ├── models/
│   └── types/
├── public/
└── docs/
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Uploadthing (for file uploads)
UPLOADTHING_SECRET=your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id

# Mux (for video streaming)
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret

# Admin credentials (for initial setup)
ADMIN_EMAIL=admin@mpu-focus.com
ADMIN_PASSWORD=your_admin_password
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mpu-focus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in all required environment variables

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - User Platform: `http://localhost:3000`
   - Admin Panel: `http://localhost:3000/admin`

## Database Schema

### User Model
- Personal information
- Course progress
- Document submissions
- Authentication details

### Course Model
- Course structure
- Chapters and content
- Video associations

### Document Model
- File metadata
- Upload tracking
- Admin review status

## Development Roadmap

### Phase 1 (Current)
- [x] Project setup and structure
- [ ] User authentication system
- [ ] Basic admin panel
- [ ] Course structure implementation
- [ ] Document upload functionality

### Phase 2 (Future)
- [ ] Mux video integration
- [ ] Advanced progress tracking
- [ ] Document processing automation
- [ ] Enhanced analytics

### Phase 3 (Future)
- [ ] Self-registration system
- [ ] Advanced reporting
- [ ] Mobile optimization
- [ ] API for third-party integrations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Private - All rights reserved

## Support

For support and questions, contact the development team.