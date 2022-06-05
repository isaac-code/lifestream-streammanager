import { Status } from "../enums/statusenum";

export class BasicResponse {

    private status: number;
    private data: object;
    private message: string;
    private recordCount: number;

    constructor(status: number, data?: object, message?: string, recordCount?: number) {
        this.status = status;
        this.data = data;
        this.message = message;
        this.recordCount = recordCount;
    }

    public getData() {
        return this.data;
    }

    public getMessage() {
        return this.message;
    }

    public getStatusString() {
        return Status[this.status];
    }

    public getRecordCount() {
        return this.recordCount;
    }

}