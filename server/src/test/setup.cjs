// CommonJS setup — runs before any module is loaded, sets required env vars.
// Must be .cjs so Jest can require() it without ESM transformation issues.
process.env.JWT_SECRET = 'test-jwt-secret-for-jest';
process.env.DATABASE_URL = 'postgresql://unused/test';
