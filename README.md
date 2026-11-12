# TOOFAN Shield — synthetic-data prototype

TOOFAN Shield is a local demonstration of a financial-pattern review dashboard and an offline evidence-log workflow. All included people, handles, merchants, and transactions are fictional. The app does not connect to UPI, banks, police systems, or government services.

> **Not an operational law-enforcement or legal system.** Pattern scores are not proof, probable cause, or a finding of guilt. The demo does not decide whether an offence occurred, establish liability, determine a minor's legal status, or guarantee compliance with the NDPS Act, JJ Act, IT Act, or evidence rules. PDF output is a draft training artifact—not a court-ready memo or a substitute for counsel, approved forms, lawful procedure, independent verification, or secure evidence handling. A hash can help detect changes to a file; it does not prove when, where, or by whom the file was created.

## Layout

```text
toofan-shield/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── PayDemo.jsx
│       ├── main.jsx
│       ├── styles.css
│       └── evidenceStore.js
└── README.md
```

## Requirements

- Node.js 18+ and npm
- Python 3.10+

## Quick Start (One Command)

```powershell
python main_ui.py
```

- **TOOFAN Shield Command Center:** http://localhost:5173/
- **Google Pay (GPay) Cash Simulator:** http://localhost:5173/pay
- **FastAPI Backend & Swagger Docs:** http://localhost:8000/docs

---

## 🚀 Hosting on Render (Free Tier)

This repository is pre-configured with a **unified single-service deployment** that serves both the FastAPI Python backend and the production React frontend on a single Render URL with zero CORS issues.

### Method 1: 1-Click Blueprint (Recommended)

1. Push your repository to **GitHub** or **GitLab**.
2. Go to your [Render Dashboard](https://dashboard.render.com/).
3. Click **"New +"** → **"Blueprint"**.
4. Select your repository. Render will automatically detect `render.yaml` and configure:
   - **Service Name**: `toofan-shield-gpay`
   - **Environment**: Python
   - **Build Command**: `bash build.sh`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
5. Click **"Apply"**. Render will build the React app and launch the unified server.

---

### Method 2: Manual Web Service Setup

If you prefer to configure manually on Render without Blueprints:

1. In the Render Dashboard, click **"New +"** → **"Web Service"**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name**: `toofan-shield`
   - **Region**: Any (e.g. *Oregon* or *Frankfurt*)
   - **Branch**: `main` (or your active branch)
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     bash build.sh
     ```
   - **Start Command**:
     ```bash
     uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan Type**: `Free`
4. Under **Advanced** → **Environment Variables**, add:
   - `PYTHON_VERSION`: `3.11.9`
   - `NODE_VERSION`: `20.11.0`
5. Click **"Create Web Service"**.

Once deployed, your live Render URL (e.g., `https://toofan-shield.onrender.com`) will serve:
- **Command Center Dashboard**: `https://<your-app>.onrender.com/`
- **Google Pay Simulator**: `https://<your-app>.onrender.com/pay`
- **FastAPI Endpoints**: `https://<your-app>.onrender.com/api/trace-mule` and `/docs`

---

## Run locally (Separate Terminals)

1. Start the API:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

2. In another terminal, start the UI:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173/` for the officer dashboard or `http://localhost:5173/pay` for the separate payment simulator. The API is at `http://localhost:8000`; its interactive docs are at `/docs`.

Run a scenario on `/pay` and open the dashboard in the same browser to see connected transaction sequences. Scenario records pass between pages using local browser storage and to the local API. For browser access from a different origin, configure `TOOFAN_ALLOWED_ORIGINS` as a comma-separated environment variable. The default allows localhost Vite development ports only.

## Demo operations

- Use the preset buttons to create fictional transactions and send them to `/api/trace-mule`.
- The cash scenario shows a synthetic merchant-deposit route separately from any customer's cash purchase. Real cash is fungible; timing or amount similarity alone cannot prove that a later deposit came from a particular sale.
- The cash demo includes a generic receipt-baseline comparison. Its configurable example flags a 4× or greater increase with at least ₹500 difference (₹200 usual vs ₹900 observed); the rule is only a synthetic review prompt, not a validated threshold or a finding of wrongdoing.
- The trace endpoint accepts either a JSON `transactions` array or a CSV string in `csv_data`. It returns candidate topology patterns for human review; it does not label people or accounts as guilty.
- Use the evidence wizard to select a local image (or create a synthetic placeholder), compute its SHA-256 digest in the browser, and store a log in IndexedDB. No image bytes are uploaded to the API.
- Memo generation sends the evidence metadata and checklist to `/api/generate-remand-memo`, which returns a PDF explicitly marked as a **draft training artifact**.
- The privacy toggle masks student labels in the UI and routes the displayed workflow to a fictional rehabilitation lane. It is not a secure anonymization control or a real referral.

## Data handling

The browser stores evidence log metadata and image hashes in IndexedDB on the current device. This is not encrypted storage, a backup, or a certified chain-of-custody system. The backend keeps no case database and writes generated PDFs to memory. Do not enter real personal, financial, health, or case data.
