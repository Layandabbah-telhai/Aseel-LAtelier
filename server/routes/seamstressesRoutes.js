const express = require("express");

function createSeamstressesRouter(controller) {
  const router = express.Router();

  router.get("/", controller.listSeamstresses);
  router.get("/assignments", controller.listAssignments);
  router.get("/:id", controller.getSeamstress);

  router.post("/", controller.createSeamstress);
  router.post("/assignments", controller.createAssignment);

  router.put("/:id", controller.updateSeamstress);
  router.put("/assignments/:id", controller.updateAssignment);

  router.delete("/:id", controller.deleteSeamstress);
  router.delete("/assignments/:id", controller.deleteAssignment);

  return router;
}

module.exports = createSeamstressesRouter;