when we request we create a stream record






when we request for content by pretty name, we search if the channel with this pretty name exist
if it does and stream is available we just send the streamLink
if it does and the stream is not available we start setting up the stream and send the link
if it does not exist we search on minister and/or media-tag database for this content
if one exist we create the channel then persist the necessary data (ministerId and/or mediaTagId)
We then start setting up the stream and then send the link


```mermaid
sequenceDiagram

    participant CL as User Landing Page
    participant LS as LifeStream Service
    participant N
    participant SR as LiquidSoap Script Runner
    participant LQ as LiquidSoap(LQ)
    participant MG as MongoDB
    participant SL as Slack
    participant WR as Stream Watcher
    
    CL ->> NA: Request a Stream Link for a Channel
    alt channel is not available
        NA ->> +MG: Request: Declare Channel as "initiating"<br> and nowPlaying field as 0 (indicating first media in channel is the next to play)
        MG ->> -NA: Response: Return with new Channel Record
        NA ->> CL: Response: Return message "Kindly Refresh"
        par CREATING CHANNEL LQ SCRIPT
            NA ->> NA: Create LQ Script with <br> Channel Details and Start LQ Script
            alt we got a command for pulling Media Link before 60seconds
                par SETTING UP A NEW MEDIA STREAM
                    LQ ->> +NA: Request: Get Next Media Link for Channel
                    NA ->> +MG: Request: Update nowPlaying to +1 and Get Current Media Remote Link for Channel
                    MG ->> -NA: Response: Return Remote Link 
                    par SAVING FILE LOCALLY
                        NA ->> NA: Create Folder for this <br> Channel with Channel ID
                        NA ->> NA: Pull Remote Media to Channel Folder changing the name to the media ID
                    end
                    NA ->> -LQ: Send the full Link (Local) for the Media of Channel
                    alt we got a command to persist Stream Link before 60seconds
                        LQ ->> NA: Starts the process and request to Persist Stream Link to Channel Record
                        NA ->> MG: Persist Stream Link and update channel to "live"
                        alt persist Stream Link is successful
                            MG ->> NA: Response: is successful
                        else persist Stream Link is not successful
                            NA ->> SL: Send an error message to slack
                        end
                    else we did not get a command to persist Stream Link after 60seconds
                        NA ->> SL: Send an error message to slack
                    end
                end
            else we did not get command for pulling Media Link after 60seconds
                NA ->> SL: Send an error message to slack
            end
        end
    else channel is "initiating" or not "live"
        alt initiatingTimeDifference is less than 120seconds
            NA ->> CL: Response: Return message "Kindly Refresh"
        else initiatingTimeDifference is more than 120seconds
            NA ->> LQ: Delete Channel Script if it exist <br> and Start CREATING CHANNEL LQ SCRIPT afresh
            NA ->> CL: Response: Return message "Kindly Refresh"
        end
    else channel is "live"
        NA ->> CL: Response: Return with Stream Link
    end
    LQ ->> NA: Media just ended
    alt if media is local
        NA ->> NA: Delete Media
    else if media is remote
        NA ->> NA: Do nothing
    end
