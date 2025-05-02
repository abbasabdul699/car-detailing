# Reeva Car Detailing App - Setup Guide

## Detailed Installation Instructions

### 1. Installing Node.js

#### On macOS:
1. **Using Homebrew (Recommended)**:
   ```bash
   # Install Homebrew if you haven't already
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Node.js
   brew install node
   ```

2. **Alternative Method**: Download the installer
   - Visit [Node.js official website](https://nodejs.org)
   - Download the LTS (Long Term Support) version
   - Run the downloaded .pkg installer
   - Follow the installation wizard

#### On Windows:
1. Visit [Node.js official website](https://nodejs.org)
2. Download the LTS version installer (.msi)
3. Run the installer
4. Follow the installation wizard (accept all defaults)
5. Restart your computer after installation

#### Verify Installation:
Open Terminal (macOS) or Command Prompt (Windows) and run:
```bash
node --version
npm --version
```
Both commands should display version numbers if installed correctly.

### 2. Installing Next.js and Project Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/abbasabdul699/car-detailing.git
   cd car-detailing
   ```

2. **Install Dependencies** (this will automatically install Next.js):
   ```bash
   npm install
   ```

3. **Verify Next.js Installation**:
   ```bash
   npx next --version
   ```

## Prerequisites

1. **Node.js**
   - Install Node.js LTS version (16.x or higher)
   - Verify installation: `node -v` and `npm -v`

2. **Git**
   - Install Git
   - Verify installation: `git --version`

3. **Code Editor**
   - Install Visual Studio Code (recommended)
   - Recommended extensions:
     - Tailwind CSS IntelliSense
     - ESLint
     - Prettier
     - TypeScript and JavaScript Language Features
     - GitLens (optional)

## Project Setup

1. **Environment Variables**
   Create a `.env` file in the root directory with the following variables:

   ```env
   # Database
   DATABASE_URL="your_database_url"
   MONGODB_URI="your_mongodb_uri"

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID="your_aws_access_key"
   AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
   AWS_REGION="your_aws_region"
   AWS_BUCKET_NAME="your_bucket_name"

   # Email Configuration
   EMAIL_USER="your_gmail_address"
   EMAIL_PASS="your_gmail_app_specific_password"

   # Google Maps
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
   GOOGLE_MAPS_API_KEY="your_google_maps_api_key"

   # Site Configuration
   NEXT_PUBLIC_SITE_URL="https://www.reevacar.com"

   # Development
   NODE_ENV="development"
   ```

4. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

- `/app` - Next.js application routes and components
- `/lib` - Utility functions and configurations
- `/public` - Static assets
- `/prisma` - Database schema and migrations

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed the database
- `npm run migrate-images` - Migrate images to S3
- `npm run update-urls` - Update image URLs in database

## Important Notes

1. **Email Configuration**
   - For Gmail, you need to set up an App Password
   - Go to Google Account > Security > 2-Step Verification > App Passwords
   - Generate a new app password and use it in EMAIL_PASS

2. **AWS S3 Setup**
   - Create an S3 bucket with public access
   - Configure CORS settings for your domain
   - Create an IAM user with S3 access
   - Use the access keys in your environment variables

3. **Google Maps**
   - Create a project in Google Cloud Console
   - Enable Maps JavaScript API, Places API, and Geocoding API
   - Create API keys with appropriate restrictions

4. **Database**
   - Set up a MongoDB database (Atlas recommended)
   - Use the connection string in MONGODB_URI
   - Set up a PostgreSQL database for Prisma
   - Use the connection string in DATABASE_URL

## Troubleshooting

1. **Build Errors**
   - Clear `.next` directory: `rm -rf .next`
   - Delete `node_modules`: `rm -rf node_modules`
   - Reinstall dependencies: `npm install`

2. **Database Issues**
   - Reset Prisma: `npx prisma generate`
   - Reset database: `npx prisma db push --force-reset`

3. **Environment Variables**
   - Restart the development server after changing env vars
   - Make sure all required variables are set

## Support

For any issues:
1. Check the error logs
2. Review the documentation
3. Contact the development team

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

Remember to set all environment variables in your production environment. 