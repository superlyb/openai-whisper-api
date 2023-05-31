/* import fs from 'fs'
import path from 'path'
import { exec } from 'child_process' */
import axios from 'axios'
import FormData from 'form-data'

import { cleanInput } from '../../lib/utils'

import Cors from 'cors'

import {OpenAIApi,Configuration} from 'openai'

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
/*
 function getFileType(filename) {
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
} 
*/
 export async function POST(req,cors) {



    const form = await req.formData()
    
    const blob = form.get('file')
    const name = cleanInput(form.get('name'))
    const datetime = cleanInput(form.get('datetime'))
    const raw_options = cleanInput(form.get('options'))
   

    if(!blob || !name || !datetime) {
        return new Response('Bad Request', {
            status: 400,
        })
    }

    const options = JSON.parse(raw_options)
    const extension = options.type

    const buffer = Buffer.from( await blob.arrayBuffer() )
    const filename = `${name}`
 
    const flagDoNotUseApi = process.env?.DO_NOT_USE_API === 'true'
   
    let header = {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_APIKEY}`
    }

    let formData = new FormData()
    let contentTypes = {
        'webm':'audio/webm' ,
        'mp4':'audio/mp4',
        'mp3':'audio/mpeg',
        'wav':'audio/wav',
        // Add more MIME types if needed
    };
     formData.append('file', buffer, 
     {
        filename: filename, // replace with your file name
        contentType: contentTypes[extension], // replace with the correct mime type for your audio data
      } 
      );
 
    console.log("contentTypes[extension]",contentTypes[extension])
   // formData.append('file', fs.createReadStream(filepath))
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
    
        //console.log("response"+process.env.NEXT_PUBLIC_OPENAI_APIKEY)
        const data = response.data

        const origin = req.headers.origin;
        // Return CORS headers for preflight request

        
        const allowedOrigins = ['https://chat-gpt-next-web-avre.vercel.app'];

         const res = new Response(JSON.stringify({ 
            datetime,
            filename,
            data
        }), {
            status: 200,
        })

// If the origin of the request is in our list of allowed origins, set the Access-Control-Allow-Origin header to that origin
        console.log("gptResponse",origin)
        if (allowedOrigins.includes(origin)) {
            res.headers.set('Access-Control-Allow-Origin', origin);
        }
        res.headers.set('Access-Control-Allow-Methods', 'POST'); // Include other methods if needed
        res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
        return  res
      } catch (error) {

        console.log(error)
        return new Response(JSON.stringify({ 
            error: error.message 
        }), {
            status: 500,
        })
      }
   
}

export async function GET() {
    try {
        const subscriptionKey = process.env.NEXT_PUBLIC_TTS_ACCESS_KEY_ID;
        const serviceRegion = process.env.NEXT_PUBLIC_TTS_REGION;   
        const endpoint = `https://${serviceRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
    
        const response = await axios.get(endpoint, {
          headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Content-Type': 'application/json',
          },
        });
    
        const voices = response.data;
        console.log(voices)
        return new Response(
            (JSON.stringify({ 
                voices
            }), {
                status: 200,
            }))
      } catch (error) {
        console.error('Failed to fetch voice list:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Failed to fetch voice list'
            }), {
                status: 500,
            })
      }
}
export async function OPTIONS(req) {
    try {
        //console.log("re2q",req)
        const origin = req.headers.origin;
        // Return CORS headers for preflight request

        
        const allowedOrigins = ['https://chat-gpt-next-web-avre.vercel.app'];
        const res = new Response({
            status: 200,
        })
        if (allowedOrigins.includes(origin)) {
            res.headers.set('Access-Control-Allow-Origin', origin);
          }
          res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
          return;
      } catch (error) {
        console.error('Failed to fetch voice list:', error);
        return new Response(
            JSON.stringify({ 
                error: error
            }), {
                status: 500,
            })
      }
} 