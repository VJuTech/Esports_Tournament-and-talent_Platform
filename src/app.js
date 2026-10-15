const path = require('node:path');
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();
const databaseUrl = new URL(env.DATABASE_URL);
databaseUrl.searchParams.delete('sslmode');
const sessionPool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname) ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  keepAlive: true
});

if (env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      frameSrc: ["'self'", 'https:'],
      mediaSrc: ["'self'", 'https:']
    }
  }
}));
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buffer) => {
    if (req.path.startsWith('/payments/webhook') || req.path.startsWith('/webhooks/payments/')) req.rawBody = buffer;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(session({
  name: 'championlounge.sid',
  store: new PgSession({
    pool: sessionPool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});
app.get('/health', async (req, res) => {
  try {
    await require('./config/database').prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});
app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
app.locals.sessionPool = sessionPool;
