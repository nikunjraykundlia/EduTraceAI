const ImageKit = require('imagekit');
const fs = require('fs');

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_ENDPOINT
});

/**
 * Uploads a file to ImageKit
 * @param {string} filePath - Path to the local file
 * @param {string} fileName - Name to save the file as
 * @returns {Promise<Object>} - ImageKit upload response
 */
const uploadToImageKit = async (filePath, fileName) => {
    try {
        const fileContent = fs.readFileSync(filePath);

        const response = await imagekit.upload({
            file: fileContent,
            fileName: fileName,
            folder: process.env.IMAGEKIT_FOLDER || '/EduTrace/transcripts',
            useUniqueFileName: true
        });

        console.log(`File uploaded to ImageKit: ${response.url}`);
        return response;
    } catch (error) {
        console.error('ImageKit Upload Error:', error.message);
        throw new Error(`Failed to upload to ImageKit: ${error.message}`);
    }
};

module.exports = {
    uploadToImageKit
};
