// Set required environment variables before any module is loaded
process.env.JWT_SECRET = 'test-jwt-secret-for-jest';
// DATABASE_URL must be set even though pool is mocked, to avoid startup errors
process.env.DATABASE_URL = 'postgresql://unused/test';
