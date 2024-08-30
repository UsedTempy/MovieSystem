const express = require('express')
const axios = require('axios')
const fs = require('fs')
const util = require('util')
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
        .output(path.join(outputDir, 'frame-%d.bmp'))
        .outputOptions([
            '-vf', `fps=60,${scaleFilter}`, // Extract frames and apply scaling filter
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

function bitmapToRGBString(filePath) {
    const bitmap = fs.readFileSync(filePath);

    // BMP files have a header of 54 bytes
    const width = bitmap.readUInt32LE(18);
    const height = bitmap.readUInt32LE(22);
    const start = bitmap.readUInt32LE(10);

    let rgbString = '';

    // Loop through each pixel (starting from the end due to BMP's storage order)
    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            const idx = start + (x + y * width) * 3;
            const b = bitmap[idx];
            const g = bitmap[idx + 1];
            const r = bitmap[idx + 2];
            rgbString += `${r},${g},${b};`;
        }
    }

    return rgbString.slice(0, -1); // Remove the last semicolon
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
    const startPoint = parseInt(req.query.startPoint) // || 1920; // Default width if not provided
    const range = parseInt(req.query.range) // || 1080; // Default height if not provided

    const movieFilePath = `Bitmaps/${movieName}`;
    console.log(movieName, startPoint, range)

    if (!fs.existsSync(movieFilePath)) {
        return res.status(404).json({
            result: false,
            message: "Couldn't find a movie with that file path",
        });
    }
        
    try {
        let decodedStrings = []
        for (let i = startPoint; i < startPoint + range; i++) {
            const bitmapFilePath = `Bitmaps/${movieName}/frame-${i}.bmp`
            if (!fs.existsSync(bitmapFilePath)) continue

            const rgbString = bitmapToRGBString(bitmapFilePath);
            decodedStrings.push(rgbString)
        }

        return res.status(200).json({
            result: true,
            response: decodedStrings,
        })
    } catch {
        return res.status(404).json({
            result: false,
            message: "Couldn't convert bitmap to RGB"
        })
    }
})

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))