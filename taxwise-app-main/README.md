# TaxWise: Smart ITR Analysis & Planning Tool

TaxWise is a modern, web-based application designed to simplify income tax analysis and planning for individuals, families, and tax professionals in India. By parsing official ITR (Income Tax Return) JSON files or allowing for detailed manual entry, TaxWise provides instant, accurate tax computations, a clear summary dashboard, and powerful tools for financial planning.

## Core Features

### 1. Multi-Form ITR JSON Parser
- **Effortless Upload**: Securely upload your ITR JSON file downloaded from the official income tax portal.
- **Form-Aware Logic**: The parser intelligently detects the ITR form type (ITR-1, ITR-2, ITR-3, ITR-4) and uses form-specific logic to accurately extract data from complex schedules.
- **Instant Processing**: Data is parsed in seconds, automatically populating the entire computation summary.

### 2. Manual Tax Computation & Planning
- **Create from Scratch**: Don't have an ITR file? Start a new manual computation from scratch to plan for the upcoming financial year.
- **Dynamic Inputs**: Freely add, edit, and remove custom income sources and deductions to model various financial scenarios.
- **Real-Time Calculation**: The entire tax liability is re-calculated in real-time with every change you make.

### 3. Detailed Computation Dashboard
- **Comprehensive Summary**: View a clear, line-by-line breakdown of your income, deductions, and tax liabilities.
- **Old vs. New Regime Comparison**: Instantly switch between the Old and New tax regimes to see which is more beneficial. A visual bar chart helps in comparing the final tax payable under both regimes.
- **Capital Gains Module**: A dedicated section for detailed entry of Short-Term (STCG) and Long-Term (LTCG) Capital Gains, including purchase, sale, and expenses, with automatic profit/loss calculation.

### 4. Data Management & Export
- **Client Management**: All uploaded or manually created computations are saved as "clients" to your secure dashboard.
- **Search & Filter**: Quickly find any client using the built-in search bar that filters by Name or PAN.
- **PDF & CSV Export**: Export a professionally formatted PDF summary of any individual computation or export a CSV file containing the summary data for all your clients.

### 5. Secure and Private
- **Firebase Authentication**: User accounts are secured using Firebase Authentication, including options for email/password and Google Sign-In.
- **Firestore Database**: All user data is securely stored in Firestore, with data access protected by security rules. Your financial information remains private to your account.

### 6. AI-Powered Insights (Powered by Genkit)
- The application is integrated with Google's Genkit to provide AI-driven tax-saving tips and summaries based on the user's financial profile.

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **UI Framework**: ShadCN UI Components, Tailwind CSS
- **State Management**: React Hooks (`useState`, `useEffect`)
- **Backend & Database**: Firebase (Authentication, Firestore)
- **AI Integration**: Genkit (for Google's Generative AI models)
- **PDF Generation**: jsPDF, jspdf-autotable
- **Deployment**: Configured for Firebase App Hosting

This combination of technologies ensures a fast, modern, and scalable user experience with robust backend services.
