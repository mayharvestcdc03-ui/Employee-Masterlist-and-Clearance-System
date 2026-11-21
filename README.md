# May Harvest Corporation - Employee Masterlist & Clearance Management System

Enterprise HR & Manpower Lifecycle Management System for Employee Profiles, 201 Files, Accountable Items Issuance, Departmental Deployment Approvals, and Multi-Level Clearance Processing with Real-Time Cloud Synchronization.

---

## 🌟 Key Modules

1. **Executive Dashboard (`E`)**: Real-time manning analytics per agency (Workbridge, Multicareer, Top Jinzai, BLGM, Omnichron) and area requirements.
2. **Master List (`F`)**: Full directory of applicants, active employees, and separated personnel with multi-field search and CSV export.
3. **Personal Information (`A`)**: Comprehensive 201 profile, contact numbers, PSGC Philippine address integration (Province, City/Town, Barangay), emergency contacts, and Government IDs (SSS, PhilHealth, Pag-IBIG, TIN).
4. **Character Reference & Background Check (`K`)**: Employment history, character references, Police/NBI clearance status, and background verification.
5. **Deployment & Approval (`B`)**: Deployment stationing, position mapping, Department Head's approval, and Approval Remarks.
6. **Accountable Items Issuance (`C`)**: Issued company property tracking (Locker keys, IDs, PPEs, jackets, thermometers, gadgets), quantity, condition, and handover logs.
7. **Clearance Process (`D`)**: Multi-signatory clearance workflow (Department Head, Accounting, HR, Operations, Agency Coordinators) with official printable clearance records.
8. **Bulk Upload (`G`)**: Batch onboarding of candidates and personnel via standardized CSV/Excel formats.
9. **Other Sources (`J`)**: Supplemental manpower requests and monitoring for EMHCO, BLGM, and Omnichron personnel.
10. **Document Control (`I`)**: Form registry, effectivity tracking, revision history, and compliance logging.
11. **Accounts (`H`)**: User administration, department and agency mapping, and security controls.

---

## 🛡️ Role-Based Access Control (RBAC)

Strict access permissions matching May Harvest Corporation organizational policies:

| Role | Visible Modules | Access Level |
|---|---|---|
| **Admin** | All Modules (`AKBCDEFGHIJ`) | Full Access |
| **HR** | All except Document Control & Accounts (`AKBCDEFGJ`) | Full Access |
| **Document Control** | Document Control (`I`) | Full Access to Document Register |
| **Operations Manager** | `AKBCDEFJ` | 👁️ **Viewing Only:** Personal Info, Character Reference, Deployment (except Department's Approval)<br>⚡ **Full Access:** Accountable Items, Clearance, Dashboard, Masterlist, Other Sources |
| **Department Heads** | `AKBCDEFJ` | 👁️ **Viewing Only:** Personal Info, Character Reference, Deployment (except Department's Approval & Approval Remarks)<br>⚡ **Full Access:** Accountable Items, Clearance, Dashboard, Masterlist, Other Sources |
| **Agency** | `AKBCDEF` | Full Access within their assigned agency roster |

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/mayharvestcdc06-tech/Employee-Masterlist-and-Clearance-System.git

# Enter project directory
cd Employee-Masterlist-and-Clearance-System

# Start server
npm start
```

Visit `http://localhost:3000` in your browser.

---

## ☁️ Deployment on Render

This repository is pre-configured with `render.yaml` and `Procfile` for one-click deployment on **Render Free Web Service**:

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** ➔ **Web Service**.
3. Select `mayharvestcdc06-tech/Employee-Masterlist-and-Clearance-System`.
4. Click **Deploy Web Service**.

---

© 2026 May Harvest Corporation. All rights reserved.
