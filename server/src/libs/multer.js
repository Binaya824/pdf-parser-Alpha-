import multer from "multer";
import path from 'path'
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      // Define the filename for the uploaded file
      cb(null, Date.now() + "-" + file.originalname);
    },
    onError: function (err, next) {
      console.log("error", err);
      next(err);
    },
  }),
  fileFilter: function (req, file, callback) {
    var ext = path.extname(file.originalname);
    if (ext !== ".pdf") {
      return callback(new Error("ONLY_PDF_ALLOW_TO_UPLOAD"));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10000000,
  },
}).single("file");

export default upload;
