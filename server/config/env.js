const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  PORT: process.env.PORT || 3001,

  // Shopify Storefront API
  SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN || 'mrmjjs-tu.myshopify.com',
  SHOPIFY_STOREFRONT_TOKEN: process.env.SHOPIFY_STOREFRONT_TOKEN || '',
  // Public storefront domain (for REST API — no token needed)
  SHOPIFY_PUBLIC_DOMAIN: process.env.SHOPIFY_PUBLIC_DOMAIN || 'www.ryecentral.com',

  // Admin credentials (simple for home use — upgrade to OAuth for production)
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'changeme',

  // JWT secret for session tokens
  JWT_SECRET: process.env.JWT_SECRET || 'ryecentral-tasting-secret-change-in-production',

  // Email config (optional — for invite emails)
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',

    // Resend API for login code emails
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    MAIL_FROM: process.env.MAIL_FROM || 'RyeCentral Tasting <onboarding@resend.dev>',

  // Judge.me API (private token for review submission)
  JUDGEME_API_TOKEN: process.env.JUDGEME_API_TOKEN || '',

  // App URL (for QR codes and invite links — auto-detected from request if not set)
  APP_URL: process.env.APP_URL || '',
};
