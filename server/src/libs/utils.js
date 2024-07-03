import { exec } from "child_process";
import fs from 'fs';
import path from 'path';

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode || 500;
    this.status =
      (statusCode && String(statusCode)[0] === "4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export const removeNewlinesFromTable = (tables) => {
  // Iterate through the outer array (tables)
  for (let i = 0; i < tables.length; i++) {
    // Iterate through the inner subarray
    for (let j = 0; j < tables[i].length; j++) {
      // Replace newline characters ("\n") with an empty string
      tables[i][j] = tables[i][j].replace(/\n/g, '');
    }
  }
  return tables;
}

export const handleScript = (pythonScript, pdfFile, outputDir) => {
  return new Promise((resolve, reject) => {
    exec(
      `python3 ${pythonScript} "${pdfFile}" "${outputDir}"`,
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(new Error(`Python script exited with an error: ${stderr}`));
          return;
        }
        console.log(`Python script output: ${stdout} ${outputDir}`);

        fs.readdir(outputDir, (err, files) => {
          if (err) {
            console.error('Error reading folder:', err);
            return;
          }

          let fileNames = files.filter(file => {
            const filePath = path.join(outputDir, file);
            return fs.statSync(filePath).isFile();
          });
          fileNames = fileNames.map((file) => outputDir + '/' + file)
          fileNames.sort((a, b) => {
            const pageA = parseInt(a.match(/page_(\d+)/)[1]);
            const pageB = parseInt(b.match(/page_(\d+)/)[1]);
            return pageA - pageB;
          });
          resolve(fileNames);
          // extractInformation
          // extractInformation(file_names)
        });

        // resolve(stdout);
      }
    );
  });
}

export function removeNewlines(obj) {
  // Base case: If the table is an array, remove \n characters
  if (Array.isArray(obj.table)) {
    obj.table = obj.table.map((row) => row.map((item) => removeNewlines(item)));
  } else if (typeof obj.text === 'string') {
    obj.text = obj.text.replace(/\n/g, '');
  }

  return obj;
}
// module.exports.AppError = AppError
// module.exports.catchAsync = catchAsync