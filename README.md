# MPU Focus - Complete Learning Management Platform

A comprehensive learning management system built with Next.js 14, TypeScript, and MongoDB. Features include course management, video streaming, assessments, document processing, and administrative tools.

## Features

### Core Learning Platform
- **Course Management**: Create, edit, and organize courses with video content
- **Video Streaming**: High-quality video streaming with Mux integration
- **Progress Tracking**: Real-time progress tracking for students
- **Assessment System**: Quizzes and evaluations with automatic grading
- **User Management**: Student and instructor account management
- **Document Management**: Upload and manage course materials
- **Email Notifications**: Automated email system for important updates

### Document Processor Tool 🆕
- **PDF Processing**: Upload and process large PDF documents (100-200 pages)
- **OCR Integration**: Extract text from scanned documents using Google Cloud Vision API
- **AI-Powered Data Extraction**: Use GPT-4 to structure extracted data according to templates
- **Progress Tracking**: Real-time processing status with progress indicators
- **Template Support**: Pre-built templates for legal documents, invoices, and general documents
- **Streaming Processing**: Server-sent events for real-time updates during processing

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **File Storage**: UploadThing
- **Video Streaming**: Mux
- **Email**: Nodemailer
- **OCR**: Google Cloud Vision API
- **AI/LLM**: OpenAI GPT-4
- **PDF Processing**: pdf2pic
- **UI Components**: Radix UI, Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB instance
- Google Cloud Platform account (for OCR)
- OpenAI API account (for AI extraction)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mpu-focus
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:

#### Required for Document Processing:
```env
# OpenAI API for AI extraction
OPENAI_API_KEY=your-openai-api-key-here

# Google Cloud Vision for OCR
GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id
GOOGLE_CLOUD_KEY_FILE=path/to/your/service-account.json
```

#### Other Required Variables:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/mpu-focus

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# File Upload
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-uploadthing-app-id
```

5. Set up Google Cloud Vision API:
   - Create a Google Cloud Project
   - Enable the Vision API
   - Create a service account and download the JSON key file
   - Set the path to the key file in `GOOGLE_CLOUD_KEY_FILE`

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Document Processor Usage

### Accessing the Tool
Navigate to `/document-processor` to access the document processing tool.

### Supported Features
- **File Upload**: Drag and drop or select PDF files up to 50MB
- **Real-time Processing**: Watch progress as your document is processed
- **OCR Extraction**: Automatic text extraction from scanned pages
- **AI Structuring**: Intelligent data extraction using customizable templates
- **Results Export**: Copy extracted data or process multiple documents

### Processing Workflow
1. **Upload PDF**: Select a PDF document (supports 100-200 pages)
2. **Conversion**: PDF is converted to high-quality images
3. **OCR Processing**: Each page is processed with Google Cloud Vision
4. **AI Extraction**: GPT-4 analyzes and structures the extracted text
5. **Results**: View and copy the structured data output

### Template System
The tool includes pre-built templates for:
- **Legal Documents**: Extract offense details, dates, penalties, and personal information
- **Invoices**: Extract billing information, line items, and totals
- **General Documents**: Extract key information in a structured format

## API Endpoints

### Document Processing
- `POST /api/document-processor/process` - Process a PDF document
  - Accepts: `multipart/form-data` with PDF file
  - Returns: Server-sent events stream with processing status and results

### OCR (Optional)
- `POST /api/ocr/parse-images` - OCR multiple page images via OCR.space in parallel
  - Body: `{ imageUrls: string[], language?: string, isOverlayRequired?: boolean, concurrency?: number }`
  - Response: `{ success: boolean, texts: string[], errors?: { index: number, error: string }[] }`
  - Env: `OCR_SPACE_API_KEY` (falls back to `helloworld` for testing), `OCR_SPACE_CONCURRENCY` (default 5), `OCR_SPACE_DELAY_MS` (default 150)

### Core Platform APIs
- `POST /api/auth/[...nextauth]` - Authentication endpoints
- `GET/POST /api/courses` - Course management
- `GET/POST /api/users` - User management
- `POST /api/upload` - File upload handling
- `GET/POST /api/videos` - Video management with Mux

## Project Structure

```
src/
├── app/
│   ├── document-processor/     # Document processing tool
│   │   └── page.tsx           # Main processor interface
│   ├── api/
│   │   ├── document-processor/ # Processing API routes
│   │   ├── auth/              # Authentication
│   │   ├── courses/           # Course management
│   │   └── users/             # User management
│   ├── admin/                 # Admin dashboard
│   ├── client/                # Client dashboard
│   └── layout.tsx             # Root layout
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── forms/                 # Form components
│   └── layout/                # Layout components
├── lib/
│   ├── document-processor.ts  # Document processing utilities
│   ├── db.ts                  # Database connection
│   ├── auth.ts                # Authentication config
│   └── utils.ts               # Utility functions
├── models/                    # MongoDB schemas
├── types/
│   ├── document-processor.ts  # Document processing types
│   └── index.ts               # General types
└── hooks/                     # Custom React hooks
```

## Environment Configuration

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Production Deployment
The application is configured for deployment on Vercel with:
- Automatic deployments from main branch
- Environment variable management
- Serverless function optimization

## Security Considerations

### Document Processing Security
- File size limits (50MB max)
- PDF file type validation
- Temporary file cleanup
- API rate limiting recommended
- Secure credential management

### General Security
- NextAuth.js for secure authentication
- Environment variable protection
- Input validation and sanitization
- CORS configuration
- File upload restrictions

## Performance Optimization

### Document Processing
- Streaming responses for large documents
- Progressive image conversion
- Parallel OCR processing
- Efficient memory management
- Automatic cleanup of temporary files

### General Platform
- Server-side rendering with Next.js
- Image optimization
- Lazy loading for components
- Database query optimization
- CDN integration with Vercel

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review environment configuration in `.env.example`

---

**Note**: The document processor requires valid API keys for Google Cloud Vision and OpenAI. Make sure to set up these services before using the document processing features.
