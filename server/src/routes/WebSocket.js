import { WebSocketServer } from "ws";
import { extractDataAndUploadToDB } from "../controllers/pdf.controller.js";
// import { extractDataAndUploadToDB } from '../controllers/pdf.controller';
// import { PORT } from '../index.js';
import http from 'http';

// Set up a function to check and handle CORS for WebSocket connections
const setupWebSocketServer = (port,app) => {
  // console.log(`🚀 Web Socket Server running ${port}`);
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server});

  wss.on("connection", (ws) => {
    console.log("Client connected");
    let hasProcessedValidMessage = false;

    ws.on("message", async (message) => {
      if (hasProcessedValidMessage) {
          ws.send(
            JSON.stringify({
              error: true,
              message: "Extraction is already in progress.",
            })
          );
          return;
        }

      try {
        var pdfPages = JSON.parse(`${message}`);
      } catch (error) {
        const response = {
          error: true,
          data: "",
          message:
            error?.message || "Some error occurred, please try again later",
        };
        ws.send(JSON.stringify(response));
        ws.close();
      }

      if (Array.isArray(pdfPages)) {
          if(!hasProcessedValidMessage){
            const response = await extractDataAndUploadToDB(pdfPages, ws);
            hasProcessedValidMessage = true;
          }
      } else {
        const response = {
          error: true,
          data: "",
          message: "request is not a valid array",
        };
        ws.send(JSON.stringify(response));
        ws.close();
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      hasProcessedValidMessage = false;
    });
  });
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

export default setupWebSocketServer;
