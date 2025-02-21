import express from "express";
import admin from "./admin";
import bvault from "./bvault";
import lntvault from "./lntvault";
import nft from "./nft";
import third from "./third";
const routes = express.Router();

routes.use("/admin", admin);
routes.use("/bvault", bvault);
routes.use("/lntvault", lntvault);
routes.use("/nft", nft);
routes.use("/third", third);
export default routes;
