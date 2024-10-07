import express from "express";
import cors from "cors";
import productRoutes from "./routes/products.route.js";

const app = express();
app.use(cors());

app.use(express.json());
app.use(productRoutes);

export default app