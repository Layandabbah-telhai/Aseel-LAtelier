const express = require("express");

function createOrdersRouter(controller) {
  const router = express.Router();
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:id/status", controller.updateStatus);
  return router;
}

module.exports = createOrdersRouter;
