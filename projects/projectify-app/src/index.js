import express from "express";
import { adminRouter } from "./routes/admin.routes.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.use("/admins", adminRouter);

app.listen(PORT, () => {
    console.log("Server is running on ", PORT);
});
