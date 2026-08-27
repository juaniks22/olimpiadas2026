const service = require("./auth.service");

module.exports = {
  login: async (req, res) => res.json(await service.login(req.body)),
  me: async (req, res) => res.json(await service.me(req.user.id)),
  changePassword: async (req, res) => res.json(await service.changePassword(req.user.id, req.body)),
};
