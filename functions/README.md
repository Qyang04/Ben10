# Firebase Cloud Functions

Backend API for accessibility analysis

## Setup

```bash
npm install
npm run build
firebase deploy --only functions
```

## Endpoints

- `POST /analyze` - Run accessibility analysis
- `POST /gemini/explain` - Get AI explanation
- `POST /report` - Generate PDF report
