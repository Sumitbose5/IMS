import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";

export const uploadPoster = async (req: any, res: Response) => {
    try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Upload to Cloudinary using Promise.all for concurrency
    const uploadPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'uploads' }, // optional folder
          (error, result) => {
            if (error) reject(error);
            else resolve(result?.secure_url);
          }
        );
        uploadStream.end(file.buffer);
      });
    });

    const imageUrls = await Promise.all(uploadPromises);
    res.json({ success: true, urls: imageUrls });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error });
  }
};
