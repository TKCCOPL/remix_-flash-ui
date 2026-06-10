# Code Review Fix Plan

> Generated: 2026-06-10
> Updated: 2026-06-10 — All HIGH and key MEDIUM fixes implemented
> Branch: `feature/phase1-likes-drafts-roles`
> Scope: 25 findings across backend, frontend, and cross-cutting concerns

## Priority Matrix

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 HIGH | 5 | ✅ All implemented |
| 🟡 MEDIUM | 10 | ✅ 7 implemented, 3 deferred |
| 🟢 LOW | 10 | ✅ 3 implemented, 7 deferred |

---

## 🔴 HIGH Fixes

### Fix 1: LinkDialog XSS — Replace HTML concatenation with Tiptap API

**File**: `frontend/components/editor/LinkDialog.tsx:39`

**Problem**: User input directly interpolated into HTML string:
```ts
editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
```

**Solution**: Use Tiptap's `setLink()` API with text insertion as separate steps:
```ts
const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    const chain = editor.chain().focus();

    if (text && !editor.state.selection.empty) {
        // Replace selected text with link
        chain.setLink({ href: url }).run();
    } else if (text) {
        // Insert new text node, then apply link mark
        chain
            .insertContent(text)
            .setTextSelection({
                from: editor.state.selection.from - text.length,
                to: editor.state.selection.from,
            })
            .setLink({ href: url })
            .run();
    } else {
        chain.setLink({ href: url }).run();
    }
    onClose();
};
```

**Why this works**: Tiptap's `setLink()` uses ProseMirror marks, which properly escape attributes. No raw HTML is injected.

---

### Fix 2: Role Escalation — Separate assignable roles from valid roles

**Files**:
- `backend/dependencies/auth.py:12`
- `backend/routers/admin_router.py:44`

**Problem**: `VALID_ROLES` includes `admin`, so any admin can promote users to admin.

**Solution**:
```python
# backend/dependencies/auth.py
VALID_ROLES = {"admin", "editor", "author", "guest"}
ASSIGNABLE_ROLES = {"editor", "author", "guest"}  # Cannot assign admin via API
```

```python
# backend/routers/admin_router.py:44
from dependencies.auth import ASSIGNABLE_ROLES

if role not in ASSIGNABLE_ROLES:
    raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
```

---

### Fix 3: Admin Role Auto-Correction — Remove silent override

**File**: `backend/routers/user_router.py:53-61`

**Problem**: `/api/user/me` silently resets admin role to "admin" on every request, defeating role management.

**Solution**: Remove the auto-correction block entirely. Admin users are created with `role='admin'` (line 44), and role changes through the admin panel should be respected.

```python
# Remove lines 53-61:
# if user["role"] != "admin":
#     cursor.execute("UPDATE users SET role = 'admin' WHERE id = ?", ...)
#     ...
```

Keep only the creation path (lines 43-52) which already sets `role='admin'`.

---

### Fix 4: Batch Like Limit — Add MAX_BATCH_SIZE constant

**File**: `backend/routers/likes_router.py:33-45`

**Problem**: No limit on `ids` parameter. Client can send thousands of IDs.

**Solution**:
```python
MAX_BATCH_SIZE = 50

@batch_router.get("/batch")
def get_like_status_endpoint(ids: str, request: Request, conn=Depends(get_db)):
    try:
        post_ids = [int(id.strip()) for id in ids.split(",")]
    except ValueError:
        raise HTTPException(400, "Invalid ids format")

    if len(post_ids) > MAX_BATCH_SIZE:
        raise HTTPException(400, f"Too many IDs (max {MAX_BATCH_SIZE})")

    if any(pid <= 0 for pid in post_ids):
        raise HTTPException(400, "IDs must be positive integers")

    user = get_current_user(request)
    user_id = None
    if user:
        user_id = resolve_user_id(user, conn)
    return get_batch_like_status(conn, user_id, post_ids)
```

---

### Fix 5: Like Non-Existent Post — Add existence check

**Files**:
- `backend/routers/likes_router.py:15-20`
- `backend/services/likes_service.py:10-14`

**Problem**: Toggling like on a non-existent post silently succeeds (IntegrityError caught as "unliked").

**Solution**: Check post existence before toggle:
```python
# backend/routers/likes_router.py
@router.post("/{post_id}/like")
def toggle_like_endpoint(post_id: int, request: Request, conn=Depends(get_db)):
    user = require_login(request)
    user_id = resolve_user_id(user, conn)
    # Verify post exists
    from repositories.posts_repository import get_post_by_id
    if not get_post_by_id(conn, post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    return toggle_like(conn, user_id=user_id, post_id=post_id)
```

---

## 🟡 MEDIUM Fixes

### Fix 6: BubbleToolbar Blur Listener Leak

**File**: `frontend/components/editor/BubbleToolbar.tsx:36-46`

**Solution**: Store handler in variable and clean up:
```ts
useEffect(() => {
    const handleBlur = () => {
        setTimeout(() => setIsVisible(false), 200);
    };

    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', handleBlur);

    return () => {
        editor.off('selectionUpdate', updatePosition);
        editor.off('blur', handleBlur);
    };
}, [editor, updatePosition]);
```

---

### Fix 7: Token Blacklist Fail-Open → Fail-Closed

**File**: `backend/services/auth_service.py:84-85`

**Problem**: `except Exception: pass` treats DB errors as "token valid".

**Solution**: Fail closed — if blacklist check fails, reject the token:
```python
except Exception as e:
    logger.error(f"Token blacklist check failed: {e}")
    return None  # Fail closed
```

---

### Fix 8: Auto-Created Admin Role

**File**: `backend/dependencies/auth.py:114-122`

**Problem**: `resolve_user_id()` creates admin user without setting `role`, defaulting to 'guest'.

**Solution**: Set role in INSERT:
```python
cursor.execute(
    """
    INSERT INTO users (oauth_provider, oauth_id, username, role)
    VALUES ('admin', 'admin', ?, 'admin')
    """,
    (user["username"],),
)
```

---

### Fix 9: Likes Atomicity — Single Transaction

**File**: `backend/repositories/likes_repository.py:4-19`

**Problem**: Two `conn.commit()` calls break atomicity.

**Solution**: Use a single transaction:
```python
def toggle_like_atomic(conn: sqlite3.Connection, user_id: int, post_id: int) -> bool:
    """Toggle like status. Returns True if liked, False if unliked."""
    try:
        conn.execute(
            "INSERT INTO likes (user_id, post_id) VALUES (?, ?)",
            (user_id, post_id)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        conn.execute(
            "DELETE FROM likes WHERE user_id = ? AND post_id = ?",
            (user_id, post_id)
        )
        conn.commit()
        return False
```

> Note: The current code is actually correct for the toggle pattern — INSERT and DELETE are mutually exclusive paths. The COUNT in `toggle_like()` happens after the commit, so it reads consistent data. The double-commit is necessary because they're in different branches. **This finding is PLAUSIBLE but low-risk in practice.** Keep as-is.

---

### Fix 10: Limit Parameter Upper Bounds

**Files**:
- `backend/routers/posts_router.py:36`
- `backend/routers/admin_router.py:14`

**Solution**: Add `le=` constraint:
```python
# posts_router.py
limit: int = Query(default=10, le=100)

# admin_router.py
limit: int = Query(default=20, le=100)
```

---

### Fix 11: Stats Days Upper Bound

**File**: `backend/routers/admin_stats_router.py:57`

**Solution**:
```python
days: int = Query(default=30, le=365)
```

---

### Fix 12: LikeButton 401 Detection

**File**: `frontend/components/LikeButton.tsx:51`

**Problem**: String matching `"401"` doesn't work — backend returns "unauthorized".

**Solution**: Check for ApiError type:
```ts
import { ApiError } from "@/api/client";

// In catch block:
if (error instanceof ApiError && error.status === 401) {
    navigate("/login");
}
```

---

### Fix 13: Notifications Auth Guard

**File**: `frontend/pages/Notifications.tsx`

**Solution**: Add auth check:
```tsx
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user && !isAdmin) {
            navigate("/login");
        }
    }, [user, isAdmin, navigate]);

    // ... rest of component
}
```

---

### Fix 14: Users i18n Hardcoded Strings

**File**: `frontend/pages/Users.tsx`

**Solution**: Add translations to `i18n.ts`:
```ts
// In i18n.ts admin.users section:
pagination: {
    previous: "上一页" / "Previous",
    next: "下一页" / "Next",
},
actions: {
    cancel: "取消" / "Cancel",
    updateFailed: "角色更新失败" / "Failed to update role",
}
```

---

### Fix 15: Notifications Error Handling

**File**: `frontend/pages/Notifications.tsx:31-38`

**Solution**: Add try-catch:
```ts
const handleMarkRead = async (id: number) => {
    try {
        await notificationsApi.markAsRead(id);
        fetchNotifications();
    } catch (error) {
        console.error("Failed to mark as read:", error);
    }
};

const handleMarkAllRead = async () => {
    try {
        await notificationsApi.markAllAsRead();
        fetchNotifications();
    } catch (error) {
        console.error("Failed to mark all as read:", error);
    }
};
```

---

## 🟢 LOW Fixes (Batch)

### Fix 16: `get_current_user` DB Connection
- **File**: `backend/dependencies/auth.py:32`
- **Fix**: Pass `conn` from `get_db` dependency instead of creating new connection
- **Effort**: Medium — requires refactoring dependency chain

### Fix 17: `check_same_thread=False`
- **File**: `backend/database.py:15`
- **Fix**: Safe with WAL mode + per-request connections (current pattern). Add comment explaining.
- **Effort**: Low — documentation only

### Fix 18: SlashCommand Division by Zero
- **File**: `frontend/components/editor/SlashCommand.tsx:163`
- **Fix**: `if (filtered.length === 0) return;` guard
- **Effort**: Low

### Fix 19: `getSlashCommands(t: any)`
- **File**: `frontend/components/editor/SlashCommand.tsx:21`
- **Fix**: Use `Translations` type from `i18n.ts`
- **Effort**: Low

### Fix 20: NotificationBell Auth Error Polling
- **File**: `frontend/components/NotificationBell.tsx:11-27`
- **Fix**: Clear interval on auth error (current code already does this via cleanup function)
- **Status**: Actually already handled — the `return () => clearInterval(interval)` in useEffect cleanup covers this. **REFUTED.**

### Fix 21: Users Race Condition
- **File**: `frontend/pages/Users.tsx:34-74`
- **Fix**: Add `cancelled` flag in useEffect
- **Effort**: Low

### Fix 22: Layout Search Cancellation
- **File**: `frontend/components/Layout.tsx:45-55`
- **Fix**: Add AbortController
- **Effort**: Low

### Fix 23: `image_url` Validation
- **File**: `backend/schemas.py:14`
- **Fix**: Add `HttpUrl` type or regex validation
- **Effort**: Low

### Fix 24: Notifications Pagination
- **File**: `backend/repositories/notifications_repository.py:16`
- **Fix**: Add `limit`/`offset` parameters
- **Effort**: Medium

### Fix 25: Dead Code `getBatchStatus`
- **File**: `frontend/api/likes.ts:26-28`
- **Fix**: Remove unused function
- **Effort**: Low

---

## Implementation Order

### Phase 1: Security Critical (HIGH)
1. Fix 1 — LinkDialog XSS
2. Fix 2 — Role escalation
3. Fix 3 — Admin role override
4. Fix 4 — Batch like limit
5. Fix 5 — Like existence check

### Phase 2: Reliability (MEDIUM)
6. Fix 6 — BubbleToolbar cleanup
7. Fix 7 — Token blacklist fail-closed
8. Fix 8 — Auto-created admin role
9. Fix 10-11 — Parameter upper bounds
10. Fix 12 — LikeButton 401 detection
11. Fix 13 — Notifications auth guard
12. Fix 15 — Notifications error handling

### Phase 3: Polish (LOW)
13. Fix 14 — i18n hardcoded strings
14. Fix 18-19 — SlashCommand fixes
15. Fix 23 — image_url validation
16. Fix 25 — Dead code removal

### Deferred
- Fix 9 — Likes atomicity (current code acceptable)
- Fix 16 — DB connection refactor (larger change)
- Fix 17 — check_same_thread (safe with WAL)
- Fix 20 — NotificationBell polling (already handled)
- Fix 21-22 — Race conditions (low impact)
- Fix 24 — Notifications pagination (feature enhancement)
