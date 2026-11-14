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

## 🌟 Upgraded Capabilities (BNSS 2023, BSA 2023 & NDPS Act Compliance)

The platform has been enhanced to address 5 critical legal, financial, and operational loopholes:

### 1. Physical Cash & No-Bill Shop Detection (Module 1 & 3)
- **GPS Hotspot Spatial Clustering:** Logs student physical cash handovers with GPS coordinates, shop name, and UPI QR ID. Backend clusters reports using a 50m Haversine radius and 30-day sliding window, automatically flagging shops in pulsating **RED as "High-Risk Cash Choke Points"** once 3+ independent student reports converge.
- **ATM Cash Deposit (CDM) ➔ UPI Loop Detector:** Scans bank transaction streams for smurfing patterns where cash is deposited via Cash Deposit Machines (CDM), micro-ATM agents, or AEPS, and swept out via UPI/IMPS within 15–60 minutes (structured under ₹10,000 or ₹50,000). Visualized with glowing amber nodes in the topology graph.

### 2. Commingled Business "Stock vs. Deposit" Auditor (Module 1)
- **Front-Shop Audit Tool:** Evaluates wholesale purchase stock invoices against actual bank cash/UPI deposits over the same period.
- **Phantom Revenue Detection:** Flags anomalies when bank deposits exceed plausible retail margins (e.g. ₹2,15,000 deposits against ₹20,000 wholesale stock) or transfers occur during off-hours (12:00 AM – 4:00 AM).
- **Section 68J NDPS Legal Notice:** Triggers a statutory indicator under **Section 68J of the NDPS Act (Reverse Burden of Proof)**, placing the legal onus on the suspect to prove legitimate commercial origins.

### 3. Field Protocol Wizard Upgraded to BNSS 2023, BSA 2023 & Full NDPS Compliance (Module 2)
- **Full NDPS & BNSS 7-Point Checklist:** Enforces mandatory procedural compliance:
  1. *Section 42 NDPS:* Written grounds of belief recorded prior to search (Sunset-to-Sunrise mandate).
  2. *Section 42 NDPS:* Recorded grounds dispatched to superior officer within 72 hours.
  3. *Section 50 NDPS:* Accused formally apprised in writing of right to be searched before Gazetted Officer / Magistrate.
  4. *Section 50 NDPS:* Female suspect searched strictly and exclusively by a female officer.
  5. *Section 52A NDPS:* Contraband inventory prepared and submitted before Judicial Magistrate for sampling certification.
  6. *Section 105 BNSS:* Mandatory continuous audio-video recording of search and seizure.
  7. *Section 74 JJ Act:* Child identity cryptographic token generated with zero minor personal details disclosed.
- **Client-Side SHA-256 Hashing:** Uses the browser WebCrypto API to fingerprint seizure videos (Sec 105 BNSS) and photos locally with GPS fix and ISO timestamp without uploading media bytes.
- **Statutory Section 63 BSA 2023 Certificate:** Auto-generates a court-ready Electronic Evidence Certificate under **Section 63 Bharatiya Sakshya Adhiniyam, 2023** embedded in the Remand & Seizure Memo PDF.

### 4. 1-Click Section 94 BNSS Bank Requisition Generator (Module 1)
- Added **"Generate Section 94 BNSS Notice"** buttons next to every flagged UPI VPA, bank account, or shop QR in the graph, transaction ledger, and AI scanner.
- Auto-generates a formal police requisition PDF addressed to the Bank Nodal Officer / NPCI under **Section 94 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023**, demanding KYC records and 90-day CSV transaction logs.

### 5. Section 74 JJ Act Child Pseudonymisation & Role-Based Privacy (Module 3)
- Cryptographic pseudonym tokenization (`STU-TOKEN-XXXX`) for all student records.
- **Header Role Switcher:**
  - **🛡️ DANSAF / Excise Analyst Mode:** Completely masks student name, phone number, school, and photo, exposing only the token, GPS handover location, and suspect supplier links.
  - **🤝 CWC / Vimukthi Counsellor Mode:** Decrypts student identities for Child Welfare Committee (CWC) legal care, psychosocial counselling, and Vimukthi rehabilitation tracking.

---

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
