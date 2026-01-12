import { v2 as cloudinary } from "cloudinary";

/**
 * Uploads a file buffer to Cloudinary via upload_stream.
 * @param {Buffer} buffer - The file buffer.
 * @param {Object} options - Additional Cloudinary options.
 * @returns {Promise<Object>} - The Cloudinary upload result.
 */
export const streamUpload = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "lingomate_uploads",
        resource_type: "auto",
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(buffer);
  });
};
