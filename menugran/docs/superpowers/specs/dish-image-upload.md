# Dish Photo Upload & Management — Design Spec

## Context

The admin panel (`/admin/menu`) already supports CRUD for menu items and categories, including an image upload field (`dishImageFile`) that saves files locally via `POST /api/admin/menu`. This plan **enhances** the existing upload system to deliver a polished, mobile-first experience for restaurant admins who manage menus from their phones.

### Current State (Verified)

| Layer | What exists today |
|-------|-------------------|
| **API** (`src/app/api/admin/menu/route.ts`) | `POST` accepts `FormData` with optional `image` file. Uses `saveImage()` (sharp: resize 800×600, webp q80, saves to `public/uploads/menu/`). `imageUrl` stored as relative path `/uploads/menu/{name}`. Requires `ADMIN` or `SUPERADMIN` via `withAuth()`. |
| **Admin page** (`src/app/(admin)/admin/menu/page.tsx`) | 642-line page with `dishImageFile` / `dishImagePreview` state. Sends `FormData` when image is selected. Uses `URL.createObjectURL` for preview. Has `removeDishImage()`. |
| **Menu item model** | `imageUrl` field exists in Prisma schema (string, optional). |

---

## Goal / Deliverables

Build three features on top of the existing infrastructure:

1. **Drag-and-drop image upload** — Replace the plain file input with a tappable dropzone that shows instant preview, supports image removal, and displays upload progress.
2. **Image upload progress indicator** — Show a progress bar during upload so users know the system is working (large files on slow connections).
3. **Bulk image upload** — Allow selecting or dragging multiple images at once to populate the dish gallery efficiently.

---

## User Experience

### Primary Persona
Restaurant owner or kitchen manager, managing the menu from a mobile device during busy service hours.

### Key User Stories

| # | Story |
|---|-------|
| US-1 | As a restaurant owner, I tap the image area to upload a photo and see a live preview before saving. |
| US-2 | As a restaurant owner, I drag an image onto the upload area to add it quickly. |
| US-3 | As a restaurant owner, I see a progress bar while the image uploads so I don't think the app is frozen. |
| US-4 | As a restaurant owner, I select multiple images at once to build a gallery for a dish. |
| US-5 | As a restaurant owner, I can remove an image and replace it with a different one. |

---

## Architecture

### Component Design

```
<AdminMenuPage>                          ← existing, modified
  └─ <DishImageUploader>                 ← NEW component
       ├─ DropZone (tap or drag-to-upload)
       ├─ UploadProgress (progress bar)
       ├─ ImagePreview (thumbnail + remove)
       └─ BulkImageGrid (multiple image slots)
```

### Data Flow

```
User taps/drags image(s)
  → File(s) validated (size, type)
  → FormData created per file
  → POST /api/admin/menu (existing endpoint, already handles FormData)
  → saveImage() processes via sharp (existing)
  → imageUrl[] saved to MenuItem (schema update needed for array)
  → Response returns saved item
  → UI updates preview grid
```

### Schema Change

The `MenuItem.imageUrl` field is currently a single string. For bulk upload support, add a new field:

```prisma
model MenuItem {
  // ... existing fields
  imageUrl   String?    @db.VarChar(500)   // keep for backward compat
  imageUrls  String[]?                       // NEW: array of image URLs
}
```

---

## API Design

### No new endpoints needed

The existing `POST /api/admin/menu` already:
- Accepts `FormData` with an `image` file
- Processes via `saveImage()` with sharp
- Returns the saved item with `imageUrl`

**Modification**: Update the route to also handle `images` (multiple files) and populate the new `imageUrls` array field.

### Updated POST /api/admin/menu

```
FormData fields:
  name: string (required)
  description?: string
  price: number (required)
  categoryId: string (required)
  image?: File        ← existing, single image
  images?: File[]     ← NEW, multiple images for bulk upload
```

---

## UI Components

### DishImageUploader Component

**Location**: `src/components/admin/DishImageUploader.tsx`

```tsx
// Core functionality:
- Dropzone with tap-to-upload and drag-and-drop
- File validation: max 5MB, accepts image/jpeg, image/png, image/webp, image/avif
- Upload progress tracking via XMLHttpRequest
- Preview grid showing uploaded images
- Remove button per image
- Single-image mode (default) and multi-image mode (bulk)
```

### Upload Progress

Use `XMLHttpRequest` instead of `fetch` for upload progress events:

```tsx
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (e) => {
  if (e.lengthComputable) {
    setProgress(Math.round((e.loaded / e.total) * 100));
  }
};
```

### Dropzone States

| State | Appearance |
|-------|------------|
| **Empty** | Dashed border, camera icon, "Tap to add photo" text |
| **Hover/Drag** | Blue border, background tint, "Drop image here" |
| **Uploading** | Progress bar overlay, percentage text |
| **Preview** | Image thumbnail(s) with remove (×) button |
| **Error** | Red border, error message (e.g., "File too large") |

---

## Styling

Use Tailwind CSS (already configured in project). Follow existing design tokens from `tailwind.config.ts`:

- Border radius: `rounded-xl` (matches existing card style)
- Colors: `brand`, `gold`, `cream`, `ink`, `neutral` tokens
- Shadows: `soft`, `card` tokens
- Safe area padding: `safe-top`, `safe-bottom` for mobile

### Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| Mobile (<640px) | Full-width dropzone, single column preview grid |
| Tablet (640-1024px) | Side-by-side: dropzone + preview |
| Desktop (>1024px) | Compact dropzone, horizontal preview strip |

---

## Accessibility

- Dropzone uses `role="button"` with `tabIndex={0}`
- Keyboard activation: Enter/Space triggers file picker
- `aria-label="Upload dish image"` on the dropzone
- `aria-live="polite"` on progress indicator
- Remove buttons have `aria-label="Remove image {n}"`
- Focus ring visible on all interactive elements

---

## Testing

### Unit Tests

| Test | Description |
|------|-------------|
| File validation | Rejects files >5MB, non-image types |
| FormData construction | Correctly appends files to FormData |
| Progress tracking | xhr.upload.onprogress fires with correct percentages |

### Integration Tests

| Test | Description |
|------|-------------|
| Single image upload | Select file → preview shown → save → imageUrl persisted |
| Multiple image upload | Select 3 files → all previews shown → save → imageUrls populated |
| Image removal | Click remove → image removed from preview and not saved |
| API error handling | Server returns 413 → error message displayed |

### E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| Tap to upload | Tap dropzone → file picker opens → select image → preview appears |
| Drag and drop | Drag image onto dropzone → preview appears |
| Progress visible | Upload large image → progress bar appears and completes |
| Bulk upload | Select multiple files → all appear in preview grid |
| Mobile viewport | Test all interactions at 375×667 viewport |

---

## Implementation Plan

### Phase 1: Core Upload Component
1. Create `DishImageUploader` component with dropzone, preview, and remove
2. Add file validation (size, type)
3. Integrate with existing `saveDish` FormData flow
4. Write unit tests for validation logic

### Phase 2: Upload Progress
1. Replace `fetch` with `XMLHttpRequest` for upload
2. Add progress bar UI with percentage
3. Handle upload errors gracefully
4. Write integration tests

### Phase 3: Bulk Upload
1. Add `imageUrls` field to Prisma schema + migration
2. Update API route to handle multiple files
3. Update `DishImageUploader` for multi-image mode
4. Update admin page to pass `imageUrls` to form state
5. Write integration and E2E tests

### Phase 4: Polish
1. Responsive styling refinements
2. Accessibility audit
3. Performance optimization (image compression before upload)
4. Documentation update

---

## Verification

- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] Manual test: upload single image on mobile viewport
- [ ] Manual test: drag-and-drop image
- [ ] Manual test: bulk upload multiple images
- [ ] Manual test: progress bar visible during upload
- [ ] Manual test: remove image from preview
- [ ] API test: POST with FormData returns saved imageUrl/imageUrls
