# Quick Start Guide for New Desktop

## Step 1: Install Required Software

### Install Node.js
1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the LTS (Long Term Support) version
3. Run the installer
4. Open Terminal/Command Prompt and verify:
   ```bash
   node --version  # Should show v16 or higher
   npm --version   # Should show v8 or higher
   ```

### Install Git
1. Go to [https://git-scm.com](https://git-scm.com)
2. Download and install Git
3. Verify installation:
   ```bash
   git --version
   ```

### Install VS Code
1. Go to [https://code.visualstudio.com](https://code.visualstudio.com)
2. Download and install VS Code
3. Install recommended extensions:
   - Tailwind CSS IntelliSense
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features

## Step 2: Clone and Setup Project

1. **Open Terminal/Command Prompt**

2. **Clone the Repository**
   ```bash
   git clone https://github.com/abbasabdul699/car-detailing.git
   cd car-detailing
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Create Environment File**
   Create a new file named `.env` in the project root and copy all environment variables from your current desktop.

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

## Step 3: Verify Installation

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. You should see the Reeva Car Detailing homepage
3. Test the following features:
   - Search functionality
   - Google Maps integration
   - Image uploads
   - Contact form

## Common Issues

### Port Already in Use
```bash
# Kill the process using port 3000
sudo lsof -i :3000
kill -9 <PID>
```

### Node Modules Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules
rm -rf .next
npm install
```

### Environment Variables
Make sure all environment variables are correctly set in your `.env` file:
- Database connections
- AWS credentials
- Google Maps API key
- Email configuration

## Need Help?
- Check the full setup guide: `SETUP_GUIDE.md`
- Review error messages in the terminal
- Check the browser console for frontend errors 