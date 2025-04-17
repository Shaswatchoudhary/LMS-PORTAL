const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadMediaToCloudinary = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "auto", // Detects video/image/audio
    folder: "course-uploads",
  });
  fs.unlinkSync(filePath); // Delete local file
  return result;
};

const deleteMediaFromCloudinary = async (publicId) => {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "video", // Optional if all uploads are videos
  });
};

module.exports = {
  uploadMediaToCloudinary,
  deleteMediaFromCloudinary,
};
