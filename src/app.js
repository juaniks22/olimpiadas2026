// Blue Code API — monolito modular en capas (Controllers -> Services -> Repositories).
// Express 5. Nota: Express 5 propaga automáticamente los errores de handlers async
// hacia el errorHandler, así que los controllers no necesitan try/catch.
const express = require("express");
const cors = require("cors");

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

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/areas", areasRoutes);
app.use("/calls", callsRoutes);
app.use("/response-team-positions", responseTeamRoutes.positions);
app.use("/staff-members", responseTeamRoutes.staff);
app.use("/crash-cart-positions", crashCartsRoutes.positions);
app.use("/crash-cart-items", crashCartsRoutes.items);
app.use("/crash-carts", crashCartsRoutes.carts);
app.use("/reports", reportsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
