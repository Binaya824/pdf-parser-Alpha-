import { catchAsync, handleScript } from "../libs/utils.js";
import { exec } from "child_process";
import WebSocket from "ws";
import fs from 'fs'
// import fs from 'fs';
// import path from 'path';

export const handleUpload = catchAsync(async (req, res, next) => {
  // print(req.file)
  const outputDir = `output/${Math.floor(Date.now() / 1000)}`;

  exec(`mkdir -p ${outputDir}`, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Error creating output directory: ${error}`);
    } else {
      console.log("Output directory created.");
      const pythonScript = "convert_to_images.py";
      if (req.file == undefined) {
        return res.status(404).json({
          status: "error",
          error: false,
          message: "File not found.",
          data: {},
        });
      }

      try {
        const outputArray = await sendJsonRequest({
          file_dir: req.file.path,
          output_dir: outputDir,
          type: "extract_image",
        });


        if (outputArray.type == "error") {
          res.status(400).json({
            status: "failed",
            error: true,
            message: outputArray.response,
            data: {
              outputArray,
            },
          });
          return "";
        }

        res.status(200).json({
          status: "success",
          error: false,
          message: "Document uploaded successfully",
          data: {
            outputArray,
          },
        });
      } catch (error) {
        res.status(400).json({
          status: "failed",
          error: true,
          message: {
            ...error,
          },
        });
      }
    }
  });
});

async function sendJsonRequest(request) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://py-server:5151");

    ws.on("open", () => {
      console.log("WebSocket connection opened.");
      // Stringify the JSON request
      const jsonRequest = JSON.stringify(request);
      // Send the JSON request to the WebSocket server
      ws.send(jsonRequest);
    });

    ws.on("message", (message) => {
      console.log("Received message from WebSocket server:", message);
      // Parse the received JSON response
      const jsonResponse = JSON.parse(message);
      // Resolve the promise with the received JSON response
      resolve(jsonResponse);
      // Close the WebSocket connection after receiving a response
      ws.close();
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed.");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      reject(error);
    });
  });
}
