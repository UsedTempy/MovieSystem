const express = require('express')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const dotenv = require('dotenv');
const { json } = require('body-parser');
const ffmpeg = require('fluent-ffmpeg');

const app = express()
const PORT = 3000;

const bitmapOutput = 'Bitmaps\\TestVideo'

// Private Functions TODO: asd
function videoToBitmap(videoPath, outputDir, callback) {
    ffmpeg(videoPath)
        .output(path.join(outputDir, 'frame-%03d.bmp'))
        .outputOptions([
            '-vf', 'fps=60', // Extract 1 frame per second (adjust as needed)
            '-q:v', '2' // Set quality of the output images (lower value means higher quality)
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


// API
app.use(express.json())
app.get("/requestBitmap", async (req, res) => {
    const movieName = req.query.movieName
    const movieFilePath = `MovieFiles/${movieName}.mp4`
    let bitmapArray = {}

    console.log(movieFilePath)

    if (!fs.existsSync(movieFilePath)) {
        return res.status(200).json({
            result: false,
            message: "Couldn't find a movie with that file path",
        })
    }

    if (!fs.existsSync(`Bitmaps/${movieName}`)) {
        const dirPath = path.join('Bitmaps', movieName);

        // Create a new directory
        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating directory:', err);
            } else console.log('Directory created successfully:', dirPath);
        });
    }

    videoToBitmap(movieFilePath, bitmapOutput, (err) => {
        if (err) {
            console.error('Failed to process video:', err);
        } else {
            console.log('Video processing complete.');
        }
    })

    return res.status(200).json({
        result: bitmapArray
    })
})

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))