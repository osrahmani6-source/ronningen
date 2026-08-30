import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventBuilderRouter from "./event-builder";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventBuilderRouter);

export default router;
