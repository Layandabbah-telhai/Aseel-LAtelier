const express = require("express");

function createOrdersRouter(controller) {
  const router = express.Router();

  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.remove);

  router.get("/:id/payments", controller.listPayments);
  router.post("/:id/payments", controller.createPayment);
  router.delete("/payments/:paymentId", controller.deletePayment);

  return router;
}

module.exports = createOrdersRouter;