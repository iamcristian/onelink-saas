# 📦 Shared Contracts & Validation (`@repo/shared`)

> Universal TypeScript types, Zod validation schemas, and constants shared across `apps/api` and `apps/web`.

---

## ⚡ Exports

- **Schemas (`zod`)**:
  - `RegisterSchema`: Email, password (min 8 chars), username (3-30 chars, alphanumeric + `_` `-`).
  - `LoginSchema`: Email, password.
  - `CreateLinkSchema`: Title, destination URL, link type (`LINK`, `HEADER`, `DIVIDER`), position.
  - `UpdateProfileSchema`: Title, bio (max 500 chars), avatarUrl, themeId, isPublished.
  - `TrackClickSchema`: Click beacon payload (linkId, profileId, referrer).
- **Constants**:
  - `RESERVED_USERNAMES`: Blocklist of reserved slugs (`admin`, `api`, `dashboard`, `auth`, `login`, `register`, `terms`, etc.) to prevent route collisions.
- **Inferred Types**:
  - `RegisterInput`, `LoginInput`, `CreateLinkInput`, `UpdateProfileInput`, `TrackClickInput`.

---

## 🛠️ Usage Example

```typescript
// In apps/api (NestJS validation pipe):
import { RegisterSchema, type RegisterInput } from '@repo/shared';

export class RegisterDto implements RegisterInput {
  // Validated automatically using Zod
}

// In apps/web (React Hook Form / Zod resolver):
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterInput } from '@repo/shared';

const form = useForm<RegisterInput>({
  resolver: zodResolver(RegisterSchema),
});
```
