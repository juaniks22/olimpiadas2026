const service = require("./reports.service");
const { seedDemoData } = require("./seedDemoData");

module.exports = {
  summary: async (req, res) => res.json(await service.summary(req.query)),
  calls: async (req, res) => res.json(await service.calls(req.query)),
  crashCarts: async (req, res) => res.json(await service.crashCarts(req.query)),

  exportCsv: async (req, res) => {
    const csv = await service.exportCsv(req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="blue-code-llamados.csv"');
    res.send(csv);
  },

  exportPdf: async (req, res) => {
    const pdf = await service.exportPdf(req.query);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="blue-code-reporte.pdf"');
    res.send(pdf);
  },

  seedDemo: async (req, res) => {
    const result = await seedDemoData();
    res.json(result);
  },
};

