README

**Important:** This repository contains multiple projects. The QuickGig application is located in the `QuickGig` folder. **Please ignore all folders outside the QuickGig directory** as they are unrelated to this project.

Problem Statement:
There is a lack of affordable and accessible options for everyday tasks such as cleaning, tutoring,
or simple repairs. Many existing service platforms charge high fees or cater to professionals only,
leaving residents with limited and costly choices.

Solution / App Overview:
QuickGig is a community-based online platform that connects skilled hobbyists and talented local
residents with people who need everyday services.
The platform:
- Allows skilled hobbyists and residents to offer services at accessible, affordable prices.
- Makes essential services more affordable while fostering stronger community connections.
- Provides residents with opportunities to monetize their skills and hobbies.
- Enables users to find trustworthy and verified help within their local community.

Application URL:
Live App: https://web2-g10-op.vercel.app

Git Repository:
GitHub Repository: https://github.com/marcusLiow/Web2-G10.git

Test User details - Use the following test credentials to explore the platform’s features:
- Requestor Email: adriancat@gmail.com
- Requestor Password: password
- Adventurer Email: yourname@gmail.com
- Adventurer Password: 123456
  
Test Payment Details - Use these details when testing the payment form (in Stripe test mode):
- Card Number: 4242 4242 4242 4242
- Expiry Date: Any future date (e.g., 12/25 or 04/28)
- CVC: Any 3 digits (e.g., 123)
- ZIP/Postal Code: Any 5 digits (e.g., 12345)
These details are for testing only and will not process real payments.

How to run:
- clone the repository
- npm install
- npm install vue3-apexcharts apexcharts
- Set up environment variables 
Create a .env file in the QuickGig folder and add the following environment variables: VITE_SUPABASE_URL=https://tlgvoqyldznsvrwugedl.supabase.co VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZ3ZvcXlsZHpuc3Zyd3VnZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNTczODIsImV4cCI6MjA3NTgzMzM4Mn0.hQ5uuw38DgIpNSqXO86TEBprBx9wdQnWUCBp71bTgqI VITE_GOOGLE_MAPS_API_KEY=AIzaSyAxgA1lecOeQ1b9CifEuQ6iXe-t594FZG0 VITE_GOOGLE_GEOCODING_API_KEY=AIzaSyAxgA1lecOeQ1b9CifEuQ6iXe-t594FZG0 VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SLRo95raSCHfjZYIvKDDEvmxhB804Am8ELSSuSSRuvcx3upuBnPuPcY0PLXV2ZHlNPveLBlAHMUZQ9OHG6SyYPn005qmB9M8n
- npm run dev

Key Features:
- Browse and hire local service providers
- Post job listings for everyday tasks
- Secure test payment integration
- Profile and skill management for service providers
- Community-driven rating and review system
- Affordable and accessible platform for all residents
  
Development Team: Web2 Group 10 (G10)
- Marcus Liow
- Angel Lim
- Lesley Tan
- Joseph
- Jiayu

