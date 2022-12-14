const { date } = require('@hapi/joi');
const multer = require('multer'); //middleware access file
const Files = require('../models/file_schema');

const currentTime = Date.now();

const storage = multer.diskStorage({
    destination: (req, file, cb) => { //set path
        cb(null, 'public')
    },
    filename: (req, file, cb) => {
        cb(null, currentTime + '-' + file.originalname) //set filename and time
    }
});

const storageImg = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/')
    },
    filename: (req, file, cb) => {
        cb(null, currentTime + '-' + file.originalname)
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') { //filter only jpeg png and jpg files
        cb(null, true)
    } else {
        cb({message: 'Unsupported file format'}, false)
    }
}

exports.uploadImage = async (req, res) => {
    const adminemail = req.adminemail //only admin can upload

    const uploadImg = multer({storage: storageImg}).array('file');

    uploadImg( req, res, async (err) => {
        if (err) {
            return res.status(500).json(err)
        }

        const file_arr = []
        for(let i = 0 ; i < req.files.length ; i++){ //loop files and append to array
            const file_data = {
                file_name: req.files[i].originalname,
                filename_extension: req.files[i].mimetype,
                file_path: req.files[i].path,
            }
            file_arr.push(file_data)
        }

        const data = await Files.create(file_arr) //create db and save path in db
        const data_id = data.map(key => {
            return key._id
        });

        console.log(`Uploaded file by: ${adminemail}, Time: ${Date.now()}`)

        return res.status(200).json({result: 'OK', message: 'success upload image', data: data_id})
    });
};