const express = require("express");

module.exports = function createOccasionRequestsRouter(controller) {
  const router = express.Router();

  router.post(
    "/customer-occasion-request",
    controller.createCustomerRequest
  );

  router.get(
    "/customer-occasion-requests/:customerId",
    controller.listCustomerRequests
  );

  router.get(
    "/occasion-requests",
    controller.listAllRequests
  );

  router.put(
    "/occasion-requests/:id/status",
    controller.updateStatus
  );

  return router;
};