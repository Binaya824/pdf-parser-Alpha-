import fs from "fs";
import axios from "axios";

import FormData from "form-data";
import { createScheduler, createWorker } from "tesseract.js";

import model from "wink-eng-lite-model";
import winkNLP from "wink-nlp";
// import amqp from "amqplib"
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';
import os from "os";

class PdfTextExtractor {
    constructor() {
        // this.pdfExtract = new PDFExtract();
        this.scheduler = createScheduler();
        this.nlp = winkNLP(model, ["sbd", "pos"]);
        this.result = {};
        this.clauseEnded = false;
        this.lastClausePage = "";
        this.ClausePages = [];

        this.currentPoint = "";
        this.tableEncountered = false;
        this.clauseStarted = false;
        this.stopExtracting = false;
        this.nonValidatedPoints = [];
        this.isInsideDoubleHash = false
        this.cleanedText = ""
        this.ignoreToken = false


        this.files = []
        this.worker_array = []

    }

    validate(str) {
        return str.match(/^(?:\b([ivxlcd]+)\.|\b([abcefhjklno]\.))\s/m);
    }



    async processFiles(files, ws = '') {

        if (ws != '') {
            ws.on("close", () => {
                this.worker_array.forEach((worker) => {
                    try {
                        worker.terminate();
                        console.log('all worker are terminate.', worker.id)
                    } catch (error) {
                        console.error(error);
                    }
                })
            });
        }


        const nlp = winkNLP(model, ["sbd"]);
        let scheduler = createScheduler()
        const numWorkers = os.cpus().length - 1;

        const workerGen = async () => {
            const worker = await createWorker('eng', 1);
            this.worker_array.push(worker)
            scheduler.addWorker(worker);
        }
        // Initialize workers
        const resArr = Array(numWorkers).fill(null).map(workerGen);
        await Promise.all(resArr);

        // Set up the results structure and other flags
        const result = {};
        let currentPoint = '';
        let currentSubPoint = '';
        let tableEncountered = false;
        let clauseStarted = false;
        let stopExtracting = false;
        const nonValidatedPoints = [];
        let progress = 0; // Track the number of files processed
        let tableIndices = [];

        const trackProgress = (() => {
            const startTime = performance.now()
            let completedJobs = 0
            const totalJobs = files.length
            let processingTime = ''

            return () => {
                completedJobs++
                const progress = (completedJobs / totalJobs) * 100
                console.log(`Progress: ${progress.toFixed(2)}% (${completedJobs}/${totalJobs} jobs completed)`)
                if (ws != '') {
                    ws.send(JSON.stringify({ type: 'progress', message: `Progress: ${progress.toFixed(2)}% (${completedJobs}/${totalJobs} jobs completed)`, progress: progress.toFixed(2), task: { total: totalJobs, completed: completedJobs } }));
                }

                if (completedJobs === totalJobs) {
                    const endTime = performance.now()
                    processingTime = (endTime - startTime) / 1000;
                    processingTime = processingTime / 60
                    // console.log('All Clause extraction jobs completed.', `It took ${processingTime} minute`);
                    if (ws != '') {
                        ws.send(JSON.stringify({ "type": "task_completed", "message": "All Clause extraction jobs completed.", time: processingTime, task: 'clause' }));
                    }

                    // process.exit(0);
                }
            }
        })()

        const chunkSize = 5
        const chunkedFiles = []

        for (let i = 0; i < files.length; i += chunkSize) {
            chunkedFiles.push(files.slice(i, i + chunkSize))
        }

        extractLoop:
        for (const chunk of chunkedFiles) {
            if (stopExtracting) break extractLoop;
            const promises = chunk.map(async (file) => {
                const { data: { text } } = await scheduler.addJob('recognize', file);
                progress++;
                trackProgress();
                // console.log({length: text.length})
                return text;
            });

            const texts = await Promise.all(promises);

            texts.forEach((t) => {

                const doc = nlp.readDoc(t);
                const tokens = doc.sentences().out();
                console.log("tokens" , tokens)
                let cleanedText = '';
                let isInsideDoubleHash = false;
                let ignoreToken = false
                let tableString = ""

                tokens.forEach((token) => {

                    const tableMatch = token.match(/\bTABLE\b|\b\(TABLE\)\b/g);
                    // console.log("token =============================================>>>>>>>>>>>>>>>>>>>>>>>>>" , token)

                    // let indexOfTableKeyword = token.indexOf("(TABLE")

                    if (tableMatch) {
                        // if (indexOfTableKeyword !== -1) {
                        // }
                        tableEncountered = true;
                        const elIndex = tableIndices.indexOf(currentPoint);
                        if(elIndex === -1){

                            tableIndices.push(currentPoint);
                        }
                        // tableString = token.substring(0, indexOfTableKeyword + 5);
                        
                    }

                    if (tableEncountered) {
                        if (clauseStarted && !stopExtracting) {
                            for (const ch of chunk) {
                                const regex = /(output\/\d+\/)/;
                                const match = ch.match(regex);
                                if (match) {
                                    const page = match.input
                                    if (!this.ClausePages.includes(page)) {
                                        this.ClausePages.push(page);
                                    }
                                }
                            }


                        }

                        if (currentPoint) {
                            
                            // result[currentPoint] = tableString.replace("(TABLE", "(TABLE)")
                        }
                        // currentPoint = "";
                        // cleanedText = "";
                        // tableString = ""
                        // delete result[currentPoint];
                    }
                    tableIndices.forEach((index)=> {
                                const text = result[index]["content"];
                                // console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%" , text)
                                let indexOfTableKeyword = text.indexOf("TABLE")
                                    if (indexOfTableKeyword === -1) {
                                        indexOfTableKeyword = text.indexOf("(TABLE");
                                    }
                                    // console.log(index , "index of table key word ======================================================" , indexOfTableKeyword)
                                    // const textSeparated = text.split(' ');
                                    // textSeparated.forEach((el , index)=>{
                                    //     console.log("element $$$$$$$$$$$$$$$$$" , el)
                                    // })
            
                                    const referLinkIndex = text.indexOf("*")
                                    // console.log("referLinkIndex-------------------------->>>>>>>>>>>>>>>"  , referLinkIndex)
                                    const referedContent = text.substring(referLinkIndex , text.length);
                                    // console.log("refered content ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~" , referedContent)
                                    // .concat(' ', referedContent);
                                    if(referLinkIndex != -1 && clauseStarted){
                                        result[index]["content"] = text.substring(0, indexOfTableKeyword + 5).concat(" " , referedContent).replace("(TABLE", "(TABLE)")
                                    }else if(clauseStarted){
            
                                        result[index]["content"] = text.substring(0, indexOfTableKeyword + 5).replace("(TABLE", "(TABLE)")
                                    }
                                })


                    const introductionMatch = token.match(/INTRODUCTION/g);

                    if (introductionMatch) {
                        clauseStarted = true;
                    }

                    const tokenSeparated = token.split("\n");

                    const pointMatch = token.match(
                        /^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/
                    );

                    const subPointMatch = token.match(/(?:^|\s)([^\s\)]\)) (.+?)(?=(?:\n\s*)[^\s\)]\)|$)/gs);
                    
                    if(subPointMatch){
                        currentSubPoint = subPointMatch[0].trim().substring(0 ,2).replace(/(\b1\))\s*/g, 'i) ').replace(/(\bI\))\s*/g, 'l) ')
                    }

                    if (pointMatch && !stopExtracting && !isInsideDoubleHash) {
                        console.log("____________________________)))))))))))))))))))))))))))))) pointmatch" , pointMatch)
                        if (Object.hasOwn(result, pointMatch[0])) {
                            cleanedText = pointMatch[0];
                            result[currentPoint]["content"] = (result[currentPoint]["content"]).concat(cleanedText);
                        } else {
                            tableEncountered = false;
                            currentPoint = pointMatch[0];
                            currentSubPoint = ""
                            result[currentPoint] = {"content": "" , "sequence" : {}};
                        }
                        // console.log(currentPoint)
                    } else if (tokenSeparated && !isInsideDoubleHash) {
                        for (const separatedToken of tokenSeparated) {
                            // console.log("&&&&&&&&&&&&&&separatedtoken" , separatedToken)

                            if (!stopExtracting && clauseStarted && !tableEncountered) {


                                const validationPoints = this.validate(separatedToken);
                                if (validationPoints) {
                                    console.log('Non validated points--', validationPoints[0]);
                                    nonValidatedPoints.push(validationPoints[0]);
                                }
                            }

                            let separatedTokenMatch;

                            if (Object.keys(result).length === 1 && Object.values(result)[0]["content"] === 'INTRODUCTION ') {
                                separatedTokenMatch = separatedToken.match(
                                    /^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/
                                );
                            } else {
                                separatedTokenMatch = separatedToken.match(/^\d+(\.\d+)+(\.)+$|\\End of Clauses\\$/)
                            }

                            // console.log({ separatedTokenMatch: separatedToken.match(/^\d+(\.\d+)+(\.)+$|\\End of Clauses\\$/) })

                            if (
                                separatedToken.match(/^(\*\*End of Clauses(\*\*|™™\*{0,2}|™\*{1,2})|“\*End of clauses™|\*\*¥\*% End of clauses \*\*\*|\*\*¥\* End of clauses \*\*\*)$/
                            )
                            ) {
                                stopExtracting = true;
                            }

                            if (separatedToken.startsWith("##") && separatedToken.endsWith("#")) {
                                ignoreToken = true
                            }

                            if (separatedToken.startsWith("H#") || separatedToken.startsWith("#H#") || separatedToken.startsWith("##")) {
                                isInsideDoubleHash = !isInsideDoubleHash;
                            }

                            if (separatedToken.endsWith("#i#") || separatedToken.endsWith("##") || separatedToken.endsWith("#H#")) {
                                isInsideDoubleHash = !isInsideDoubleHash;
                                ignoreToken = true
                            }

                            if (
                                separatedTokenMatch &&
                                currentPoint != separatedTokenMatch[0] &&
                                !stopExtracting
                            ) {
                                // tableEncountered = false;
                                currentPoint = separatedTokenMatch[0];
                                currentSubPoint = "";
                                result[currentPoint] = {"content": "" , "sequence" : {}};
                            } else if (currentPoint && !stopExtracting && !ignoreToken && !isInsideDoubleHash && !currentSubPoint) {
                                cleanedText = separatedToken.replace(/\s+/g, " ").trim();
                                console.log("*************************************************************************************" , cleanedText)
                                result[currentPoint]["content"] += cleanedText + " ";
                            }else if(currentSubPoint && !stopExtracting && !ignoreToken && !isInsideDoubleHash && !pointMatch){
                                cleanedText = separatedToken.replace(/\s+/g, " ").trim();
                                console.log("************************************************************************************* subContent" , cleanedText)
                                result[currentPoint]["sequence"][currentSubPoint] = result[currentPoint]["sequence"][currentSubPoint] ? result[currentPoint]["sequence"][currentSubPoint].replace(/[^\s\)]\)\s*/, '').trim() + cleanedText + " " : cleanedText + " ";
                            }
                            // console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%" , currentSubPoint)

                            ignoreToken = false
                            if (!clauseStarted) {
                                currentPoint = "";
                                cleanedText = "";
                                delete result[currentPoint];
                            }
                        }
                    }

                    // this.ignoreToken = false
                });
                // console.log(result)

               

                // if (currentPoint && result[currentPoint]) {
                //     result[currentPoint] limitedText= result[currentPoint].join(" ");
                // }

                // At the end of processing each file:
                if (nonValidatedPoints.length) {
                    this.ClausePages = [];
                    console.log(`Validation error, we found some points which are not allowed i.e ${nonValidatedPoints.join(",")}`)
                    throw new Error(`Validation error, we found some points which are not allowed i.e ${nonValidatedPoints.join(",")}`);
                }

                // for (const key in result) {
                //     result[key]["content"] = result[key]["content"].trim();
                // }
            });

            // if (result.hasOwnProperty("1.")) {
            //     // Now, you can also check if the value associated with "1." is "INTRODUCTION"
            //     const ifIntroductionExistsRegex = /INTRODUCTION/g

            //     const ifIntroductionExists = ifIntroductionExistsRegex.test(result["1."])

            //     if (!ifIntroductionExists) {
            //         throw new Error(`Validation error, The first entry should be  '1. INTRODUCTION'`);
            //     } 
            // } else {
            //     throw new Error(`Validation error, the document does not comply with our validation rule.`);
            // }

            // Process each file

            // Process text from each file
            // console.log(this.worker_array,'>>>>>>>>>>>>>>>>>>>>')    

            // this.worker_array.forEach((worker)=>{
            //     try {
            //         worker.terminate();
            //     } catch (error) {
            //         console.error(error);
            //     }
            // })
            console.log(JSON.stringify(result , null , 2))
            console.log("table indices ================>" , tableIndices)
            if (ws != '') {
                ws.send(JSON.stringify({ type: 'progress_data', data: result }));
            }
            // console.log(`result`, result);
        }


        if (result.hasOwnProperty("1.")) {
            // Now, you can also check if the value associated with "1." is "INTRODUCTION"
            const ifIntroductionExistsRegex = /INTRODUCTION/g

            const ifIntroductionExists = ifIntroductionExistsRegex.test(result["1."]["content"])

            if (!ifIntroductionExists) {
                throw new Error(`Validation error, The first entry should be  '1. INTRODUCTION'`);
            }
        } else {
            throw new Error(`Validation error, the document does not comply with our validation rule.`);
        }

        // Process each file

        // Process text from each file
        // console.log(this.worker_array,'>>>>>>>>>>>>>>>>>>>>')    

        this.worker_array.forEach((worker) => {
            try {
                worker.terminate();
            } catch (error) {
                console.error(error);
            }
        })
        await scheduler.terminate();
        return result
    };

    async extractImagesFromPdf(filePath) {
        // print(filePath,'extract_images')
        console.log(filePath, "extract_images");
        // exportImages("file.pdf", "output/dir")
        //   .then((images) => console.log("Exported", images.length, "images"))
        //   .catch(console.error);
    }
    async extractTableFromPdf(ws = '') {
        const tableData = [];
        try {
            console.log('extract_table_started', "JSONRESPONSE")

            const uuid = uuidv4();
            // await ws.send('Table extraction started.')
            if (ws != '') {
                await ws.send(JSON.stringify({ "type": "new_task_started", "message": "Table extraction started.", task: 'table' }));
            }

            if (this.ClausePages == undefined) {
                this.ClausePages = [];
            }

            const jsonResponse = await sendJsonRequest({ 'tables': this.ClausePages, 'uuid': uuid, 'type': 'extract_table' }, ws);
            console.log("table response" , JSON.stringify(jsonResponse , null , 2))
            this.ClausePages = [];
            return jsonResponse;
        } catch (error) {
            console.error("Error:", error);
        }
    }
}



async function sendJsonRequest(request, wsr) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://py-server:5151');

        ws.on('open', () => {
            console.log('WebSocket connection opened.2');
            // Stringify the JSON request
            const jsonRequest = JSON.stringify(request);
            // console.log(jsonRequest,'-00000')
            // Send the JSON request to the WebSocket server
            ws.send(jsonRequest);
        });

        ws.on('message', (message) => {
            console.log('Received message from WebSocket server:', message);
            // Parse the received JSON response
            const jsonResponse = JSON.parse(message);
            // console.log(`jsonResponse`, jsonResponse);
            // console.log(jsonResponse,'response-from-the-py-server')
            if (jsonResponse.type == 'response') {

                resolve(jsonResponse.response);
                ws.close();
            } else {
                if (wsr != '') {
                    wsr.send(JSON.stringify(jsonResponse))
                    console.log(jsonResponse.message)
                }

            }
            // Resolve the promise with the received JSON response
            // Close the WebSocket connection after receiving a response

        });

        ws.on('close', () => {
            console.log('WebSocket connection closed.');
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);

            // Reject the promise if there's an error
            reject(error);
        });
    });
}

export default PdfTextExtractor;