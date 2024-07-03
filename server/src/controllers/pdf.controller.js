import { AppError, catchAsync, removeNewlines } from "../libs/utils.js";
// import { NextFunction, Request, Response } from "express";
// const amqp = require('amqplib');

// import Clause from "../models/data.model.js";
// import { Sequelize } from "sequelize";
import PdfTextExtractor from "../services/pdfService.js";
// import Table from "../models/table.model.js";
import os from "os";
import fs from "fs";
import path from "path";
// import Files from "../models/files.model.js";
import admin from "firebase-admin";
import connectToFireBase from "../libs/fireBase.js";



connectToFireBase();

export const extractDataAndUploadToDB = catchAsync(async (files, ws) => {
  let table;
  let tables;
  let clauses;
  let filesPath;

  const pdfTextExtractor = new PdfTextExtractor()

  try {
    const numCPUs = os.cpus().length;
    // await pdfTextExtractor.initializeWorkers(numCPUs - 1);
    clauses = await pdfTextExtractor.processFiles(files, ws);
    table = await pdfTextExtractor.extractTableFromPdf(ws);

    const id_part = files[0].split("/")[1];
    const files_path = await Files.findOne({
      where: {
        folder_id: id_part,
      },
    });
    // console.log(files_path?.data)
    if (files_path?.data) {
      filesPath = files_path?.data;
      const url = await extractFileUrl(filesPath["pdf_file"]);
      filesPath["pdf_file"] = url[0];
      Object.entries(filesPath).forEach((item) => {
        if (item[1].length != 0 && Array.isArray(item[1])) {
          item[1].forEach(async (file, i) => {
            const url = await extractFileUrl(file.img_filename);
            filesPath[item[0]][i]["img_filename"] = url[0];
          });
        }
      });
    }

    clauses = await Clause.create({
      data: {
        ...clauses,
      },
      tableId: table.id,
    });

    await clauses.save();
    tables = await Table.findByPk(table.id);
    // console.log(tables, "+++++++++++++++++++++")
    tables = tables.dataValues;
  } catch (err) {
    // console.log(err);
    const response = {
      status: "failed",
      error: true,
      message: err?.message || "Some error occurred, please try again later",
    };
    ws.send(JSON.stringify(response));
    ws.close();
    return response;
    // }
  }


  const response = {
    status: "success",
    error: false,
    message: "Data extracted successfully",
    data: {
      clauses,
      tables,
      filesPath
    },
  };

  // files.forEach((filePath) => {
  //   fs.unlink(filePath, (err) => {
  //     if (err) {
  //       console.error(`Error deleting file ${filePath}: ${err.message}`);
  //     } else {
  //       console.log(`File ${filePath} deleted successfully`);
  //     }
  //   });
  // });

  ws.send(JSON.stringify(response));
  ws.close();
  return response;
});

function getCurrentCpuUsage(startTime) {
  const startUsage = os.cpus();


  // Add a delay (e.g., 100ms) to measure CPU usage over a short interval
  // You can adjust the delay based on your requirements
  return new Promise((resolve) => {
    setTimeout(() => {
      const endUsage = os.cpus();

      const totalUserTime = endUsage.reduce((total, cpu, index) => {
        const startUserTime = startUsage[index].times.user;
        const endUserTime = cpu.times.user;
        const userTimeDiff = endUserTime - startUserTime;

        const startSysTime = startUsage[index].times.sys;
        const endSysTime = cpu.times.sys;
        const sysTimeDiff = endSysTime - startSysTime;

        const startNiceTime = startUsage[index].times.nice;
        const endNiceTime = cpu.times.nice;
        const niceTimeDiff = endNiceTime - startNiceTime;

        // Calculate the total CPU time (user + sys + nice)
        const totalTimeDiff = userTimeDiff + sysTimeDiff + niceTimeDiff;

        return total + (totalTimeDiff / (Date.now() - startTime));
      }, 0) / endUsage.length;

      resolve(totalUserTime * 100); // Convert to percentage
    }, 100); // Adjust the delay as needed
  });
}

export const extractDataAndUploadToDBApi = catchAsync(
  async (req, res, next) => {
    const startTime = Date.now();
    await getCurrentCpuUsage(startTime).then((data) => {
      console.log(`data`, data);
      if (data >= 80) {
        return res.status(500).json({
          status: "failed",
          error: true,
          message: "Server is busy right now. Please try again later.",
        });
      }
    });

    const files = req.body.files;
    // let data;
    let table;
    let tables;
    let clauses;
    let filesPath;

    const pdfTextExtractor = new PdfTextExtractor();
    try {
      if (!req.body || !Array.isArray(files)) {
        return res.status(400).json({
          status: "failed",
          error: true,
          message: "Invalid request format. Please provide a valid JSON object with a 'files' key containing an array of image paths."
        })
      }

      // const id_part = files[0].split("/")[1];
      // const files_path = await Files.findOne({
      //   where: {
      //     folder_id: id_part,
      //   },
      // });
      // console.log(files_path?.data)
      // if (files_path?.data) {
      //   filesPath = files_path?.data;
      //   const url = await extractFileUrl(filesPath["pdf_file"]);
      //   filesPath["pdf_file"] = url[0];
      //   Object.entries(filesPath).forEach((item) => {
      //     if (item[1].length != 0 && Array.isArray(item[1])) {
      //       item[1].forEach(async (file, i) => {
      //         const url = await extractFileUrl(file.img_filename);
      //         filesPath[item[0]][i]["img_filename"] = url[0];
      //       });
      //     }
      //   });
      // }

      clauses = await pdfTextExtractor.processFiles(files);

      table = await pdfTextExtractor.extractTableFromPdf();
      // console.log(`table`, table.data);
      // clauses = await Clause.create({
      //   data: {
      //     ...clauses,
      //   },
      //   tableId: table.id,
      // });

      // await clauses.save();
      // tables = await Table.findByPk(table.id);
      tables = table.data;
      console.log(tables)
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        status: "failed",
        error: true,
        message: err?.message || "Some error occurred, please try again later",
      });
      // }
    }

    res.status(200).json({
      status: "success",
      error: false,
      message: "Data extracted successfully",
      data: {
        clauses,
        tables,
        filesPath,
      },
    });
  }
);

const extractFileUrl = async (path) => {

  const storage = admin.storage();

  const bucket = storage.bucket();
  const file = bucket.file(path);

  const url = await file
    .getSignedUrl({
      action: "read", // Specify the desired action (e.g., read, write)
      expires: Date.now() + 12 * 60 * 60 * 1000, // Set the expiration time in milliseconds (1 hour in this example)
    })
    .then((url) => {
      // Use the signed URL in your application
      return url;
    })
    .catch((error) => {
      console.error("Error getting signed URL:", error);
    });

  return url;
}


export const getPDFData = catchAsync(async (req, res, next) => {
  const data = await Clause.findAll();

  const tables = await Table.findAll();

  res.status(200).json({
    message: "success",
    error: false,
    message: "Data fetched successfully",
    data,
    tables,
  });
});

export const getSinglePdfData = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const clauseQuery = req.query.clause;

  let pdf;
  let table;

  if (clauseQuery) {
    pdf = await Clause.findByPk(id);
    pdf = { [clauseQuery]: pdf.data[clauseQuery] };
  } else {
    pdf = await Clause.findByPk(id);
    // table = await Table.findByPk(pdf.tableId)
  }

  res.status(200).json({
    status: "Success",
    error: false,
    message: "Pdf data fetched successfully",
    pdf
  });
});

export const updatePdfData = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const query = req.query.clause;
  const content = req.body.content;
  const tableContent = req.body.tableContent;

  console.log("-------------------------------");

  // console.log({tableContent})

  // console.log(tableContent)

  console.log("==========================");

  const clauses = await Clause.findByPk(id);
  const table = await Table.findByPk(clauses.tableId);

  // console.log(table.setDataValue, "------------")

  if (content) {
    clauses.set({
      data: {
        ...clauses.data,
        [query]: content,
      },
    });
    await clauses.save();
  }

  console.log("+++++++++++++++++++++++++++++++++");

  if (tableContent) {
    const updatedTable = tableContent.map((item) => removeNewlines(item));
    table.setDataValue("data", updatedTable);
    await table.save();

    // const newTable = await Table.findByPk(clauses.tableId)

    // console.log(newTable)
  }

  res.status(200).json({
    status: "success",
    error: false,
    message: "Data updated successfully",
    data: null,
  });
});
