#!/bin/bash

# Setup CORS for Firebase Storage
# This script configures CORS to allow localhost access

echo "🔧 Setting up CORS for Firebase Storage..."
echo ""

# Add Google Cloud SDK to PATH
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

# Step 1: Authenticate with Google Cloud
echo "Step 1: Authenticating with Google Cloud..."
echo "Please open the URL shown below in your browser and complete the authentication:"
echo ""
gcloud auth login

if [ $? -eq 0 ]; then
    echo "✅ Authentication successful!"
    echo ""
    
    # Step 2: Set the project
    echo "Step 2: Setting Google Cloud project..."
    gcloud config set project prepbharat
    
    # Step 3: Apply CORS configuration
    echo "Step 3: Applying CORS configuration..."
    gsutil cors set cors.json gs://prepbharat.firebasestorage.app
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ CORS configuration applied successfully!"
        echo ""
        echo "You can now refresh your browser at http://localhost:8001/question_assigner.html"
        echo "and try loading JSON files from Firebase Storage."
    else
        echo ""
        echo "❌ Failed to apply CORS configuration. Please check the error above."
    fi
else
    echo ""
    echo "❌ Authentication failed. Please try again."
fi


