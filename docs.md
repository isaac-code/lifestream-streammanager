```mermaid
sequenceDiagram
    participant AD as Admin
    participant NA as Node App
    participant FS as File Server App
    participant MG as MongoDB
    participant FH as File Host <br> (DropBox, AWS, GCP)

    AD ->> +NA: Request: Create Channel
    NA ->> +MG: Request: Create Channel
    MG ->> -NA: Response: Created Channel
    NA ->> -AD: Response: Created Channel

    AD ->> +NA: Request: Create Media
    NA ->> +FS: Request: Upload File
    FS ->> +FH: Request: Upload File
    FH ->> -FS: Response: File Remote Link
    FS ->> -NA: Response: File Remote Link
    NA ->> +MG: Request: Create Media Record with File Remote Link
    MG ->> -NA: Response: Created Media Record
    NA ->> -AD: Request: Created Media Record
