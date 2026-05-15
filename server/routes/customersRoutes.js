const express = require("express");

function createCustomersRouter(controller) {
  const router = express.Router();

  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return router;
}

module.exports = createCustomersRouter;