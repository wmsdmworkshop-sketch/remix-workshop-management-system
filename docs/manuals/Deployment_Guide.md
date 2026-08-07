# DWIP v1.0 Deployment Guide

This guide details the steps to deploy the **Devanand Workshop Intelligence Platform (DWIP) v1.0** in production environments.

## 1. Prerequisites
- Node.js version 18 or above
- MySQL Database Engine
- Redis Server (for query cache layers)

## 2. Setup Steps
1. Clone the repository and install packages:
   ```bash
   npm install
   ```
2. Configure `.env` variables:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=secret
   DB_DATABASE=dwip_golden
   REDIS_URL=redis://localhost:6379
   ```
3. Initialize the MySQL Golden Database schema:
   ```bash
   npm run db:migrate
   ```
4. Run the production build chunk compiler:
   ```bash
   npm run build
   ```
5. Start the Node process:
   ```bash
   npm run start
   ```
