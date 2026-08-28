const service = require("./responseTeam.service");

module.exports = {
  listPositions: async (req, res) => res.json(await service.listPositions(req.query)),
  createPosition: async (req, res) => res.status(201).json(await service.createPosition(req.body)),
  updatePosition: async (req, res) =>
    res.json(await service.updatePosition(req.params.id, req.body)),

  listStaff: async (req, res) => res.json(await service.listStaff(req.query)),
  getStaff: async (req, res) => res.json(await service.getStaff(req.params.id)),
  createStaff: async (req, res) => res.status(201).json(await service.createStaff(req.body)),
  updateStaff: async (req, res) => res.json(await service.updateStaff(req.params.id, req.body)),
};
