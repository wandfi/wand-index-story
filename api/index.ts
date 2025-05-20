import bodyParser from "body-parser";
import cors from "cors";
import express from "express";

import { CONFIGS } from "@/configs";
import routes from "./routers";
import { CommonResponse } from "./common";

export async function apiServer() {
  const port = CONFIGS.server.port;
  const app = express();
  app.use(
    cors({
      origin: "*",
      credentials: true,
    })
  );
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use("/ping", (_req, res) => {
    CommonResponse.success().send(res);
  });
  app.use("/api", routes);
  app.use((err: any, _req: any, _res: any, _next: any) => {
    console.error(`Server stack: ${err.stack} \n msg: ${err.message}`);
  });
  console.info(`Server start on: ${port}`);
  app.listen(CONFIGS.server.port);
}

export async function startApi() {
    await apiServer()
}
