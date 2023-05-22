//import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import axios from 'axios'
import FormData from 'form-data'

import { cleanInput } from '../../lib/utils'

import Cors from 'cors'

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'HEAD', 'POST'], // Specify the methods you want to enable for this route
  origin: ['http://localhost:3000', 'https://www.bus-ai.com'], // Specify the sites you want to allow
})


import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";



async function upLoadfile2cloud(file,filename){

    const client = new S3Client({ region: "auto",//process.env.NEXT_PUBLIC_AWS_REGION?process.env.NEXT_PUBLIC_AWS_REGION:'ap-northeast-1',
                        endpoint: `https://4d5690537aaf9afd3e7776f09497ab71.r2.cloudflarestorage.com`,
                        credentials: {
                            accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID?process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID:'',
                            secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY?process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY:'',
                        }
                    });


   // const buffer = await file.arrayBuffer();
    const command = new PutObjectCommand({
        Bucket: "jadaudio",
        Key: filename,
        Body: file,
    });

    try {
        const response = await client.send(command);
        //console.log(response.$metadata.);
    } catch (err) {
        console.error(err);
    }

}

/* function getFileType(filename) {
    // Get the file extension
    const extension = filename.split('.').pop();

    // Map the file extension to a MIME type
    const mimeTypes: [extension] = {
        'webm': 'audio/webm',
        'mp4': 'audio/mp4',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        // Add more file types if needed
    };

    return mimeTypes[extension || ''] || 'Unknown file type';
} */

export async function POST(req,cors) {



    const form = await req.formData()
    
    const blob = form.get('file')
    const name = cleanInput(form.get('name'))
    const datetime = cleanInput(form.get('datetime'))
    const raw_options = cleanInput(form.get('options'))
   

    /**
     * Simple form validation
     */
    if(!blob || !name || !datetime) {
        return new Response('Bad Request', {
            status: 400,
        })
    }

    const options = JSON.parse(raw_options)
    const extension = options.type

    const buffer = Buffer.from( await blob.arrayBuffer() )
    const filename = `${name}.`+extension
    //await bufferToFile(buffer, filename);
  // upLoadfile2cloud(buffer,filename)
    //upload to R2

   // let filepath = `${path.join('public', 'uploads', filename)}`
    
   // fs.writeFileSync(filepath, buffer)

    /**
     * We are going to check the file size here to decide
     * whether to send it or not to the API.
     * As for the min file size value, it is based on my testing.
     * There is probably a better way to check if the file has no audio data.
     */
/*     const minFileSize = 18000 // bytes
   // const stats = fs.statSync(filepath)

    if(parseInt(stats.size) < minFileSize) {

        return new Response('Bad Request', {
            status: 400,
        })
    } */

    const flagDoNotUseApi = process.env?.DO_NOT_USE_API === 'true'
/* 
    if(flagDoNotUseApi) {
        
        const outputDir = path.join('public', 'uploads') 

        let sCommand = `whisper './${filename}' --language ${options.language} --temperature ${options.temperature} --model tiny --output_dir '${outputDir}'`
        if(options.endpoint === 'translations') {
            sCommand = `whisper './${filename}' --language ${options.language} --task translate --temperature ${options.temperature} --model tiny --output_dir '${outputDir}'`
        }

        const retval = await new Promise((resolve, reject) => {

            exec(sCommand, (error, stdout, stderr) => {
                
                if (error) {
                    
                    resolve({
                        status: 'error',
                        message: "Failed to transcribe [1]",
                    })
    
                } else {
    
                    resolve({
                        status: 'ok',
                        error: stderr,
                        //pid: getSimpleId(),
                        out: stdout,
                        //url: fileUrl,
                        //datetime: dateTimeCreated,
                    })
    
                }
                
            })
    
        })

        if(retval.status === "error" || retval.out.length === 0) {
            return new Response('Bad Request', {
                status: 400,
            })
        }

        /**
         * retval.out format: '[00:01.000 --> 00:02.000]  thank\n' +
         *             '[00:02.720 --> 00:03.720]  you\n' +
         *
        let sout = []
        let stokens = retval.out.split('\n')
        for(let i = 0; i < stokens.length; i++) {
            let n = stokens[i].indexOf(']')
            if(n > 0) {
                let s1 = stokens[i].substr(0, n + 1)
                let s2 = stokens[i].substr(n + 1)
                sout.push(s1)
                sout.push(s2)
            } else {
                sout.push(stokens[i])
            }
        }

        return new Response(JSON.stringify({ 
            datetime,
            filename,
            data: sout.join('\n'),
        }), {
            status: 200,
        })

    }  */
     
    let header = {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_APIKEY}`
    }

    let formData = new FormData()
    let contentTypes = {
        'webm':'audio/webm' ,
        'mp4':'audio/mp4',
        'mp3':'audio/mpeg',
        'wav':'audio/wav',
        // Add more MIME types if needed
    };
    formData.append('file', buffer, {
        filename: filename, // replace with your file name
        contentType: contentTypes[extension], // replace with the correct mime type for your audio data
      });

    console.log("contentTypes[extension]",contentTypes[extension])
    //formData.append('file', form)//fs.createReadStream(filepath))
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'vtt') // e.g. text, vtt, srt

    formData.append('temperature', options.temperature)
    formData.append('language', options.language)

    const url = options.endpoint === 'transcriptions' ? 'https://api.openai.com/v1/audio/transcriptions' : 'https://api.openai.com/v1/audio/translations'
    

    try {
        const response = await axios.post(url, formData, {
          headers: {
            ...header,
          },
        });
    
        //console.log(response)
        const data = response.data

        /**
         * Sample output
         */
        //const data = "WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nThe party is starting now hurry up, let's go.\n00:00:04.000 --> 00:00:07.000\nHold this one, okay, do not drop it."
     
        return new Response(JSON.stringify({ 
            datetime,
            filename,
            data,
        }), {
            status: 200,
        })
      } catch (error) {

        console.log(error.response.data)
        return new Response(JSON.stringify({ 
            error: error.message 
        }), {
            status: 500,
        })
      }
   


}