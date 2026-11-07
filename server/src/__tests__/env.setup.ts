// Runs before the test framework and before any application module is imported.
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '5123';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/interviewiq-test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-fedcba9876543210fedcba9876543210';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.AI_API_KEY = '';
process.env.AI_DEV_MODE = 'true';
process.env.UPLOAD_DIR = 'uploads-test';
process.env.MAX_FILE_SIZE_MB = '5';
process.env.ADMIN_EMAIL = 'admin@test.dev';
process.env.ADMIN_PASSWORD = 'AdminPass123';
process.env.LOG_LEVEL = 'error';
