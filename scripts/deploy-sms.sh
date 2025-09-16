#!/bin/bash

# SMS Integration Deployment Script
# This script helps deploy the SMS integration changes

set -e

echo "🚀 Deploying SMS Integration for Reeva Car AI"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env() {
    print_status "Checking environment variables..."
    
    required_vars=("TWILIO_ACCOUNT_SID" "TWILIO_AUTH_TOKEN" "TWILIO_PHONE_NUMBER" "TWILIO_WEBHOOK_AUTH_SECRET" "OPENAI_API_KEY" "MONGODB_URI")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Missing required environment variable: $var"
            exit 1
        fi
    done
    
    print_success "All required environment variables are set"
}

# Build the project
build_project() {
    print_status "Building the project..."
    
    if [ -f "pnpm-lock.yaml" ]; then
        if command -v pnpm &> /dev/null; then
            pnpm build
        else
            print_warning "pnpm not found, using npm..."
            npm run build
        fi
    else
        npm run build
    fi
    
    print_success "Project built successfully"
}

# Push database schema changes
push_schema() {
    print_status "Pushing database schema changes..."
    
    if command -v pnpm &> /dev/null; then
        pnpm db:push
    else
        npx prisma db push
    fi
    
    print_success "Database schema updated"
}

# Test the SMS webhook locally
test_webhook() {
    print_status "Testing SMS webhook locally..."
    
    if [ -f "scripts/test-sms.js" ]; then
        print_status "Running SMS test script..."
        node scripts/test-sms.js || print_warning "Test script failed (this is normal if not fully configured)"
    else
        print_warning "Test script not found"
    fi
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found, installing..."
        npm install -g vercel
    fi
    
    # Check if already linked
    if [ ! -f ".vercel/project.json" ]; then
        print_status "Linking to Vercel project..."
        vercel link
    fi
    
    print_status "Deploying to production..."
    vercel --prod
    
    print_success "Deployed to Vercel successfully"
}

# Main deployment flow
main() {
    echo ""
    print_status "Starting SMS integration deployment..."
    
    check_env
    build_project
    push_schema
    
    echo ""
    print_status "Choose deployment option:"
    echo "1) Deploy to Vercel (production)"
    echo "2) Test webhook locally"
    echo "3) Both deploy and test"
    echo "4) Exit"
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_vercel
            ;;
        2)
            test_webhook
            ;;
        3)
            deploy_vercel
            test_webhook
            ;;
        4)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "SMS integration deployment completed!"
    print_status "Next steps:"
    echo "1. Configure your Twilio phone number webhook URL"
    echo "2. Test by sending an SMS to your Twilio number"
    echo "3. Monitor logs for any issues"
    echo "4. Check the TWILIO_SETUP.md guide for detailed instructions"
}

# Run main function
main "$@"
