import express from "express";
import third from "./third";
const routes = express.Router();

routes.use("/third", third);
export default routes;
