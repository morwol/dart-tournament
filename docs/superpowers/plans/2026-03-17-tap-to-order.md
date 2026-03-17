# Tap-to-Order Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cart+submit flow in the Bar station with direct tap-to-order — each product tap immediately POSTs an order, and a session list below the grid shows what was ordered with per-item undo.

**Architecture:** Three focused changes: (1) new DELETE endpoint on the backend, (2) new `SessionOrderList` component, (3) GastronomyPage state refactor replacing `cart`/`addToCart`/`submitOrder` with `sessionOrders`/`tapProduct`/`tapUndo` plus a 20s inactivity timer. `OrderCart` and `OrderCartItem` are deleted. `ProductGrid` gets a session-count badge.

**Tech Stack:** React 18 + Vite + Zustand + TailwindCSS; Node.js + Express + better-sqlite3; PE CSS tokens (`var(--pe-*)`); Verdana font; touch targets ≥ 64px

**Spec:** `docs/superpowers/specs/2026-03-17-tap-to-order-design.md`

---

## Chunk 1: Backend — DELETE /api/orders/:id

### Task 1: Add DELETE endpoint to orders route

**Files:**
- Modify: `backend/src/routes/orders.js`

- [ ] Open `backend/src/routes/orders.js`. Read the existing route handlers to find the correct insertion point. The new handler must be placed **before** the `GET /by-guest` handler to avoid Express matching `/:id` as a literal path collision with named routes. A safe placement is directly after the existing `POST /api/orders/settle/:guestId` handler.

- [ ] Add the following handler:

```js
router.delete('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
  const result = db.prepare(
    "DELETE FROM orders WHERE id = ? AND status = 'open'"
  ).run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Order not found or already paid' });
  }
  res.json({ message: 'Order deleted' });
});
```

- [ ] Verify the handler is placed before any `GET /by-guest` or `GET /dashboard` routes so Express does not interpret `by-guest` or `dashboard` as an `:id` param. (Express evaluates routes in declaration order — named segments like `/by-guest` are fine as long as they are declared before `/:id`.)

- [ ] Manual test — start the backend and run:
```bash
# 1. Get auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r .token)

# 2. Create a test order (requires an existing guest and product)
curl -s -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"guest_id":1,"product_id":1,"quantity":1}' | jq .
# Expected: JSON with id, product_name, price, status: "open"

# 3. Note the returned id (e.g. 42), then delete it
curl -s -X DELETE http://localhost:3001/api/orders/42 \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: {"message":"Order deleted"}

# 4. Delete same id again — should 404
curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE http://localhost:3001/api/orders/42 \
  -H "Authorization: Bearer $TOKEN"
# Expected: 404

# 5. Delete non-existent id
curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE http://localhost:3001/api/orders/999999 \
  -H "Authorization: Bearer $TOKEN"
# Expected: 404
```

- [ ] Commit:
```bash
git add backend/src/routes/orders.js
git commit -m "feat: add DELETE /api/orders/:id endpoint for tap-to-order undo"
```

---

## Chunk 2: New Component — SessionOrderList

### Task 2: Create SessionOrderList component

**Files:**
- Create: `frontend/src/components/gastro/SessionOrderList.jsx`

- [ ] Create the file `frontend/src/components/gastro/SessionOrderList.jsx` with the following content:

```jsx
// frontend/src/components/gastro/SessionOrderList.jsx
export default function SessionOrderList({ orders, onUndo }) {
  if (!orders || orders.length === 0) return null;

  const total = orders.reduce((sum, o) => sum + parseFloat(o.price), 0);

  return (
    <div style={{
      background: 'var(--pe-bg-card)',
      border: '1px solid var(--pe-border)',
      borderRadius: 12,
      padding: 12,
      marginTop: 12,
      fontFamily: 'Verdana, Geneva, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        fontWeight: 'bold',
        color: 'var(--pe-text)',
        fontSize: 14,
        marginBottom: 8,
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}>
        Diese Bestellung ({orders.length} Artikel, {total.toFixed(2)} €)
      </div>

      {/* Order rows */}
      {orders.map((order) => (
        <div
          key={order.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '4px 0',
            borderBottom: '1px solid var(--pe-border)',
          }}
        >
          <span style={{
            flex: 1,
            color: 'var(--pe-text)',
            fontSize: 14,
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}>
            {order.product_name}
          </span>
          <span style={{
            color: 'var(--pe-text-sub)',
            fontSize: 13,
            minWidth: 56,
            textAlign: 'right',
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}>
            {parseFloat(order.price).toFixed(2)} €
          </span>
          <button
            onClick={() => onUndo(order.id)}
            style={{
              minWidth: 64,
              minHeight: 64,
              color: 'var(--pe-danger)',
              background: 'var(--pe-bg-elevated)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 18,
              fontFamily: 'Verdana, Geneva, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Total */}
      <div style={{
        textAlign: 'right',
        marginTop: 10,
        color: 'var(--pe-cyan-bright)',
        fontWeight: 'bold',
        fontSize: 15,
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}>
        Gesamt: {total.toFixed(2)} €
      </div>
    </div>
  );
}
```

- [ ] Visual check: `SessionOrderList` renders nothing when `orders` is empty or null. When orders are present, the header, rows, and total show correctly.

- [ ] Commit:
```bash
git add frontend/src/components/gastro/SessionOrderList.jsx
git commit -m "feat: add SessionOrderList component for tap-to-order session"
```

---

## Chunk 3: Frontend Refactor

### Task 3: Update ProductGrid — rename prop + session badge

**Files:**
- Modify: `frontend/src/components/gastro/ProductGrid.jsx`

- [ ] Read `frontend/src/components/gastro/ProductGrid.jsx` in full.

- [ ] Rename the prop `onAddToCart` to `onTap` in the component signature and everywhere it is referenced inside the file.

- [ ] Add the optional `sessionCounts` prop (default: empty `Map`):
```jsx
export default function ProductGrid({ products, onTap, isBlocked, categoryFilter, onCategoryChange, sessionCounts = new Map() }) {
```

- [ ] On each product button, after the price display, add the session count badge — render only when `sessionCounts.get(product.id) > 0`:
```jsx
{sessionCounts.get(product.id) > 0 && (
  <span style={{
    fontSize: 11,
    fontWeight: 'bold',
    color: 'var(--pe-cyan-bright)',
    fontFamily: 'Verdana, Geneva, sans-serif',
  }}>
    ×{sessionCounts.get(product.id)}
  </span>
)}
```

- [ ] Change the product button's `onClick` from `onAddToCart(product)` to `onTap(product)`.

- [ ] Commit:
```bash
git add frontend/src/components/gastro/ProductGrid.jsx
git commit -m "feat: productgrid rename onAddToCart to onTap, add session count badge"
```

---

### Task 4: Refactor GastronomyPage — state, timer, tapProduct, tapUndo

**Files:**
- Modify: `frontend/src/pages/GastronomyPage.jsx`

This is the core refactor. Read the full file first, then apply the changes below in order.

- [ ] Read `frontend/src/pages/GastronomyPage.jsx` in full.

- [ ] **Replace state declarations** — find the `cart` and `orderSuccess` state variables and replace:
```jsx
// REMOVE:
const [cart, setCart] = useState([]);
const [orderSuccess, setOrderSuccess] = useState(false);

// ADD:
const [sessionOrders, setSessionOrders] = useState([]);
const timerRef = useRef(null);
```
Add `useRef` to the React imports if not already present.

- [ ] **Add `clearSession`, `resetTimer`, `selectGuest` functions** — add these after the existing state declarations:
```jsx
const clearSession = useCallback(() => {
  clearTimeout(timerRef.current);
  setGuest(null);        // isBlocked is derived from guest — becomes false automatically
  setSessionOrders([]);
  setGuestOpenOrders(null);
  setProductFilter('all');
}, []);

const resetTimer = useCallback(() => {
  clearTimeout(timerRef.current);
  timerRef.current = setTimeout(clearSession, 20000);
}, [clearSession]);

const selectGuest = useCallback((g) => {
  setGuest(g);
  setSessionOrders([]);
  setGuestOpenOrders(null);
  resetTimer();
}, [resetTimer]);
```

- [ ] **Add `useEffect` cleanup** for the timer (add alongside existing effects):
```jsx
useEffect(() => {
  return () => clearTimeout(timerRef.current);
}, []);
```

- [ ] **Extract `fetchGuestOpenOrders` as a named callback** — the existing open-orders fetch is done inline in a `useEffect` and inside `submitOrder`. Extract it so `tapUndo` can call it:
```jsx
const fetchGuestOpenOrders = useCallback(async (guestId) => {
  try {
    const data = await api.get(`/orders/guest/${guestId}`);
    setGuestOpenOrders(data);
  } catch {
    setGuestOpenOrders(null);
  }
}, []);
```
Update the existing `useEffect` that fetches open orders to call `fetchGuestOpenOrders(guest.id)` instead of inlining the API call.

- [ ] **Remove `addToCart`, `removeFromCart`, and `submitOrder`** — delete all three functions. `removeFromCart` also references `setCart` and is only consumed by `OrderCart` which is being deleted. Then add `tapProduct`:
```jsx
const tapProduct = useCallback(async (product) => {
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
}, [guest, resetTimer, addToast]);
```

- [ ] **Add `tapUndo` function**:
```jsx
const tapUndo = useCallback(async (orderId) => {
  resetTimer();
  try {
    await api.delete(`/orders/${orderId}`);
    setSessionOrders(prev => prev.filter(o => o.id !== orderId));
    if (guest) fetchGuestOpenOrders(guest.id);
  } catch (err) {
    // Distinguish already-paid (404) from generic network errors
    if (err.status === 404) {
      addToast({ type: 'error', message: 'Bereits abgerechnet — kann nicht entfernt werden' });
    } else {
      addToast({ type: 'error', message: 'Rückgängig nicht möglich' });
    }
  }
}, [guest, resetTimer, addToast, fetchGuestOpenOrders]);
```

- [ ] **Update `handleNFCScan`** — replace `setCart([])` and `setOrderSuccess(false)` with `selectGuest(resolvedGuest)`:

Find the `handleNFCScan` function. It currently does `setGuest(result)` and `setCart([])`. Replace the guest-setting part with `selectGuest(result)` and remove the `setCart([])` and `setOrderSuccess(false)` lines.

- [ ] **Update `confirmSettle`** — replace every `setCart([])` with `setSessionOrders([])` and remove any `setOrderSuccess(false)`. There should be one occurrence in the settle success branch for the bar station.

- [ ] **Derive `sessionCounts`** from `sessionOrders` (add as a derived constant in the render, before the return):
```jsx
const sessionCounts = sessionOrders.reduce((map, o) => {
  map.set(o.product_id, (map.get(o.product_id) || 0) + 1);
  return map;
}, new Map());
```

- [ ] **Update imports** — remove `OrderCart` import, add `SessionOrderList` import:
```jsx
import SessionOrderList from '../components/gastro/SessionOrderList';
// Remove: import OrderCart from '../components/gastro/OrderCart';
```

- [ ] **Update Bar layout JSX** — find the Bar station render block. Make these changes:

  1. Replace the two-column layout (`flex-col md:flex-row` with `md:w-80` cart column) with a single-column `w-full` layout.
  2. In the `GuestSelector` `onGuestSelect` prop, replace the inline callback that calls `setCart([])` and `setOrderSuccess(false)` with `selectGuest(g)`.
  3. In the `GuestSelector` `onCreateGuest` prop, find the `.then((g) => { setGuest(g); setCart([]); ... })` callback and replace it with `selectGuest(g)` so the new guest also starts the inactivity timer and clears session state:
  ```jsx
  onCreateGuest={(name) =>
    api.post('/nfc/create-manual', { name })
      .then((g) => { selectGuest(g); setAllGuests((prev) => [...prev, g]); })
      .catch((err) => addToast({ type: 'error', message: err.message }))
  }
  ```
  4. Replace `<ProductGrid ... onAddToCart={addToCart} .../>` with `<ProductGrid ... onTap={tapProduct} sessionCounts={sessionCounts} onCategoryChange={handleCategoryChange} .../>`.
  5. After `<ProductGrid>`, add `<SessionOrderList orders={sessionOrders} onUndo={tapUndo} />`.
  6. Remove `{guest && <div className="md:w-80 ..."><OrderCart .../></div>}` entirely.

  The updated Bar layout should look like:
  ```jsx
  <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 100px' }}>
    {!guest && (
      <GuestSelector
        guests={allGuests}
        onGuestSelect={selectGuest}
        onCreateGuest={...}
        nfcAvailable={'NDEFReader' in window}
        onRequestNfcScan={handleNFCScan}
        scanning={scanning}
      />
    )}
    {guest && (
      <>
        <GuestHeader
          guest={guest}
          isBlocked={isBlocked}
          onClose={clearSession}
          onToggleLock={toggleGuestLock}
          lockLoading={lockLoading}
          onSettle={() => initSettle(guest)}
        />
        {guestOpenOrders?.items?.length > 0 && (
          <OpenOrdersPanel items={guestOpenOrders.items} total={guestOpenOrders.total} />
        )}
        <ProductGrid
          products={stationFilteredProducts}
          onTap={tapProduct}
          isBlocked={isBlocked}
          categoryFilter={productFilter}
          onCategoryChange={handleCategoryChange}
          sessionCounts={sessionCounts}
        />
        <SessionOrderList orders={sessionOrders} onUndo={tapUndo} />
      </>
    )}
  </div>
  ```

  Note: `handleCategoryChange` now calls `setProductFilter(cat)` AND `resetTimer()` (see below).

- [ ] **Add `handleCategoryChange` function** (replaces direct `setProductFilter` calls):
```jsx
const handleCategoryChange = useCallback((cat) => {
  setProductFilter(cat);
  resetTimer();
}, [resetTimer]);
```

- [ ] **Update `GuestHeader` `onClose` prop** — the close button should call `clearSession` instead of an inline `() => { setGuest(null); setCart([]); }`.

- [ ] Commit:
```bash
git add frontend/src/pages/GastronomyPage.jsx
git commit -m "feat: tap-to-order — replace cart flow with sessionOrders + 20s inactivity timer"
```

---

### Task 5: Delete obsolete components

**Files:**
- Delete: `frontend/src/components/gastro/OrderCart.jsx`
- Delete: `frontend/src/components/gastro/OrderCartItem.jsx`

- [ ] Verify `OrderCart` and `OrderCartItem` are no longer imported anywhere:
```bash
grep -r "OrderCart" /home/moritzwolf/dartsturnier/frontend/src/
# Expected: no results (or only the files themselves if they still exist)
grep -r "OrderCartItem" /home/moritzwolf/dartsturnier/frontend/src/
# Expected: no results
```

- [ ] Delete the files:
```bash
git rm frontend/src/components/gastro/OrderCart.jsx
git rm frontend/src/components/gastro/OrderCartItem.jsx
```

- [ ] Commit:
```bash
git commit -m "refactor: remove OrderCart and OrderCartItem — replaced by SessionOrderList"
```

---

## Chunk 4: Integration & PR

### Task 6: Smoke test checklist

Before creating the PR, verify the following manually in the browser (or document as known-working):

- [ ] Open `/gastronomy` → login → select Bar station → guest selector shows
- [ ] Select a guest → product grid appears full-width, no cart sidebar
- [ ] Tap a product → item appears immediately in SessionOrderList below the grid
- [ ] Tap same product again → second row appears (same product, separate row)
- [ ] Product button shows `×2` badge after two taps
- [ ] Tap ✕ on a row → row disappears, badge decrements
- [ ] Wait 20 seconds without interaction → screen silently resets to guest selector
- [ ] Tap any product, then wait 20 seconds → resets (timer resets on tap)
- [ ] Tap ✕, wait 20 seconds → resets (timer resets on undo)
- [ ] Change category filter → timer resets (no accidental reset to guest select)
- [ ] Blocked guest → product grid dimmed, tapping does nothing
- [ ] Kasse/Küche/KitchenView stations → unaffected by this change
- [ ] Register settle flow → still works (submitting state preserved)

### Task 7: Push branch and create PR

**Files:** none

- [ ] Verify all commits are on the feature branch:
```bash
git log --oneline dev..HEAD
```

- [ ] Push:
```bash
git push origin feat/tap-to-order
```

- [ ] Create PR:
```bash
gh pr create --base dev --head feat/tap-to-order \
  --title "feat: tap-to-order bar station — direct booking with session list (#107)" \
  --body "$(cat <<'EOF'
## Summary

- Replaces cart+submit flow with direct tap-to-order in Bar station
- Each product tap immediately POSTs \`/api/orders\` — no Bestellen button
- Session list below product grid shows orders for current guest with per-item undo (✕)
- 20s inactivity timer auto-resets to guest selection silently
- Product buttons show ×N badge when tapped multiple times in same session
- Product grid now full-width (no cart sidebar column)
- Adds \`DELETE /api/orders/:id\` backend endpoint
- Removes \`OrderCart.jsx\` and \`OrderCartItem.jsx\`

## Test Plan

- [ ] Tap product → immediate row in session list, no submit step
- [ ] ×N badge on product button after multiple taps
- [ ] ✕ undo removes row and syncs OpenOrdersPanel
- [ ] 20s inactivity → silent return to guest selector
- [ ] Interaction (tap, undo, category change) resets timer
- [ ] Kasse / Register settle flow unaffected
- [ ] Backend DELETE /api/orders/:id returns 404 for paid/missing orders

Closes #107

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
