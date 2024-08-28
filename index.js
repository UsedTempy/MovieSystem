const express = require('express')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const dotenv = require('dotenv');
const ffmpeg = require('fluent-ffmpeg');

const app = express()
const PORT = 3000;

/**
 * Converts a bitmap file to a base64 encoded string and stores it in an array.
 * @param {string} bitmapPath - The path to the bitmap file.
 * @param {function} callback - Callback function that will receive the array of base64 strings.
 */

// Private Functions TODO: asd
function videoToBitmap(videoPath, outputDir, width, height, callback) {
    // Create the scale filter string
    const scaleFilter = `scale=${width}:${height}`;

    ffmpeg(videoPath)
        .output(path.join(outputDir, 'frame-%03d.bmp'))
        .outputOptions([
            '-vf', `fps=1,${scaleFilter}`, // Extract frames and apply scaling filter
            '-q:v', 2 // Set quality of the output images (lower value means higher quality)
        ])
        .on('end', () => {
            console.log('Frames extracted as bitmaps successfully.');
            if (callback) callback(null);
        })
        .on('error', (err) => {
            console.error('Error during video processing:', err);
            if (callback) callback(err);
        })
        .run();
}

function bitmapToStringArray(bitmapPath, callback) {
    fs.readFile(bitmapPath, (err, data) => {
        if (err) {
            console.error('Error reading bitmap file:', err);
            callback(err, null);
            return;
        }
        
        // Convert binary data to base64 string
        const base64String = data.toString('base64');

        // Store the base64 string in an array
        const resultArray = [base64String];

        // Call the callback with the result array
        callback(null, resultArray);
    });
}


// API
app.use(express.json())
app.get("/createBitmap", async (req, res) => {
    const movieName = req.query.movieName;
    const width = parseInt(req.query.width, 10) || 1920; // Default width if not provided
    const height = parseInt(req.query.height, 10) || 1080; // Default height if not provided
    const movieFilePath = `MovieFiles/${movieName}.mp4`;

    if (!fs.existsSync(movieFilePath)) {
        return res.status(404).json({
            result: false,
            message: "Couldn't find a movie with that file path",
        });
    }

    const dirPath = path.join('Bitmaps', movieName);
    if (!fs.existsSync(dirPath)) {
        // Create a new directory
        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating directory:', err);
                return res.status(500).json({
                    result: false,
                    message: "Error creating bitmap directory",
                });
            } else console.log('Directory created successfully:', dirPath);
        });
    }

    videoToBitmap(movieFilePath, dirPath, width, height, (err) => {
        if (err) {
            console.error('Failed to process video:', err);
            return res.status(500).json({
                result: false,
                message: 'Failed to process video',
            });
        } else {
            console.log('Video processing complete.');
            return res.status(200).json({
                result: true
            });
        }
    });
});

app.get("/requestBitmap", async (req, res) => {
    const movieName = req.query.movieName;
    const startPoint = parseInt(req.query.startPoint, 10) || 1920; // Default width if not provided
    const range = parseInt(req.query.range, 10) || 1080; // Default height if not provided

    const movieFilePath = `MovieFiles/${movieName}.mp4`;

    if (!fs.existsSync(movieFilePath)) {
        return res.status(404).json({
            result: false,
            message: "Couldn't find a movie with that file path",
        });
    }

    const bitmapFilePath = `Bitmaps/${movieName}/frame-002.bmp`;
    const stringBitmap = bitmapToStringArray(bitmapFilePath, (err, resultArray) => {
        if (err) {
            console.error('Failed to convert bitmap to string array:', err);
        } else {
            console.log('Bitmap converted to string array:', resultArray);
        }
    });

    console.log(stringBitmap)
})

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))