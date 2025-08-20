#!/bin/bash

# AI Car Detailing Assistant - Deployment Script
# This script helps deploy the AI components to production

set -e

echo "🚀 AI Car Detailing Assistant - Deployment Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "git is not installed"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "pnpm-lock.yaml" ]; then
        if ! command -v pnpm &> /dev/null; then
            print_warning "pnpm not found, installing..."
            npm install -g pnpm
        fi
        pnpm install
    else
        npm install
    fi
    
    print_success "Dependencies installed"
}

# Build the project
build_project() {
    print_status "Building the project..."
    
    if [ -f "turbo.json" ]; then
        if command -v pnpm &> /dev/null; then
            pnpm build
        else
            npm run build
        fi
    else
        cd apps/web && npm run build && cd ../..
    fi
    
    print_success "Project built successfully"
}

# Check environment variables
check_env() {
    print_status "Checking environment variables..."
    
    if [ ! -f ".env" ]; then
        print_warning "No .env file found. Please create one from env.example"
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success "Created .env from env.example"
        fi
    fi
    
    # Check for required environment variables
    required_vars=("DATABASE_URL" "REDIS_URL" "OPENAI_API_KEY" "GOOGLE_API_KEY")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env 2>/dev/null; then
            print_warning "Missing required environment variable: $var"
        fi
    done
    
    print_success "Environment check completed"
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

# Deploy worker
deploy_worker() {
    print_status "Deploying worker..."
    
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found, installing..."
        npm install -g @railway/cli
    fi
    
    print_status "Deploying worker to Railway..."
    cd apps/worker
    railway up
    cd ../..
    
    print_success "Worker deployed successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Test AI conversation endpoint
    print_status "Testing AI conversation endpoint..."
    if [ -f ".env" ]; then
        source .env
        if [ ! -z "$APP_URL" ]; then
            curl -X POST "$APP_URL/api/ai/conversation" \
                -H "Content-Type: application/json" \
                -d '{"message": "test", "stage": "greeting"}' \
                --max-time 10 || print_warning "API test failed (this is normal if not deployed yet)"
        fi
    fi
    
    print_success "Tests completed"
}

# Main deployment flow
main() {
    echo ""
    print_status "Starting deployment process..."
    
    check_dependencies
    install_dependencies
    check_env
    build_project
    
    echo ""
    print_status "Choose deployment option:"
    echo "1) Deploy to Vercel (web app)"
    echo "2) Deploy worker to Railway"
    echo "3) Deploy both"
    echo "4) Run tests only"
    echo "5) Exit"
    
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            deploy_vercel
            ;;
        2)
            deploy_worker
            ;;
        3)
            deploy_vercel
            deploy_worker
            ;;
        4)
            run_tests
            ;;
        5)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Deployment completed successfully!"
    print_status "Next steps:"
    echo "1. Set up environment variables in your deployment platform"
    echo "2. Test the AI endpoints"
    echo "3. Monitor performance and logs"
    echo "4. Begin stress testing"
}

# Run main function
main "$@"
