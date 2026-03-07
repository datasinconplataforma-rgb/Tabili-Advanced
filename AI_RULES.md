# AI Rules for Tabili

## Tech Stack

- **Frontend Framework**: React 18.3.1 with TypeScript for type safety and modern component patterns
- **Build Tool**: Vite for fast development server and optimized production builds
- **Routing**: React Router DOM 6.30.1 for client-side navigation and route management
- **UI Components**: shadcn/ui (built on Radix UI primitives) for accessible, customizable components
- **Styling**: Tailwind CSS 3.4.17 with custom design system using HSL color values
- **State Management**: React hooks for local state, TanStack React Query for server state
- **Backend/Auth**: Supabase for authentication, database, and real-time capabilities
- **Data Visualization**: Recharts for creating charts and graphs in reports
- **Icons**: lucide-react for consistent iconography throughout the app
- **Forms & Validation**: react-hook-form with Zod schemas for form management

---

## Library Usage Rules

### UI Components

- **ALWAYS use components from `@/components/ui/`** for standard UI elements (buttons, inputs, dialogs, tables, etc.)
- These are pre-built shadcn/ui components - do not recreate them
- Only create new components in `src/components/` when:
  - You need custom business logic
  - You're combining multiple UI components
  - The component is page-specific or feature-specific

### Styling

- **Use Tailwind CSS utility classes** for all styling
- Follow the custom design system using HSL variables (defined in `src/index.css`)
- Use `cn()` utility from `@/lib/utils` for conditional class merging
- Reference the `src/index.css` for available design tokens (colors, shadows, fonts)

### Icons

- **Use lucide-react icons ONLY** - they are already installed
- All icons should be imported consistently: `import { IconName } from 'lucide-react'`

### Data Fetching & State

- **Use custom hooks from `@/hooks/`** for data fetching patterns:
  - `useAuth` for authentication state
  - `useProjects` for projects data
  - `useCashFlow` for cash flow entries
  - `useCustomTables` and `useCustomTableData` for custom table management
- Use TanStack Query's `QueryClientProvider` (already in App.tsx) for caching and state management
- Do NOT install additional state management libraries (Redux, Zustand, etc.)

### Forms

- **Use react-hook-form** for all forms
- Use Zod schemas for validation (already installed via `@hookform/resolvers`)
- Use shadcn/ui form components (`@/components/ui/form`) which integrate with react-hook-form
- Example pattern: Combine `useForm` hook with shadcn Input/Select components

### Routing

- **Use React Router DOM** for all navigation
- Route definitions MUST be in `src/App.tsx` inside the `<Routes>` component
- Use `Link` component for navigation (imported from react-router-dom)
- Use `useNavigate` hook for programmatic navigation
- Keep all pages in `src/pages/` directory

### Database & Authentication

- **Use Supabase** for all backend operations
- Supabase client is available at `@/integrations/supabase/client`
- Types are auto-generated in `@/integrations/supabase/types.ts`
- Auth state is managed via `AuthContext` at `@/contexts/AuthContext.tsx`
- use `useAuth()` hook to access auth methods (signIn, signUp, signOut)

### Charts & Reports

- **Use Recharts** for all chart visualizations
- Use the Chart components from `@/components/ui/chart` for styling consistency
- Chart configuration should follow the pattern used in `src/pages/relatorios/RelatoriosDinamicos.tsx`

### File Operations

- **Use xlsx** for Excel import/export (already installed)
- **Use jsPDF and jspdf-autotable** for PDF generation (already installed)
- Follow the patterns in existing pages for file operations

### Toast Notifications

- **Use sonner** (via `@/components/ui/sonner`) for toast notifications
- Import and use the `toast` function from `@/hooks/use-toast`
- Example: `toast({ title: 'Success', description: 'Data saved' })`
- Both `Toaster` and `Sonner` components are already in App.tsx

### Date Handling

- **Use date-fns** for all date formatting and manipulation (already installed)
- Use `format()` function consistently: `format(new Date(), 'dd/MM/yyyy')`

### Page Structure

- Main/default page: `src/pages/Index.tsx`
- Always use page components with appropriate layouts (e.g., `ModuleSidebarLayout` for module pages)
- Protected pages must use `SimpleLayout` or check auth state on mount

### Layout Components

- Use `ModuleSidebarLayout` for module pages with sidebar navigation
- Use `SimpleLayout` for protected pages without sidebar
- Layout props should include `moduleName`, `moduleIcon`, and `menuItems` (array of ModuleMenuItem)

### TypeScript

- ALWAYS write TypeScript (no JavaScript files)
- Use existing types from `@/hooks/...` and Supabase types
- Define interfaces for new data structures following existing patterns

---

## File Organization Rules

- **Components**: `src/components/` - Reusable UI components
- **Pages**: `src/pages/` - Route-level components
- **Hooks**: `src/hooks/` - Custom React hooks for data and logic
- **Contexts**: `src/contexts/` - React contexts for global state
- **UI Components**: `src/components/ui/` - shadcn/ui components (DO NOT EDIT)
- **Integrations**: `src/integrations/` - Third-party client configurations

---

## Code Style Rules

- Keep components under 100 lines - split into smaller components if needed
- Use "use client" directive at the top of all components that use hooks or interactivity
- Follow existing naming conventions (e.g., `useXxx` for hooks, `XxxXxx` for components)
- Use meaningful imports - avoid unused imports
- Write complete, self-contained components with all necessary props

---

## Development Workflow

1. Before creating new pages/components, check if similar functionality already exists
2. Use existing patterns from similar files as templates
3. Always use pre-installed libraries - do not add new dependencies without good reason
4. Test changes in the preview after each file update
5. Keep the app responsive - always consider mobile layouts with Tailwind responsive classes

---

## Prohibited Practices

- DO NOT use class-based components (functional components with hooks only)
- DO NOT edit shadcn/ui component files in `src/components/ui/`
- DO NOT install new UI libraries (Material UI, antd, etc.)
- DO NOT use inline styles - use Tailwind classes
- DO NOT create duplicate functionality that already exists
- DO NOT hardcode API keys or secrets (use environment variables)
- DO NOT use `any` type in TypeScript - define proper types