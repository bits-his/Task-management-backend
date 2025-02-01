import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: 'salamcom',
  api_key: '772938886654431',
  api_secret: 'rYOxlxPPyG1uF1QZMiGDI5b2M-k',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads',
    allowedFormats: ['jpg', 'png', 'jpeg'],
  },
});

export { storage };