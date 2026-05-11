# AI_RULES.md

## 🏗 Project Architecture & Structure
- **Folder Isolation**: Maintain a strict separation between `/client` (Frontend) and `/server` (Backend).
- **Communication**: Frontend and Backend must communicate via REST API. Use environment variables (`.env`) for URLs and secrets.
- **Type Safety**: Use TypeScript across the entire stack. Define shared Zod schemas where possible to ensure request/response validation.

## 💻 Tech Stack Constraints
- **Frontend**: React.js with Vite, TypeScript, Tailwind CSS.
- **Backend**: Node.js, Express, TypeScript.
- **ORM/DB**: Drizzle ORM with PostgreSQL.
- **Auth**: Clerk (Role-based: ADMIN, MANAGER).
- **Icons/UI**: Lucide-react for icons, Shadcn/UI for professional, minimal components.

## 🗄 Database & Schema Standards
- **Naming Convention**: Use `snake_case` for database columns and `camelCase` for TypeScript/JSON objects.
- **Role Management**: Implement an `enum` for user roles: `['ADMIN', 'MANAGER']`.
- **Core Entities**:
    - `products`: id, name, sku, barcode (unique), stock_quantity, low_stock_threshold, purchase_price, sale_price, category_id.
    - `sales`: id, product_id, quantity, total_price, user_id (clerk_id), created_at.
    - `purchases`: id, product_id, quantity, cost_price, supplier_info, created_at.
- **Inventory Logs**: Maintain a history table for every stock adjustment to ensure auditability.

## 🛠 Business Logic & Features
- **Stock Deduction**: All sales must be wrapped in a Database Transaction. Check stock availability before finalizing a sale.
- **Low Stock Alerts**: Logic must trigger an alert state whenever `stock_quantity <= low_stock_threshold`.
- **Barcode Integration**: The "Add Sale" input should autofocus a barcode field. It must handle rapid input from hardware scanners (listening for the "Enter" key).
- **RBAC (Role-Based Access Control)**:
    - **ADMIN**: Access to financial insights, user management, and hard-deleting products.
    - **MANAGER**: Access to inventory CRUD, recording sales, and scanning, but restricted from sensitive financial dashboards.

## 🎨 Design & UX Principles
- **Aesthetic**: Minimal, professional "Enterprise-lite" design.
- **Color Palette**: Neutral Zinc/Slate backgrounds with subtle primary accents (e.g., Indigo or Blue).
- **Visual Cues**: 
    - Red badges for "Out of Stock".
    - Amber/Orange badges for "Low Stock".
    - Success/Error Toasts for every CRUD operation.
- **Dashboard**: Use light-weight charts (Recharts) to visualize Sales vs. Purchases.

## 🤖 AI Interaction Instructions
- **Refactoring**: When updating code, ensure Drizzle schemas and TypeScript interfaces remain in sync.
- **Error Handling**: Every API endpoint must have a try-catch block and return meaningful HTTP status codes (400, 401, 403, 404, 500).
- **Simplicity**: Favor readable, modular code over complex abstractions.