import { Router } from "express";
import passportV1Router from "./passport_v1.routes.ts";

const router = Router();

// v2 inherits and proxies directly to v1 initially for compatibility
router.use("/", passportV1Router);

export default router;
