// Blue Code API — monolito modular en capas (Controllers -> Services -> Repositories).
// Express 5. Nota: Express 5 propaga automáticamente los errores de handlers async
// hacia el errorHandler, así que los controllers no necesitan try/catch.
const express = require("express");
const cors = require("cors");
const path = require("path");

const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const areasRoutes = require("./modules/areas/areas.routes");
const callsRoutes = require("./modules/calls/calls.routes");
const responseTeamRoutes = require("./modules/responseTeam/responseTeam.routes");
const crashCartsRoutes = require("./modules/crashCarts/crashCarts.routes");
const reportsRoutes = require("./modules/reports/reports.routes");

const app = express();

// Demo: CORS abierto. El token viaja en el header Authorization, no en cookies.
// Se expone X-Session-Token para que el cliente pueda leer el token renovado.
app.use(cors({ exposedHeaders: ["X-Session-Token"] }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => res.json({ status: "ok", service: "blue-code-api" }));

const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/areas", areasRoutes);
apiRouter.use("/calls", callsRoutes);
apiRouter.use("/response-team-positions", responseTeamRoutes.positions);
apiRouter.use("/staff-members", responseTeamRoutes.staff);
apiRouter.use("/crash-cart-positions", crashCartsRoutes.positions);
apiRouter.use("/crash-cart-items", crashCartsRoutes.items);
apiRouter.use("/crash-carts", crashCartsRoutes.carts);
apiRouter.use("/reports", reportsRoutes);

app.use("/api", apiRouter);

// Serve Frontend in Production
app.use(express.static(path.join(__dirname, "../../../frontend/dist")));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "../../../frontend/dist/index.html"));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
