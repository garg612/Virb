# Changelog

## 2026-05-29 — Validation refactor, route fixes, smoke tests

- Split validation into route-specific files:
  - `src/validation/user.validation.js` (user registration schema)
  - `src/validation/message.validation.js` (message schema)
  - Removed `src/validation/validation.js` (legacy combined schema)

- Fixed and verified multiple routes:
  - `src/controllers/user.controllers.js`: registration validation and token generation fixes
  - `src/controllers/conversation.controller.js`: fixed conversation lookup, send-message validation, dynamic socket import
  - `src/middlewares/auth.middlewares.js`: fixed error handling for missing/invalid tokens
  - Added multer upload middleware wiring for avatar routes

- Regenerated Prisma client (`npx prisma generate`) and adjusted queries that caused runtime errors.

- Automated smoke tests completed: registration, token refresh, create conversation, send message, list messages, group member flows. Cloudinary multipart tests were not run (require live credentials).

## Next steps (optional)
- Run multipart upload tests with Cloudinary credentials.
- Run integration tests and CI.
