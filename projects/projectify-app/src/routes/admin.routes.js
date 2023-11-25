import { Router } from "express";
import { adminController } from "../controllers/admin.controller.js";

const adminRouter = Router();

adminRouter.post("/sign-up", adminController.signUp);

export { adminRouter };
