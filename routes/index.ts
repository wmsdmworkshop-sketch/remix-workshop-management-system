import { Router } from "express";
import healthRouter from "./health.routes.ts";
import customerRouter from "./customer/customer.routes.ts";
import warrantyRouter from "./warranty.routes.ts";
import cxoRouter from "./cxo.routes.ts";
import customerV1Router from "./customer/customer_v1.routes.ts";
import customerV2Router from "./customer/customer_v2.routes.ts";
import fleetRouter from "./fleet/fleet.routes.ts";
import fleetV2Router from "./fleet/fleet_v2.routes.ts";
import graphRouter from "./graph/graph.routes.ts";
import graphV2Router from "./graph/graph_v2.routes.ts";
import pilotRouter from "./pilot.routes.ts";
import devopsRouter from "./devops.routes.ts";
import observabilityRouter from "./observability.routes.ts";
import pilotCustomerRouter from "./pilot_customer.routes.ts";
import passportV1Router from "./passport/passport_v1.routes.ts";
import passportV2Router from "./passport/passport_v2.routes.ts";
import masterRouter from "./master.routes.ts";

const router = Router();

// Mount sub-routers
router.use("/", healthRouter);
router.use("/customer", customerRouter);
router.use("/warranty", warrantyRouter);
router.use("/cxo", cxoRouter);
router.use("/v1/customer", customerV1Router);
router.use("/v2", customerV2Router);
router.use("/v1/fleet", fleetRouter);
router.use("/v2/fleet", fleetV2Router);
router.use("/v1/graph", graphRouter);
router.use("/v2/graph", graphV2Router);
router.use("/v1/pilot", pilotRouter);
router.use("/v1/pilot", pilotCustomerRouter);
router.use("/v1/passport", passportV1Router);
router.use("/v2/passport", passportV2Router);
router.use("/master", masterRouter);
router.use("/v1/devops", devopsRouter);
router.use("/v1/devops", observabilityRouter);
router.use("/devops", observabilityRouter);

export default router;
