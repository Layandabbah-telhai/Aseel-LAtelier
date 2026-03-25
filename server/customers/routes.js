const express = require("express");

function createCustomersRouter(controller) {
  const router = express.Router();

  // GET /api/customers
  router.get("/", controller.list);

  // GET /api/customers/:id
  router.get("/:id", controller.get);

  // POST /api/customers
  router.post("/", controller.create);

  // PUT /api/customers/:id
  router.put("/:id", controller.update);

  // DELETE /api/customers/:id
  router.delete("/:id", controller.remove);

  return router;
}

module.exports = createCustomersRouter;