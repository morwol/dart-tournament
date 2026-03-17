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
2. Timer starts immediately when guest is set (sessionOrders reset to [])
3. Product grid appears full-width
4. Tap any product → instant POST /api/orders → item appears in session list below
5. Tap again → another item added
6. ✕ on any session list item → DELETE /api/orders/:id → item removed from sessionOrders;
   re-fetch guestOpenOrders to keep OpenOrdersPanel in sync
7. 20s inactivity → clearSession() → back to guest selection
8. Any interaction (tap product, tap ✕, change category) resets the timer
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

### Modified: `GastronomyPage.jsx`

Complete list of state/function changes:

| Old | New | Notes |
|-----|-----|-------|
| `cart` state (`[]`) | `sessionOrders` state (`[]`) | Array of POST response objects |
| `setCart([])` everywhere | `setSessionOrders([])` everywhere | Including `onGuestSelect`, `handleNFCScan`, `confirmSettle`, `onClose` in GuestHeader |
| `addToCart(product)` | `tapProduct(product)` | Direct POST, no cart accumulation |
| `submitOrder()` | _(removed)_ | No submit step |
| `submitting` state | Kept for settle flow only — NOT used by `tapProduct` | `confirmSettle` still uses `setSubmitting(true/false)` |
| `orderSuccess` state | _(removed)_ | Success is implicit: item appears in SessionOrderList |
| Bar layout: two columns (`flex-col md:flex-row`) | Single column (`w-full`) | Cart sidebar column removed |
| `<OrderCart ... />` | `<SessionOrderList orders={sessionOrders} onUndo={tapUndo} />` | |

Add `inactivityTimer` ref (`useRef(null)`). Add `resetTimer()` / `clearSession()` functions (see State Design section below).

### Modified: `ProductGrid.jsx`

| Change | Detail |
|--------|--------|
| Rename prop `onAddToCart` → `onTap` | Update all call sites |
| Add optional prop `sessionCounts: Map<number, number>` | Default: empty Map |
| Show `×N` badge on product button | When `sessionCounts.get(product.id) > 0`, render a small badge (top-right corner or below price): `×N` in `var(--pe-cyan-bright)`, `fontSize: 11px`, `fontWeight: bold` |

### New: `SessionOrderList.jsx`

**File:** `frontend/src/components/gastro/SessionOrderList.jsx`

**Props:**
```js
orders: Array<{
  id: number,            // order DB id — used for DELETE
  product_id: number,
  product_name: string,
  price: number,         // display with .toFixed(2)
  quantity: number,      // always 1 per entry (one tap = one row)
  category: string,
  status: string,
  ordered_at: string,
}>
onUndo: (orderId: number) => void
```

**Render:** Hidden when `orders.length === 0`. When visible:
- Header: `"Diese Bestellung (${orders.length} Artikel, ${total.toFixed(2)} €)"` — `fontWeight: bold`, `color: var(--pe-text)`, `fontSize: 14px`
- Rows: each order is one row — product_name left, `${parseFloat(price).toFixed(2)} €` center, `[✕]` button right
- ✕ button: `minWidth: 64px`, `minHeight: 64px`, `color: var(--pe-danger)`, `background: var(--pe-bg-elevated)`, `border: none`, `borderRadius: 12px`, `cursor: pointer`
- Total row at bottom: `"Gesamt: ${total.toFixed(2)} €"` — `color: var(--pe-cyan-bright)`, `fontWeight: bold`, `textAlign: right`
- Container: `background: var(--pe-bg-card)`, `border: 1px solid var(--pe-border)`, `borderRadius: 12px`, `padding: 12px`, `marginTop: 12px`

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

- **Auth:** `requireAuth` middleware (same as all other order endpoints — any valid JWT)
- **Success:** 200 `{ message: 'Order deleted' }`
- **404:** Order not found or already paid (use `DELETE FROM orders WHERE id = ? AND status = 'open'`; if `changes === 0`, return 404)
- **Implementation:**
```js
router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare(
    'DELETE FROM orders WHERE id = ? AND status = \'open\''
  ).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Order not found or already paid' });
  res.json({ message: 'Order deleted' });
});
```

### Modified

`backend/src/routes/orders.js` — add DELETE handler above.

### POST /api/orders response shape

The existing POST handler returns the full joined row. Implementers can rely on these fields in the response:

```js
{
  id: number,           // order DB id
  guest_id: number,
  product_id: number,
  product_name: string, // from JOIN with products table
  price: number,        // float from SQLite — use .toFixed(2) for display
  quantity: number,     // always 1 for tap-to-order
  category: string,     // 'drink' | 'food'
  status: string,       // 'open'
  ordered_at: string,   // ISO datetime string
}
```

---

## State Design

### `sessionOrders`

```js
const [sessionOrders, setSessionOrders] = useState([]);
// Array of POST response objects (see POST response shape above)
// Each tap appends one entry. Undo removes by order id.
```

### `sessionCounts` (derived, not stored)

```js
const sessionCounts = sessionOrders.reduce((map, o) => {
  map.set(o.product_id, (map.get(o.product_id) || 0) + 1);
  return map;
}, new Map());
```

Passed to ProductGrid as prop.

### `clearSession()`

Resets ALL guest-related state and returns to guest selection:

```js
const clearSession = () => {
  clearTimeout(timerRef.current);
  setGuest(null);
  setSessionOrders([]);
  setGuestOpenOrders(null);
  setProductFilter('all');
  setIsBlocked(false);
};
```

### Inactivity Timer

Timer starts when guest is set. Resets on every interaction.

```js
const timerRef = useRef(null);

const resetTimer = () => {
  clearTimeout(timerRef.current);
  timerRef.current = setTimeout(clearSession, 20000); // 20 seconds
};

// Start timer when guest is selected (both manual and NFC paths):
const selectGuest = (g) => {
  setGuest(g);
  setSessionOrders([]);
  setGuestOpenOrders(null);
  resetTimer(); // start immediately
};
// handleNFCScan must also call resetTimer() after resolving the guest,
// either by delegating to selectGuest() or calling resetTimer() directly.

// Reset on every interaction:
const tapProduct = async (product) => {
  resetTimer();
  // POST /api/orders ...
};

const tapUndo = async (orderId) => {
  resetTimer();
  // DELETE /api/orders/:id ...
};

const handleCategoryChange = (cat) => {
  setProductFilter(cat);
  resetTimer();
};

// Cleanup:
useEffect(() => {
  return () => clearTimeout(timerRef.current);
}, []);
```

### `tapProduct(product)`

```js
const tapProduct = async (product) => {
  resetTimer();
  try {
    const order = await api.post('/orders', {
      guest_uid: guest.nfc_uid,
      product_id: product.id,
      quantity: 1,
    });
    setSessionOrders(prev => [...prev, order]);
  } catch (err) {
    addToast({ type: 'error', message: 'Fehler beim Buchen' });
  }
};
```

### `tapUndo(orderId)`

```js
const tapUndo = async (orderId) => {
  resetTimer();
  try {
    await api.delete(`/orders/${orderId}`);
    setSessionOrders(prev => prev.filter(o => o.id !== orderId));
    // Re-fetch open orders to keep OpenOrdersPanel in sync
    fetchGuestOpenOrders(guest.id);
  } catch (err) {
    addToast({ type: 'error', message: 'Rückgängig nicht möglich' });
  }
};
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| POST fails (network/server error) | Toast "Fehler beim Buchen" — no entry added to sessionOrders |
| Product unavailable (backend 404) | Toast "Produkt nicht verfügbar" |
| Guest blocked | ProductGrid stays dimmed (`isBlocked` prop, unchanged) |
| DELETE fails (network/server error) | Toast "Rückgängig nicht möglich" — entry stays in list |
| DELETE 404 (not found / already paid) | Toast "Bereits abgerechnet — kann nicht entfernt werden" |

---

## Design Constraints

- **Font:** Verdana, Geneva, sans-serif throughout
- **Colors:** PE CSS tokens only (`var(--pe-*)`)
- **Touch targets:** All buttons ≥ 64px (✕ undo buttons min 64×64px, product buttons already 96px)
- **Dark mode:** Always
- **Inactivity timeout:** 20 seconds hardcoded — no config needed

---

## Out of Scope

- Quantity selector (1 tap = 1 item, always)
- Kitchen view changes (separate issue #103)
- Product management UI (separate issue #108)
- Tournament association (separate issue #106)
