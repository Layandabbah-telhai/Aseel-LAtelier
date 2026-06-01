const express = require("express");

function createAppointmentsRouter(controller) {
  const router = express.Router();

  router.get("/", controller.list);

  router.get("/change-requests", controller.listChangeRequests);
  router.post("/change-requests", controller.createChangeRequest);
  router.put("/change-requests/:id/status", controller.decideChangeRequest);

  router.get("/:id", controller.get);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return router;
}

module.exports = createAppointmentsRouter;