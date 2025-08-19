#!/bin/bash
# FILE PATH: start-moonforge.sh (in project root, same level as package.json)
# ACTION: CREATE NEW FILE and make executable with: chmod +x start-moonforge.sh
# PURPOSE: Start MoonForge with all necessary checks

echo "=========================================="
echo "🌙 STARTING MOONFORGE"
echo "=========================================="

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ ERROR: .env.local not found!"
    echo ""
    echo "Please create .env.local with your API keys:"
    echo "1. Copy the template from the artifacts"
    echo "2. Add your Supabase keys"
    echo "3. Add your Helius API keys"
    echo "4. Add your OpenAI API key"
    exit 1
fi

# Check if critical environment variables are set
echo "🔍 Checking environment variables..."
source .env.local

MISSING_VARS=()

if [ "$VITE_SUPABASE_URL" = "https://llvakqunvvheajwejpzm.supabase.co" ]; then
    echo "✅ Supabase URL is set"
else
    echo "⚠️  Supabase URL may be incorrect"
fi

if [ "$VITE_SUPABASE_ANON_KEY" = "your-anon-key-here" ]; then
    MISSING_VARS+=("VITE_SUPABASE_ANON_KEY")
fi

if [ "$HELIUS_RPC_API_KEY" = "your-helius-rpc-key-here" ]; then
    MISSING_VARS+=("HELIUS_RPC_API_KEY")
fi

if [ "$OPENAI_API_KEY" = "your-openai-key-here" ]; then
    echo "⚠️  OpenAI key not set (AI features will be disabled)"
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo ""
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please update .env.local with your actual API keys"
    exit 1
else
    echo "✅ Environment variables configured"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✅ Dependencies installed"
fi

# Check if the program has been deployed
PROGRAM_ID=$(grep "VITE_BONDING_CURVE_PROGRAM_ID=" .env.local | cut -d'=' -f2)
if [ "$PROGRAM_ID" = "11111111111111111111111111111111" ]; then
    echo ""
    echo "⚠️  WARNING: Anchor program not deployed!"
    echo "Token creation will fail until you deploy the program."
    echo "Run: ./deploy-program.sh"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Clear any previous build cache
echo "🧹 Clearing cache..."
rm -rf .vite
rm -rf dist

# Start the development server
echo ""
echo "=========================================="
echo "🚀 Starting development server..."
echo "=========================================="
echo "URL: http://localhost:5173"
echo "=========================================="
echo ""

npm run dev