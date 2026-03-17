# Tap-to-Order Design Spec
# Gastro Bar Station — Direct Order Flow

**Date:** 2026-03-17
**Issue:** #107
**Status:** Approved

---

## Problem

The current Bar flow requires: guest select → add items to cart → click "Bestellen". This creates unnecessary friction for staff:
- With 30+ products the grid is unwieldy with a sidebar taking space
- A separate cart + submit step adds overhead for every single order
- The "Bestellen" button adds a confirmation step that has no value in a fast-paced environment

---

## Solution: Tap-to-Order with Session List

**One tap = one item booked immediately.** No cart, no submit button. A live session list below the product grid shows what has been ordered for this guest, with per-item undo.

### Flow

```
1. Select guest (NFC or manual) — unchanged
2. Product grid appears full-width
3. Tap any product → instant POST /api/orders → item appears in session list below
4. Tap again → another item added
5. ✕ on any session list item → DELETE /api/orders/:id → item removed
6. 20s inactivity → silent reset → back to guest selection
7. Any interaction (tap product, tap ✕, change category) resets the timer
```

### Screen Layout (Bar Station)

```
┌─────────────────────────────────────────┐
│  👤 Max Mustermann  [Aktiv]  [Sperren]  │  GuestHeader
├─────────────────────────────────────────┤
│  [Alle] [Getränke] [Speisen]            │  Category filter
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ Bier │ │Wein  │ │Wasser│ │Cola  │   │  ProductGrid (full width)
│  │×2 3,50│ │ 4,00│ │ 1,50│ │ 2,00│   │  (badge shows session count)
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│  ...                                    │
├─────────────────────────────────────────┤
│  Diese Bestellung (3 Artikel, 10,50 €)  │  SessionOrderList (new)
│  Bier                    3,50 €  [✕]   │
│  Cola                    2,00 €  [✕]   │
│  Bier                    3,50 €  [✕]   │
└─────────────────────────────────────────┘
```

---

## Component Changes

### Modified

| Component | Change |
|-----------|--------|
| `GastronomyPage.jsx` | Replace `cart` state with `sessionOrders` (array of POST responses). Add `inactivityTimer` ref. Replace `addToCart`/`submitOrder` with `tapProduct(product)`. Remove cart column from Bar layout (full-width). |
| `ProductGrid.jsx` | Rename `onAddToCart` → `onTap`. Accept optional `sessionCounts: Map<product_id, count>` prop to show `×N` badge on product buttons when count > 0. |

### New

| Component | Purpose |
|-----------|---------|
| `frontend/src/components/gastro/SessionOrderList.jsx` | Shows orders created in this session. Props: `orders`, `onUndo(orderId)`. Renders item rows with name, price, ✕ button. Shows total at bottom. Hidden when `orders.length === 0`. |

### Deleted

| Component | Reason |
|-----------|--------|
| `OrderCart.jsx` | Replaced by SessionOrderList |
| `OrderCartItem.jsx` | No longer needed |

### Unchanged

`GuestSelector`, `GuestHeader`, `OpenOrdersPanel`, `RegisterView`, `SettleDialog`, `StationSelector`, `KitchenView`, `GuestSearchInput`, `RegisterGuestCard`

---

## Backend Changes

### New Endpoint

```
DELETE /api/orders/:id
```

- **Auth:** Required (referee / admin / director)
- **Success:** 200 `{ message: 'Order deleted' }`
- **404:** Order not found
- **409:** Order already paid (`status !== 'open'`)
- Uses prepared statement: `DELETE FROM orders WHERE id = ? AND status = 'open'`

### Modified

`backend/src/routes/orders.js` — add DELETE handler.

---

## State Design

### `sessionOrders` (replaces `cart`)

```js
// Array of order objects returned by POST /api/orders
[
  { id: 42, product_id: 3, product_name: 'Bier', price: 3.50, quantity: 1 },
  { id: 43, product_id: 5, product_name: 'Cola', price: 2.00, quantity: 1 },
]
```

Each entry has `id` (order DB id) which is used for DELETE.

### `sessionCounts` (derived, not stored)

```js
// Computed from sessionOrders on render
const sessionCounts = sessionOrders.reduce((map, o) => {
  map.set(o.product_id, (map.get(o.product_id) || 0) + 1);
  return map;
}, new Map());
```

Passed to ProductGrid as prop to show `×N` badges.

### Inactivity Timer

```js
const timerRef = useRef(null);

const resetTimer = () => {
  clearTimeout(timerRef.current);
  timerRef.current = setTimeout(clearSession, 20000); // 20 seconds
};

const tapProduct = async (product) => {
  resetTimer();
  // POST /api/orders ...
};

// Also reset on: category change, ✕ undo
// Clear timer in useEffect cleanup
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| POST fails (network/server error) | Toast "Fehler beim Buchen" — no entry added to sessionOrders |
| Product unavailable (backend 400) | Toast "Produkt nicht verfügbar" |
| Guest blocked | ProductGrid stays dimmed (`isBlocked` prop, unchanged) |
| DELETE fails | Toast "Rückgängig nicht möglich" — entry stays in list |
| DELETE 409 (already paid) | Toast "Bereits abgerechnet — kann nicht entfernt werden" |

---

## Design Constraints

- **Font:** Verdana, Geneva, sans-serif throughout
- **Colors:** PE CSS tokens only (`var(--pe-*)`)
- **Touch targets:** All buttons ≥ 64px (✕ undo buttons, product buttons already 96px)
- **Dark mode:** Always
- **Inactivity timeout:** 20 seconds hardcoded — no config needed

---

## Out of Scope

- Quantity selector (1 tap = 1 item, always)
- Kitchen view changes (separate issue #103)
- Product management UI (separate issue #108)
- Tournament association (separate issue #106)
