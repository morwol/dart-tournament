# Security Report — DartEvent Manager

Datum: 2026-03-07

---

## KRITISCH 🔴

### 1. CORS komplett offen — alle Origins erlaubt
**Datei:** `backend/src/app.js:28`
```js
app.use(cors());
```
Ohne Konfiguration erlaubt dies Anfragen von JEDER Domain. Ein Angreifer kann von einer beliebigen Website API-Requests im Namen eines eingeloggten Users senden (CSRF-ähnlich).

**Fix:** CORS auf eigene Domain beschränken:
```js
app.use(cors({ origin: process.env.CORS_ORIGIN || 'https://deine-domain.de' }));
```

---

### 2. Default-Admin-Passwort `admin/admin` im Code
**Datei:** `backend/src/db/db.js:58-61`
```js
const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'admin';
```
Wenn keine Umgebungsvariablen gesetzt sind, wird ein Admin mit Passwort `admin` angelegt. Auf einem produktiven Server wäre das ein sofortiger Vollzugriff.

**Fix:** Startup abbrechen wenn `ADMIN_PASSWORD` nicht gesetzt oder zu kurz ist:
```js
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
  throw new Error('ADMIN_PASSWORD must be set and at least 12 characters');
}
```

---

### 3. Test-Endpunkt `/api/nfc/create-test` ohne Auth + NFC-UID NICHT gehasht
**Datei:** `backend/src/routes/nfc.js:64-71`
```js
router.post('/create-test', (req, res) => {
  const uid = req.body.uid || 'TEST-001';
  const name = req.body.name || 'Test-Gast';
  const existing = db.prepare('SELECT * FROM guests WHERE nfc_uid = ?').get(uid);
  // ...
  db.prepare('INSERT INTO guests (nfc_uid, name) VALUES (?, ?)').run(uid, name);
```
**Probleme:**
- Kein Auth-Schutz — jeder kann Gäste anlegen
- NFC-UID wird im Klartext gespeichert (nicht SHA-256-gehasht wie bei `/create`)
- Damit entsteht eine Inkonsistenz: `/scan` hasht die UID und findet den Test-Gast nie

**Fix:** Endpunkt entfernen oder hinter `requireAdmin` schützen und `hashUid()` verwenden.

---

### 4. Bestellungen ohne Authentifizierung (`POST /api/orders`)
**Datei:** `backend/src/routes/orders.js:31`
```js
router.post('/', requireFields(['guest_id', 'product_id']), (req, res) => {
```
Jeder (auch ohne Login) kann Bestellungen für beliebige Gäste aufgeben. Ein Angreifer muss nur `guest_id` raten (Integer, sequentiell).

**Fix:** Mindestens `requireAuth` hinzufügen, idealerweise `requireAny(['admin', 'gastronomy', 'staff'])`.

---

### 5. Spieler-Registrierung ohne Auth (`POST /api/tournaments/:id/players`)
**Datei:** `backend/src/routes/players.js:22`
```js
router.post('/:id/players', requireFields(['name']), (req, res) => {
```
Jeder kann beliebig viele Spieler zu offenen Turnieren hinzufügen. Kein Rate-Limiting, kein Auth.

**Fix:** Auth hinzufügen oder dediziertes Rate-Limit für diesen Endpunkt.

---

### 6. JWT_SECRET hat keinen Fallback-Check
**Datei:** `backend/src/middleware/auth.js:14`
```js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```
Wenn `JWT_SECRET` nicht gesetzt ist, wird `undefined` als Secret verwendet. Das ist zwar kein gültiger Key (jwt.verify schlägt fehl), aber in `auth.js:20-23` (Login) wird mit demselben `undefined` signiert — **alle Tokens wären identisch signiert mit `undefined`**.

**Fix:** Beim Start prüfen:
```js
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'CHANGE_ME_VERY_LONG_RANDOM_STRING_HERE') {
  throw new Error('JWT_SECRET must be set to a secure value');
}
```

---

## MITTEL 🟠

### 7. `verifyToken` statt `requireAdmin` auf Admin-Routen
Mehrere Routen verwenden nur `verifyToken` (= jeder eingeloggte User), obwohl sie Admin-only sein sollten:

| Route | Datei | Zeile | Sollte sein |
|-------|-------|-------|-------------|
| `POST /api/tournaments` | tournaments.js | 15 | `requireAdmin` |
| `PUT /api/tournaments/:id` | tournaments.js | 61 | `requireAdmin` |
| `PUT /api/tournaments/:id/start` | tournaments.js | 82 | `requireAdmin` |
| `POST /api/products` (alt) | orders.js | 15 | `requireAdmin` |
| `PUT /api/orders/:id/pay` | orders.js | 59 | `requireAny(['admin', 'gastronomy'])` |
| `GET /api/orders/summary` | orders.js | 78 | `requireAdmin` |
| `POST /api/nfc/create` | nfc.js | 26 | `requireAdmin` |

**Auswirkung:** Ein User mit Rolle `referee` oder `gastronomy` kann Turniere erstellen/starten, Produkte anlegen, Bestellungen als bezahlt markieren und NFC-Gäste anlegen.

---

### 8. Doppelte Product-Routen (Konflikt)
**Datei:** `backend/src/routes/orders.js`
- Zeile 15: `router.post('/products', verifyToken, ...)` — alt, nur `verifyToken`
- Zeile 259: `router.post('/products', requireAuth, ...)` — neu, mit `requireAuth`

Beide Routen sind registriert. Express nimmt die erste, die matcht. Die alte Route (Zeile 15) wird ausgeführt, die neue (Zeile 259) ist unerreichbar. Beide verwenden keine Admin-Prüfung.

---

### 9. Fehler-Details an Client gesendet (`err.message`)
**Dateien:** Mehrere Catch-Blocks senden `err.message` direkt:
- `tournaments.js:248, 272, 364, 379`
- `games.js:294, 379, 477, 507, 634, 684, 757`
- `orders.js:151, 197, 222, 255, 289`
- `mail.js:52, 72, 94, 171`

```js
res.status(500).json({ error: err.message });
```
Stack-Traces werden zwar nicht gesendet, aber `err.message` kann interne Pfade, Datenbank-Fehler oder Schema-Details offenlegen.

**Fix:** Generische Fehlermeldung verwenden und intern loggen:
```js
console.error(err);
res.status(500).json({ error: 'Internal server error' });
```

---

### 10. NFC-Scan ohne Auth — ermöglicht Gast-Enumeration
**Datei:** `backend/src/routes/nfc.js:14`
```js
router.post('/scan', requireFields(['uid']), (req, res) => {
```
Jeder kann NFC-UIDs scannen/testen. Die Antwort unterscheidet zwischen "nicht gefunden" (404) und gefundenem Gast (200 mit allen Daten inkl. Name). Das ermöglicht Brute-Force-Aufzählung von NFC-UIDs.

**Fix:** Rate-Limit speziell für diesen Endpunkt + Auth oder ein Token/HMAC.

---

### 11. `GET /api/nfc/:uid/orders` exponiert Gast-Bestellungen ohne Auth
**Datei:** `backend/src/routes/nfc.js:44`
Wer die NFC-UID kennt, sieht alle Bestellungen eines Gastes — ohne Login.

---

### 12. Mail-Templates: Stored XSS / HTML-Injection
**Datei:** `backend/src/routes/mail.js:66`
```js
'INSERT INTO mail_templates (name, subject, body_html) VALUES (?, ?, ?)'
```
`body_html` wird unvalidiert gespeichert und in Zeile 131 direkt als E-Mail-HTML gesendet. Ein Admin könnte Schadcode in Templates injizieren, der bei Empfängern ausgeführt wird.

Zusätzlich werden Template-Platzhalter wie `{{tournament_name}}` ohne HTML-Escaping eingesetzt (Zeile 134). Wenn ein Turniername HTML enthält, wird es direkt in die Mail gerendert.

---

## NIEDRIG 🟡

### 13. Login Rate-Limit: 20 Versuche / 15 Min
**Datei:** `backend/src/app.js:33`
20 Versuche pro IP sind relativ großzügig. Für einen Login-Endpunkt wären 5–10 Versuche / 15 Min sinnvoller.

### 14. Kein Passwort-Komplexitäts-Check bei User-Erstellung
**Datei:** `backend/src/routes/users.js:20`
Es wird nur geprüft ob `password` vorhanden ist, nicht ob es stark genug ist (Mindestlänge, Komplexität).

### 15. bcrypt Rounds = 10
**Datei:** `backend/src/routes/users.js:35` und `backend/src/db/db.js:60`
10 Rounds sind akzeptabel, aber 12 wäre der aktuelle Standard für besseren Schutz.

### 16. Keine Input-Längen-Validierung
Felder wie `name`, `username`, `body_html` haben keine Maximallänge. Extrem lange Eingaben könnten die Datenbank aufblähen oder Speicherprobleme verursachen.

### 17. `quantity` in Bestellungen nicht validiert
**Datei:** `backend/src/routes/orders.js:46`
```js
).run(guest_id, product_id, quantity || 1);
```
Kein Check ob `quantity` eine positive Ganzzahl ist. Negative oder Dezimalwerte sind möglich.

### 18. `price` in Produkt-Erstellung nicht validiert
**Datei:** `backend/src/routes/orders.js:270`
Kein Check ob `price` eine positive Zahl ist. Negative Preise sind möglich.

### 19. Helmet mit Default-Config
**Datei:** `backend/src/app.js:27`
`helmet()` ohne Konfiguration ist gut, aber CSP (Content Security Policy) könnte explizit gesetzt werden für zusätzlichen Schutz.

---

## EMPFEHLUNGEN ✅

### Sofort umsetzen
1. **CORS konfigurieren** — nur eigene Domain(s) erlauben
2. **Default-Passwort entfernen** — Startup abbrechen wenn nicht konfiguriert
3. **`/api/nfc/create-test` entfernen** oder hinter Auth + Hashing schützen
4. **`POST /api/orders`** mit Auth schützen
5. **`verifyToken` → `requireAdmin`** auf allen Admin-Routen (siehe Tabelle in #7)
6. **JWT_SECRET Validierung** beim Server-Start

### Bald umsetzen
7. **Error-Handler**: Globaler Express Error Handler der intern loggt, extern generische Meldung zurückgibt
8. **Input-Validation erweitern**: Maximale Stringlängen, Zahlen-Typ-Checks
9. **NFC-Scan Rate-Limiting**: Separates, strenges Limit (5/min)
10. **Doppelte Product-Route aufräumen**: Eine der beiden POST-Routen entfernen

### Best Practices
11. **Passwort-Policy**: Mindestens 8 Zeichen bei User-Erstellung erzwingen
12. **Audit-Logging**: Wichtige Aktionen (Login, Turnier-Start, Bezahlung) loggen
13. **HTTPS-Only Cookie/Header** in Produktion setzen
14. **Regelmäßiger Dependency-Audit**: `npm audit` als CI-Schritt

---

## Zusammenfassung

| Severity | Anzahl |
|----------|--------|
| KRITISCH 🔴 | 6 |
| MITTEL 🟠 | 6 |
| NIEDRIG 🟡 | 7 |

Die kritischsten Probleme sind die **offene CORS-Konfiguration**, das **Default-Passwort**, der **ungeschützte Test-Endpunkt** und die **fehlende Auth auf Bestell- und Spieler-Routen**. Diese sollten vor einem produktiven Einsatz behoben werden.

SQL-Injection ist kein Problem — alle Queries verwenden Prepared Statements korrekt. NFC-UID-Hashing mit SHA-256 ist implementiert (außer im Test-Endpunkt). Die JWT-Implementierung ist grundsätzlich korrekt, braucht aber eine Secret-Validierung beim Start.
