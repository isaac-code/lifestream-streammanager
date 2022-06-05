import * as fs from "fs";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as logger from "morgan";
import * as path from "path";
import * as dotenv from "dotenv";
import * as cors from "cors";
import errorHandler = require("errorhandler");
import methodOverride = require("method-override");
import mongoose = require("mongoose");
import encrypt = require("mongoose-encryption");

dotenv.config();

//Controller

//models
import { IModel } from "./models/model";

//routes
import { StreamController } from "./controllers/streamcontroller";


//schemas


//let logStream = fs.createWriteStream(path.join(__dirname, "../app.log"), { flags: "a" })

export class Server {
    public app: express.Application;
    private connection: mongoose.Connection;
    public model: IModel;

    public static bootstrap(): Server {
        return new Server();
    }

    constructor() {
        this.model = Object();
        //create expressjs application
        this.app = express();

        //configure application
        this.config();

        //add routes
        this.routes();

        this.runners(this.connection);
    }

    config() {
        const MONGODB_CONNECTION = process.env.MONGODB_HOST + process.env.DB_NAME;

        //mount cookie parser
        this.app.use(cookieParser(process.env.SECRET_KEY));

        //mount override
        this.app.use(methodOverride());

        //allow cors
        this.app.options("*", cors());
        this.app.use(cors());

        //to mount json form parser
        this.app.use(bodyParser.json());

        //mount query string parser
        this.app.use(bodyParser.urlencoded({
            extended: true
        }))

        //serve static files
        this.app.use(express.static(path.join(__dirname, "public")));

        //mount logger
        this.app.use(logger("dev"));

        //use q promises
        global.Promise = require("q").Promise;
        mongoose.Promise = global.Promise;

        //connect to mongoose
        let connection = mongoose.createConnection(
            MONGODB_CONNECTION
        );
        this.connection = connection;

        //enable encryption
        var encKey = process.env.db_encryption_key;
        var sigKey = process.env.db_signing_key;
        mongoose.plugin(encrypt, {
            encryptionKey: encKey,
            signingKey: sigKey,
            encryptedFields: ["secret"]
        });


        //create models


        // catch 404 and forward to error handler
        this.app.use(function (
            err: any,
            req: express.Request,
            res: express.Response,
            next: express.NextFunction
        ) {
            err.status = 404;
            next(err);
        });

        //error handling
        this.app.use(errorHandler());
    }

    routes() {
        const router = express.Router();

        console.log(`Loading stream controller routes`);
        new StreamController().loadRoutes("/stream", router);

        this.app.use(router);
    }

    private runners(connection: mongoose.Connection): any {
        //register and fire scheduled job runner classes
    }

}
