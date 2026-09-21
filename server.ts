import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { ZipArchive } from "archiver";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // API Routes
  app.get("/api/download-plugin", (req, res) => {
    res.attachment("dimensionador-de-audio.zip");
    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error(err);
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    const folderName = "dimensionador-de-audio";
    
    // PHP Plugin file
    archive.file("dimensionador-de-audio.php", { name: `${folderName}/dimensionador-de-audio.php` });

    // Build directory
    if (fs.existsSync(path.join(process.cwd(), "dist"))) {
      archive.directory("dist/", `${folderName}/dist`);
    }

    archive.finalize();
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      version: "1.0.2",
      app: "Calculadora Workpro",
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Workpro Audio Calculator v1.0.2] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
