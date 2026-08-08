import { Service } from "node-windows";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a new Windows Service object
const svc = new Service({
  name: "DWIP Enterprise Operations Service",
  description: "Runs the DWIP node web server and background workers.",
  script: path.join(__dirname, "dist", "server.cjs"),
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "PORT",
      value: "3001"
    }
  ]
});

// Listen for the "install" event, which indicates the service is installed
svc.on("install", () => {
  console.log("DWIP service installed successfully. Starting service...");
  svc.start();
});

// Install the service
svc.install();
