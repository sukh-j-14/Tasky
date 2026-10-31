# Tasky backend

Node.js and Express API with MongoDB through Mongoose. API routes, controllers, authentication middleware, and database models live here.

Copy `.env.example` to `.env` in this folder and configure `MONGODB_URI` and `JWT_SECRET`. Use a separate `tasky_v2` development database.

From `version 2`, run `npm run dev -w backend`. The API runs on port 5002. The React frontend runs separately on port 5173 during development. For production, the API can also serve the built `frontend/dist` files.
