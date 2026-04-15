---
Task ID: 11-b
Agent: Full-stack Developer
Task: Create enhanced Audit Template Library component for Окулус-Аудит

Work Log:
- Read worklog.md for project context (v2.5, 17+ components, Next.js 16 App Router, shadcn/ui, Prisma)
- Read page.tsx — TemplateLibrary already imported and routed at 'library' view with creatorId prop
- Read app-shell.tsx — "Библиотека" nav item already exists in admin "Отчёты" group with Library icon
- Analyzed existing template-library.tsx (basic version with 6 templates, no preview dialog, minimal features)
- Analyzed existing answer type configs from template-builder.tsx for consistency
- Analyzed category badge color patterns from auditor-calendar.tsx, admin-calendar.tsx, template-builder.tsx
- Checked globals.css for existing utility classes (glass, shimmer, glassmorphism)

Created enhanced `/src/components/audit/template-library.tsx` (~550 lines) with:

**Header Section:**
- Title "Библиотека шаблонов" with gradient emerald/teal BookOpen icon in rounded container
- Subtitle "Готовые шаблоны для быстрого начала работы"
- Decorative gradient blur circle behind header
- Search input with Search icon and clear button (X icon)
- Category filter chips: Все, Безопасность, Качество, Экология, Техническое, Санитария
  - Active chip: emerald-600 background with shadow
  - Inactive chip: outline style with emerald hover effects

**Template Cards Grid** (1 col mobile, 2 md, 3 lg):
- 10 templates across 5 categories with 6-12 realistic questions each
- Top gradient accent bar per card (category-colored)
- Category badge with colored dot indicator
- Template icon in category-colored rounded container (hover scale animation)
- Template name (bold) + description (2-line clamp)
- Difficulty dots indicator (1-3 colored dots: emerald/amber/red + label)
- Stats row: question count (ClipboardCheck icon) + estimated time (Clock icon)
- "Использовать" button: emerald→teal gradient, Download icon, shadow
- "Просмотр" button: outline, Eye icon, emerald hover
- Hover effect: shadow-lg, translateY(-4px), 300ms transition
- Staggered card entrance with framer-motion spring animations
- Glassmorphism card background (gradient from-card to-card/80, backdrop-blur)

**Preview Dialog:**
- Gradient header area with template icon, name, description
- Meta badges: category (colored dot), difficulty (colored dot), question count, estimated time
- "Список вопросов" section header
- Numbered question list with emerald gradient number circles
- Answer type badges (color-coded: TEXT, YES_NO, SCALE, NUMBER, PHOTO, DATE, CHECKLIST)
- Required questions marked with red asterisk
- Non-required questions slightly dimmed (opacity-70)
- Staggered question entrance animation
- ScrollArea for long question lists (max-h-[45vh])
- Footer: required count indicator + "Закрыть" and "Импортировать" buttons

**Templates (10 total):**
1. Пожарная безопасность (Безопасность) - 10 questions, 25 min, advanced
2. Контроль качества продукции (Качество) - 12 questions, 35 min, intermediate
3. Охрана труда (Безопасность) - 8 questions, 20 min, intermediate
4. Экологический мониторинг (Экология) - 7 questions, 20 min, advanced
5. Техническое обслуживание станков (Техническое) - 10 questions, 30 min, advanced
6. Санитарные нормы производства (Санитария) - 9 questions, 20 min, beginner
7. Безопасность складских операций (Безопасность) - 8 questions, 25 min, intermediate
8. Энергетическая эффективность (Экология) - 6 questions, 15 min, beginner
9. Электробезопасность (Техническое) - 8 questions, 25 min, advanced
10. Водоочистка и канализация (Санитария) - 6 questions, 15 min, intermediate

**Loading & Empty States:**
- Loading: skeleton shimmer with 6 placeholder cards, header, and filter bar
- Empty: floating animated info icon, "Шаблоны не найдены" message, "Сбросить фильтры" button

**Styling:**
- Emerald/teal primary color scheme with gradient accents
- Framer-motion animations throughout (staggered entrance, hover effects, spring physics)
- Glassmorphism effects on cards (backdrop-blur, gradient backgrounds)
- Dark mode: full dark: variants on all elements
- Responsive design: 1/2/3 column grid, mobile-adapted button labels

**Use Action:**
- POST /api/templates with title, description, category, status, frequency, creatorId, questions
- Toast notification on success: "Шаблон «{name}» импортирован в ваши шаблоны"
- Error toast on failure
- Preview dialog auto-closes on successful import
- Loading spinner during import

**Wiring:**
- No changes needed to page.tsx (already imported and routed)
- No changes needed to app-shell.tsx (already has "Библиотека" nav item)

Verification:
- ESLint: 0 errors, 0 warnings
- Dev server: compiled successfully (160ms)

Stage Summary:
- Completely rewrote template-library.tsx from basic 368-line component to full-featured ~550-line component
- 10 templates with 84 total realistic audit questions across 5 categories
- Preview dialog with detailed question view and answer type badges
- Difficulty indicator with colored dots (beginner/intermediate/advanced)
- Loading shimmer skeleton and enhanced empty state
- Emerald/teal color scheme with gradient accents and glassmorphism
- Full dark mode support
- All wiring already in place — no changes to page.tsx or app-shell.tsx needed
