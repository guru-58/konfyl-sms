# KONFYL Field-Force CRM Backend

This is the Node.js / Express backend service supporting KONFYL's Field-Force CRM Foundation (Phase 4).

## Architecture Overview

The CRM system is built on Firebase Firestore with transactional consistency, schema validators, and hierarchical role-based scoping.

### Core Collections & Data Schemas

1. **`organizationUnits`**: Geographic structures.
   - Types: `ZONE`, `REGION`, `HEADQUARTERS`, `TERRITORY`
   - Strict child-to-parent validation:
     - `REGION` parent must be `ZONE`
     - `HEADQUARTERS` parent must be `REGION`
     - `TERRITORY` parent must be `HEADQUARTERS`
   - Fields: `code` (unique ID), `name`, `type`, `parentId`, `active` (boolean), `state`, `city`, `pincodes` (only for Territory)

2. **`crmSpecialties`**: Doctor specialties.
   - Fields: `code` (unique ID), `name`, `description`, `sortOrder`, `activeStatus` (`ACTIVE`/`INACTIVE`)

3. **`doctors`**: Medical professionals.
   - Fields: `title`, `firstName`, `lastName`, `displayName`, `doctorCode` (unique), `specialtyCode`, `specialtyName`, `qualifications`, `registrationNumber`, `contact` (mobile, email), `primaryTerritoryId`, `classification` (`A`/`B`/`C`), `visitFrequency`, `preferredVisitDays`, `preferredVisitTime`, `activeStatus`

4. **`institutions`**: Medical centers, clinics, pharmacies.
   - Fields: `name`, `institutionCode` (unique), `type` (`CLINIC`/`HOSPITAL`/etc), `address` (line1, city, state, pincode), `territoryId`, `activeStatus`

5. **`crmPracticeLocations`**: Mapped doctor consultation venues (sub-collection under doctors/or linked table).
   - Fields: `doctorId`, `institutionId`, `department`, `isPrimary` (boolean), `consultationDays`, `consultationTime`, `activeStatus`

6. **`crmReportingAssignments`** & **`crmTerritoryAssignments`**: User assignments.
   - Standardized status: `ACTIVE`, `INACTIVE`
   - Safe Firestore transactions to end historical primary records automatically when registering a new primary manager or territory.

7. **`crmAuditLogs`**: Tracks administrative operations (CREATE, UPDATE, STATUS_CHANGE) with actor metadata.

## Security & Scoping (`crmScopeMiddleware.js`)

Requests going to `/api/crm/*` are intercepted by the scoping middleware:
- **ZSM Role**: Traverses reporting assignments to locate downstream RSMs and MRs. Computes allowed list of Zones, Regions, Headquarters, Territories, and Team User IDs.
- **RSM Role**: Traverses region details to compute downstream MRs, Headquarters, and Territories.
- **MR Role**: Checks active Headquarters and Territories mapping.
- Endpoints filter output in-memory or in database queries to prevent data leaks.

## Database Seeding

To run the idempotent seeding script:
```bash
npm run seed:crm
```
*(Runs `scripts/seedCrm.js`)*

## Running Tests

To run the Vitest test suites:
```bash
npm test
```