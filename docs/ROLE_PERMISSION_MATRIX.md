# SEIP Role & Permission Matrix

**Document Version:** 1.0.0  
**Date:** October 5, 2026  
**Platform:** Smart Expense Intelligence Platform (SEIP)  

---

## 1. Primary Roles Overview

SEIP defines four canonical tiers of authority, designed for individuals, companies, student clubs, associations, and NGOs:

1. **Member:** Individual participants who track personal financial activity, use wallets, view shared budgets, and access individual reports.
2. **Finance Manager:** Financial operators (accountants, treasurers) responsible for organization financial bookkeeping, budget administration, transaction verification, and financial report generation.
3. **Organization Admin:** Executive leads and managers who administer organization profiles, member onboarding/roles, category configurations, and organization-wide governance.
4. **Super Admin:** Platform engineers and cross-tenant operators authorized to perform platform maintenance, oversee all organizations, and manage global system resources.

---

## 2. Comprehensive Permission Matrix

| Operation / Capability | Member | Finance Manager | Organization Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Identity & Profile** | | | | |
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Update own profile & password | ✅ | ✅ | ✅ | ✅ |
| **Wallets & Ledgers** | | | | |
| View personal wallet & balance | ✅ | ✅ | ✅ | ✅ |
| View personal ledger history | ✅ | ✅ | ✅ | ✅ |
| Top up personal wallet | ✅ | ✅ | ✅ | ✅ |
| View organization wallet balance | ❌ | ✅ | ✅ | ✅ |
| Adjust organization wallet entries | ❌ | ✅ | ✅ | ✅ |
| **Transactions** | | | | |
| Create personal expense/income | ✅ | ✅ | ✅ | ✅ |
| Edit personal draft transaction | ✅ | ✅ | ✅ | ✅ |
| Delete/void personal transaction | ✅ | ✅ | ✅ | ✅ |
| Create organization transaction | ❌ | ✅ | ✅ | ✅ |
| Edit organization transaction | ❌ | ✅ | ✅ | ✅ |
| Delete/void organization transaction | ❌ | ✅ | ✅ | ✅ |
| View organization transaction list | ❌ | ✅ | ✅ | ✅ |
| View personal transaction history | ✅ | ✅ | ✅ | ✅ |
| Search & filter organization transactions | ❌ | ✅ | ✅ | ✅ |
| **Budgets** | | | | |
| View active organization budgets | ✅ | ✅ | ✅ | ✅ |
| Propose / create budget | ❌ | ✅ | ✅ | ✅ |
| Edit budget details & allocations | ❌ | ✅ | ✅ | ✅ |
| Approve / reject budget | ❌ | ❌ | ✅ | ✅ |
| Delete budget | ❌ | ❌ | ✅ | ✅ |
| Track deterministic budget utilization | ✅ | ✅ | ✅ | ✅ |
| **Categories** | | | | |
| View system & organization categories | ✅ | ✅ | ✅ | ✅ |
| Create custom organization category | ❌ | ✅ | ✅ | ✅ |
| Edit organization category | ❌ | ✅ | ✅ | ✅ |
| Deactivate organization category | ❌ | ❌ | ✅ | ✅ |
| **Members & Organization** | | | | |
| View member directory | ✅ | ✅ | ✅ | ✅ |
| Invite / add new member | ❌ | ❌ | ✅ | ✅ |
| Assign / change member roles | ❌ | ❌ | ✅ | ✅ |
| Suspend / activate member | ❌ | ❌ | ✅ | ✅ |
| Remove member from organization | ❌ | ❌ | ✅ | ✅ |
| View organization profile | ✅ | ✅ | ✅ | ✅ |
| Edit organization profile & settings | ❌ | ❌ | ✅ | ✅ |
| **Reports & Analytics** | | | | |
| View personal spending breakdown | ✅ | ✅ | ✅ | ✅ |
| View organization financial reports | ❌ | ✅ | ✅ | ✅ |
| View organization analytics & summary | ❌ | ✅ | ✅ | ✅ |
| Export financial data / Excel reports | ❌ | ✅ | ✅ | ✅ |
| **Audit & Governance** | | | | |
| View financial audit log | ❌ | ❌ | ✅ | ✅ |
| Platform administration & cross-tenant ops | ❌ | ❌ | ❌ | ✅ |
| **AI & Financial Intelligence** | | | | |
| View AI system status | ✅ | ✅ | ✅ | ✅ |
| View personal AI insights | ✅ | ✅ | ✅ | ✅ |
| View organization AI insights | ❌ | ✅ | ✅ | ✅ |
| Request transaction classification | ✅ | ✅ | ✅ | ✅ |
| Administer AI provider settings | ❌ | ❌ | ❌ | ✅ |

---

## 3. Legacy Role Compatibility Mapping

To maintain 100% backward compatibility with existing tests and integrations, incoming legacy role names are normalized to canonical roles via `normalizeRole()`:

| Legacy Role Name | Case Variations | Canonical Role | Equivalent Permissions |
| :--- | :--- | :--- | :--- |
| `Student` | `student`, `Student` | **Member** | Personal transactions, wallet, personal dues |
| `Treasurer` | `treasurer`, `Treasurer` | **Finance Manager** | Bookkeeping, budget creation, ledger audit |
| `Admin` | `admin`, `Admin` | **Organization Admin** | Budget approval, member management, org settings |
| `Super Admin` | `super admin`, `Super Admin` | **Super Admin** | Platform maintenance, cross-tenant override |
