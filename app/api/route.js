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
    //console.log('options',options)
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
 
   // console.log("contentTypes[extension]",contentTypes[extension])
   // formData.append('file', fs.createReadStream(filepath))
    formData.append('model', 'whisper-1')
    formData.append('response_format', options.format) // e.g. text, vtt, srt

    formData.append('temperature', options.temperature)
    if (!options.language){
        formData.append('language', options.language)
    }
    else{
        formData.append('language', 'zh')
    }

    console.log(formData)
    

 //   console.log("lang",options.language)

    const url = options.endpoint === 'transcriptions' ? 'https://api.openai.com/v1/audio/transcriptions' : 'https://api.openai.com/v1/audio/translations'
    

    try {
        const response = await axios.post(url, formData, {
          headers: {
            ...header,
          },
        });
        
        //console.log("response"+process.env.NEXT_PUBLIC_OPENAI_APIKEY)
        const data = response.data
        // Return CORS headers for preflight request
        
        //const allowedOrigins = ['https://chat-gpt-next-web-avre.vercel.app'];
        if (options.format === 'text'){
            const resheaders = new Headers();
            resheaders.set('Access-Control-Allow-Origin', '*');
            resheaders.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
            resheaders.set('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token');
            const res = new Response(JSON.stringify({ 
                    data
            }), {
                    status: 200,
                    headers:resheaders
            })

            return  res
        }
        else{
            const res = new Response(JSON.stringify({
                datetime,
                filename, 
                data
            }), {
                status: 200,
            })
            return  res
        } 
         
      } catch (error) {

        console.log(error.response)
        
        return new Response(JSON.stringify({ 
            error: error 
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
       // console.log(voices)
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
        const res = new Response({
            status: 200,
        })
          res.headers.set('Access-Control-Allow-Origin', '*');
          res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
          res.headers.set('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token');
          return res;
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