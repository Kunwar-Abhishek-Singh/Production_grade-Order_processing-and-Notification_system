const session = require("express-session");
const { RedisStore } = require("connect-redis");
const { redisClient } = require("../config/redis");
const config = require("../config/env");

if (!config.config.auth.sessionSecret) {
  throw new Error("SESSION_SECRET is not configured");
}

const sessionMiddleware = session({
  name: "order.sid",
  store: new RedisStore({
    client: redisClient,
    prefix: "order-system:session:"
  }),
  secret: config.config.auth.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.server.nodeEnv === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60
  }
});

module.exports = sessionMiddleware;



/*
A few important details:
- httpOnly: true prevents client-side JavaScript from reading the session cookie.
- secure: true in production means the cookie is sent only over HTTPS.
- sameSite: "lax" provides a useful baseline against cross-site request forgery, but we will still need CSRF protection for state-changing form submissions.
- saveUninitialized: false avoids saving sessions that haven't been modified.
- The one-hour cookie lifetime limits how long the browser keeps the session cookie. We'll also need server-side expiration and logout handling.
*/